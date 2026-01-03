import logger from '../infra/logging/logger.js';
import { listUnassignedChats, assignChatDb, getOpenChatCountsByAgent, isUserInQueue } from '../infra/db/chatRepository.js';
import { listConnectedAgents } from './userConnectionService.js';
import { getSystemSettings } from '../infra/db/systemSettingsRepository.js';
import { recordChatAssignmentAudit } from '../infra/db/chatAssignmentAuditRepository.js';
import pool from '../infra/db/postgres.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';
import { emitChatAssignedEvent } from '../infra/realtime/chatEvents.js';

const LOG_TAG = 'AUTO_ASSIGN';

const withAdvisoryLock = async (key, fn) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [key]);
    if (!rows[0]?.locked) {
      return { assigned: 0, reason: 'locked' };
    }
    const result = await fn(client);
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [key]);
    return result;
  } catch (err) {
    try {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [key]);
    } catch (_) {
      // ignore unlock errors
    }
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Algoritmo trazable:
 * 1) Respeta feature flag autoAssignEnabled (settings).
 * 2) Solo agentes conectados (no admin/super).
 * 3) Balanceo por carga: toma cargas actuales y ordena de menor a mayor.
 * 4) Progresivo: asigna máx 1 chat por agente por ciclo; si gradualAssignmentEnabled está activo, limita el total del ciclo.
 * 5) Concurrencia: advisory lock global evita dobles asignaciones.
 * 6) Auditoría: registra en chat_assignment_audit y audit_log.
 */
export const runAutoAssignment = async () => {
  const settings = await getSystemSettings();
  if (!settings.autoAssignEnabled) {
    return { assigned: 0, reason: 'disabled' };
  }

  const agents = await listConnectedAgents();
  const eligibleAgents = agents.filter((a) => a.role === 'AGENTE');
  if (!eligibleAgents.length) {
    logger.info({ tag: LOG_TAG }, 'No connected agents; leaving chats unassigned');
    return { assigned: 0, reason: 'no_agents' };
  }

  const unassigned = await listUnassignedChats(200);
  if (!unassigned.length) {
    return { assigned: 0, reason: 'no_chats' };
  }

  const agentIds = eligibleAgents.map((a) => a.userId);
  const loads = await getOpenChatCountsByAgent(agentIds);
  const loadMap = new Map(loads.map((l) => [l.agentId, l.openChats]));

  // Initialize load for agents with zero chats
  for (const agentId of agentIds) {
    if (!loadMap.has(agentId)) loadMap.set(agentId, 0);
  }

  // Sort agents by current load asc to prioritize least loaded (new agents first)
  const sortedAgents = [...eligibleAgents].sort(
    (a, b) => (loadMap.get(a.userId) || 0) - (loadMap.get(b.userId) || 0)
  );

  let assignedCount = 0;
  const queue = [...unassigned];
  const maxAssignmentsThisCycle = settings.gradualAssignmentEnabled
    ? Math.max(1, Math.min(queue.length, sortedAgents.length)) // progresivo: 1 por agente como máximo
    : queue.length;

  for (const agent of sortedAgents) {
    if (!queue.length) break;
    const currentLoad = loadMap.get(agent.userId) || 0;
    if (currentLoad >= settings.maxChatsPerAgent) continue;

    // Assign only one chat per agent per cycle (gradual)
    const chat = queue.shift();
    if (chat.queueId) {
      const allowedQueue = await isUserInQueue(agent.userId, chat.queueId);
      if (!allowedQueue) {
        // Reinsert chat to allow other eligible agents to be considered
        queue.push(chat);
        continue;
      }
    }
    const updated = await assignChatDb(chat.id, agent.userId);
    loadMap.set(agent.userId, currentLoad + 1);
    assignedCount += 1;

    await recordChatAssignmentAudit({
      chatId: chat.id,
      previousAgentId: chat.assignedAgentId || null,
      newAgentId: agent.userId,
      action: 'AUTO_ASSIGN',
      executedByUserId: null,
      reason: 'auto_assign',
      validatedQueue: chat.queueId ? true : null
    });

    await recordAuditLog({
      userId: null,
      action: 'chat_auto_assigned',
      resource: 'chat',
      resourceId: chat.id,
      ip: null,
      userAgent: null,
      metadata: { agentId: agent.userId, queueId: updated.queueId, strategy: 'least_load' }
    });
    emitChatAssignedEvent(updated);

    logger.info(
      { tag: LOG_TAG, chatId: chat.id, agentId: agent.userId, queueId: updated.queueId },
      'Chat auto-assigned'
    );

    if (assignedCount >= maxAssignmentsThisCycle) break; // progresivo: no asignar todos de golpe
  }

  return { assigned: assignedCount, reason: assignedCount ? 'assigned' : 'none' };
};

export const runAutoAssignmentLocked = async () => {
  return withAdvisoryLock('chat_auto_assign', () => runAutoAssignment());
};
