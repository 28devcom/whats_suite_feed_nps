import httpStatus from 'http-status';
import {
  createSession,
  getQrForSession,
  requestPairingCode,
  getStatusForSession,
  reconnectSession,
  renewQrSession,
  resetSessionAuth,
  disconnectSession,
  listSessions,
  deleteSession,
  updateSessionSettings
} from '../../../services/whatsappService.js';
import { AppError } from '../../../shared/errors.js';

const parseSessionName = (req) => (req.params.id || req.body?.sessionName || 'default').trim();
const clientIp = (req) => (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
const ok = (data, message = 'OK', code = 'OK') => ({ success: true, data, message, code });

export const listSessionsController = async (req, res, next) => {
  try {
    const result = await listSessions(req.user?.tenantId || null);
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const createSessionController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const result = await createSession(sessionName, {
      userId: req.user?.id || null,
      ip: clientIp(req),
      tenantId: req.user?.tenantId || null,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.ACCEPTED).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const getQrController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const result = await getQrForSession(sessionName, { tenantId: req.user?.tenantId || null });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const requestPairingCodeController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const { phoneNumber } = req.body || {};
    const normalizedPhone = typeof phoneNumber === 'string' ? phoneNumber.trim() : phoneNumber;
    if (!normalizedPhone) {
      throw new AppError('phoneNumber requerido en formato E.164 sin "+"', 400);
    }
    const result = await requestPairingCode(sessionName, normalizedPhone, {
      userId: req.user?.id || null,
      ip: clientIp(req),
      tenantId: req.user?.tenantId || null,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const getStatusController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const result = await getStatusForSession(sessionName, { tenantId: req.user?.tenantId || null });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const reconnectController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const result = await reconnectSession(sessionName, {
      userId: req.user?.id || null,
      ip: clientIp(req),
      tenantId: req.user?.tenantId || null,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const renewQrController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const result = await renewQrSession(sessionName, {
      userId: req.user?.id || null,
      ip: clientIp(req),
      tenantId: req.user?.tenantId || null,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const resetAuthController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const result = await resetSessionAuth(sessionName, {
      userId: req.user?.id || null,
      ip: clientIp(req),
      tenantId: req.user?.tenantId || null,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const disconnectController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const result = await disconnectSession(sessionName, {
      userId: req.user?.id || null,
      ip: clientIp(req),
      tenantId: req.user?.tenantId || null,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};

export const deleteSessionController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const result = await deleteSession(sessionName, {
      userId: req.user?.id || null,
      ip: clientIp(req),
      tenantId: req.user?.tenantId || null,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.OK).json(ok(result, 'DELETED', 'DELETED'));
  } catch (err) {
    next(err);
  }
};

export const updateSessionSettingsController = async (req, res, next) => {
  try {
    const sessionName = parseSessionName(req);
    const { syncHistory } = req.body || {};
    if (syncHistory === undefined || syncHistory === null) {
      throw new AppError('syncHistory requerido', 400);
    }
    const normalizedSync = typeof syncHistory === 'string' ? ['true', '1', 'on'].includes(syncHistory.toLowerCase()) : Boolean(syncHistory);
    const result = await updateSessionSettings(sessionName, {
      tenantId: req.user?.tenantId || null,
      syncHistory: normalizedSync,
      userId: req.user?.id || null,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || null
    });
    res.status(httpStatus.OK).json(ok(result));
  } catch (err) {
    next(err);
  }
};
