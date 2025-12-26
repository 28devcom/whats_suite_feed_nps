import { verifyAndGetUser } from '../../../services/authService.js';
import { AppError } from '../../../shared/errors.js';
import logger from '../../../infra/logging/logger.js';

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer') return null;
  return token;
};

export const authenticate = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw new AppError('No autorizado', 401);
    const { user, payload } = await verifyAndGetUser(token);
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      tenantId: user.tenantId || null,
      jti: payload.jti
    };
    next();
  } catch (err) {
    next(err);
  }
};

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new AppError('No autorizado', 401));
  if (roles.length && !roles.includes(req.user.role)) {
    return next(new AppError('Acceso denegado', 403));
  }
  logger.info({ userId: req.user.id, role: req.user.role, path: req.path, tag: 'AUTHZ' }, 'authorized request');
  return next();
};

export const authorizeDashboard = (req, _res, next) => {
  if (!req.user) return next(new AppError('No autorizado', 401));
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERVISOR') {
    return next(new AppError('Acceso denegado', 403));
  }
  logger.info({ userId: req.user.id, role: req.user.role, path: req.path, resource: 'dashboard', tag: 'AUTHZ_DASHBOARD' }, 'dashboard access');
  return next();
};
