import pool from './postgres.js';

export const listQueueUsers = async (queueId, tenantId = null) => {
  const params = [queueId];
  let tenantClause = '';
  if (tenantId) {
    params.push(tenantId);
    tenantClause = `AND u.tenant_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT qu.queue_id, qu.user_id, qu.role, u.email, u.name
     FROM queue_users qu
     JOIN users u ON u.id = qu.user_id
     WHERE qu.queue_id = $1 ${tenantClause}`,
    params
  );
  return rows;
};

export const addQueueUser = async (queueId, userId, role) => {
  await pool.query(
    `INSERT INTO queue_users (queue_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (queue_id, user_id) DO NOTHING`,
    [queueId, userId, role]
  );
};

export const removeQueueUser = async (queueId, userId) => {
  await pool.query('DELETE FROM queue_users WHERE queue_id = $1 AND user_id = $2', [queueId, userId]);
};
