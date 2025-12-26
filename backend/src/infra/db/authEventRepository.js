import pool from './postgres.js';

export const recordAuthEvent = async ({ userId, eventType, success, ip, userAgent }) => {
  await pool.query(
    `INSERT INTO auth_events (user_id, event_type, success, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)` ,
    [userId, eventType, success, ip || null, userAgent || null]
  );
};
