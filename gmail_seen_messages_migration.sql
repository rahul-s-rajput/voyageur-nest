-- Track Gmail messages we've classified/processed to avoid reprocessing and to skip non-booking emails entirely
BEGIN;

CREATE TABLE IF NOT EXISTS public.gmail_seen_messages (
  gmail_message_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('booking','ignored')),
  reason TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;


