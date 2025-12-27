-- Queues and relationships for multi-agent chat
CREATE TABLE IF NOT EXISTS queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS queue_users (
  queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('agent','supervisor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (queue_id, user_id)
);

CREATE TABLE IF NOT EXISTS queue_connections (
  queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  whatsapp_session_name VARCHAR(255) NOT NULL REFERENCES whatsapp_sessions(session_name) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (queue_id, whatsapp_session_name)
);
