import pino from 'pino';
import env from '../../config/env.js';

// Structured logger keeps audit-friendly metadata consistent across services.
const logger = pino({
  name: env.serviceName,
  level: env.logLevel,
  base: { service: env.serviceName, instance: env.instanceId },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ['req.headers.authorization', 'req.headers.cookie']
});

export default logger;
