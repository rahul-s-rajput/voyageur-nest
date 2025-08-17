-- Add photo_path to menu_categories for category banner/cover
BEGIN;

ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS photo_path TEXT;

COMMIT;



