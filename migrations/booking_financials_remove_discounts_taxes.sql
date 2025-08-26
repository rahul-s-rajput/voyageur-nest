-- Remove discounts and taxes from booking_financials calculations and output
-- Gross and balance will now be based solely on charges_total

BEGIN;

CREATE OR REPLACE VIEW public.booking_financials AS
WITH
  charges AS (
    SELECT 
      bc.booking_id,
      bc.property_id,
      SUM(CASE WHEN bc.is_voided THEN 0 ELSE CASE WHEN bc.charge_type IN ('room','fnb','misc','service_fee') THEN bc.amount ELSE 0 END END)::numeric(12,2) AS charges_total,
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
  0::numeric(12,2) AS discounts_total,
  0::numeric(12,2) AS taxes_total,
  (COALESCE(c.charges_total,0))::numeric(12,2) AS gross_total,
  (COALESCE(p.payments_total,0) + COALESCE(b.payment_amount,0))::numeric(12,2) AS payments_total,
  COALESCE(p.refunds_total, 0)::numeric(12,2) AS refunds_total,
  ((COALESCE(c.charges_total,0))
    - (COALESCE(p.payments_total,0) + COALESCE(b.payment_amount,0))
    + COALESCE(p.refunds_total,0))::numeric(12,2) AS balance_due,
  CASE 
    WHEN (COALESCE(c.charges_total,0)) <= 0 THEN 'no-charges'
    WHEN ((COALESCE(c.charges_total,0))
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

REVOKE ALL ON public.booking_financials FROM PUBLIC;
GRANT SELECT ON public.booking_financials TO authenticated;

COMMIT;
