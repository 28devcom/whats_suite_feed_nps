import { ensureRedisConnection } from '../infra/cache/redisClient.js';
import redisClient from '../infra/cache/redisClient.js';

const ALLOW_KEY = 'warmup:allow';
const DENY_KEY = 'warmup:deny';

export const getSelection = async () => {
  await ensureRedisConnection();
  const [allow, deny] = await Promise.all([redisClient.sMembers(ALLOW_KEY), redisClient.sMembers(DENY_KEY)]);
  return { allow, deny };
};

export const setSelection = async ({ allow = [], deny = [] }) => {
  await ensureRedisConnection();
  await redisClient.multi().del(ALLOW_KEY).sAdd(ALLOW_KEY, allow).del(DENY_KEY).sAdd(DENY_KEY, deny).exec();
  return getSelection();
};

export const isAllowed = async (sessionName) => {
  if (!sessionName) return false;
  await ensureRedisConnection();
  const [allowCount, denyHit] = await Promise.all([
    redisClient.sCard(ALLOW_KEY),
    redisClient.sIsMember(DENY_KEY, sessionName)
  ]);
  if (denyHit) return false;
  if (allowCount === 0) return true; // no allow-list -> all allowed
  const isInAllow = await redisClient.sIsMember(ALLOW_KEY, sessionName);
  return Boolean(isInAllow);
};

export default { getSelection, setSelection, isAllowed };
