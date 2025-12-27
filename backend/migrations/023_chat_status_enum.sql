-- Enum-like constraint for chats.status
ALTER TABLE chats
  ADD CONSTRAINT chats_status_check CHECK (status IN ('UNASSIGNED','ASSIGNED','CLOSED','BLOCKED'));
