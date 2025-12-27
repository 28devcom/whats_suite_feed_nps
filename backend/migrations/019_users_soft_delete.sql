-- Soft delete support for users: add deleted_at and index.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON users(deleted_at);
