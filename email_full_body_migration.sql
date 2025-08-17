-- Add full body and headers to email_messages; add retry scheduling to email_parse_queue
BEGIN;

ALTER TABLE IF EXISTS public.email_messages
  ADD COLUMN IF NOT EXISTS body_plain TEXT,
  ADD COLUMN IF NOT EXISTS headers JSONB;

ALTER TABLE IF EXISTS public.email_parse_queue
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_parse_queue_pending_window
  ON public.email_parse_queue (status, next_attempt_at);

COMMIT;


