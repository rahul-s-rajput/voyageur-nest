-- Queue table for AI email parsing
CREATE TABLE IF NOT EXISTS public.email_parse_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','processing','done','error')) DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_parse_queue_email ON public.email_parse_queue(email_message_id);
CREATE INDEX IF NOT EXISTS idx_email_parse_queue_status ON public.email_parse_queue(status);

-- Trigger to enqueue on new email_messages insert
CREATE OR REPLACE FUNCTION public.enqueue_email_for_parse()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enqueue if not already processed
  IF NEW.processed = false THEN
    INSERT INTO public.email_parse_queue(email_message_id)
    VALUES (NEW.id)
    ON CONFLICT (email_message_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_email_for_parse ON public.email_messages;
CREATE TRIGGER trg_enqueue_email_for_parse
AFTER INSERT ON public.email_messages
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_email_for_parse();

COMMIT;

