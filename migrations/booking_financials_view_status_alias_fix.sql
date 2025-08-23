-- Update booking_financials column name using ALTER VIEW to avoid 42P16
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'booking_financials' 
      AND column_name = 'status'
  ) THEN
    EXECUTE 'ALTER VIEW public.booking_financials RENAME COLUMN status TO status_derived';
  END IF;
END $$;

-- Re-apply privileges (idempotent)
REVOKE ALL ON public.booking_financials FROM PUBLIC;
GRANT SELECT ON public.booking_financials TO authenticated;

COMMIT;
