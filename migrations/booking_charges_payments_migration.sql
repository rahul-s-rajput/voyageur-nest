-- ============================================================
-- Booking Charges & Payments Schema + RLS + Financials View
-- Story: 7.1.booking-charges-payments-schema-and-rls
-- ============================================================

BEGIN;
-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Helper: current_property_id() to read from JWT/session context
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_property_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_claims json;
  prop_id uuid;
BEGIN
  -- Prefer request.jwt.claims when available (used by PostgREST/Supabase)
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true)::json;
  EXCEPTION WHEN OTHERS THEN
    jwt_claims := '{}'::json;
  END;

  IF jwt_claims ? 'property_id' THEN
    prop_id := (jwt_claims->>'property_id')::uuid;
  END IF;

  -- Fallback to optional per-request setting if provided by app
  IF prop_id IS NULL THEN
    BEGIN
      prop_id := current_setting('request.property_id', true)::uuid;
    EXCEPTION WHEN OTHERS THEN
      prop_id := NULL;
    END;
  END IF;

  RETURN prop_id;
END;
$$;

-- Ensure update_updated_at_column() exists (idempotent pattern)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  charge_type text NOT NULL CHECK (charge_type IN ('room','fnb','misc','discount','tax','service_fee')),
  description text,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_amount numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  is_voided boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Consistency: amount should generally equal quantity * unit_amount for non-discount/tax rows
  CHECK (quantity >= 0 AND unit_amount >= 0 AND amount >= 0)
);

CREATE TABLE IF NOT EXISTS public.booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('payment','refund','adjustment')),
  method text, -- e.g., cash, card, upi, bank, other
  reference_no text, -- txn id or notes
  amount numeric(12,2) NOT NULL DEFAULT 0,
  is_voided boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (amount >= 0)
);

-- ------------------------------------------------------------
-- Triggers: updated_at maintenance
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_booking_charges_updated_at ON public.booking_charges;
CREATE TRIGGER trg_booking_charges_updated_at
BEFORE UPDATE ON public.booking_charges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_booking_payments_updated_at ON public.booking_payments;
CREATE TRIGGER trg_booking_payments_updated_at
BEFORE UPDATE ON public.booking_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Indexes (including partial for non-voided rows)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_booking_charges_booking
  ON public.booking_charges(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_charges_property_booking_active
  ON public.booking_charges(property_id, booking_id)
  WHERE is_voided = false;

CREATE INDEX IF NOT EXISTS idx_booking_charges_type_active
  ON public.booking_charges(charge_type)
  WHERE is_voided = false;

CREATE INDEX IF NOT EXISTS idx_booking_payments_booking
  ON public.booking_payments(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_payments_property_booking_active
  ON public.booking_payments(property_id, booking_id)
  WHERE is_voided = false;

CREATE INDEX IF NOT EXISTS idx_booking_payments_type_active
  ON public.booking_payments(payment_type)
  WHERE is_voided = false;

-- ------------------------------------------------------------
-- RLS Policies (property-scoped + admin override)
-- ------------------------------------------------------------
ALTER TABLE public.booking_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='booking_charges') THEN
    EXECUTE 'DROP POLICY IF EXISTS "booking_charges_property_read" ON public.booking_charges';
    EXECUTE 'DROP POLICY IF EXISTS "booking_charges_property_write" ON public.booking_charges';
    EXECUTE 'DROP POLICY IF EXISTS "booking_charges_property_update" ON public.booking_charges';
    EXECUTE 'DROP POLICY IF EXISTS "booking_charges_property_delete" ON public.booking_charges';
    EXECUTE 'DROP POLICY IF EXISTS "booking_charges_admin_full" ON public.booking_charges';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='booking_payments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "booking_payments_property_read" ON public.booking_payments';
    EXECUTE 'DROP POLICY IF EXISTS "booking_payments_property_write" ON public.booking_payments';
    EXECUTE 'DROP POLICY IF EXISTS "booking_payments_property_update" ON public.booking_payments';
    EXECUTE 'DROP POLICY IF EXISTS "booking_payments_property_delete" ON public.booking_payments';
    EXECUTE 'DROP POLICY IF EXISTS "booking_payments_admin_full" ON public.booking_payments';
  END IF;
END $$;

-- Property-scoped policies
CREATE POLICY "booking_charges_property_read"
  ON public.booking_charges
  FOR SELECT TO authenticated
  USING (
    property_id = public.current_property_id() OR public.is_admin()
  );

CREATE POLICY "booking_charges_property_write"
  ON public.booking_charges
  FOR INSERT TO authenticated
  WITH CHECK (
    property_id = public.current_property_id() OR public.is_admin()
  );

CREATE POLICY "booking_charges_property_update"
  ON public.booking_charges
  FOR UPDATE TO authenticated
  USING (
    property_id = public.current_property_id() OR public.is_admin()
  )
  WITH CHECK (
    property_id = public.current_property_id() OR public.is_admin()
  );

CREATE POLICY "booking_charges_property_delete"
  ON public.booking_charges
  FOR DELETE TO authenticated
  USING (
    property_id = public.current_property_id() OR public.is_admin()
  );

CREATE POLICY "booking_payments_property_read"
  ON public.booking_payments
  FOR SELECT TO authenticated
  USING (
    property_id = public.current_property_id() OR public.is_admin()
  );

CREATE POLICY "booking_payments_property_write"
  ON public.booking_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    property_id = public.current_property_id() OR public.is_admin()
  );

CREATE POLICY "booking_payments_property_update"
  ON public.booking_payments
  FOR UPDATE TO authenticated
  USING (
    property_id = public.current_property_id() OR public.is_admin()
  )
  WITH CHECK (
    property_id = public.current_property_id() OR public.is_admin()
  );

CREATE POLICY "booking_payments_property_delete"
  ON public.booking_payments
  FOR DELETE TO authenticated
  USING (
    property_id = public.current_property_id() OR public.is_admin()
  );

-- Optional explicit admin policy (redundant with OR is_admin(), but clearer)
CREATE POLICY "booking_charges_admin_full"
  ON public.booking_charges
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "booking_payments_admin_full"
  ON public.booking_payments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- Derived View: booking_financials
-- Aggregates per booking: charges/discounts/taxes/payments/refunds/balance & status
-- Includes legacy bookings.payment_amount into payments_total for compatibility
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.booking_financials AS
WITH
  charges AS (
    SELECT 
      bc.booking_id,
      bc.property_id,
      SUM(CASE WHEN bc.is_voided THEN 0 ELSE CASE WHEN bc.charge_type IN ('room','fnb','misc','service_fee') THEN bc.amount ELSE 0 END END)::numeric(12,2) AS charges_total,
      SUM(CASE WHEN bc.is_voided THEN 0 ELSE CASE WHEN bc.charge_type = 'discount' THEN bc.amount ELSE 0 END END)::numeric(12,2) AS discounts_total,
      SUM(CASE WHEN bc.is_voided THEN 0 ELSE CASE WHEN bc.charge_type = 'tax' THEN bc.amount ELSE 0 END END)::numeric(12,2) AS taxes_total,
      MAX(bc.updated_at) AS last_charge_update
    FROM public.booking_charges bc
    GROUP BY bc.booking_id, bc.property_id
  ),
  payments AS (
    SELECT 
      bp.booking_id,
      bp.property_id,
      SUM(CASE WHEN bp.is_voided THEN 0 ELSE CASE WHEN bp.payment_type = 'payment' THEN bp.amount ELSE 0 END END)::numeric(12,2) AS payments_total,
      SUM(CASE WHEN bp.is_voided THEN 0 ELSE CASE WHEN bp.payment_type = 'refund' THEN bp.amount ELSE 0 END END)::numeric(12,2) AS refunds_total,
      MAX(bp.updated_at) AS last_payment_update
    FROM public.booking_payments bp
    GROUP BY bp.booking_id, bp.property_id
  )
SELECT 
  b.id AS booking_id,
  b.property_id,
  COALESCE(c.charges_total, 0)::numeric(12,2) AS charges_total,
  COALESCE(c.discounts_total, 0)::numeric(12,2) AS discounts_total,
  COALESCE(c.taxes_total, 0)::numeric(12,2) AS taxes_total,
  (COALESCE(c.charges_total,0) - COALESCE(c.discounts_total,0) + COALESCE(c.taxes_total,0))::numeric(12,2) AS gross_total,
  -- include legacy payments for compatibility
  (COALESCE(p.payments_total,0) + COALESCE(b.payment_amount,0))::numeric(12,2) AS payments_total,
  COALESCE(p.refunds_total, 0)::numeric(12,2) AS refunds_total,
  ((COALESCE(c.charges_total,0) - COALESCE(c.discounts_total,0) + COALESCE(c.taxes_total,0))
    - (COALESCE(p.payments_total,0) + COALESCE(b.payment_amount,0))
    + COALESCE(p.refunds_total,0))::numeric(12,2) AS balance_due,
  CASE 
    WHEN (COALESCE(c.charges_total,0) - COALESCE(c.discounts_total,0) + COALESCE(c.taxes_total,0)) <= 0 THEN 'no-charges'
    WHEN ((COALESCE(c.charges_total,0) - COALESCE(c.discounts_total,0) + COALESCE(c.taxes_total,0))
          - (COALESCE(p.payments_total,0) + COALESCE(b.payment_amount,0))
          + COALESCE(p.refunds_total,0)) <= 0 THEN 'paid'
    WHEN (COALESCE(p.payments_total,0) + COALESCE(b.payment_amount,0)) > 0 THEN 'partial'
    ELSE 'unpaid'
  END AS status_derived,
  GREATEST(
    COALESCE(c.last_charge_update, b.updated_at),
    COALESCE(p.last_payment_update, b.updated_at),
    b.updated_at
  ) AS last_activity_at
FROM public.bookings b
LEFT JOIN charges c ON c.booking_id = b.id AND c.property_id = b.property_id
LEFT JOIN payments p ON p.booking_id = b.id AND p.property_id = b.property_id;

-- Limit view exposure
REVOKE ALL ON public.booking_financials FROM PUBLIC;
GRANT SELECT ON public.booking_financials TO authenticated;

-- Function privileges
GRANT EXECUTE ON FUNCTION public.current_property_id() TO anon, authenticated;

-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_charges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_payments;

COMMIT;
