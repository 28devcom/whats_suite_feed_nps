-- Módulo de mensajería masiva (broadcast) con colas internas y auditoría.
-- Incluye plantillas, campañas y mensajes individuales con reintentos y selección de conexión/retardo.

DO $$
DECLARE
  default_tenant UUID;
BEGIN
  SELECT id INTO default_tenant FROM tenants WHERE name = 'default' LIMIT 1;
  IF default_tenant IS NULL THEN
    INSERT INTO tenants (name) VALUES ('default') ON CONFLICT (name) DO NOTHING;
    SELECT id INTO default_tenant FROM tenants WHERE name = 'default' LIMIT 1;
  END IF;
END $$;

-- Función estable para obtener tenant por defecto (permitido en DEFAULT).
CREATE OR REPLACE FUNCTION default_tenant()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id FROM tenants WHERE name = 'default' LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS broadcast_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('text','image','file','tts')),
    body TEXT NOT NULL DEFAULT '',
    media JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id),
    tenant_id UUID NOT NULL DEFAULT default_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_broadcast_templates_created_at ON broadcast_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_templates_type ON broadcast_templates(type);
CREATE INDEX IF NOT EXISTS idx_broadcast_templates_tenant ON broadcast_templates(tenant_id);

CREATE TABLE IF NOT EXISTS broadcast_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    message_type VARCHAR(16) NOT NULL CHECK (message_type IN ('text','image','file','tts')),
    template_id UUID REFERENCES broadcast_templates(id) ON DELETE SET NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','error')),
    delay_min_ms INTEGER NOT NULL DEFAULT 0,
    delay_max_ms INTEGER NOT NULL DEFAULT 0,
    total_targets INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    connections TEXT[] NOT NULL DEFAULT '{}',
    last_delay_ms INTEGER,
    last_connection TEXT,
    last_error TEXT,
    tenant_id UUID NOT NULL DEFAULT default_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_created_at ON broadcast_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_status ON broadcast_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_template ON broadcast_campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_connections ON broadcast_campaigns USING GIN(connections);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_tenant ON broadcast_campaigns(tenant_id);

CREATE TABLE IF NOT EXISTS broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
    template_id UUID REFERENCES broadcast_templates(id) ON DELETE SET NULL,
    target VARCHAR(32) NOT NULL,
    message_type VARCHAR(16) NOT NULL CHECK (message_type IN ('text','image','file','tts')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','error')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    error_reason TEXT,
    session_name TEXT,
    delay_ms INTEGER,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    tenant_id UUID NOT NULL DEFAULT default_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at ON broadcast_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON broadcast_messages(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_session ON broadcast_messages(session_name);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_template ON broadcast_messages(template_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_campaign_status ON broadcast_messages(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_next_attempt ON broadcast_messages(next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_tenant ON broadcast_messages(tenant_id);

COMMENT ON TABLE broadcast_campaigns IS 'Campañas de broadcast masivo (cola interna, selección de conexión aleatoria).';
COMMENT ON TABLE broadcast_messages IS 'Mensajes individuales en cola; estados: pending, sending, sent, error.';
COMMENT ON COLUMN broadcast_campaigns.connections IS 'Lista de session_name de WhatsApp disponibles para balancear envíos.';
