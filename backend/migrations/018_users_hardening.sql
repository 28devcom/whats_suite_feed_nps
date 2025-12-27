-- Align users table with enterprise schema (username, status) and add indexes.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) DEFAULT 'ACTIVE';

-- Backfill new columns from existing data
UPDATE users
SET username = COALESCE(username, LOWER(email)),
    name = COALESCE(name, full_name),
    status = COALESCE(status, 'ACTIVE');

ALTER TABLE users
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Enforce status constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_status_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_status_check;
  END IF;
END $$;

ALTER TABLE users
  ADD CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'INACTIVE'));

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS users_username_uindex ON users(username);
CREATE INDEX IF NOT EXISTS users_status_index ON users(status);
CREATE INDEX IF NOT EXISTS users_email_index ON users(email);

COMMENT ON COLUMN users.password_hash IS 'bcrypt hash; never returned in responses';
COMMENT ON COLUMN users.status IS 'ACTIVE | INACTIVE';
