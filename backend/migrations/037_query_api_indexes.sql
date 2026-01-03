-- Índices para Query API masiva (cursor-friendly)
-- ISO 27001: acceso rápido con menor exposición (menos datos en tránsito)

CREATE INDEX IF NOT EXISTS idx_chats_status_queue_updated_at
  ON chats (status, queue_id, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chats_queue_assigned_status
  ON chats (queue_id, assigned_agent_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created_at
  ON chat_messages (chat_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_queue_users_user_queue
  ON queue_users (user_id, queue_id);
