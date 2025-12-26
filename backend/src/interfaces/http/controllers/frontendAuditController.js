import { auditAction } from '../../../services/auditService.js';
import { AppError } from '../../../shared/errors.js';

export const recordFrontendAuditController = async (req, res, next) => {
  try {
    const { event, metadata } = req.body || {};
    if (!event || typeof event !== 'string') {
      throw new AppError('event es requerido', 400);
    }
    // Sanitiza metadata para evitar filtraciones sensibles.
    const { token, qr, qrBase64, pairingCode, ...safeMetadata } = metadata || {};
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || 'unknown';
    await auditAction({
      userId: req.user?.id,
      action: `frontend_${event}`,
      resource: 'frontend',
      resourceId: null,
      ip,
      userAgent,
      metadata: safeMetadata
    });
    res.json({ success: true, data: { recorded: true }, message: 'OK', code: 'OK' });
  } catch (err) {
    next(err);
  }
};
