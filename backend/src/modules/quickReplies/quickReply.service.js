import { AppError } from '../../shared/errors.js';
import {
  createQuickReply,
  getQuickReplyById,
  listQuickReplies,
  resolveTenantId,
  setQuickReplyActive,
  updateQuickReply
} from '../../infra/db/quickReplyRepository.js';
import { recordQuickReplyAudit } from '../../infra/db/quickReplyAuditRepository.js';
import { recordAuditLog } from '../../infra/db/auditRepository.js';
import { getChatById } from '../../infra/db/chatRepository.js';
import { sendMessage as sendChatMessage } from '../../services/chatMessageService.js';

const PLACEHOLDER_REGEX = /\{([a-zA-Z0-9_.-]+)\}/g;
const VAR_NAME_REGEX = /^[a-zA-Z0-9_.-]{1,64}$/;
const MAX_VARIABLES = 25;

const extractPlaceholders = (textoBase = '') => {
  const names = new Set();
  PLACEHOLDER_REGEX.lastIndex = 0;
  let match;
  while ((match = PLACEHOLDER_REGEX.exec(textoBase)) !== null) {
    if (match[1]) names.add(match[1]);
  }
  return Array.from(names);
};

const normalizeVariables = (variables = [], textoBase = '') => {
  const placeholders = extractPlaceholders(textoBase);
  const source = Array.isArray(variables) ? variables : [];
  const selected = placeholders.length ? placeholders : source;
  const normalized = [];
  for (const raw of selected) {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (!name) continue;
    if (!VAR_NAME_REGEX.test(name)) {
      throw new AppError(`Variable inválida: ${name}`, 400);
    }
    if (!normalized.includes(name)) normalized.push(name);
  }
  if (normalized.length > MAX_VARIABLES) {
    throw new AppError(`Máximo ${MAX_VARIABLES} variables permitidas`, 400);
  }
  if (placeholders.length) {
    const missing = placeholders.filter((p) => !normalized.includes(p));
    if (missing.length) {
      throw new AppError(`Faltan variables obligatorias: ${missing.join(', ')}`, 400);
    }
  }
  return normalized;
};

const normalizeValues = (expectedNames = [], provided = {}) => {
  const values = {};
  const providedKeys = Object.keys(provided || {});
  for (const name of expectedNames) {
    const raw = provided?.[name];
    const val = typeof raw === 'string' ? raw.trim() : raw === undefined || raw === null ? '' : String(raw).trim();
    if (!val) {
      throw new AppError(`Variable requerida sin valor: ${name}`, 422);
    }
    values[name] = val;
  }
  const extras = providedKeys.filter((k) => !expectedNames.includes(k));
  if (extras.length) {
    throw new AppError(`Variables no permitidas: ${extras.join(', ')}`, 400);
  }
  return values;
};

const renderTemplate = (textoBase = '', values = {}) => {
  PLACEHOLDER_REGEX.lastIndex = 0;
  const rendered = textoBase.replace(PLACEHOLDER_REGEX, (_m, key) => values[key] ?? `{${key}}`);
  PLACEHOLDER_REGEX.lastIndex = 0;
  if (PLACEHOLDER_REGEX.test(rendered)) {
    throw new AppError('Variables incompletas para la respuesta rápida', 422);
  }
  return rendered;
};

const assertTenantMatch = (resourceTenantId, userTenantId) => {
  if (resourceTenantId && userTenantId && resourceTenantId !== userTenantId) {
    throw new AppError('Recurso pertenece a otro tenant', 403);
  }
};

export const listQuickRepliesService = async ({ userId, search, cursor, limit, activeOnly = false }) => {
  const tenantId = await resolveTenantId(userId);
  return listQuickReplies({ tenantId, search, cursor, limit, activeOnly });
};

export const createQuickReplyService = async (payload, user, { ip = null, userAgent = null } = {}) => {
  const titulo = (payload?.titulo || '').trim();
  const textoBase = (payload?.textoBase || payload?.texto_base || '').trim();
  if (!titulo) throw new AppError('Título requerido', 400);
  if (!textoBase) throw new AppError('Texto base requerido', 400);
  if (textoBase.length > 4000) throw new AppError('Texto base demasiado largo', 400);

  const normalizedVars = normalizeVariables(payload?.variables || [], textoBase);
  let quickReply = null;
  try {
    quickReply = await createQuickReply({
      titulo,
      textoBase,
      variables: normalizedVars,
      activo: payload?.activo !== undefined ? Boolean(payload.activo) : true,
      createdBy: user?.id || null
    });
  } catch (err) {
    if (err?.code === '23505') {
      throw new AppError('Ya existe una respuesta rápida con ese título', 409);
    }
    throw err;
  }

  await recordQuickReplyAudit({
    tenantId: quickReply.tenantId,
    quickReplyId: quickReply.id,
    userId: user?.id || null,
    action: 'CREATE',
    variablesUsadas: { variables: normalizedVars, textoBase },
    chatId: null,
    ip,
    userAgent
  });
  await recordAuditLog({
    userId: user?.id || null,
    action: 'quick_reply_create',
    resource: 'quick_reply',
    resourceId: quickReply.id,
    ip,
    userAgent,
    metadata: { titulo, variables: normalizedVars }
  });

  return quickReply;
};

export const updateQuickReplyService = async (id, payload, user, { ip = null, userAgent = null } = {}) => {
  const userTenantId = await resolveTenantId(user?.id || null);
  const existing = await getQuickReplyById(id, userTenantId);
  if (!existing) throw new AppError('Respuesta rápida no encontrada', 404);
  assertTenantMatch(existing.tenantId, userTenantId);

  const nextTitulo = payload?.titulo !== undefined ? String(payload.titulo || '').trim() : existing.titulo;
  const nextTextoBase =
    payload?.textoBase !== undefined || payload?.texto_base !== undefined
      ? String(payload.textoBase || payload.texto_base || '').trim()
      : existing.textoBase;
  if (!nextTitulo) throw new AppError('Título requerido', 400);
  if (!nextTextoBase) throw new AppError('Texto base requerido', 400);
  if (nextTextoBase.length > 4000) throw new AppError('Texto base demasiado largo', 400);

  const normalizedVars = normalizeVariables(
    payload?.variables !== undefined ? payload.variables : existing.variables,
    nextTextoBase
  );

  const updated = await updateQuickReply({
    id,
    tenantId: existing.tenantId,
    titulo: nextTitulo,
    textoBase: nextTextoBase,
    variables: normalizedVars,
    activo: payload?.activo !== undefined ? Boolean(payload.activo) : existing.activo,
    updatedBy: user?.id || null
  });

  await recordQuickReplyAudit({
    tenantId: updated.tenantId,
    quickReplyId: updated.id,
    userId: user?.id || null,
    action: 'UPDATE',
    variablesUsadas: { variables: normalizedVars, textoBase: nextTextoBase },
    chatId: null,
    ip,
    userAgent
  });
  await recordAuditLog({
    userId: user?.id || null,
    action: 'quick_reply_update',
    resource: 'quick_reply',
    resourceId: updated.id,
    ip,
    userAgent,
    metadata: { titulo: nextTitulo, activo: updated.activo }
  });

  return updated;
};

export const deleteQuickReplyService = async (id, user, { ip = null, userAgent = null } = {}) => {
  const userTenantId = await resolveTenantId(user?.id || null);
  const existing = await getQuickReplyById(id, userTenantId);
  if (!existing) throw new AppError('Respuesta rápida no encontrada', 404);
  assertTenantMatch(existing.tenantId, userTenantId);

  const updated = await setQuickReplyActive({
    id,
    tenantId: existing.tenantId,
    active: false,
    userId: user?.id || null
  });

  await recordQuickReplyAudit({
    tenantId: updated.tenantId,
    quickReplyId: updated.id,
    userId: user?.id || null,
    action: 'DELETE',
    variablesUsadas: { variables: updated.variables },
    chatId: null,
    ip,
    userAgent
  });
  await recordAuditLog({
    userId: user?.id || null,
    action: 'quick_reply_delete',
    resource: 'quick_reply',
    resourceId: updated.id,
    ip,
    userAgent,
    metadata: { titulo: updated.titulo }
  });
  return updated;
};

export const sendQuickReplyService = async (
  { quickReplyId, chatId, variables },
  user,
  { ip = null, userAgent = null } = {}
) => {
  const tenantId = await resolveTenantId(user?.id || null);
  const quickReply = await getQuickReplyById(quickReplyId, tenantId);
  if (!quickReply) throw new AppError('Respuesta rápida no encontrada', 404);
  if (!quickReply.activo) throw new AppError('Respuesta rápida inactiva', 409);

  const chat = await getChatById(chatId);
  if (!chat) throw new AppError('Chat no encontrado', 404);
  if (chat.tenantId && quickReply.tenantId && chat.tenantId !== quickReply.tenantId) {
    throw new AppError('Chat y respuesta rápida pertenecen a tenants distintos', 403);
  }

  const values = normalizeValues(quickReply.variables || [], variables || {});
  const messageText = renderTemplate(quickReply.textoBase, values);

  const message = await sendChatMessage({
    chatId,
    content: { text: messageText },
    user,
    ip,
    messageType: 'text',
    metadata: { quickReply: { id: quickReply.id, titulo: quickReply.titulo, variables: values } }
  });

  await recordQuickReplyAudit({
    tenantId: quickReply.tenantId,
    quickReplyId: quickReply.id,
    userId: user?.id || null,
    action: 'USE',
    variablesUsadas: values,
    chatId,
    ip,
    userAgent
  });
  await recordAuditLog({
    userId: user?.id || null,
    action: 'quick_reply_use',
    resource: 'quick_reply',
    resourceId: quickReply.id,
    ip,
    userAgent,
    metadata: { chatId, variables: values }
  });

  return { message, quickReply };
};
