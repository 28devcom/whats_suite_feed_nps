import { getSystemSettings, upsertSystemSettings } from '../infra/db/systemSettingsRepository.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';
import { AppError } from '../shared/errors.js';
import { ROLES } from '../domain/user/user.js';
import env from '../config/env.js';

const ensureAdmin = (user) => {
  if (!user || user.role !== ROLES.ADMIN) {
    throw new AppError('No autorizado', 403);
  }
};

const sanitizeNumber = (value, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
};

export const getChatSettings = async (user) => {
  ensureAdmin(user);
  return getSystemSettings();
};

export const updateChatSettings = async (user, payload = {}, { ip = null, userAgent = null } = {}) => {
  ensureAdmin(user);
  const previous = await getSystemSettings();

  const sanitized = {
    autoAssignEnabled:
      typeof payload.autoAssignEnabled === 'boolean' ? payload.autoAssignEnabled : Boolean(previous.autoAssignEnabled),
    autoAssignIntervalSeconds: sanitizeNumber(
      payload.autoAssignIntervalSeconds,
      previous.autoAssignIntervalSeconds || 30
    ),
    maxChatsPerAgent: sanitizeNumber(payload.maxChatsPerAgent, previous.maxChatsPerAgent || 10),
    gradualAssignmentEnabled:
      typeof payload.gradualAssignmentEnabled === 'boolean'
        ? payload.gradualAssignmentEnabled
        : Boolean(previous.gradualAssignmentEnabled),
    whatsappHistoryDays: sanitizeNumber(
      payload.whatsappHistoryDays,
      previous.whatsappHistoryDays || env.whatsapp?.historySyncDays || 30
    ),
    inactivityAutoCloseEnabled:
      typeof payload.inactivityAutoCloseEnabled === 'boolean'
        ? payload.inactivityAutoCloseEnabled
        : Boolean(previous.inactivityAutoCloseEnabled),
    inactivityAutoCloseHours: (() => {
      const maxHours = 90 * 24; // 90 días
      const defaultHours = 72;
      const prevHours =
        Number.isFinite(previous.inactivityAutoCloseHours) && previous.inactivityAutoCloseHours >= 0
          ? previous.inactivityAutoCloseHours
          : Number(previous.inactivityAutoCloseMinutes || 0) / 60 || defaultHours;
      const rawHours = Number(payload.inactivityAutoCloseHours);
      const baseHours = Number.isFinite(rawHours) && rawHours >= 0 ? rawHours : prevHours;
      const clamped = Math.min(Math.max(baseHours, 0), maxHours);
      return clamped;
    })()
  };

  const updated = await upsertSystemSettings(sanitized);

  await recordAuditLog({
    userId: user.id,
    action: 'system_settings_updated',
    resource: 'system_settings',
    resourceId: 'chat_auto_assign',
    ip,
    userAgent,
    metadata: { previous, updated }
  });

  return updated;
};
