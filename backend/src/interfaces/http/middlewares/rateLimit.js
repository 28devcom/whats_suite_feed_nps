import crypto from 'node:crypto';
import env from '../../../config/env.js';
import redisClient, { ensureRedisConnection } from '../../../infra/cache/redisClient.js';
import { AppError } from '../../../shared/errors.js';

const windowSeconds = env.rateLimit.windowSeconds;
const maxRequests = env.rateLimit.maxRequests;
const userWindowSeconds = env.rateLimit.userWindowSeconds || windowSeconds;
const userMaxRequests = env.rateLimit.userMaxRequests || maxRequests;
const apiWindowSeconds = env.rateLimit.apiWindowSeconds || windowSeconds;
const apiMaxRequests = env.rateLimit.apiMaxRequests || maxRequests;

const clientIp = (req) => (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
const pathKey = (req) => {
  const raw = `${req.method}:${req.baseUrl || ''}${req.path || ''}`;
  const hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
  return `rl:api:${hash}`;
};

const rateLimit = async (req, _res, next) => {
  try {
    await ensureRedisConnection();
    const ipKey = `rl:ip:${clientIp(req)}`;
    const userId = req.user?.id || req.auth?.sub || null;
    const userKey = userId ? `rl:user:${userId}` : null;
    const apiKey = pathKey(req);

    const tx = redisClient.multi();
    let idx = 0;
    const ipIncrIdx = idx;
    tx.incr(ipKey);
    idx += 1;
    tx.expire(ipKey, windowSeconds, 'NX');
    idx += 1;
    const apiIncrIdx = idx;
    tx.incr(apiKey);
    idx += 1;
    tx.expire(apiKey, apiWindowSeconds, 'NX');
    idx += 1;
    let userIncrIdx = null;
    if (userKey) {
      userIncrIdx = idx;
      tx.incr(userKey);
      idx += 1;
      tx.expire(userKey, userWindowSeconds, 'NX');
      idx += 1;
    }

    const results = await tx.exec();
    const ipCount = results?.[ipIncrIdx]?.[1] || 0;
    const apiCount = results?.[apiIncrIdx]?.[1] || 0;
    const userCount = userKey && userIncrIdx !== null ? results?.[userIncrIdx]?.[1] : null;

    if (ipCount > maxRequests) {
      return next(new AppError('Too Many Requests (IP)', 429));
    }
    if (apiCount > apiMaxRequests) {
      return next(new AppError('Too Many Requests (API)', 429));
    }
    if (userKey && userCount > userMaxRequests) {
      return next(new AppError('Too Many Requests (User)', 429));
    }
  } catch (err) {
    req.log?.warn({ err }, 'Rate limit check failed');
  }
  return next();
};

export default rateLimit;
