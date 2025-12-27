-- Preserve chats when queues/connections are removed.

ALTER TABLE chats
  ALTER COLUMN queue_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chats_queue_id_fkey'
      AND table_name = 'chats'
  ) THEN
    ALTER TABLE chats DROP CONSTRAINT chats_queue_id_fkey;
  END IF;
END$$;

ALTER TABLE chats
  ADD CONSTRAINT chats_queue_id_fkey
  FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE SET NULL;
