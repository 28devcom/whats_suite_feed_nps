-- WhatsApp session state stored in PostgreSQL (no filesystem auth)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','disconnected')),
    last_qr TEXT,
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_updated_at ON whatsapp_sessions(updated_at DESC);

-- Key-value store for Baileys auth state per session (creds + signal keys)
CREATE TABLE IF NOT EXISTS whatsapp_auth_state (
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_id, key)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_auth_state_session ON whatsapp_auth_state(session_id);
