-- Preserve chat_messages when chats/connections/queues are deleted.

ALTER TABLE chat_messages ALTER COLUMN chat_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chat_messages_chat_id_fkey'
      AND table_name = 'chat_messages'
  ) THEN
    ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_chat_id_fkey;
  END IF;
END$$;

ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_chat_id_fkey
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL;
