-- Device Tokens Cleanup (archive and safely deactivate)
BEGIN;

-- 1) Ensure archive table exists with same structure
CREATE TABLE IF NOT EXISTS device_tokens_archive (LIKE device_tokens INCLUDING ALL);
ALTER TABLE device_tokens_archive
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT now();

-- 2) Archive current records (avoid duplicates on re-run)
INSERT INTO device_tokens_archive (
  id, device_token, device_name, device_info, created_at, last_used_at, is_active, expires_at, archived_at
)
SELECT id, device_token, device_name, device_info, created_at, last_used_at, is_active, expires_at, now()
FROM device_tokens
ON CONFLICT (id) DO NOTHING;

-- 3) Deactivate all device tokens and expire them immediately
UPDATE device_tokens
SET is_active = false,
    expires_at = LEAST(expires_at, now()),
    last_used_at = now();

COMMIT;
