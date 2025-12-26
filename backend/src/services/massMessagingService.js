import { AppError } from '../shared/errors.js';
import logger from '../infra/logging/logger.js';
import {
  createTemplate,
  listTemplates,
  createCampaign,
  addTargets,
  listCampaigns,
  getCampaign,
  updateCampaignStatus,
  listTargets,
  updateTargetStatus,
  recordCampaignEvent,
  listCampaignEvents
} from '../infra/db/massMessagingRepository.js';

const renderTemplate = (body, variables = {}) => {
  return body.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (variables[key] !== undefined ? variables[key] : ''));
};

export const createTemplateService = async (payload, userId) => {
  const variables = Array.from(new Set((payload.variables || []).map((v) => v.trim()).filter(Boolean)));
  return createTemplate({ name: payload.name, body: payload.body, variables, createdBy: userId });
};

export const listTemplatesService = async () => listTemplates();

export const createCampaignService = async ({ name, templateId, whatsappSessionId, scheduledAt, targets, createdBy }) => {
  const campaign = await createCampaign({ name, templateId, whatsappSessionId, scheduledAt, createdBy });
  if (Array.isArray(targets) && targets.length) {
    await addTargets(campaign.id, targets);
  }
  return campaign;
};

export const listCampaignsService = async () => listCampaigns();

export const getCampaignService = async (id) => {
  const c = await getCampaign(id);
  if (!c) throw new AppError('Campaña no encontrada', 404);
  return c;
};

export const getTargetsService = async (campaignId, status) => {
  return listTargets(campaignId, status);
};

export const getEventsService = async (campaignId) => listCampaignEvents(campaignId);

export const scheduleCampaignService = async (campaignId) => {
  const campaign = await getCampaignService(campaignId);
  await updateCampaignStatus(campaignId, 'scheduled');
  await recordCampaignEvent({ campaignId, eventType: 'scheduled' });
  return campaign;
};

export const runCampaignService = async (campaignId, templateCache = {}) => {
  const campaign = await getCampaignService(campaignId);
  await updateCampaignStatus(campaignId, 'running');
  await recordCampaignEvent({ campaignId, eventType: 'started' });
  const targets = await listTargets(campaignId, 'pending');
  // Simulación de envío: solo renderiza y marca enviado
  for (const target of targets) {
    try {
      const tpl = templateCache[campaign.template_id] || templateCache.default;
      const rendered = tpl ? renderTemplate(tpl.body, target.variables) : null;
      logger.info({ campaignId, target: target.contact, preview: rendered?.slice(0, 50) }, 'Sending simulated message');
      await updateTargetStatus(target.id, 'sent');
      await recordCampaignEvent({ campaignId, targetId: target.id, eventType: 'sent', details: { contact: target.contact } });
    } catch (err) {
      await updateTargetStatus(target.id, 'failed', err.message);
      await recordCampaignEvent({ campaignId, targetId: target.id, eventType: 'failed', details: { error: err.message } });
    }
  }
  await updateCampaignStatus(campaignId, 'completed');
  await recordCampaignEvent({ campaignId, eventType: 'completed' });
};
