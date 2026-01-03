-- Refactor chat model for ISO 27001 traceability and assignment auditing

-- Extend chats with remote_jid, assignment timestamps and agent field
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS remote_jid VARCHAR(255),
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Backfill remote_jid and assigned_agent_id
UPDATE chats
SET remote_jid = COALESCE(remote_jid, remote_number || '@s.whatsapp.net')
WHERE remote_jid IS NULL;

UPDATE chats
SET assigned_agent_id = assigned_user_id,
    assigned_at = CASE WHEN assigned_user_id IS NOT NULL AND assigned_at IS NULL THEN updated_at ELSE assigned_at END
WHERE assigned_agent_id IS NULL;

-- Normalize status to new domain UNASSIGNED | OPEN | CLOSED
UPDATE chats SET status = 'OPEN' WHERE status ILIKE 'ASSIGNED' OR status ILIKE 'OPEN';
UPDATE chats SET status = 'UNASSIGNED' WHERE status ILIKE 'UNASSIGNED';
UPDATE chats SET status = 'CLOSED' WHERE status ILIKE 'CLOSED' OR status ILIKE 'BLOCKED';
UPDATE chats SET status = 'UNASSIGNED' WHERE status NOT IN ('UNASSIGNED','OPEN','CLOSED');

ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_status_check;
ALTER TABLE chats
  ADD CONSTRAINT chats_status_check CHECK (status IN ('UNASSIGNED','OPEN','CLOSED'));
ALTER TABLE chats ALTER COLUMN status SET DEFAULT 'UNASSIGNED';

-- Unique constraint including remote_jid for clarity (keeps existing uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS ux_chats_session_remote_jid ON chats(whatsapp_session_name, remote_jid);

-- Audit table for assignments and closures
CREATE TABLE IF NOT EXISTS chat_assignment_audit (
  id BIGSERIAL PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  previous_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  new_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(32) NOT NULL CHECK (action IN ('AUTO_ASSIGN','MANUAL_ASSIGN','UNASSIGN','CLOSE')),
  executed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_assignment_chat_id ON chat_assignment_audit(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_assignment_action ON chat_assignment_audit(action);
CREATE INDEX IF NOT EXISTS idx_chat_assignment_executor ON chat_assignment_audit(executed_by_user_id);

-- System-level settings for assignment strategies
CREATE TABLE IF NOT EXISTS system_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  auto_assign_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_assign_interval_seconds INTEGER NOT NULL DEFAULT 30,
  max_chats_per_agent INTEGER NOT NULL DEFAULT 10,
  gradual_assignment_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
