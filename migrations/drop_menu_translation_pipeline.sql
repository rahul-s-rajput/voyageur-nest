-- Teardown: Gemini menu-translation pipeline (menu is now English-only).
--
-- The app no longer reads menu_item_translations / menu_category_translations,
-- and the translation-worker edge function + enqueue triggers have been removed.
-- Run this in the Supabase SQL editor to drop the now-unused objects.
--
-- Order matters: drop the triggers before the functions they call, and the
-- functions before / alongside the tables.

BEGIN;

-- Triggers fire on menu_items / menu_categories edits (those tables stay).
DROP TRIGGER IF EXISTS trg_enqueue_item_translation_jobs ON public.menu_items;
DROP TRIGGER IF EXISTS trg_enqueue_category_translation_jobs ON public.menu_categories;

-- Enqueue functions + the supported-locales helper they call.
DROP FUNCTION IF EXISTS public.enqueue_item_translation_jobs();
DROP FUNCTION IF EXISTS public.enqueue_category_translation_jobs();
DROP FUNCTION IF EXISTS public.get_supported_locales(uuid);

-- Translation storage + job queue (CASCADE clears their RLS policies/indexes).
DROP TABLE IF EXISTS public.menu_item_translations CASCADE;
DROP TABLE IF EXISTS public.menu_category_translations CASCADE;
DROP TABLE IF EXISTS public.translation_jobs CASCADE;

-- Optional: properties.supported_locales is now unused by the app. Uncomment to drop.
-- ALTER TABLE public.properties DROP COLUMN IF EXISTS supported_locales;

COMMIT;
