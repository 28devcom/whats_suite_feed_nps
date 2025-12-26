import { AppError } from '../shared/errors.js';
import pool from '../infra/db/postgres.js';
import {
  lockConversation,
  updateAssignment,
  updateStatus,
  countActiveByAgents,
  getConversation
} from '../infra/db/conversationRepository.js';
import { recordAssignment, recordStatusEvent, listAssignments, listStatusEvents } from '../infra/db/conversationAuditRepository.js';

const STATUS_FLOW = {
  open: ['assigned', 'closed'],
  assigned: ['open', 'closed'],
  closed: []
};

const assertStatusTransition = (from, to) => {
  const allowed = STATUS_FLOW[from] || [];
  if (!allowed.includes(to)) {
    throw new AppError(`Transición de estado no permitida: ${from} -> ${to}`, 409);
  }
};

export const manualAssign = async ({ conversationId, agentId, assignedBy, reason }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const conv = await lockConversation(client, conversationId);
    if (!conv) throw new AppError('Conversación no encontrada', 404);
    if (conv.status === 'closed') throw new AppError('Conversación cerrada', 409);
    await updateAssignment(client, conversationId, agentId);
    await recordAssignment({ conversationId, agentId, assignedBy, reason, auto: false });
    await recordStatusEvent({ conversationId, status: 'assigned', details: { reason, assignedBy } });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const pickAgentWithLowerLoad = async (agentIds) => {
  if (!agentIds?.length) throw new AppError('No hay agentes candidatos', 400);
  const loads = await countActiveByAgents(agentIds);
  const loadMap = new Map(agentIds.map((id) => [id, 0]));
  for (const row of loads) {
    loadMap.set(row.agent_id, Number(row.total));
  }
  let bestAgent = agentIds[0];
  let bestLoad = loadMap.get(bestAgent) ?? 0;
  for (const id of agentIds.slice(1)) {
    const l = loadMap.get(id) ?? 0;
    if (l < bestLoad) {
      bestLoad = l;
      bestAgent = id;
    }
  }
  return bestAgent;
};

export const autoAssign = async ({ conversationId, candidateAgentIds, assignedBy }) => {
  const agentId = await pickAgentWithLowerLoad(candidateAgentIds);
  await manualAssign({ conversationId, agentId, assignedBy, reason: 'auto_assign' });
  return agentId;
};

export const changeStatus = async ({ conversationId, status, details }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const conv = await lockConversation(client, conversationId);
    if (!conv) throw new AppError('Conversación no encontrada', 404);
    assertStatusTransition(conv.status, status);
    await updateStatus(client, conversationId, status);
    await recordStatusEvent({ conversationId, status, details });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getAssignmentHistory = async (conversationId) => {
  const conv = await getConversation(conversationId);
  if (!conv) throw new AppError('Conversación no encontrada', 404);
  return listAssignments(conversationId);
};

export const getStatusHistory = async (conversationId) => {
  const conv = await getConversation(conversationId);
  if (!conv) throw new AppError('Conversación no encontrada', 404);
  return listStatusEvents(conversationId);
};
