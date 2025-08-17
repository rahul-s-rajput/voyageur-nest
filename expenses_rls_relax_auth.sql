-- Relax expense module RLS: allow any authenticated user to manage expenses, budgets, categories, and line items

-- Drop admin-only trigger if present
DROP TRIGGER IF EXISTS trg_expenses_admin_approval ON public.expenses;
DROP FUNCTION IF EXISTS public.enforce_admin_on_expense_approval();

-- Ensure RLS enabled
ALTER TABLE IF EXISTS public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_line_items ENABLE ROW LEVEL SECURITY;

-- Replace restrictive policies with authenticated-all policies
DO $$
DECLARE 
  policy_name text;
  tables_name text;
  tables text[] := ARRAY['expense_categories', 'expenses', 'expense_budgets', 'expense_line_items'];
BEGIN
  FOREACH tables_name IN ARRAY tables LOOP
    -- Drop existing policies for the current table
    FOR policy_name IN 
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname='public' AND tablename = tables_name 
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_name, tables_name);
    END LOOP;

    -- Create new all-authenticated policy
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR ALL TO authenticated 
      USING (true) 
      WITH CHECK (true)
    ', tables_name || '_all_authenticated', tables_name);
  END LOOP;
