-- Normaliza estados de whatsapp_sessions a lower-case y relaja constraint para compatibilidad.
ALTER TABLE whatsapp_sessions
  ALTER COLUMN status SET DEFAULT 'pending';

UPDATE whatsapp_sessions
SET status = LOWER(status)
WHERE status IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'whatsapp_sessions' AND constraint_name = 'whatsapp_sessions_status_check'
  ) THEN
    ALTER TABLE whatsapp_sessions DROP CONSTRAINT whatsapp_sessions_status_check;
  END IF;
END $$;

ALTER TABLE whatsapp_sessions
  ADD CONSTRAINT whatsapp_sessions_status_check CHECK (LOWER(status) IN ('pending','connected','disconnected'));
