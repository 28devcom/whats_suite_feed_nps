import pool from './postgres.js';

let cachedDefaultTenantId = null;

const mapSessionRow = (row) => ({
  id: row.id || null,
  sessionName: row.session_name,
  tenantId: row.tenant_id,
  status: row.status || null,
  syncHistory: Boolean(row.sync_history),
  historySyncStatus: row.history_sync_status || 'idle',
  historySyncCursor: row.history_sync_cursor || {},
  historySyncProgress: row.history_sync_progress || {},
  historySyncedAt: row.history_synced_at || null,
  lastConnectedAt: row.last_connected_at || null,
  connectionId: row.connection_id || row.session_name || null,
  lastSyncedAt: row.last_synced_at || null,
  lastMessageId: row.last_message_id || null,
  lastDisconnectAt: row.last_disconnect_at || null,
  syncState: row.sync_state || 'IDLE',
  syncError: row.sync_error || null,
  lastConnectAt: row.last_connect_at || null
});

export const getDefaultTenantId = async () => {
  if (cachedDefaultTenantId) return cachedDefaultTenantId;
  const res = await pool.query("SELECT id FROM tenants WHERE name = 'default' LIMIT 1");
  cachedDefaultTenantId = res.rows[0]?.id || null;
  return cachedDefaultTenantId;
};

export const getTenantIdForSession = async (sessionName, fallbackTenantId = null) => {
  if (sessionName) {
    const { rows } = await pool.query('SELECT tenant_id FROM whatsapp_sessions WHERE session_name = $1 LIMIT 1', [sessionName]);
    if (rows[0]?.tenant_id) return rows[0].tenant_id;
  }
  if (fallbackTenantId) return fallbackTenantId;
  return getDefaultTenantId();
};

export const findSessionByName = async ({ sessionName, tenantId = null }) => {
  const params = [sessionName];
  let where = 'session_name = $1';
  if (tenantId) {
    params.push(tenantId);
    where += ` AND tenant_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT id, session_name, tenant_id, status, sync_history, history_sync_status, history_sync_cursor, history_sync_progress, history_synced_at, last_connected_at, connection_id, last_synced_at, last_message_id, last_disconnect_at, sync_state, sync_error, last_connect_at
     FROM whatsapp_sessions
     WHERE ${where}
     LIMIT 1`,
    params
  );
  if (!rows[0]) {
    const resolvedTenant = await getTenantIdForSession(sessionName, tenantId);
    return {
      id: null,
      sessionName,
      tenantId: resolvedTenant,
      status: 'unknown',
      syncHistory: true,
      historySyncStatus: 'idle',
      historySyncCursor: {},
      historySyncProgress: {},
      historySyncedAt: null,
      lastConnectedAt: null,
      connectionId: sessionName,
      lastSyncedAt: null,
      lastMessageId: null,
      lastDisconnectAt: null,
      syncState: 'IDLE',
      syncError: null,
      lastConnectAt: null
    };
  }
  return mapSessionRow(rows[0]);
};

export const upsertSessionSyncHistory = async ({ sessionName, tenantId = null, syncHistory = true }) => {
  const resolvedTenant = await getTenantIdForSession(sessionName, tenantId);
  await pool.query(
    `INSERT INTO whatsapp_sessions (session_name, name, connection_id, tenant_id, status, sync_history, creds, keys, updated_at)
     VALUES (
       $1,
       $2,
       COALESCE((SELECT connection_id FROM whatsapp_sessions WHERE session_name = $1), NULL),
       $3,
       'DISCONNECTED',
       $4,
       COALESCE((SELECT creds FROM whatsapp_sessions WHERE session_name = $1), '{}'::jsonb),
       COALESCE((SELECT keys FROM whatsapp_sessions WHERE session_name = $1), '{}'::jsonb),
       NOW()
     )
     ON CONFLICT (session_name) DO UPDATE
       SET sync_history = EXCLUDED.sync_history,
           tenant_id = COALESCE(whatsapp_sessions.tenant_id, EXCLUDED.tenant_id),
           updated_at = NOW(),
           connection_id = COALESCE(whatsapp_sessions.connection_id, EXCLUDED.connection_id)`,
    [sessionName, sessionName, resolvedTenant, syncHistory]
  );
  return findSessionByName({ sessionName, tenantId: resolvedTenant });
};

export const updateHistorySyncState = async ({ sessionName, tenantId = null, status = null, progress = null, cursor = null, syncedAt = null }) => {
  const resolvedTenant = await getTenantIdForSession(sessionName, tenantId);
  const { rows } = await pool.query(
    `UPDATE whatsapp_sessions
     SET history_sync_status = COALESCE($3, history_sync_status),
         history_sync_progress = CASE WHEN $4::jsonb IS NULL THEN history_sync_progress ELSE $4::jsonb END,
         history_sync_cursor = CASE WHEN $5::jsonb IS NULL THEN history_sync_cursor ELSE $5::jsonb END,
         history_synced_at = COALESCE($6, history_synced_at),
         updated_at = NOW()
     WHERE session_name = $1 AND tenant_id = $2
     RETURNING id, session_name, tenant_id, status, sync_history, history_sync_status, history_sync_cursor, history_sync_progress, history_synced_at, last_connected_at, connection_id`,
    [sessionName, resolvedTenant, status, progress, cursor, syncedAt]
  );
  if (rows[0]) return mapSessionRow(rows[0]);

  await pool.query(
    `INSERT INTO whatsapp_sessions (session_name, name, connection_id, tenant_id, status, sync_history, history_sync_status, history_sync_progress, history_sync_cursor, history_synced_at, creds, keys, updated_at)
     VALUES (
       $1,
       $2,
       COALESCE((SELECT connection_id FROM whatsapp_sessions WHERE session_name = $1), NULL),
       $3,
       'DISCONNECTED',
       FALSE,
       COALESCE($4, 'idle'),
       COALESCE($5, '{}'::jsonb),
       COALESCE($6, '{}'::jsonb),
       $7,
       COALESCE((SELECT creds FROM whatsapp_sessions WHERE session_name = $1), '{}'::jsonb),
       COALESCE((SELECT keys FROM whatsapp_sessions WHERE session_name = $1), '{}'::jsonb),
       NOW()
     )
     ON CONFLICT (session_name) DO NOTHING`,
    [sessionName, sessionName, resolvedTenant, status, progress, cursor, syncedAt]
  );
  return findSessionByName({ sessionName, tenantId: resolvedTenant });
};

export const updateSessionSyncTracking = async ({
  sessionName,
  tenantId = null,
  lastSyncedAt = null,
  lastMessageId = null,
  lastDisconnectAt = null,
  lastConnectAt = null,
  syncState = null,
  syncError = null
}) => {
  const resolvedTenant = await getTenantIdForSession(sessionName, tenantId);
  const fields = [];
  const params = [sessionName, resolvedTenant];
  if (lastSyncedAt) {
    params.push(lastSyncedAt);
    fields.push(`last_synced_at = $${params.length}`);
  }
  if (lastMessageId) {
    params.push(lastMessageId);
    fields.push(`last_message_id = $${params.length}`);
  }
  if (lastDisconnectAt) {
    params.push(lastDisconnectAt);
    fields.push(`last_disconnect_at = $${params.length}`);
  }
  if (lastConnectAt) {
    params.push(lastConnectAt);
    fields.push(`last_connect_at = $${params.length}`);
  }
  if (syncState) {
    params.push(syncState);
    fields.push(`sync_state = $${params.length}`);
  }
  if (syncError !== undefined) {
    params.push(syncError);
    fields.push(`sync_error = $${params.length}`);
  }
  if (!fields.length) return findSessionByName({ sessionName, tenantId: resolvedTenant });

  const sql = `
    UPDATE whatsapp_sessions
    SET ${fields.join(', ')},
        updated_at = NOW()
    WHERE session_name = $1 AND tenant_id = $2
    RETURNING *
  `;
  const { rows } = await pool.query(sql, params);
  if (rows[0]) return mapSessionRow(rows[0]);
  return findSessionByName({ sessionName, tenantId: resolvedTenant });
};
