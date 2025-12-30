import { AppError } from '../../../shared/errors.js';

const enforceHttps = (req, res, next) => {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || '').toString().toLowerCase();
  if (proto === 'https') return next();

  return next(new AppError('HTTPS required', 426));
};

export default enforceHttps;
