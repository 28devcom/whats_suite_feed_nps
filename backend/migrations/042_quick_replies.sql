-- Módulo de Respuestas Rápidas con trazabilidad y aislamiento por tenant.

-- Asegurar tenant por defecto para backfill seguro.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE name = 'default') THEN
    INSERT INTO tenants (name) VALUES ('default') ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;

-- Función estable para default tenant (idempotente).
CREATE OR REPLACE FUNCTION default_tenant()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id FROM tenants WHERE name = 'default' LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT default_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
  titulo VARCHAR(160) NOT NULL,
  texto_base TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CHECK (jsonb_typeof(variables) = 'array')
);

-- Índices obligatorios y unicidad controlada por tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_quick_replies_tenant_titulo ON quick_replies(tenant_id, LOWER(titulo));
CREATE INDEX IF NOT EXISTS idx_quick_replies_tenant_activo ON quick_replies(tenant_id, activo);
CREATE INDEX IF NOT EXISTS idx_quick_replies_tenant_titulo ON quick_replies(tenant_id, titulo);
CREATE INDEX IF NOT EXISTS idx_quick_replies_tenant_created_at ON quick_replies(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_replies_tenant_updated_at ON quick_replies(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_replies_variables_gin ON quick_replies USING GIN (variables);

-- Auditoría inmutable para respuestas rápidas (ISO/IEC 27001).
CREATE TABLE IF NOT EXISTS quick_reply_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT default_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
  quick_reply_id UUID REFERENCES quick_replies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  accion VARCHAR(16) NOT NULL CHECK (accion IN ('CREATE','UPDATE','DELETE','USE')),
  variables_usadas JSONB NOT NULL DEFAULT '{}'::jsonb,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_reply_audit_tenant ON quick_reply_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_reply_audit_accion ON quick_reply_audit(accion);
CREATE INDEX IF NOT EXISTS idx_quick_reply_audit_quick_reply_id ON quick_reply_audit(quick_reply_id);
CREATE INDEX IF NOT EXISTS idx_quick_reply_audit_chat_id ON quick_reply_audit(chat_id);
