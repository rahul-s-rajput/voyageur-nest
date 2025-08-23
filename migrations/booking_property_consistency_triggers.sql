-- Enforce that booking_charges.property_id and booking_payments.property_id
-- always match the parent bookings.property_id
-- Idempotent: replaces functions and recreates triggers

BEGIN;

-- Function for booking_charges
CREATE OR REPLACE FUNCTION public.enforce_booking_charge_property_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_property_id uuid;
BEGIN
  IF NEW.booking_id IS NULL THEN
    RAISE EXCEPTION 'booking_id must not be NULL on booking_charges';
  END IF;

  SELECT b.property_id INTO expected_property_id
  FROM public.bookings b
  WHERE b.id = NEW.booking_id;

  IF expected_property_id IS NULL THEN
    RAISE EXCEPTION 'Parent booking (%) not found for booking_charges', NEW.booking_id;
  END IF;

  IF NEW.property_id IS DISTINCT FROM expected_property_id THEN
    RAISE EXCEPTION 'booking_charges.property_id (%) must match parent bookings.property_id (%) for booking_id %',
      NEW.property_id, expected_property_id, NEW.booking_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Function for booking_payments
CREATE OR REPLACE FUNCTION public.enforce_booking_payment_property_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_property_id uuid;
BEGIN
  IF NEW.booking_id IS NULL THEN
    RAISE EXCEPTION 'booking_id must not be NULL on booking_payments';
  END IF;

  SELECT b.property_id INTO expected_property_id
  FROM public.bookings b
  WHERE b.id = NEW.booking_id;

  IF expected_property_id IS NULL THEN
    RAISE EXCEPTION 'Parent booking (%) not found for booking_payments', NEW.booking_id;
  END IF;

  IF NEW.property_id IS DISTINCT FROM expected_property_id THEN
    RAISE EXCEPTION 'booking_payments.property_id (%) must match parent bookings.property_id (%) for booking_id %',
      NEW.property_id, expected_property_id, NEW.booking_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate triggers for booking_charges
DROP TRIGGER IF EXISTS trg_booking_charges_property_consistency ON public.booking_charges;
CREATE TRIGGER trg_booking_charges_property_consistency
BEFORE INSERT OR UPDATE OF booking_id, property_id ON public.booking_charges
FOR EACH ROW
EXECUTE FUNCTION public.enforce_booking_charge_property_match();

-- Recreate triggers for booking_payments
DROP TRIGGER IF EXISTS trg_booking_payments_property_consistency ON public.booking_payments;
CREATE TRIGGER trg_booking_payments_property_consistency
BEFORE INSERT OR UPDATE OF booking_id, property_id ON public.booking_payments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_booking_payment_property_match();

COMMIT;
