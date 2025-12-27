-- Ensure whatsapp_sessions supports PostgreSQL-based Baileys auth state (no filesystem).
-- Adds required columns and constraints without dropping existing data.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'whatsapp_sessions'
  ) THEN
    CREATE TABLE whatsapp_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_name TEXT NOT NULL UNIQUE,
        creds JSONB NOT NULL DEFAULT '{}'::jsonb,
        keys JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'DISCONNECTED',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Add/normalize columns on existing table.
ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS session_name TEXT,
  ADD COLUMN IF NOT EXISTS creds JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS keys JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DISCONNECTED',
  ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMPTZ,
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Backfill session_name to avoid NULLs before constraint.
UPDATE whatsapp_sessions
SET session_name = COALESCE(session_name, connection_id::text, id::text, 'default')
WHERE session_name IS NULL;

ALTER TABLE whatsapp_sessions
  ALTER COLUMN session_name SET NOT NULL,
  ALTER COLUMN creds SET NOT NULL,
  ALTER COLUMN keys SET NOT NULL;

-- Enforce uniqueness on session_name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_sessions_session_name_key'
      AND table_name = 'whatsapp_sessions'
  ) THEN
    ALTER TABLE whatsapp_sessions
      ADD CONSTRAINT whatsapp_sessions_session_name_key UNIQUE (session_name);
  END IF;
END $$;

-- Index for lookups by session_name.
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_session_name ON whatsapp_sessions(session_name);
