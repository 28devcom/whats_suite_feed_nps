import logger from '../infra/logging/logger.js';
import { listChatsForAutoClose, closeChatForInactivityDb, getChatById } from '../infra/db/chatRepository.js';
import { emitToUsers, emitToRoles } from '../infra/realtime/socketHub.js';
import { recordChatAssignmentAudit } from '../infra/db/chatAssignmentAuditRepository.js';
import { recordChatAudit } from '../infra/db/chatAuditRepository.js';
import { getSystemSettings } from '../infra/db/systemSettingsRepository.js';
import { emitChatClosedEvent } from '../infra/realtime/chatEvents.js';

const TAG = 'CHAT_INACTIVITY';

const lastActivity = (chat) => chat.lastMessageAt || chat.createdAt;

const closeChats = async (autoCloseMinutes, enabled) => {
  if (!enabled || !autoCloseMinutes || autoCloseMinutes <= 0) return 0;
  const GRACE_MINUTES = 60; // tiempo adicional tras transferencia/reapertura
  const stale = await listChatsForAutoClose(autoCloseMinutes);
  let closed = 0;
  for (const chat of stale) {
    const latest = await getChatById(chat.id);
    if (!latest || latest.status !== 'OPEN') continue;
    // Recalcular última actividad para chats que recibieron mensajes recientes
    const activityAt = lastActivity(latest);
    const nowMs = Date.now();
    const inactivityMs = autoCloseMinutes * 60 * 1000;
    const activityMs = activityAt ? new Date(activityAt).getTime() : 0;
    if (!activityMs) continue;
    if (nowMs - activityMs < inactivityMs) continue;

    // Si se reasignó o reabrió recientemente, aplicar gracia adicional.
    const refTimes = [latest.assignedAt, latest.reassignedAt, latest.updatedAt]
      .filter(Boolean)
      .map((t) => new Date(t).getTime());
    const freshestRef = refTimes.length ? Math.max(...refTimes) : 0;
    if (freshestRef > activityMs) {
      const graceUntil = freshestRef + GRACE_MINUTES * 60 * 1000;
      if (nowMs < graceUntil) continue;
    }
    const updated = await closeChatForInactivityDb(latest.id);
    if (!updated) continue;
    const metadata = { inactivityMinutes: autoCloseMinutes, lastActivityAt: lastActivity(latest) };
    await recordChatAssignmentAudit({
      chatId: updated.id,
      previousAgentId: latest.assignedAgentId || null,
      newAgentId: null,
      action: 'CLOSE',
      executedByUserId: null,
      reason: 'auto_close_inactivity',
      validatedQueue: true,
      fromConnectionId: latest.whatsappSessionName,
      toConnectionId: null
    }).catch(() => {});
    await recordChatAudit({
      actorUserId: null,
      action: 'chat_closed_inactivity',
      chatId: updated.id,
      queueId: updated.queueId || null,
      ip: null,
      metadata
    }).catch(() => {});

    const payload = { chat: updated, reason: 'inactivity', metadata };
    if (latest.assignedAgentId) {
      await emitToUsers([latest.assignedAgentId], 'chat:auto-closed', payload);
    }
    await emitToRoles(['ADMIN', 'SUPERVISOR'], 'chat:auto-closed', payload);
    await emitToUsers([latest.assignedAgentId].filter(Boolean), 'chat:update', updated);
    await emitToRoles(['ADMIN', 'SUPERVISOR'], 'chat:update', updated);
    emitChatClosedEvent(updated);
    closed += 1;
  }
  return closed;
};

export const deliverPendingWarningsForUser = async (userId) => {
  return 0;
};

let monitorTimer = null;
let running = false;

const monitorTick = async () => {
  if (running) return;
  running = true;
  try {
    const settings = await getSystemSettings();
    const hours = Number.isFinite(settings.inactivityAutoCloseHours)
      ? Number(settings.inactivityAutoCloseHours)
      : Number(settings.inactivityAutoCloseMinutes || 0) / 60;
    const autoCloseAfter = Math.max(0, Number(hours || 0) * 60); // minutos
    const autoCloseEnabled = Boolean(settings.inactivityAutoCloseEnabled);
    if (!autoCloseEnabled || autoCloseAfter <= 0) {
      running = false;
      return;
    }
    const closedCount = await closeChats(autoCloseAfter, autoCloseEnabled);
    if (closedCount) {
      logger.info({ closedCount, tag: TAG }, 'Monitor de inactividad ejecutado');
    }
  } catch (err) {
    logger.error({ err, tag: TAG }, 'Error en monitor de inactividad');
  } finally {
    running = false;
  }
};

export const startChatInactivityMonitor = () => {
  if (monitorTimer) return;
  logger.info({ tag: TAG }, 'Iniciando monitor de inactividad de chats');
  monitorTimer = setInterval(monitorTick, 60_000);
  monitorTick().catch(() => {});
};

export const stopChatInactivityMonitor = () => {
  if (monitorTimer) clearInterval(monitorTimer);
  monitorTimer = null;
};
