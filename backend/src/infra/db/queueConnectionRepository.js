import pool from './postgres.js';

export const listQueueConnections = async (queueId) => {
  const { rows } = await pool.query(
    `SELECT qc.queue_id, qc.whatsapp_session_name
     FROM queue_connections qc
     WHERE qc.queue_id = $1`,
    [queueId]
  );
  return rows;
};

export const addQueueConnection = async (queueId, sessionName) => {
  await pool.query(
    `INSERT INTO queue_connections (queue_id, whatsapp_session_name)
     VALUES ($1, $2)
     ON CONFLICT (queue_id, whatsapp_session_name) DO NOTHING`,
    [queueId, sessionName]
  );
};

export const removeQueueConnection = async (queueId, sessionName) => {
  await pool.query('DELETE FROM queue_connections WHERE queue_id = $1 AND whatsapp_session_name = $2', [queueId, sessionName]);
};

export const getQueueIdsForSession = async (sessionName) => {
  const { rows } = await pool.query(
    `SELECT qc.queue_id
     FROM queue_connections qc
     INNER JOIN queues q ON q.id = qc.queue_id
     WHERE qc.whatsapp_session_name = $1
       AND q.deleted_at IS NULL
       AND q.active = true`,
    [sessionName]
  );
  return rows.map((r) => r.queue_id);
};

export const getQueueIdForSession = async (sessionName) => {
  const { rows } = await pool.query(
    `SELECT qc.queue_id
     FROM queue_connections qc
     INNER JOIN queues q ON q.id = qc.queue_id
     WHERE qc.whatsapp_session_name = $1
       AND q.deleted_at IS NULL
       AND q.active = true
     ORDER BY q.created_at ASC
     LIMIT 1`,
    [sessionName]
  );
  return rows[0]?.queue_id || null;
};

const mapConnectionRow = (r) => {
  const queues = Array.isArray(r.queues)
    ? r.queues
        .filter((q) => q && q.id && q.name)
        .map((q) => ({ id: q.id, name: q.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  return {
    sessionName: r.session_name,
    status: r.status || null,
    queues
  };
};

export const listConnectionsForUser = async (userId, { includeAll = false } = {}) => {
  if (includeAll) {
    const { rows } = await pool.query(
      `SELECT qc.whatsapp_session_name AS session_name,
              qs.status,
              jsonb_agg(DISTINCT jsonb_build_object('id', q.id, 'name', q.name)) FILTER (WHERE q.id IS NOT NULL) AS queues
       FROM queue_connections qc
       INNER JOIN queues q ON q.id = qc.queue_id
       LEFT JOIN whatsapp_sessions qs ON qs.session_name = qc.whatsapp_session_name
       WHERE q.deleted_at IS NULL
         AND q.active = true
       GROUP BY qc.whatsapp_session_name, qs.status
       ORDER BY qc.whatsapp_session_name`
    );
    return rows.map(mapConnectionRow);
  }

  const { rows } = await pool.query(
    `SELECT qc.whatsapp_session_name AS session_name,
            qs.status,
            jsonb_agg(DISTINCT jsonb_build_object('id', q.id, 'name', q.name)) FILTER (WHERE q.id IS NOT NULL) AS queues
     FROM queue_connections qc
     INNER JOIN queue_users qu ON qu.queue_id = qc.queue_id
     INNER JOIN queues q ON q.id = qc.queue_id
     LEFT JOIN whatsapp_sessions qs ON qs.session_name = qc.whatsapp_session_name
     WHERE qu.user_id = $1
       AND q.deleted_at IS NULL
       AND q.active = true
     GROUP BY qc.whatsapp_session_name, qs.status
     ORDER BY qc.whatsapp_session_name`,
    [userId]
  );
  return rows.map(mapConnectionRow);
};

export const userHasConnection = async (userId, sessionName) => {
  const { rows } = await pool.query(
    `SELECT 1
     FROM queue_connections qc
     INNER JOIN queue_users qu ON qu.queue_id = qc.queue_id
     INNER JOIN queues q ON q.id = qc.queue_id
     WHERE qu.user_id = $1
       AND qc.whatsapp_session_name = $2
       AND q.deleted_at IS NULL
       AND q.active = true
     LIMIT 1`,
    [userId, sessionName]
  );
  return Boolean(rows[0]);
};

export const listQueuesForSessionAndUser = async (sessionName, userId) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT q.id, q.name
     FROM queue_connections qc
     INNER JOIN queue_users qu ON qu.queue_id = qc.queue_id
     INNER JOIN queues q ON q.id = qc.queue_id
     WHERE qc.whatsapp_session_name = $1
       AND qu.user_id = $2
       AND q.deleted_at IS NULL
       AND q.active = true
     ORDER BY q.name`,
    [sessionName, userId]
  );
  return rows.map((r) => ({ id: r.id, name: r.name }));
};

export const listQueuesForSession = async (sessionName) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT q.id, q.name
     FROM queue_connections qc
     INNER JOIN queues q ON q.id = qc.queue_id
     WHERE qc.whatsapp_session_name = $1
       AND q.deleted_at IS NULL
       AND q.active = true
     ORDER BY q.name`,
    [sessionName]
  );
  return rows.map((r) => ({ id: r.id, name: r.name }));
};

export const connectionExists = async (sessionName) => {
  const { rows } = await pool.query(
    `SELECT 1
     FROM queue_connections qc
     INNER JOIN queues q ON q.id = qc.queue_id
     WHERE qc.whatsapp_session_name = $1
       AND q.deleted_at IS NULL
       AND q.active = true
     LIMIT 1`,
    [sessionName]
  );
  return Boolean(rows[0]);
};
