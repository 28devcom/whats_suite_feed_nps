-- Contactos globales por número (ISO 27001: datos mínimos y trazables).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE name = 'default') THEN
    INSERT INTO tenants (name) VALUES ('default');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_normalized VARCHAR(32) NOT NULL,
  display_name VARCHAR(255),
  avatar_ref TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, phone_normalized)
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
