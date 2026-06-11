-- Enforce booking_charges.amount = quantity * unit_amount server-side.
--
-- Context: amount is currently a plain numeric column populated by the client
-- services. The CHECK constraint only guarantees amount >= 0, so a buggy or
-- tampered client could persist an amount that disagrees with
-- quantity * unit_amount, corrupting every figure derived from the
-- booking_financials view. This trigger makes the database the source of truth
-- for the line total on the charge types that feed the financial totals
-- (room / fnb / misc / service_fee). discount / tax rows are left untouched
-- because they are entered as lump sums (and are currently neutered to 0 in the
-- view anyway).
--
-- Apply via the Supabase SQL editor (idempotent — safe to re-run).

CREATE OR REPLACE FUNCTION enforce_booking_charge_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.charge_type IN ('room', 'fnb', 'misc', 'service_fee') THEN
    NEW.amount := ROUND(COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_amount, 0), 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_booking_charge_amount ON booking_charges;

CREATE TRIGGER trg_enforce_booking_charge_amount
  BEFORE INSERT OR UPDATE ON booking_charges
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_charge_amount();

-- One-time reconciliation of any existing rows that drifted.
UPDATE booking_charges
SET amount = ROUND(COALESCE(quantity, 0) * COALESCE(unit_amount, 0), 2)
WHERE charge_type IN ('room', 'fnb', 'misc', 'service_fee')
  AND amount IS DISTINCT FROM ROUND(COALESCE(quantity, 0) * COALESCE(unit_amount, 0), 2);
