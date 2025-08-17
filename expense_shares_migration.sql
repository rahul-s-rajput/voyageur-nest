-- Shared expenses allocation across properties

CREATE TABLE IF NOT EXISTS public.expense_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  share_percent NUMERIC(5,2) NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (expense_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_shares_expense ON public.expense_shares(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_shares_property ON public.expense_shares(property_id);

-- updated_at trigger
CREATE TRIGGER trg_expense_shares_updated_at
BEFORE UPDATE ON public.expense_shares
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies (anon, matching app model)
ALTER TABLE public.expense_shares ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname='public' AND tablename='expense_shares' 
  LOOP
    EXECUTE format('DROP POLICY %I ON public.expense_shares', r.policyname);
  END LOOP;
END$$;

CREATE POLICY expense_shares_select_anon ON public.expense_shares
  FOR SELECT TO anon USING (true);
CREATE POLICY expense_shares_insert_anon ON public.expense_shares
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY expense_shares_update_anon ON public.expense_shares
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY expense_shares_delete_anon ON public.expense_shares
  FOR DELETE TO anon USING (true);


