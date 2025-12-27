-- Sync history flag per WhatsApp session with audit hardening and tenant indexes (ISO 27001/9001).

-- WhatsApp session settings
ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS sync_history BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS history_sync_status VARCHAR(16) NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS history_sync_cursor JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS history_sync_progress JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS history_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_tenant_conn ON whatsapp_sessions(tenant_id, connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_sync_flags ON whatsapp_sessions(tenant_id, session_name, sync_history);

-- Audit log enrichment
ALTER TABLE whatsapp_audit_log
  ADD COLUMN IF NOT EXISTS connection_id TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

UPDATE whatsapp_audit_log
SET connection_id = COALESCE(connection_id, session_name)
WHERE connection_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_tenant_conn ON whatsapp_audit_log(tenant_id, connection_id, created_at);

-- Message/search performance under multitenancy
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_chat ON chat_messages(tenant_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_whatsapp_message ON chat_messages(tenant_id, whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_timestamp ON chat_messages(tenant_id, timestamp);

-- Chat metadata for history sync and contact context
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS push_name TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_chats_tenant_status ON chats(tenant_id, status);
