ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','closed'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_agent ON conversations(assigned_agent_id);
