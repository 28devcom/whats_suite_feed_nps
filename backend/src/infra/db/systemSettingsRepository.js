import env from '../../config/env.js';
import pool from './postgres.js';

const DEFAULT_HISTORY_DAYS = Number(env.whatsapp?.historySyncDays || 30);

const mapRowToSettings = (row) => {
  if (!row) {
    return {
      autoAssignEnabled: false,
      autoAssignIntervalSeconds: 30,
      maxChatsPerAgent: 10,
      gradualAssignmentEnabled: false,
      whatsappHistoryDays: DEFAULT_HISTORY_DAYS
    };
  }
  return {
    autoAssignEnabled: row.auto_assign_enabled,
    autoAssignIntervalSeconds: Number(row.auto_assign_interval_seconds || 30),
    maxChatsPerAgent: Number(row.max_chats_per_agent || 10),
    gradualAssignmentEnabled: row.gradual_assignment_enabled,
    whatsappHistoryDays: Number(row.whatsapp_history_days || DEFAULT_HISTORY_DAYS)
  };
};

export const getSystemSettings = async () => {
  const { rows } = await pool.query('SELECT * FROM system_settings WHERE id = 1 LIMIT 1');
  const row = rows[0];
  return mapRowToSettings(row);
};

export const ensureSystemSettingsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY,
      auto_assign_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      auto_assign_interval_seconds INTEGER NOT NULL DEFAULT 30,
      max_chats_per_agent INTEGER NOT NULL DEFAULT 10,
      gradual_assignment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      whatsapp_history_days INTEGER NOT NULL DEFAULT ${DEFAULT_HISTORY_DAYS},
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS whatsapp_history_days INTEGER NOT NULL DEFAULT ${DEFAULT_HISTORY_DAYS};
  `);
  await pool.query(
    `INSERT INTO system_settings (id, auto_assign_enabled, auto_assign_interval_seconds, max_chats_per_agent, gradual_assignment_enabled, whatsapp_history_days)
     VALUES (1, FALSE, 30, 10, FALSE, ${DEFAULT_HISTORY_DAYS})
     ON CONFLICT (id) DO NOTHING`
  );
};

export const upsertSystemSettings = async ({
  autoAssignEnabled,
  autoAssignIntervalSeconds,
  maxChatsPerAgent,
  gradualAssignmentEnabled,
  whatsappHistoryDays = DEFAULT_HISTORY_DAYS
}) => {
  const { rows } = await pool.query(
    `INSERT INTO system_settings (id, auto_assign_enabled, auto_assign_interval_seconds, max_chats_per_agent, gradual_assignment_enabled, whatsapp_history_days)
     VALUES (
       1,
       COALESCE($1, false),
       COALESCE($2, 30),
       COALESCE($3, 10),
       COALESCE($4, false),
       COALESCE($5, ${DEFAULT_HISTORY_DAYS})
     )
     ON CONFLICT (id) DO UPDATE
       SET auto_assign_enabled = EXCLUDED.auto_assign_enabled,
           auto_assign_interval_seconds = EXCLUDED.auto_assign_interval_seconds,
           max_chats_per_agent = EXCLUDED.max_chats_per_agent,
           gradual_assignment_enabled = EXCLUDED.gradual_assignment_enabled,
           whatsapp_history_days = EXCLUDED.whatsapp_history_days,
           updated_at = NOW()
     RETURNING *`,
    [autoAssignEnabled, autoAssignIntervalSeconds, maxChatsPerAgent, gradualAssignmentEnabled, whatsappHistoryDays]
  );
  return mapRowToSettings(rows[0]);
};
