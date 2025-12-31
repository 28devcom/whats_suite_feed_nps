import pool from './postgres.js';

export const recordChatAudit = async ({ actorUserId, action, chatId, queueId, ip, metadata }) => {
  await pool.query(
    `INSERT INTO chat_audit_log (actor_user_id, action, chat_id, queue_id, ip, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actorUserId || null, action, chatId || null, queueId || null, ip || null, metadata || {}]
  );
};

export const getLatestChatAudit = async (chatId) => {
  if (!chatId) return null;
  const { rows } = await pool.query(
    `SELECT actor_user_id, action, metadata, created_at
     FROM chat_audit_log
     WHERE chat_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [chatId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    actorUserId: row.actor_user_id,
    action: row.action,
    metadata: row.metadata || null,
    createdAt: row.created_at
  };
};
