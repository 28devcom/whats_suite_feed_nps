import pool from './postgres.js';

export const messagesPerMinute = async (minutes = 60) => {
  const { rows } = await pool.query(
    `SELECT date_trunc('minute', created_at) AS bucket, COUNT(*) AS total
     FROM chat_messages
     WHERE created_at >= NOW() - ($1 || ' minutes')::interval
     GROUP BY bucket
     ORDER BY bucket DESC
     LIMIT $1`,
    [Math.max(1, Math.min(minutes, 1440))]
  );
  return rows.map((r) => ({ minute: r.bucket, total: Number(r.total) }));
};

export const mediaFilesPerDay = async (days = 30) => {
  const { rows } = await pool.query(
    `SELECT date_trunc('day', created_at) AS bucket, COUNT(*) AS total
     FROM media_files
     WHERE created_at >= NOW() - ($1 || ' days')::interval
     GROUP BY bucket
     ORDER BY bucket DESC
     LIMIT $1`,
    [Math.max(1, Math.min(days, 180))]
  );
  return rows.map((r) => ({ day: r.bucket, total: Number(r.total) }));
};

export const activeAgents = async () => {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT assigned_agent_id) AS total
     FROM chats
     WHERE status = 'OPEN' AND assigned_agent_id IS NOT NULL`
  );
  return Number(rows?.[0]?.total || 0);
};

export const responseSla = async (days = 7) => {
  const { rows } = await pool.query(
    `WITH inbound AS (
       SELECT id, chat_id, created_at
       FROM chat_messages
       WHERE direction = 'in' AND created_at >= NOW() - ($1 || ' days')::interval
     ),
     response AS (
       SELECT i.chat_id,
              EXTRACT(EPOCH FROM (o.created_at - i.created_at)) AS seconds_diff
       FROM inbound i
       JOIN LATERAL (
         SELECT created_at
         FROM chat_messages o
         WHERE o.chat_id = i.chat_id
           AND o.direction = 'out'
           AND o.created_at > i.created_at
         ORDER BY o.created_at ASC
         LIMIT 1
       ) o ON TRUE
     )
     SELECT
       AVG(seconds_diff) AS avg_seconds,
       PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY seconds_diff) AS p90_seconds
     FROM response`,
    [Math.max(1, Math.min(days, 90))]
  );
  const row = rows?.[0] || {};
  return {
    avgSeconds: row.avg_seconds !== null ? Number(row.avg_seconds) : null,
    p90Seconds: row.p90_seconds !== null ? Number(row.p90_seconds) : null
  };
};
