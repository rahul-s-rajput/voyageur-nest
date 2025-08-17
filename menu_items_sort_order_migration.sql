-- Add sort_order to menu_items and initialize ordering per category
BEGIN;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Initialize sort_order by created_at then name within each category
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at ASC, name ASC) - 1 AS rn
  FROM public.menu_items
)
UPDATE public.menu_items m
SET sort_order = r.rn
FROM ranked r
WHERE r.id = m.id;

-- Optional index to speed ordered queries per category
CREATE INDEX IF NOT EXISTS idx_menu_items_category_sort
  ON public.menu_items (category_id, sort_order);

COMMIT;

