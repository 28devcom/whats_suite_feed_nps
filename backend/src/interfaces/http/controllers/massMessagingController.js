import {
  createTemplateService,
  listTemplatesService,
  createCampaignService,
  listCampaignsService,
  getCampaignService,
  getTargetsService,
  getEventsService,
  scheduleCampaignService,
  runCampaignService
} from '../../../services/massMessagingService.js';
import { auditAction } from '../../../services/auditService.js';

export const createTemplateController = async (req, res, next) => {
  try {
    const template = await createTemplateService(req.body, req.user?.id);
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
};

export const listTemplatesController = async (_req, res, next) => {
  try {
    const templates = await listTemplatesService();
    res.json(templates);
  } catch (err) {
    next(err);
  }
};

export const createCampaignController = async (req, res, next) => {
  try {
    const campaign = await createCampaignService({ ...req.body, createdBy: req.user?.id });
    await auditAction({ userId: req.user?.id, action: 'create_campaign', resource: 'campaign', resourceId: campaign.id });
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
};

export const listCampaignsController = async (_req, res, next) => {
  try {
    const campaigns = await listCampaignsService();
    res.json(campaigns);
  } catch (err) {
    next(err);
  }
};

export const getCampaignController = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const campaign = await getCampaignService(campaignId);
    res.json(campaign);
  } catch (err) {
    next(err);
  }
};

export const getTargetsController = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const targets = await getTargetsService(campaignId, req.query.status);
    res.json(targets);
  } catch (err) {
    next(err);
  }
};

export const getEventsController = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const events = await getEventsService(campaignId);
    res.json(events);
  } catch (err) {
    next(err);
  }
};

export const scheduleCampaignController = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const campaign = await scheduleCampaignService(campaignId);
    await auditAction({ userId: req.user?.id, action: 'schedule_campaign', resource: 'campaign', resourceId: campaignId });
    res.status(202).json(campaign);
  } catch (err) {
    next(err);
  }
};

export const runCampaignController = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    await runCampaignService(campaignId, {});
    await auditAction({ userId: req.user?.id, action: 'run_campaign', resource: 'campaign', resourceId: campaignId });
    res.status(202).json({ message: 'Campaña procesada (simulada)' });
  } catch (err) {
    next(err);
  }
};
