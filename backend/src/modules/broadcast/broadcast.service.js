import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import xlsx from 'xlsx';
import env from '../../config/env.js';
import logger from '../../infra/logging/logger.js';
import {
  bumpCampaignCounters,
  createBroadcastCampaign,
  createBroadcastTemplate,
  deleteBroadcastTemplate,
  getBroadcastTemplateById,
  findActiveConnections,
  insertBroadcastMessages,
  listBroadcastCampaigns,
  listBroadcastTemplates,
  resolveTenantId,
  listBroadcastMessagesByCampaign,
  getCampaignById
} from '../../infra/db/broadcastRepository.js';
import { normalizeWhatsAppNumber } from '../../shared/phoneNormalizer.js';
import { AppError } from '../../shared/errors.js';

const dataUrlRegex = /^data:(.*?);base64,(.*)$/;

const parseDataUrl = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(dataUrlRegex);
  if (!match) return null;
  const mime = match[1] || 'application/octet-stream';
  const buffer = Buffer.from(match[2], 'base64');
  return { mime, buffer };
};

const persistUploadMedia = async (upload = {}, { type }) => {
  const parsed = parseDataUrl(upload.dataUrl);
  if (!parsed) throw new AppError('Archivo base64 inválido', 400);
  const size = parsed.buffer.length;
  const max = env.media?.maxBytes || 25 * 1024 * 1024;
  if (size > max) throw new AppError(`Archivo supera el límite (${max} bytes)`, 400);
  const allowed = env.media?.allowedMimePrefixes || ['image/', 'video/', 'audio/', 'application/'];
  const isAllowed = allowed.some((p) => parsed.mime.toLowerCase().startsWith(p.toLowerCase()));
  if (!isAllowed) throw new AppError(`MIME no permitido: ${parsed.mime}`, 400);
  if (type === 'image' && !parsed.mime.startsWith('image/')) {
    throw new AppError('Se requiere una imagen válida', 422);
  }
  const baseDir = path.resolve(process.cwd(), 'storage/broadcast');
  await fs.mkdir(baseDir, { recursive: true });
  const safeName = (upload.name || '').replace(/[^a-zA-Z0-9._-]/g, '') || 'file';
  const extFromMime = parsed.mime.split('/')[1]?.split(';')[0] || 'bin';
  const ext = path.extname(safeName) || `.${extFromMime}`;
  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const filePath = path.join(baseDir, fileName);
  await fs.writeFile(filePath, parsed.buffer, { mode: 0o600 });
  return {
    path: filePath,
    mimeType: parsed.mime,
    size,
    fileName: safeName || fileName,
    type
  };
};

const normalizeTargets = (targets = []) => {
  const set = new Set();
  targets
    .map((t) => (typeof t === 'string' || typeof t === 'number' ? String(t) : ''))
    .map((t) => t.replace(/[^\d]/g, ''))
    .filter((digits) => digits && digits.length >= 5)
    .forEach((t) => {
      const normalized = normalizeWhatsAppNumber(t) || t;
      if (normalized) set.add(normalized);
    });
  return Array.from(set);
};

const normalizeTargetEntries = (entries = []) => {
  const result = [];
  for (const entry of entries) {
    if (!entry) continue;
    const raw = typeof entry === 'string' || typeof entry === 'number' ? String(entry) : entry.phone || entry.target || '';
    const digits = String(raw).replace(/[^\d]/g, '');
    if (!digits || digits.length < 5) continue;
    const normalized = normalizeWhatsAppNumber(digits);
    const target = normalized || digits;
    const variables = entry.variables && typeof entry.variables === 'object' ? entry.variables : {};
    result.push({ target, variables });
  }
  return result;
};

const parseXlsxRecipients = (xlsxFile) => {
  if (!xlsxFile?.dataUrl) return [];
  const allowedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (xlsxFile.type && !xlsxFile.type.includes('sheet') && xlsxFile.type !== allowedMime) {
    throw new AppError('Archivo XLSX inválido', 400);
  }
  const parsed = parseDataUrl(xlsxFile.dataUrl);
  if (!parsed) throw new AppError('XLSX inválido', 400);
  const workbook = xlsx.read(parsed.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new AppError('XLSX sin hojas', 400);
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (!rows.length) throw new AppError('XLSX sin datos', 400);
  const header = rows[0] || [];
  const varNames = header.slice(1).map((h, idx) => (h ? String(h).trim() : `var${idx + 1}`));
  const entries = [];
  const overrideKeys = ['text_override', 'mensaje_override', 'texto_override', 'body_override', 'override'];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const phone = row[0];
    if (!phone) continue;
    const variables = {};
    let textOverride = null;
    for (let j = 1; j < row.length; j += 1) {
      const key = varNames[j - 1] || `var${j}`;
      const value = row[j];
      if (value !== undefined && value !== null) {
        const normKey = String(key).trim().toLowerCase();
        if (overrideKeys.includes(normKey)) {
          textOverride = typeof value === 'string' ? value : String(value);
        } else {
          variables[key] = typeof value === 'string' ? value : String(value);
        }
      }
    }
    if (textOverride) {
      variables.textOverride = textOverride;
    }
    entries.push({ target: phone, variables });
  }
  return entries;
};

const validateDelays = ({ delayMin, delayMax }) => {
  const minSeconds = Math.max(0, Number(delayMin) || 0);
  const maxSeconds = Math.max(minSeconds, Number(delayMax) || minSeconds);
  return { delayMinSeconds: minSeconds, delayMaxSeconds: maxSeconds };
};

const buildPayload = async ({ messageType, text, file, template }) => {
  const payload = {
    text: text || template?.body || ''
  };
  if (template?.metadata) payload.metadata = template.metadata;
  if (template?.media) payload.media = template.media;
  if (messageType === 'tts') {
    payload.tts = template?.metadata?.tts || {};
  }
  if (file?.dataUrl) {
    payload.media = await persistUploadMedia(file, { type: messageType });
  }
  if ((messageType === 'image' || messageType === 'file') && !payload.media?.path) {
    throw new AppError('Se requiere un archivo para este tipo de mensaje', 400);
  }
  return payload;
};

export const createTemplateService = async (payload, userId) => {
  const type = payload.type;
  if (!['text', 'image', 'file', 'tts'].includes(type)) throw new AppError('Tipo de template inválido', 400);
  const media = payload.media || payload.file;
  const storedMedia = media?.dataUrl ? await persistUploadMedia(media, { type }) : media || {};
  if ((type === 'image' || type === 'file') && !storedMedia?.path) {
    throw new AppError('El template requiere un archivo adjunto', 400);
  }
  const metadata = payload.metadata || {};
  return createBroadcastTemplate({
    name: payload.name,
    type,
    body: payload.body || payload.text || '',
    media: storedMedia || {},
    metadata,
    createdBy: userId
  });
};

export const listTemplatesService = async (userId) => {
  const tenantId = await resolveTenantId(userId);
  return listBroadcastTemplates(tenantId);
};

export const deleteTemplateService = async (id, userId) => {
  const tenantId = await resolveTenantId(userId);
  await deleteBroadcastTemplate(id, tenantId);
};

export const createBroadcastCampaignService = async ({
  name,
  messageType,
  templateId,
  recipients,
  text,
  file,
  xlsx: xlsxFile,
  delayMin,
  delayMax,
  connections,
  tts,
  startAt,
  stopAt
}, user) => {
  if (!name) throw new AppError('Nombre de campaña requerido', 400);
  const targetConnections = Array.isArray(connections)
    ? connections.map((c) => String(c).trim()).filter(Boolean)
    : [];
  if (!targetConnections.length) throw new AppError('Se requiere al menos una conexión de WhatsApp', 400);
  const tenantId = await resolveTenantId(user?.id || null);
  const connectionStatus = await findActiveConnections(targetConnections);
  const activeConnections = connectionStatus
    .filter((c) => (c.status || '').toLowerCase() === 'connected')
    .map((c) => c.session_name);
  if (!activeConnections.length) {
    throw new AppError('No hay conexiones activas disponibles', 400);
  }
  const template = templateId ? await getBroadcastTemplateById(templateId) : null;
  if (template?.tenant_id && template.tenant_id !== tenantId) {
    throw new AppError('Template no pertenece a tu organización', 403);
  }
  const type = messageType || template?.type;
  if (!['text', 'image', 'file', 'tts'].includes(type)) throw new AppError('Tipo de mensaje inválido', 400);
  const { delayMinSeconds, delayMaxSeconds } = validateDelays({ delayMin, delayMax });
  const start = startAt ? new Date(startAt) : null;
  const stop = stopAt ? new Date(stopAt) : null;
  if (start && Number.isNaN(start.getTime())) throw new AppError('Fecha/hora de inicio inválida', 400);
  if (stop && Number.isNaN(stop.getTime())) throw new AppError('Fecha/hora de fin inválida', 400);
  if (start && stop && start > stop) throw new AppError('La hora de inicio debe ser antes de la de fin', 400);
  const baseText = text || template?.body || '';
  const payload = await buildPayload({ messageType: type, text: baseText, file, template });
  const xlsxEntries = parseXlsxRecipients(xlsxFile || {});
  const xlsxTargets = normalizeTargetEntries(xlsxEntries);
  const manualTargets = Array.isArray(recipients) && recipients.length ? normalizeTargets(recipients).map((t) => ({ target: t, variables: {} })) : [];
  const allTargets = [...manualTargets, ...xlsxTargets];
  logger.info(
    {
      tag: 'BROADCAST_TARGETS_COMPILED',
      manual: manualTargets.length,
      xlsx: xlsxTargets.length,
      baseTextLength: (baseText || '').length,
      sampleXlsx: xlsxTargets[0]
        ? { target: xlsxTargets[0].target, vars: Object.keys(xlsxTargets[0].variables || {}), override: xlsxTargets[0].variables?.textOverride }
        : null
    },
    'Broadcast payload prepared'
  );
  if (!allTargets.length) throw new AppError('No hay destinatarios válidos', 400);
  if (type === 'tts') {
    payload.tts = { ...(payload.tts || {}), ...(tts || {}) };
    if (!payload.text) throw new AppError('Texto TTS requerido', 400);
  }
  const campaign = await createBroadcastCampaign({
    name,
    messageType: type,
    templateId: template?.id || null,
    delayMinSeconds,
    delayMaxSeconds,
    connections: activeConnections,
    startAt: start || null,
    stopAt: stop || null,
    createdBy: user?.id || null
  });
  const messages = allTargets.map(({ target, variables }) => {
    const textOverride = variables?.textOverride || baseText;
    const messagePayload = {
      ...payload,
      baseText,
      templateText: baseText,
      text: textOverride,
      body: textOverride,
      variables: { ...(variables || {}) }
    };
    return {
      target,
      payload: messagePayload,
      maxAttempts: 3,
      nextAttemptAt: start || new Date()
    };
  });
  await insertBroadcastMessages({
    campaignId: campaign.id,
    templateId: template?.id || null,
    messageType: type,
    messages,
    tenantId
  });
  await bumpCampaignCounters(campaign.id);
  logger.info(
    { campaignId: campaign.id, targets: allTargets.length, connections: activeConnections, type },
    'Broadcast campaign creada'
  );
  return { ...campaign, total_targets: allTargets.length };
};

export const listBroadcastHistoryService = async (userId) => {
  const tenantId = await resolveTenantId(userId);
  const campaigns = await listBroadcastCampaigns(tenantId, 100);
  return campaigns.map((c) => {
    const total = c.total_targets || 0;
    const sent = c.sent_messages || c.sent_count || 0;
    const failed = c.failed_messages || c.error_count || 0;
    const progress = total ? Math.round(((sent + failed) / total) * 100) : 0;
    return {
      ...c,
      sent_count: sent,
      error_count: failed,
      progress
    };
  });
};

export const getBroadcastDetailService = async (campaignId, userId) => {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new AppError('Campaña no encontrada', 404);
  const tenantId = await resolveTenantId(userId);
  if (campaign.tenant_id && tenantId && campaign.tenant_id !== tenantId) {
    throw new AppError('No autorizado para ver esta campaña', 403);
  }
  const messages = await listBroadcastMessagesByCampaign(campaignId, 500);
  const stats = {
    total: campaign.total_targets || messages.length,
    sent: messages.filter((m) => m.status === 'sent').length,
    error: messages.filter((m) => m.status === 'error').length,
    pending: messages.filter((m) => m.status === 'pending' || m.status === 'sending').length
  };
  return { campaign, messages, stats };
};
