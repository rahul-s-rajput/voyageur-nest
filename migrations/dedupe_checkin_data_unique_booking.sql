-- Fix: duplicate checkin_data rows for a single booking brick the guest check-in page.
--
-- Root cause: the public /checkin form could be submitted twice (the submit button was
-- only disabled by a prop that the parent flipped AFTER the async guest-profile lookup +
-- ID-photo upload finished, leaving a window where a second click fired a second insert).
-- getCheckInDataByBookingId() then used .maybeSingle(), which throws
-- "JSON object requested, multiple (or no) rows returned" whenever 2+ rows exist.
--
-- This migration (a) removes existing duplicates, keeping the earliest row per booking,
-- and (b) adds a UNIQUE constraint so the database itself rejects a second insert.
-- Run AFTER deploying the client fix (read path no longer assumes a single row; submit
-- button is guarded). Idempotent: safe to re-run.

BEGIN;

-- (a) Delete duplicate rows, keeping the earliest created_at per booking_id.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY booking_id ORDER BY created_at ASC, id ASC) AS rn
  FROM checkin_data
)
DELETE FROM checkin_data
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- (b) Enforce one check-in record per booking going forward.
CREATE UNIQUE INDEX IF NOT EXISTS checkin_data_booking_id_key
  ON checkin_data (booking_id);

COMMIT;
