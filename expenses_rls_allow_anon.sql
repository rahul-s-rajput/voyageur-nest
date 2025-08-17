-- Allow anonymous (anon) access for expense module tables since app uses device tokens, not Supabase auth

-- Ensure RLS enabled
ALTER TABLE IF EXISTS public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_line_items ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on target tables
DO $$
DECLARE 
  policy_name text;
  table_name text;
  tables text[] := ARRAY['expense_categories', 'expenses', 'expense_budgets', 'expense_line_items'];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    FOR policy_name IN 
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname='public' AND tablename = table_name 
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_name, table_name);
    END LOOP;
  END LOOP;
END$$;

-- Create permissive anon policies (mirror authenticated too if needed)

-- expense_categories
CREATE POLICY expense_categories_select_anon ON public.expense_categories
  FOR SELECT TO anon USING (true);
CREATE POLICY expense_categories_insert_anon ON public.expense_categories
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY expense_categories_update_anon ON public.expense_categories
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY expense_categories_delete_anon ON public.expense_categories
  FOR DELETE TO anon USING (true);

-- expenses
CREATE POLICY expenses_select_anon ON public.expenses
  FOR SELECT TO anon USING (true);
CREATE POLICY expenses_insert_anon ON public.expenses
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY expenses_update_anon ON public.expenses
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY expenses_delete_anon ON public.expenses
  FOR DELETE TO anon USING (true);

-- expense_budgets
CREATE POLICY expense_budgets_select_anon ON public.expense_budgets
  FOR SELECT TO anon USING (true);
CREATE POLICY expense_budgets_insert_anon ON public.expense_budgets
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY expense_budgets_update_anon ON public.expense_budgets
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY expense_budgets_delete_anon ON public.expense_budgets
  FOR DELETE TO anon USING (true);

-- expense_line_items
CREATE POLICY expense_line_items_select_anon ON public.expense_line_items
  FOR SELECT TO anon USING (true);
CREATE POLICY expense_line_items_insert_anon ON public.expense_line_items
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY expense_line_items_update_anon ON public.expense_line_items
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY expense_line_items_delete_anon ON public.expense_line_items
