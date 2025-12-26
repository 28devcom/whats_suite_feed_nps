import { auditAction } from '../../../services/auditService.js';

export const audit = (action, resourceResolver = () => ({})) => async (req, _res, next) => {
  try {
    const { resource, resourceId, metadata } = resourceResolver(req) || {};
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || 'unknown';
    await auditAction({
      userId: req.user?.id,
      action,
      resource,
      resourceId,
      ip,
      userAgent,
      metadata
    });
  } catch (err) {
    // No bloquear flujo por falla de auditoría
    req.log?.warn({ err }, 'Audit log failed');
  }
  next();
};
