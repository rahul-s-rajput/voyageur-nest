-- Teardown: the AUTO-TRANSLATION GENERATOR only.
--
-- Keeps the existing translated content in place (menu_item_translations,
-- menu_category_translations, translations) so the multilingual menu and
-- check-in form keep working. Only removes the machinery that generated NEW
-- translations via Gemini: the enqueue triggers, their functions, and the
-- job queue. The translation-worker edge function is undeployed separately.
--
-- After this: editing/adding a menu item no longer enqueues a translation job;
-- a brand-new item simply falls back to English until translated by hand.

BEGIN;

-- Triggers that fired on every menu_items / menu_categories name edit.
DROP TRIGGER IF EXISTS trg_enqueue_item_translation_jobs ON public.menu_items;
DROP TRIGGER IF EXISTS trg_enqueue_category_translation_jobs ON public.menu_categories;

-- Their functions + the supported-locales helper.
DROP FUNCTION IF EXISTS public.enqueue_item_translation_jobs();
DROP FUNCTION IF EXISTS public.enqueue_category_translation_jobs();
DROP FUNCTION IF EXISTS public.get_supported_locales(uuid);

-- The job queue (work list only — NOT translated content).
DROP TABLE IF EXISTS public.translation_jobs CASCADE;

-- KEPT (do NOT drop): menu_item_translations, menu_category_translations,
-- translations — these hold the live multilingual content.

COMMIT;
