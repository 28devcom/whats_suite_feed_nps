-- Historial de asignaciones y eventos de estado para conversaciones
CREATE TABLE IF NOT EXISTS conversation_assignment_history (
    id BIGSERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    reason TEXT,
    auto BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assignment_history_conversation ON conversation_assignment_history(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS conversation_status_events (
    id BIGSERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_events_conversation ON conversation_status_events(conversation_id, created_at DESC);
