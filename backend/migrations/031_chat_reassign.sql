-- Extend chat model for reassignment traceability
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS reassigned_from_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reassigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Extend assignment audit for reassignment and richer context
ALTER TABLE chat_assignment_audit
  ADD COLUMN IF NOT EXISTS from_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS to_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS from_connection_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS to_connection_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS validated_queue BOOLEAN DEFAULT NULL;

-- Update constraint to include REASSIGN action
ALTER TABLE chat_assignment_audit DROP CONSTRAINT IF EXISTS chat_assignment_audit_action_check;
ALTER TABLE chat_assignment_audit
  ADD CONSTRAINT chat_assignment_audit_action_check CHECK (action IN ('AUTO_ASSIGN','MANUAL_ASSIGN','UNASSIGN','CLOSE','REASSIGN'));
