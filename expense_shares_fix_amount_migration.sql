-- Add fixed amount support to expense_shares

ALTER TABLE IF EXISTS public.expense_shares
  ADD COLUMN IF NOT EXISTS share_amount NUMERIC(12,2);

-- Optional helper index if querying by amount
CREATE INDEX IF NOT EXISTS idx_expense_shares_amount ON public.expense_shares(share_amount);


