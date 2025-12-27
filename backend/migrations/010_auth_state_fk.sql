-- Ajusta el almacenamiento de auth state para que referencie whatsapp_connections (no filesystem).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_auth_state_session_id_fkey'
  ) THEN
    ALTER TABLE whatsapp_auth_state DROP CONSTRAINT whatsapp_auth_state_session_id_fkey;
  END IF;
END $$;

ALTER TABLE whatsapp_auth_state
  ADD CONSTRAINT whatsapp_auth_state_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES whatsapp_connections(id) ON DELETE CASCADE;
