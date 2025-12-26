import pool from './postgres.js';

const mapConversation = (row) => ({
  id: row.id,
  name: row.name,
  whatsappSessionId: row.whatsapp_session_id,
  metadata: row.metadata || {},
  status: row.status,
  assignedAgentId: row.assigned_agent_id,
  queueId: row.queue_id || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const createConversation = async ({ name, whatsappSessionId = null, metadata = {} }) => {
  const { rows } = await pool.query(
    `INSERT INTO conversations (name, whatsapp_session_id, metadata)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, whatsappSessionId, metadata]
  );
  return mapConversation(rows[0]);
};

export const getConversation = async (id) => {
  const { rows } = await pool.query(
    `SELECT c.*, qc.queue_id
     FROM conversations c
     LEFT JOIN whatsapp_sessions ws ON ws.id = c.whatsapp_session_id
     LEFT JOIN queue_connections qc ON qc.whatsapp_session_name = ws.session_name
     WHERE c.id = $1
     LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return mapConversation(rows[0]);
};

export const listConversations = async ({ limit = 50, offset = 0 }) => {
  const realLimit = Math.min(limit, 200);
  const { rows } = await pool.query(
    `SELECT c.*, qc.queue_id
     FROM conversations c
     LEFT JOIN whatsapp_sessions ws ON ws.id = c.whatsapp_session_id
     LEFT JOIN queue_connections qc ON qc.whatsapp_session_name = ws.session_name
     ORDER BY c.updated_at DESC
     LIMIT $1 OFFSET $2`,
    [realLimit, offset]
  );
  return rows.map(mapConversation);
};

export const lockConversation = async (client, conversationId) => {
  const { rows } = await client.query('SELECT * FROM conversations WHERE id = $1 FOR UPDATE', [conversationId]);
  return rows[0] ? mapConversation(rows[0]) : null;
};

export const updateAssignment = async (client, conversationId, agentId) => {
  await client.query(
    'UPDATE conversations SET assigned_agent_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
    [agentId, 'assigned', conversationId]
  );
};

export const updateStatus = async (client, conversationId, status) => {
  await client.query('UPDATE conversations SET status = $1, updated_at = NOW() WHERE id = $2', [status, conversationId]);
};

export const countActiveByAgents = async (agentIds) => {
  const { rows } = await pool.query(
    'SELECT assigned_agent_id as agent_id, COUNT(1) as total FROM conversations WHERE assigned_agent_id = ANY($1) AND status = ANY(ARRAY[\'open\',\'assigned\']) GROUP BY assigned_agent_id',
    [agentIds]
  );
  return rows;
};
