-- Add retry/backoff support to translation_jobs
ALTER TABLE public.translation_jobs
  ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_translation_jobs_status_next_attempt
  ON public.translation_jobs(status, next_attempt_at);




