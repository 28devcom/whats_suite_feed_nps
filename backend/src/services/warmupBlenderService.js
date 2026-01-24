import crypto from 'node:crypto';
import env from '../config/env.js';
import redisClient, { ensureRedisConnection } from '../infra/cache/redisClient.js';
import logger from '../infra/logging/logger.js';

const ROTATION_ZSET_KEY = 'warmup:line:last-used';
const RECENT_PAIR_PREFIX = 'warmup:recent-pair:';
const RECENT_GROUP_PREFIX = 'warmup:recent-group:';
const GROUP_LOCK_KEY = 'warmup:grouping:lock';

const defaults = {
  minGroupSize: 3,
  maxGroupSize: 8,
  recentPairTtlSeconds: 6 * 3600, // evita reusar el mismo par durante 6h
  recentGroupTtlSeconds: 12 * 3600, // evita repetir el mismo grupo durante 12h
  lockTtlMs: 15_000,
  maxGroupAttempts: 4
};

const randomInt = (min, max) => crypto.randomInt(min, max + 1);

const pairKey = (idA, idB) => {
  const [a, b] = [idA, idB].map((v) => v.toString()).sort();
  return `${RECENT_PAIR_PREFIX}${a}:${b}`;
};

const groupKey = (ids) => {
  const normalized = [...new Set(ids.map((v) => v.toString()))].sort();
  const hash = crypto.createHash('sha1').update(normalized.join('|')).digest('hex');
  return `${RECENT_GROUP_PREFIX}${hash}`;
};

const normalizeLines = (lines = []) => {
  const seen = new Set();
  const normalized = [];
  for (const line of lines) {
    const id = line?.id || line?.sessionName || line?.phone || line;
    if (!id) continue;
    const key = id.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ ...(typeof line === 'object' ? line : { id: key }), id: key });
  }
  return normalized;
};

const buildGroupSizes = (total, minSize, maxSize) => {
  if (total < minSize) return [];
  const sizes = [];
  let remaining = total;
  while (remaining > 0) {
    if (remaining <= maxSize && remaining >= minSize) {
      sizes.push(remaining);
      break;
    }
    const maxAllowed = Math.min(maxSize, remaining - minSize);
    const size = randomInt(minSize, maxAllowed);
    sizes.push(size);
    remaining -= size;
    if (remaining > 0 && remaining < minSize) {
      let idx = 0;
      while (remaining > 0 && idx < sizes.length) {
        if (sizes[idx] < maxSize) {
          sizes[idx] += 1;
          remaining -= 1;
        } else {
          idx += 1;
        }
      }
      break;
    }
  }
  return sizes;
};

const loadRecency = async (lineIds) => {
  const tx = redisClient.multi();
  lineIds.forEach((id) => tx.zScore(ROTATION_ZSET_KEY, id));
  const results = await tx.exec();
  const recency = new Map();
  lineIds.forEach((id, idx) => {
    const score = results?.[idx]?.[1];
    recency.set(id, score === null || score === undefined ? 0 : Number(score));
  });
  return recency;
};

const orderLinesForRotation = (lines, recency) =>
  [...lines]
    .map((line) => ({
      line,
      recency: recency.get(line.id) ?? 0,
      jitter: randomInt(0, 10_000)
    }))
    .sort((a, b) => {
      if (a.recency !== b.recency) return a.recency - b.recency;
      return a.jitter - b.jitter;
    })
    .map((item) => item.line);

const countPairConflicts = async (candidateId, currentGroup, pairCache) => {
  if (!currentGroup.length) return 0;
  const pendingKeys = [];
  let conflicts = 0;

  for (const member of currentGroup) {
    const cacheKey = pairKey(candidateId, member.id);
    if (pairCache.has(cacheKey)) {
      if (pairCache.get(cacheKey)) conflicts += 1;
      continue;
    }
    pendingKeys.push({ cacheKey, redisKey: cacheKey });
  }

  if (pendingKeys.length) {
    const tx = redisClient.multi();
    pendingKeys.forEach((item) => tx.exists(item.redisKey));
    const results = await tx.exec();
    pendingKeys.forEach((item, idx) => {
      const exists = Boolean(results?.[idx]?.[1]);
      pairCache.set(item.cacheKey, exists);
      if (exists) conflicts += 1;
    });
  }
  return conflicts;
};

const pickBestCandidate = async (pool, currentGroup, recency, pairCache) => {
  let best = null;
  for (const candidate of pool) {
    const collisions = await countPairConflicts(candidate.id, currentGroup, pairCache);
    const lastUsed = recency.get(candidate.id) ?? 0;
    const jitter = randomInt(0, 1000);

    if (!best) {
      best = { candidate, collisions, lastUsed, jitter };
      continue;
    }
    const betterCollision = collisions < best.collisions;
    const sameCollisionOlder = collisions === best.collisions && lastUsed < best.lastUsed;
    const sameAndJitter = collisions === best.collisions && lastUsed === best.lastUsed && jitter < best.jitter;
    if (betterCollision || sameCollisionOlder || sameAndJitter) {
      best = { candidate, collisions, lastUsed, jitter };
    }
  }
  return best?.candidate || null;
};

const buildGroupCandidate = async (availableLines, targetSize, recency, pairCache, config) => {
  for (let attempt = 0; attempt < config.maxGroupAttempts; attempt += 1) {
    const pool = [...availableLines];
    const group = [];

    while (group.length < targetSize && pool.length) {
      const candidate = await pickBestCandidate(pool, group, recency, pairCache);
      if (!candidate) break;
      group.push(candidate);
      const idx = pool.findIndex((item) => item.id === candidate.id);
      if (idx >= 0) pool.splice(idx, 1);
    }

    if (group.length < config.minGroupSize) continue;
    const gKey = groupKey(group.map((l) => l.id));
    const exists = await redisClient.exists(gKey);
    if (!exists) return group;
  }
  return null;
};

const persistGroups = async (groups, config) => {
  if (!groups.length) return;
  const tx = redisClient.multi();
  const now = Date.now();

  groups.forEach((group) => {
    const ids = group.map((l) => l.id);
    tx.set(groupKey(ids), '1', { EX: config.recentGroupTtlSeconds });
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        tx.set(pairKey(ids[i], ids[j]), '1', { EX: config.recentPairTtlSeconds });
      }
    }
    ids.forEach((id) => tx.zAdd(ROTATION_ZSET_KEY, { score: now, value: id }));
  });

  await tx.exec();
};

const acquireLock = async (token, ttlMs) => {
  const res = await redisClient.set(GROUP_LOCK_KEY, token, { NX: true, PX: ttlMs });
  return res === 'OK';
};

const releaseLock = async (token) => {
  const current = await redisClient.get(GROUP_LOCK_KEY);
  if (current && current === token) {
    await redisClient.del(GROUP_LOCK_KEY);
  }
};

/**
 * Construye grupos de calentamiento ("licuadoras") cumpliendo:
 * - Tamaño variable entre minGroupSize y maxGroupSize.
 * - Rotación: prioriza líneas menos recientes vía ZSET.
 * - Evita repeticiones: bloquea pares y combinaciones recientes con TTL.
 */
export const planWarmupGroups = async (lines, options = {}) => {
  const config = { ...defaults, ...options };
  const normalizedLines = normalizeLines(lines);
  if (!normalizedLines.length || normalizedLines.length < config.minGroupSize) {
    return [];
  }

  await ensureRedisConnection();
  const lockToken = `${env.instanceId || 'warmup'}:${Date.now()}`;
  const locked = await acquireLock(lockToken, config.lockTtlMs);
  if (!locked) {
    throw new Error('Warmup grouping is already running');
  }

  try {
    const recency = await loadRecency(normalizedLines.map((l) => l.id));
    const ordered = orderLinesForRotation(normalizedLines, recency);
    const sizes = buildGroupSizes(ordered.length, config.minGroupSize, config.maxGroupSize);
    const pairCache = new Map();
    const groups = [];
    let remaining = [...ordered];

    for (const size of sizes) {
      if (remaining.length < config.minGroupSize) break;
      const group = await buildGroupCandidate(remaining, size, recency, pairCache, config);
      if (!group || group.length < config.minGroupSize) {
        logger.warn({ size, available: remaining.length }, 'No se pudo armar grupo sin repetir combinaciones recientes');
        break;
      }
      groups.push(group);
      const used = new Set(group.map((l) => l.id));
      remaining = remaining.filter((line) => !used.has(line.id));
    }

    await persistGroups(groups, config);
    return groups;
  } finally {
    await releaseLock(lockToken);
  }
};

export default planWarmupGroups;
