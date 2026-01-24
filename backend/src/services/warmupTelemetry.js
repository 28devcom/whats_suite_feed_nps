import crypto from 'node:crypto';
import { ensureRedisConnection } from '../infra/cache/redisClient.js';
import redisClient from '../infra/cache/redisClient.js';
import logger from '../infra/logging/logger.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';

const metricKey = (lineId) => `warmup:metrics:${lineId}`;
const historyKey = (lineId) => `warmup:history:${lineId}`;
const MAX_HISTORY = 50;

const safeText = (text) => {
  if (!text) return '';
  const str = text.toString();
  return str.length > 280 ? `${str.slice(0, 277)}...` : str;
};

const nowIso = () => new Date().toISOString();

const updateHistory = async (lineId, entry) => {
  await ensureRedisConnection();
  const key = historyKey(lineId);
  await redisClient.lPush(key, JSON.stringify(entry));
  await redisClient.lTrim(key, 0, MAX_HISTORY - 1);
  await redisClient.expire(key, 7 * 24 * 3600);
};

export const recordWarmupSent = async ({ lineId, sessionName, to, delayMs, topic, profile, dryRun = false, messageId = null, text = '' }) => {
  if (!lineId) return;
  const meta = {
    at: nowIso(),
    sessionName,
    to,
    delayMs,
    topic: topic || null,
    profile: profile || null,
    dryRun,
    messageId: messageId || null,
    text: safeText(text)
  };
  try {
    await ensureRedisConnection();
    const key = metricKey(lineId);
    const tx = redisClient.multi();
    tx.hIncrBy(key, dryRun ? 'dry_sent' : 'sent', 1);
    tx.hSet(key, {
      last_sent_at: meta.at,
      last_delay_ms: delayMs || 0,
      profile: profile || '',
      last_to: to || ''
    });
    tx.expire(key, 14 * 24 * 3600);
    await tx.exec();
    await updateHistory(lineId, { kind: 'sent', ...meta });
  } catch (err) {
    logger.warn({ err, lineId, tag: 'WARMUP_TELEMETRY_SENT' }, 'Failed to record warmup sent');
  }
};

export const recordWarmupFailed = async ({ lineId, sessionName, to, error, profile, text = '' }) => {
  if (!lineId) return;
  const meta = {
    at: nowIso(),
    sessionName,
    to,
    profile: profile || null,
    error: error?.message || String(error),
    text: safeText(text)
  };
  try {
    await ensureRedisConnection();
    const key = metricKey(lineId);
    const tx = redisClient.multi();
    tx.hIncrBy(key, 'failed', 1);
    tx.hSet(key, { last_error: meta.error, last_error_at: meta.at, profile: profile || '' });
    tx.expire(key, 14 * 24 * 3600);
    await tx.exec();
    await updateHistory(lineId, { kind: 'failed', ...meta });
  } catch (err) {
    logger.warn({ err, lineId, tag: 'WARMUP_TELEMETRY_FAIL' }, 'Failed to record warmup failure');
  }
};

export const recordWarmupSkip = async ({ lineId, sessionName, reason, profile }) => {
  if (!lineId) return;
  try {
    await ensureRedisConnection();
    const key = metricKey(lineId);
    const tx = redisClient.multi();
    tx.hIncrBy(key, 'skipped', 1);
    tx.hSet(key, { last_skip_reason: reason || 'unknown', profile: profile || '' });
    tx.expire(key, 14 * 24 * 3600);
    await tx.exec();
    await updateHistory(lineId, {
      kind: 'skipped',
      at: nowIso(),
      sessionName,
      reason,
      profile: profile || null
    });
  } catch (err) {
    logger.warn({ err, lineId, tag: 'WARMUP_TELEMETRY_SKIP' }, 'Failed to record warmup skip');
  }
};

export const auditWarmup = async ({ action, resourceId, metadata = {}, userId = null, tenantId = null }) => {
  try {
    await recordAuditLog({
      userId,
      action,
      resource: 'warmup',
      resourceId,
      tenantId,
      metadata
    });
  } catch (err) {
    logger.warn({ err, action, resourceId, tag: 'WARMUP_AUDIT' }, 'Failed to record warmup audit');
  }
};

export const snapshotWarmupMetrics = async (lineId) => {
  await ensureRedisConnection();
  const key = metricKey(lineId);
  const hash = await redisClient.hGetAll(key);
  return {
    lineId,
    sent: Number.parseInt(hash.sent || '0', 10),
    drySent: Number.parseInt(hash.dry_sent || '0', 10),
    failed: Number.parseInt(hash.failed || '0', 10),
    skipped: Number.parseInt(hash.skipped || '0', 10),
    lastSentAt: hash.last_sent_at || null,
    lastDelayMs: hash.last_delay_ms ? Number.parseInt(hash.last_delay_ms, 10) : null,
    lastTo: hash.last_to || null,
    lastError: hash.last_error || null,
    lastErrorAt: hash.last_error_at || null,
    lastSkipReason: hash.last_skip_reason || null,
    profile: hash.profile || null
  };
};

export const listWarmupHistory = async (lineId, limit = 20) => {
  await ensureRedisConnection();
  const key = historyKey(lineId);
  const items = await redisClient.lRange(key, 0, Math.max(limit - 1, 0));
  return items.map((raw) => {
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }).filter(Boolean);
};

export const buildAlertPayload = ({ lineId, sessionName, reason, context = {} }) => ({
  id: crypto.randomUUID(),
  at: nowIso(),
  lineId,
  sessionName,
  reason,
  context
});
