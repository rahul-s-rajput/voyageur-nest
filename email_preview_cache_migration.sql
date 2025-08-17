-- Cache table to store precomputed previews per email
CREATE TABLE IF NOT EXISTS public.email_preview_cache (
  email_message_id UUID PRIMARY KEY REFERENCES public.email_messages(id) ON DELETE CASCADE,
  preview_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_preview_cache_email ON public.email_preview_cache(email_message_id);

COMMIT;

