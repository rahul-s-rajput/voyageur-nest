-- Booking Enforcement Violation Views
-- Idempotent: drop and recreate views

BEGIN;

DROP VIEW IF EXISTS public.booking_enforcement_violations_today;
DROP VIEW IF EXISTS public.booking_enforcement_violations_overdue;

-- Today: bookings that should check in today but are not checked-in, and
-- bookings that should check out today but are not checked-out
CREATE VIEW public.booking_enforcement_violations_today AS
  (
    SELECT 
      b.id,
      b.property_id,
      b.guest_name,
      b.room_no,
      b.check_in,
      b.check_out,
      b.status,
      b.cancelled,
      'check-in-today'::text AS violation_type,
      b.created_at,
      b.updated_at
    FROM public.bookings b
    WHERE b.cancelled = false
      AND b.check_in = CURRENT_DATE
      AND b.status NOT IN ('checked-in', 'checked-out')
  )
  UNION ALL
  (
    SELECT 
      b.id,
      b.property_id,
      b.guest_name,
      b.room_no,
      b.check_in,
      b.check_out,
      b.status,
      b.cancelled,
      'check-out-today'::text AS violation_type,
      b.created_at,
      b.updated_at
    FROM public.bookings b
    WHERE b.cancelled = false
      AND b.check_out = CURRENT_DATE
      AND b.status <> 'checked-out'
  );

-- Overdue: bookings that should have checked in before today but didn't,
-- and bookings that should have checked out before today but haven't.
CREATE VIEW public.booking_enforcement_violations_overdue AS
  (
    SELECT 
      b.id,
      b.property_id,
      b.guest_name,
      b.room_no,
      b.check_in,
      b.check_out,
      b.status,
      b.cancelled,
      'overdue-check-in'::text AS violation_type,
      b.created_at,
      b.updated_at
    FROM public.bookings b
    WHERE b.cancelled = false
      AND b.check_in < CURRENT_DATE
      AND b.status NOT IN ('checked-in', 'checked-out')
  )
  UNION ALL
  (
    SELECT 
      b.id,
      b.property_id,
      b.guest_name,
      b.room_no,
      b.check_in,
      b.check_out,
      b.status,
      b.cancelled,
      'overdue-check-out'::text AS violation_type,
      b.created_at,
      b.updated_at
    FROM public.bookings b
    WHERE b.cancelled = false
      AND b.check_out < CURRENT_DATE
      AND b.status <> 'checked-out'
  );

COMMIT;
