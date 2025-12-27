-- Audit log for chat events
CREATE TABLE IF NOT EXISTS chat_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  queue_id UUID REFERENCES queues(id) ON DELETE SET NULL,
  ip INET,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_audit_chat_id ON chat_audit_log(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_audit_actor ON chat_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_audit_action ON chat_audit_log(action);
