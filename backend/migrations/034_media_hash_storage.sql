-- Hash-based media storage with minimal metadata, ISO 27001 controls and filesystem-friendly paths.
-- No binaries are stored in DB; files live under /media/{year}/{month}/{hash_prefix}/{file_id}.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop legacy indexes tied to columns we are pruning
DROP INDEX IF EXISTS idx_media_files_session_created;
DROP INDEX IF EXISTS idx_media_files_checksum;
DROP INDEX IF EXISTS idx_media_files_metadata_gin;

-- Add minimal metadata columns (hash, retention, AV status) before pruning old ones
ALTER TABLE media_files
  ADD COLUMN IF NOT EXISTS hash TEXT,
  ADD COLUMN IF NOT EXISTS retention_policy VARCHAR(32) DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS av_status VARCHAR(16) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS av_checked_at TIMESTAMPTZ;

-- Backfill hash from checksum or deterministic fallback
UPDATE media_files
SET hash = COALESCE(
    hash,
    checksum,
    encode(digest(COALESCE(storage_url, '') || COALESCE(file_name, '') || id::text, 'sha256'), 'hex')
)
WHERE hash IS NULL;

UPDATE media_files
SET retention_policy = COALESCE(retention_policy, 'default')
WHERE retention_policy IS NULL;

-- Deterministic type derivation and storage path
-- Use immutable expressions (regex) for generated columns; avoid stable functions like to_char/format to pass immutability check.
ALTER TABLE media_files
  ADD COLUMN IF NOT EXISTS media_kind VARCHAR(16) GENERATED ALWAYS AS (
    CASE
      WHEN mime_type ~* '^audio/' THEN 'audio'
      WHEN mime_type ~* '^image/webp$' THEN 'sticker'
      WHEN mime_type ~* '^image/' THEN 'image'
      WHEN mime_type ~* '^video/' THEN 'video'
      WHEN mime_type ~* '^application/.+geo' OR mime_type ~* '^application/gpx' OR mime_type ~* '^application/kml' THEN 'location'
      ELSE 'document'
    END
  ) STORED,
  ADD COLUMN IF NOT EXISTS hash_prefix TEXT GENERATED ALWAYS AS (substring(hash FROM 1 FOR 6)) STORED;

-- Tighten constraints
ALTER TABLE media_files
  ALTER COLUMN hash SET NOT NULL,
  ALTER COLUMN retention_policy SET NOT NULL,
  ALTER COLUMN av_status SET NOT NULL,
  ADD CONSTRAINT media_files_retention_chk CHECK (retention_policy IN ('default','30d','90d','365d','legal_hold')),
  ADD CONSTRAINT media_files_av_status_chk CHECK (av_status IN ('pending','clean','quarantined','blocked')),
  ADD CONSTRAINT media_files_mime_chk CHECK (mime_type ~* '^[a-z0-9.+-]+/[a-z0-9.+-]+$'),
  ADD CONSTRAINT media_files_kind_chk CHECK (media_kind IN ('audio','image','video','document','sticker','location'));

-- Remove non-essential columns to keep DB footprint minimal
ALTER TABLE media_files
  DROP COLUMN IF EXISTS whatsapp_session_name,
  DROP COLUMN IF EXISTS remote_number,
  DROP COLUMN IF EXISTS file_name,
  DROP COLUMN IF EXISTS storage_url,
  DROP COLUMN IF EXISTS checksum,
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS updated_at;

-- Indexes optimized for hash lookups, retention sweeps and AV pipeline
-- Include partition key (created_at) to satisfy uniqueness on partitioned table
CREATE UNIQUE INDEX IF NOT EXISTS ux_media_files_hash_size ON media_files(hash, size_bytes, created_at);
CREATE INDEX IF NOT EXISTS idx_media_files_hash_prefix ON media_files(hash_prefix, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_files_retention ON media_files(retention_policy, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_files_av_pending ON media_files(created_at) WHERE av_status = 'pending';

-- Role-based access (logical; extend grants to app role as needed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'media_admin') THEN
    CREATE ROLE media_admin;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'media_uploader') THEN
    CREATE ROLE media_uploader;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'media_reader') THEN
    CREATE ROLE media_reader;
  END IF;
  -- Ensure current user keeps access
  GRANT media_admin TO CURRENT_USER;
  GRANT media_uploader TO media_admin;
  GRANT media_reader TO media_uploader, media_admin;
END $$;

REVOKE ALL ON media_files FROM PUBLIC;
GRANT SELECT ON media_files TO media_reader;
GRANT INSERT, UPDATE ON media_files TO media_uploader;
GRANT ALL ON media_files TO media_admin;

-- Antivirus hook via NOTIFY and stricter sync trigger
CREATE OR REPLACE FUNCTION sync_media_files_from_attachments() RETURNS TRIGGER AS $$
DECLARE
    v_hash TEXT;
    v_chat UUID;
    v_retention TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM media_files WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    IF NEW.message_created_at IS NULL THEN
        SELECT created_at INTO NEW.message_created_at FROM messages_core WHERE id = NEW.message_id;
    END IF;

    SELECT chat_id INTO v_chat FROM messages_core WHERE id = NEW.message_id AND created_at = NEW.message_created_at;
    v_retention := COALESCE(current_setting('app.media_retention_policy', true), 'default');

    v_hash := COALESCE(
        NEW.checksum,
        encode(digest(COALESCE(NEW.storage_url, '') || COALESCE(NEW.file_name, '') || NEW.id::text, 'sha256'), 'hex')
    );
    IF v_hash IS NULL THEN
        RAISE EXCEPTION 'media hash required for attachment %', NEW.id;
    END IF;

    INSERT INTO media_files (id, message_id, message_created_at, chat_id, mime_type, size_bytes, hash, retention_policy, av_status, created_at)
    VALUES (
        NEW.id,
        NEW.message_id,
        NEW.message_created_at,
        v_chat,
        NEW.mime_type,
        COALESCE(NEW.size_bytes, 0),
        v_hash,
        v_retention,
        'pending',
        COALESCE(NEW.created_at, NOW())
    )
    ON CONFLICT (id, created_at) DO UPDATE
    SET hash = EXCLUDED.hash,
        mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes,
        chat_id = COALESCE(media_files.chat_id, EXCLUDED.chat_id),
        retention_policy = COALESCE(media_files.retention_policy, EXCLUDED.retention_policy),
        av_status = CASE WHEN media_files.av_status = 'pending' THEN EXCLUDED.av_status ELSE media_files.av_status END;

    PERFORM pg_notify('media_av_scan', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_message_attachments_sync_media_files ON message_attachments;
CREATE TRIGGER trg_message_attachments_sync_media_files
AFTER INSERT OR UPDATE OR DELETE ON message_attachments
FOR EACH ROW EXECUTE FUNCTION sync_media_files_from_attachments();
