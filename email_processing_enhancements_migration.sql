-- Email processing + booking source enhancements
-- 1) Flag email messages as processed after approval so they don't reappear
ALTER TABLE IF EXISTS public.email_messages
  ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_email_messages_processed ON public.email_messages(processed);

-- 2) Booking source and additional details to record OTA and reference ids
ALTER TABLE IF EXISTS public.bookings
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_details JSONB;

CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings(source);

-- 3) Mark already processed emails based on imports with processed_at
UPDATE public.email_messages m
SET processed = true
WHERE processed = false
  AND EXISTS (
    SELECT 1 FROM public.email_booking_imports i
    WHERE i.email_message_id = m.id AND i.processed_at IS NOT NULL
  );

COMMIT;

