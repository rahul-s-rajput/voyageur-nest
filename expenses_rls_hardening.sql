-- Expense Module RLS Hardening and Approval Guard
-- This migration tightens RLS and enforces admin-only approvals

-- 1) Ensure RLS is enabled (idempotent)
ALTER TABLE IF EXISTS public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_line_items ENABLE ROW LEVEL SECURITY;

-- 2) Drop permissive policies if present
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_categories' AND policyname = 'expense_categories_read';
  IF FOUND THEN EXECUTE 'DROP POLICY expense_categories_read ON public.expense_categories'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_categories' AND policyname = 'expense_categories_write';
  IF FOUND THEN EXECUTE 'DROP POLICY expense_categories_write ON public.expense_categories'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_categories' AND policyname = 'expense_categories_update';
  IF FOUND THEN EXECUTE 'DROP POLICY expense_categories_update ON public.expense_categories'; END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'expenses_read';
  IF FOUND THEN EXECUTE 'DROP POLICY expenses_read ON public.expenses'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'expenses_insert';
  IF FOUND THEN EXECUTE 'DROP POLICY expenses_insert ON public.expenses'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'expenses_update';
  IF FOUND THEN EXECUTE 'DROP POLICY expenses_update ON public.expenses'; END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_budgets' AND policyname = 'expense_budgets_read';
  IF FOUND THEN EXECUTE 'DROP POLICY expense_budgets_read ON public.expense_budgets'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_budgets' AND policyname = 'expense_budgets_write';
  IF FOUND THEN EXECUTE 'DROP POLICY expense_budgets_write ON public.expense_budgets'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_budgets' AND policyname = 'expense_budgets_update';
  IF FOUND THEN EXECUTE 'DROP POLICY expense_budgets_update ON public.expense_budgets'; END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_line_items' AND policyname = 'expense_line_items_select';
  IF FOUND THEN EXECUTE 'DROP POLICY expense_line_items_select ON public.expense_line_items'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_line_items' AND policyname = 'expense_line_items_insert';
  IF FOUND THEN EXECUTE 'DROP POLICY expense_line_items_insert ON public.expense_line_items'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_line_items' AND policyname = 'expense_line_items_update';
  IF FOUND THEN EXECUTE 'DROP POLICY expense_line_items_update ON public.expense_line_items'; END IF;
END$$;

-- 3) Define scoped policies
-- Note: Without a property membership model, we scope by authenticated role for writes,
-- and require admin for approvals. Reads remain open to authenticated users.

-- expense_categories
CREATE POLICY expense_categories_select_authenticated ON public.expense_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY expense_categories_modify_staff ON public.expense_categories
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('staff','admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('staff','admin'));

-- expenses
CREATE POLICY expenses_select_authenticated ON public.expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY expenses_insert_staff ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('staff','admin'));

CREATE POLICY expenses_update_staff ON public.expenses
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' IN ('staff','admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('staff','admin'));

CREATE POLICY expenses_delete_admin ON public.expenses
  FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- expense_budgets
CREATE POLICY expense_budgets_select_authenticated ON public.expense_budgets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY expense_budgets_modify_staff ON public.expense_budgets
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('staff','admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('staff','admin'));

-- expense_line_items
CREATE POLICY expense_line_items_select_authenticated ON public.expense_line_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY expense_line_items_modify_staff ON public.expense_line_items
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('staff','admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('staff','admin'));

-- 4) Enforce admin-only approval transitions
CREATE OR REPLACE FUNCTION public.enforce_admin_on_expense_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF COALESCE((auth.jwt() ->> 'role')::text, '') <> 'admin' THEN
      RAISE EXCEPTION 'Only admin can change approval_status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_expenses_admin_approval ON public.expenses;
CREATE TRIGGER trg_expenses_admin_approval
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_on_expense_approval();


