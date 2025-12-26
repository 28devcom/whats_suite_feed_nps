import pool from './postgres.js';

export const recordChatAudit = async ({ actorUserId, action, chatId, queueId, ip, metadata }) => {
  await pool.query(
    `INSERT INTO chat_audit_log (actor_user_id, action, chat_id, queue_id, ip, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actorUserId || null, action, chatId || null, queueId || null, ip || null, metadata || {}]
  );
};
