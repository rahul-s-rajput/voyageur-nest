-- Backfill missing 'room' booking_charges from legacy bookings.total_amount
-- Idempotent: inserts only when a non-voided room charge does not already exist
-- Run once after deploying booking_charges schema and before removing UI fallbacks

BEGIN;

INSERT INTO public.booking_charges (
  property_id,
  booking_id,
  charge_type,
  description,
  quantity,
  unit_amount,
  amount,
  created_at
)
SELECT
  b.property_id,
  b.id,
  'room'::text AS charge_type,
  'Room charge (backfill)'::text AS description,
  1::numeric(12,2) AS quantity,
  (b.total_amount)::numeric(12,2) AS unit_amount,
  (b.total_amount)::numeric(12,2) AS amount,
  COALESCE(b.booking_date::timestamptz, b.created_at, now()) AS created_at
FROM public.bookings b
WHERE
  b.total_amount IS NOT NULL
  AND b.total_amount::numeric(12,2) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.booking_charges bc
    WHERE bc.booking_id = b.id
      AND bc.property_id = b.property_id
      AND bc.charge_type = 'room'
      AND bc.is_voided = false
  );

COMMIT;
