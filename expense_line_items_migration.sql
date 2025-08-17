-- Optional: Expense line items storage
CREATE TABLE IF NOT EXISTS public.expense_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) DEFAULT 1,
  unit_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2),
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expense_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_line_items_select ON public.expense_line_items;
CREATE POLICY expense_line_items_select ON public.expense_line_items FOR SELECT USING (true);

DROP POLICY IF EXISTS expense_line_items_insert ON public.expense_line_items;
CREATE POLICY expense_line_items_insert ON public.expense_line_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS expense_line_items_update ON public.expense_line_items;
CREATE POLICY expense_line_items_update ON public.expense_line_items FOR UPDATE USING (true);



