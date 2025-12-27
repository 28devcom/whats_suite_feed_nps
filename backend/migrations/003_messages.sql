-- Conversations group messages; decoupled from WhatsApp sessions for future channels
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    whatsapp_session_id UUID REFERENCES whatsapp_sessions(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','closed')),
    assigned_agent_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(whatsapp_session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_agent ON conversations(assigned_agent_id);

-- Message metadata (lightweight), optimized for pagination by conversation and time
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    external_id VARCHAR(255),
    direction VARCHAR(16) NOT NULL CHECK (direction IN ('inbound','outbound')),
    sender VARCHAR(255),
    recipient VARCHAR(255),
    message_type VARCHAR(32) NOT NULL CHECK (message_type IN ('text','media','location','contact','system')),
    status VARCHAR(32) NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','delivered','failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(conversation_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Payload separated to avoid bloating main table
CREATE TABLE IF NOT EXISTS message_payloads (
    message_id UUID PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    payload_type VARCHAR(32) NOT NULL,
    content JSONB,
    storage_url TEXT,
    checksum VARCHAR(128),
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attachments for large media; store pointers, not blobs
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_url TEXT NOT NULL,
    checksum VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_message_attachments_msg ON message_attachments(message_id);

-- Audit trail of message lifecycle
CREATE TABLE IF NOT EXISTS message_events (
    id BIGSERIAL PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (event_type IN ('received','processed','delivered','failed','attachment_uploaded'))
);
CREATE INDEX IF NOT EXISTS idx_message_events_msg_created ON message_events(message_id, created_at DESC);
