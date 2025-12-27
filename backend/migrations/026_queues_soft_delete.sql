-- Add soft delete support to queues
ALTER TABLE queues
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill active based on deleted_at if needed
UPDATE queues SET active = false WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS queues_deleted_at_idx ON queues(deleted_at);
