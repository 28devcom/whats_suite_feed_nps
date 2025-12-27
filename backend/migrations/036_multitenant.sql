-- Multitenancy: tenant_id on all core tables, logical isolation and per-tenant limits.

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default tenant to backfill existing data
DO $$
DECLARE
  default_id UUID;
BEGIN
  INSERT INTO tenants (name) VALUES ('default') ON CONFLICT (name) DO NOTHING;
  SELECT id INTO default_id FROM tenants WHERE name = 'default';

  -- Helper to add tenant_id column if missing, backfill and set constraints
  PERFORM 1;

  -- Users
  ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE users SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_fk;
  ALTER TABLE users ADD CONSTRAINT users_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

  -- WhatsApp sessions
  ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE whatsapp_sessions SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE whatsapp_sessions ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE whatsapp_sessions DROP CONSTRAINT IF EXISTS whatsapp_sessions_tenant_fk;
  ALTER TABLE whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_tenant ON whatsapp_sessions(tenant_id);

  -- Chats
  ALTER TABLE chats ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE chats SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE chats ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_tenant_fk;
  ALTER TABLE chats ADD CONSTRAINT chats_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_chats_tenant ON chats(tenant_id);

  -- Chat messages (partitioned history)
  ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE chat_messages SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE chat_messages ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_tenant_fk;
  ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON chat_messages(tenant_id);

  -- Messages core / status / content
  ALTER TABLE messages_core ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE messages_core SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE messages_core ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE messages_core ADD CONSTRAINT messages_core_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_messages_core_tenant ON messages_core(tenant_id, created_at);

  ALTER TABLE messages_status ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE messages_status SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE messages_status ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE messages_status ADD CONSTRAINT messages_status_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_messages_status_tenant ON messages_status(tenant_id);

  ALTER TABLE messages_content ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE messages_content SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE messages_content ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE messages_content ADD CONSTRAINT messages_content_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_messages_content_tenant ON messages_content(tenant_id, message_created_at);

  -- Media files
  ALTER TABLE media_files ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE media_files SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE media_files ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE media_files ADD CONSTRAINT media_files_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_media_files_tenant ON media_files(tenant_id, created_at);

  -- Audit logs (partitioned)
  ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE audit_logs SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at);

  -- Queues
  ALTER TABLE queues ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE queues SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE queues ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE queues ADD CONSTRAINT queues_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_queues_tenant ON queues(tenant_id);

  -- Campaigns (mass messaging)
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE campaigns SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE campaigns ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);

  -- WhatsApp audit / error logs
  ALTER TABLE whatsapp_audit_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE whatsapp_audit_log SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE whatsapp_audit_log ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE whatsapp_audit_log ADD CONSTRAINT whatsapp_audit_log_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_tenant ON whatsapp_audit_log(tenant_id, created_at);

  ALTER TABLE whatsapp_error_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE whatsapp_error_log SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE whatsapp_error_log ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE whatsapp_error_log ADD CONSTRAINT whatsapp_error_log_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_whatsapp_error_tenant ON whatsapp_error_log(tenant_id, created_at);

  -- Assignment audit
  ALTER TABLE chat_assignment_audit ADD COLUMN IF NOT EXISTS tenant_id UUID;
  UPDATE chat_assignment_audit SET tenant_id = default_id WHERE tenant_id IS NULL;
  ALTER TABLE chat_assignment_audit ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE chat_assignment_audit ADD CONSTRAINT chat_assignment_audit_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS idx_chat_assignment_tenant ON chat_assignment_audit(tenant_id, created_at);

  -- Default per-tenant limits
  CREATE TABLE IF NOT EXISTS tenant_limits (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    max_agents INTEGER DEFAULT 500,
    max_messages_per_minute INTEGER DEFAULT 10000,
    max_media_per_day INTEGER DEFAULT 100000,
    max_whatsapp_sessions INTEGER DEFAULT 100,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  INSERT INTO tenant_limits (tenant_id)
  VALUES (default_id)
  ON CONFLICT (tenant_id) DO NOTHING;
END $$;
