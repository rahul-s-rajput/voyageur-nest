-- Allow NULL share_percent when using fixed share_amount; enforce sensible constraints

ALTER TABLE IF EXISTS public.expense_shares
  ALTER COLUMN share_percent DROP NOT NULL;

-- Drop old constraints named implicitly, then add a composite check
DO $$
BEGIN
  -- Try to drop an existing constraint if it matches typical naming; ignore if not found
  BEGIN
    ALTER TABLE public.expense_shares DROP CONSTRAINT IF EXISTS expense_shares_share_percent_check;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
    NULL;
  END;
END$$;

-- Ensure either share_percent or share_amount is provided; enforce valid ranges
ALTER TABLE public.expense_shares
  ADD CONSTRAINT expense_shares_valid_check
  CHECK (
    (
      share_percent IS NOT NULL AND share_percent >= 0 AND share_percent <= 100
    )
    OR
    (
      share_amount IS NOT NULL AND share_amount >= 0
    )
  );


