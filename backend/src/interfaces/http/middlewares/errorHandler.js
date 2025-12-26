import logger from '../../../infra/logging/logger.js';

// Centralized error funnel keeps payloads predictable for clients and auditors.
const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  logger.error({ err, requestId: res.locals.requestId }, 'Unhandled application error');
  res.setHeader('X-API-Version', 'v1');
  const payload = {
    success: false,
    data: null,
    message: status === 500 ? 'Internal server error' : err.message,
    code: err.code || (status === 500 ? 'ERROR' : 'FAIL'),
    requestId: res.locals.requestId,
    version: 'v1'
  };
  if (err.details) {
    payload.details = err.details;
  }
  res.status(status).json(payload);
};

export default errorHandler;
