-- Configurable retention policies (6m, 1y, 5y) with per-queue/client/tenant scope and cold archive metadata.

CREATE TABLE IF NOT EXISTS retention_policies (
  code VARCHAR(16) PRIMARY KEY,
  name TEXT NOT NULL,
  ttl_days INTEGER NOT NULL CHECK (ttl_days > 0),
  cold_storage_enabled BOOLEAN NOT NULL DEFAULT true,
  cold_db_enabled BOOLEAN NOT NULL DEFAULT true,
  storage_class TEXT DEFAULT 'cold',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO retention_policies (code, name, ttl_days, storage_class)
VALUES
  ('P6M', 'Retención 6 meses', 180, 'cold'),
  ('P1Y', 'Retención 1 año', 365, 'cold'),
  ('P5Y', 'Retención 5 años', 1825, 'deep_cold')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    ttl_days = EXCLUDED.ttl_days,
    storage_class = EXCLUDED.storage_class,
    updated_at = NOW();

-- Binding por alcance: queue > client > tenant > global fallback
CREATE TABLE IF NOT EXISTS retention_policy_bindings (
  id BIGSERIAL PRIMARY KEY,
  queue_id UUID REFERENCES queues(id) ON DELETE CASCADE,
  client_id UUID,
  tenant_id UUID,
  policy_code VARCHAR(16) NOT NULL REFERENCES retention_policies(code),
  priority SMALLINT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (queue_id IS NOT NULL)::int +
    (client_id IS NOT NULL)::int +
    (tenant_id IS NOT NULL)::int <= 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_retention_binding_queue ON retention_policy_bindings(queue_id) WHERE queue_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_retention_binding_client ON retention_policy_bindings(client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_retention_binding_tenant ON retention_policy_bindings(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retention_binding_priority ON retention_policy_bindings(priority);

-- Media archiving metadata (db cold / storage cold) and effective policy reference
ALTER TABLE media_files
  DROP CONSTRAINT IF EXISTS media_files_retention_chk,
  ADD COLUMN IF NOT EXISTS policy_code VARCHAR(16) REFERENCES retention_policies(code) DEFAULT 'P1Y',
  ADD COLUMN IF NOT EXISTS archive_status VARCHAR(16) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_target VARCHAR(16) DEFAULT 'storage_cold',
  ADD COLUMN IF NOT EXISTS archive_error TEXT,
  ADD COLUMN IF NOT EXISTS cold_pointer TEXT;

ALTER TABLE media_files
  ADD CONSTRAINT media_files_archive_status_chk CHECK (archive_status IN ('active','pending_archive','archived','delete_pending')),
  ADD CONSTRAINT media_files_archive_target_chk CHECK (archive_target IN ('storage_cold','db_cold','both')),
  ADD CONSTRAINT media_files_retention_chk CHECK (retention_policy IN ('default','30d','90d','365d','legal_hold','P6M','P1Y','P5Y'));

UPDATE media_files mf
SET policy_code = COALESCE(policy_code, retention_policy, 'P1Y')
WHERE policy_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_files_policy_created ON media_files(policy_code, created_at);
CREATE INDEX IF NOT EXISTS idx_media_files_archive_status ON media_files(archive_status, created_at);

-- Cursor table para orquestadores de archivado/expurgo
CREATE TABLE IF NOT EXISTS retention_jobs_cursor (
  job_name TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ,
  last_created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO retention_jobs_cursor (job_name)
VALUES ('media_archive'), ('media_expire')
ON CONFLICT (job_name) DO NOTHING;
