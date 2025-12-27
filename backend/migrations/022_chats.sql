-- Chats table with exclusivity per agent and queue linkage
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_session_name VARCHAR(255) NOT NULL REFERENCES whatsapp_sessions(session_name) ON DELETE CASCADE,
  remote_number VARCHAR(32) NOT NULL,
  queue_id UUID REFERENCES queues(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(whatsapp_session_name, remote_number)
);

CREATE INDEX IF NOT EXISTS idx_chats_queue_id ON chats(queue_id);
CREATE INDEX IF NOT EXISTS idx_chats_assigned_user_id ON chats(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
