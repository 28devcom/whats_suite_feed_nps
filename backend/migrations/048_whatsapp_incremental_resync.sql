-- Incremental resync tracking and dedup indexes.

ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_id TEXT,
  ADD COLUMN IF NOT EXISTS last_disconnect_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_connect_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_state VARCHAR(16) NOT NULL DEFAULT 'IDLE',
  ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Track connection_id per message to enable per-connection dedupe
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS connection_id TEXT;

UPDATE chat_messages m
SET connection_id = COALESCE(
  (SELECT connection_id::text FROM whatsapp_sessions s WHERE s.session_name = m.whatsapp_session_name LIMIT 1),
  m.whatsapp_session_name::text
)::text
WHERE connection_id IS NULL;

-- Unique dedupe by tenant/connection/message_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_messages_tenant_conn_msg
  ON chat_messages(tenant_id, connection_id, whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- Timestamp index for incremental scans
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_conn_ts
  ON chat_messages(tenant_id, connection_id, timestamp DESC);
