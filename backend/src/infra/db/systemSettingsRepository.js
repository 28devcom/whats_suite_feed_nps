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
      whatsappHistoryDays: DEFAULT_HISTORY_DAYS,
      inactivityAutoCloseEnabled: false,
      inactivityAutoCloseHours: 2
    };
  }
  return {
    autoAssignEnabled: row.auto_assign_enabled,
    autoAssignIntervalSeconds: Number(row.auto_assign_interval_seconds || 30),
    maxChatsPerAgent: Number(row.max_chats_per_agent || 10),
    gradualAssignmentEnabled: row.gradual_assignment_enabled,
    whatsappHistoryDays: Number(row.whatsapp_history_days || DEFAULT_HISTORY_DAYS),
    inactivityAutoCloseEnabled: Boolean(row.inactivity_autoclose_enabled),
    inactivityAutoCloseHours: Number(row.inactivity_autoclose_minutes || 0) / 60
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
      inactivity_warning_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      inactivity_warning_minutes INTEGER NOT NULL DEFAULT 15,
      inactivity_autoclose_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      inactivity_autoclose_minutes INTEGER NOT NULL DEFAULT 120,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS whatsapp_history_days INTEGER NOT NULL DEFAULT ${DEFAULT_HISTORY_DAYS},
    ADD COLUMN IF NOT EXISTS inactivity_warning_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS inactivity_warning_minutes INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS inactivity_autoclose_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS inactivity_autoclose_minutes INTEGER NOT NULL DEFAULT 120;
  `);
  await pool.query(
    `INSERT INTO system_settings (id, auto_assign_enabled, auto_assign_interval_seconds, max_chats_per_agent, gradual_assignment_enabled, whatsapp_history_days, inactivity_warning_enabled, inactivity_warning_minutes, inactivity_autoclose_enabled, inactivity_autoclose_minutes)
     VALUES (1, FALSE, 30, 10, FALSE, ${DEFAULT_HISTORY_DAYS}, FALSE, 15, FALSE, 120)
     ON CONFLICT (id) DO NOTHING`
  );
};

export const upsertSystemSettings = async ({
  autoAssignEnabled,
  autoAssignIntervalSeconds,
  maxChatsPerAgent,
  gradualAssignmentEnabled,
  whatsappHistoryDays = DEFAULT_HISTORY_DAYS,
  inactivityAutoCloseEnabled = false,
  inactivityAutoCloseHours = 2
}) => {
  const { rows } = await pool.query(
    `INSERT INTO system_settings (id, auto_assign_enabled, auto_assign_interval_seconds, max_chats_per_agent, gradual_assignment_enabled, whatsapp_history_days, inactivity_autoclose_enabled, inactivity_autoclose_minutes)
     VALUES (
       1,
       COALESCE($1, false),
       COALESCE($2, 30),
       COALESCE($3, 10),
       COALESCE($4, false),
       COALESCE($5, ${DEFAULT_HISTORY_DAYS}),
       COALESCE($6, false),
       COALESCE($7, 120)
     )
     ON CONFLICT (id) DO UPDATE
       SET auto_assign_enabled = EXCLUDED.auto_assign_enabled,
           auto_assign_interval_seconds = EXCLUDED.auto_assign_interval_seconds,
           max_chats_per_agent = EXCLUDED.max_chats_per_agent,
           gradual_assignment_enabled = EXCLUDED.gradual_assignment_enabled,
           whatsapp_history_days = EXCLUDED.whatsapp_history_days,
           inactivity_autoclose_enabled = EXCLUDED.inactivity_autoclose_enabled,
           inactivity_autoclose_minutes = EXCLUDED.inactivity_autoclose_minutes,
           updated_at = NOW()
     RETURNING *`,
    [
      autoAssignEnabled,
      autoAssignIntervalSeconds,
      maxChatsPerAgent,
      gradualAssignmentEnabled,
      whatsappHistoryDays,
      inactivityAutoCloseEnabled,
      (Number(inactivityAutoCloseHours) || 0) * 60
    ]
  );
  return mapRowToSettings(rows[0]);
};
