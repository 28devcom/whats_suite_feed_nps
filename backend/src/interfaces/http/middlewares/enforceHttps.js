import { AppError } from '../../../shared/errors.js';
import logger from '../../../infra/logging/logger.js';

const enforceHttps = (req, res, next) => {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || '').toString().toLowerCase();
  if (proto === 'https') return next();

  logger.warn(
    {
      requestId: res.locals?.requestId,
      proto,
      host: req.headers.host,
      path: req.originalUrl,
      ip: req.ip,
      forwardedFor: req.headers['x-forwarded-for'],
      tag: 'HTTP_ENFORCE_HTTPS'
    },
    'Rejected non-HTTPS request'
  );
  return next(new AppError('HTTPS required', 426));
};

export default enforceHttps;
