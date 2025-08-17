-- Add approval notes and approved_at to expenses for auditability

ALTER TABLE IF EXISTS public.expenses
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Optional: backfill approved_at where approved_by is set but timestamp missing
UPDATE public.expenses
SET approved_at = COALESCE(approved_at, updated_at)
WHERE approval_status IN ('approved','rejected') AND approved_at IS NULL;


