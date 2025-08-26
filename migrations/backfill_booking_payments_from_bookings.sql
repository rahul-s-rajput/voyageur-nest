-- Backfill booking_payments from legacy bookings.payment_amount
-- Idempotent: only inserts for bookings that currently have no booking_payments
-- Note: Run with elevated privileges to bypass RLS.

BEGIN;

INSERT INTO public.booking_payments (
  property_id,
  booking_id,
  payment_type,
  method,
  reference_no,
  amount,
  is_voided,
  created_at
)
SELECT
  b.property_id,
  b.id,
  'payment'::text AS payment_type,
  NULLIF(b.payment_mode, '') AS method,
  NULL::text AS reference_no,
  b.payment_amount::numeric(12,2) AS amount,
  false AS is_voided,
  b.created_at AS created_at
FROM public.bookings b
WHERE COALESCE(b.payment_amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.booking_payments bp
    WHERE bp.booking_id = b.id
      AND bp.property_id = b.property_id
      AND bp.is_voided = false
  );

COMMIT;
