-- Teardown: OTA email-parsing / Gmail-ingestion feature.
--
-- The client services, UI, and the parse-email / gmail-poll / gmail-auth-callback
-- edge functions have been removed. Run this in the Supabase SQL editor to drop
-- the now-unused tables, trigger, and function.
--
-- IMPORTANT: bookings.source and bookings.source_details are intentionally NOT
-- dropped — they are shared with iCal import (source = 'ical_import') and manual
-- booking create/update, and are read by booking filters and analytics.

BEGIN;

-- Enqueue trigger + function (trigger lives on email_messages).
DROP TRIGGER IF EXISTS trg_enqueue_email_for_parse ON public.email_messages;
DROP FUNCTION IF EXISTS public.enqueue_email_for_parse();

-- Children that reference email_messages / email_ai_extractions first.
DROP TABLE IF EXISTS public.email_parse_queue       CASCADE;
DROP TABLE IF EXISTS public.email_preview_cache     CASCADE;
DROP TABLE IF EXISTS public.email_booking_imports   CASCADE;
DROP TABLE IF EXISTS public.email_ai_extractions    CASCADE;
DROP TABLE IF EXISTS public.gmail_seen_messages     CASCADE;

-- Parent.
DROP TABLE IF EXISTS public.email_messages          CASCADE;

-- Standalone Gmail OAuth/config tables.
DROP TABLE IF EXISTS public.gmail_tokens            CASCADE;
DROP TABLE IF EXISTS public.gmail_settings          CASCADE;

COMMIT;
