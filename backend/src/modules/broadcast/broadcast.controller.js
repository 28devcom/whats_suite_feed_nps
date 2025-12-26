import httpStatus from 'http-status';
import {
  createBroadcastCampaignService,
  createTemplateService,
  deleteTemplateService,
  listBroadcastHistoryService,
  listTemplatesService,
  getBroadcastDetailService
} from './broadcast.service.js';
import { auditAction } from '../../services/auditService.js';

const ok = (data, code = 'OK') => ({ success: true, data, code });
const requesterIp = (req) => (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();

export const sendBroadcastController = async (req, res, next) => {
  try {
    const campaign = await createBroadcastCampaignService({ ...req.body }, req.user);
    await auditAction({
      userId: req.user?.id,
      action: 'broadcast_send',
      resource: 'broadcast_campaign',
      resourceId: campaign.id,
      ip: requesterIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      metadata: { name: req.body?.name, total: req.body?.recipients?.length || 0 }
    }).catch(() => {});
    res.status(httpStatus.ACCEPTED).json(ok(campaign, 'QUEUED'));
  } catch (err) {
    next(err);
  }
};

export const broadcastHistoryController = async (req, res, next) => {
  try {
    const data = await listBroadcastHistoryService(req.user?.id);
    res.status(httpStatus.OK).json(ok(data));
  } catch (err) {
    next(err);
  }
};

export const listBroadcastTemplatesController = async (req, res, next) => {
  try {
    const data = await listTemplatesService(req.user?.id);
    res.status(httpStatus.OK).json(ok(data));
  } catch (err) {
    next(err);
  }
};

export const broadcastDetailController = async (req, res, next) => {
  try {
    const data = await getBroadcastDetailService(req.params.id, req.user?.id);
    res.status(httpStatus.OK).json(ok(data));
  } catch (err) {
    next(err);
  }
};

export const createBroadcastTemplateController = async (req, res, next) => {
  try {
    const tpl = await createTemplateService(req.body, req.user?.id);
    await auditAction({
      userId: req.user?.id,
      action: 'broadcast_template_create',
      resource: 'broadcast_template',
      resourceId: tpl.id,
      ip: requesterIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      metadata: { name: tpl.name, type: tpl.type }
    }).catch(() => {});
    res.status(httpStatus.CREATED).json(ok(tpl, 'CREATED'));
  } catch (err) {
    next(err);
  }
};

export const deleteBroadcastTemplateController = async (req, res, next) => {
  try {
    await deleteTemplateService(req.params.id, req.user?.id);
    await auditAction({
      userId: req.user?.id,
      action: 'broadcast_template_delete',
      resource: 'broadcast_template',
      resourceId: req.params.id,
      ip: requesterIp(req),
      userAgent: req.headers['user-agent'] || 'unknown'
    }).catch(() => {});
    res.status(httpStatus.OK).json(ok({ id: req.params.id }, 'DELETED'));
  } catch (err) {
    next(err);
  }
};
