import pool from './postgres.js';

export const recordAssignment = async ({ conversationId, agentId, assignedBy, reason, auto }) => {
  await pool.query(
    `INSERT INTO conversation_assignment_history (conversation_id, agent_id, assigned_by, reason, auto)
     VALUES ($1, $2, $3, $4, $5)` ,
    [conversationId, agentId, assignedBy || null, reason || null, auto || false]
  );
};

export const recordStatusEvent = async ({ conversationId, status, details }) => {
  await pool.query(
    `INSERT INTO conversation_status_events (conversation_id, status, details)
     VALUES ($1, $2, $3)` ,
    [conversationId, status, details || {}]
  );
};

export const listAssignments = async (conversationId) => {
  const { rows } = await pool.query(
    `SELECT * FROM conversation_assignment_history WHERE conversation_id = $1 ORDER BY created_at DESC`,
    [conversationId]
  );
  return rows;
};

export const listStatusEvents = async (conversationId) => {
  const { rows } = await pool.query(
    `SELECT * FROM conversation_status_events WHERE conversation_id = $1 ORDER BY created_at DESC`,
    [conversationId]
  );
  return rows;
};
