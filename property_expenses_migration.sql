-- Property Expenses Migration (Story 4.4)

-- Expense categories: global templates (property_id NULL) and property-specific overrides
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, name)
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'INR',
  payment_method TEXT,
  vendor TEXT,
  notes TEXT,
  receipt_url TEXT,
  receipt_path TEXT,
  approval_status TEXT DEFAULT 'pending',
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-category monthly budgets per property
CREATE TABLE IF NOT EXISTS public.expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  budget_amount NUMERIC(12,2) NOT NULL CHECK (budget_amount >= 0),
  currency TEXT DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, category_id, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_property_date ON public.expenses(property_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_approval ON public.expenses(approval_status);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_month ON public.expense_budgets(property_id, month);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER trg_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_expense_budgets_updated_at ON public.expense_budgets;
CREATE TRIGGER trg_expense_budgets_updated_at
BEFORE UPDATE ON public.expense_budgets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (adjust policies per your auth model)
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;

-- Simplified permissive policies (replace with property-scoped policies in production)
CREATE POLICY expense_categories_read ON public.expense_categories FOR SELECT USING (true);
CREATE POLICY expense_categories_write ON public.expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY expense_categories_update ON public.expense_categories FOR UPDATE USING (true);

CREATE POLICY expenses_read ON public.expenses FOR SELECT USING (true);
CREATE POLICY expenses_insert ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY expenses_update ON public.expenses FOR UPDATE USING (true);

CREATE POLICY expense_budgets_read ON public.expense_budgets FOR SELECT USING (true);
CREATE POLICY expense_budgets_write ON public.expense_budgets FOR INSERT WITH CHECK (true);
CREATE POLICY expense_budgets_update ON public.expense_budgets FOR UPDATE USING (true);




