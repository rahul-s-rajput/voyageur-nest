-- Email ingestion core tables
-- Creates: email_messages, email_ai_extractions, email_booking_imports

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT UNIQUE NOT NULL,
  thread_id TEXT,
  label_ids TEXT[] DEFAULT '{}',
  sender TEXT,
  recipient TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ,
  snippet TEXT,
  mime_summary JSONB,
  raw_source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON public.email_messages (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_sender ON public.email_messages (sender);

CREATE TABLE IF NOT EXISTS public.email_ai_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  output_json JSONB NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  reasoning TEXT,
  status TEXT NOT NULL CHECK (status IN ('auto_imported','needs_review','ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_ai_extractions_email_id ON public.email_ai_extractions (email_message_id);
CREATE INDEX IF NOT EXISTS idx_email_ai_extractions_status ON public.email_ai_extractions (status);

CREATE TABLE IF NOT EXISTS public.email_booking_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES public.email_ai_extractions(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('new','modified','cancelled')),
  decision TEXT NOT NULL CHECK (decision IN ('auto','manual-approved','manual-rejected')),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  import_errors JSONB,
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_booking_imports_property ON public.email_booking_imports (property_id);
CREATE INDEX IF NOT EXISTS idx_email_booking_imports_booking ON public.email_booking_imports (booking_id);

-- Useful composite uniqueness to avoid duplicate imports per message
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_import_per_message ON public.email_booking_imports (email_message_id);

COMMIT; 