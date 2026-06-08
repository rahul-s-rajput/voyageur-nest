-- Teardown: UI-string translations table (replaced by bundled static JSON).
--
-- After the move to src/locales/*.json + StaticTranslationService, nothing in
-- the app reads the `translations` table. Run this in the Supabase SQL editor
-- to drop it. Safe/idempotent; the publication step is guarded in case the
-- table was never added to realtime.

BEGIN;

DROP TRIGGER IF EXISTS update_translations_updated_at ON public.translations;
DROP FUNCTION IF EXISTS public.update_translations_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.translations;
EXCEPTION WHEN OTHERS THEN
  -- table not in publication (or publication absent) — ignore
  NULL;
END $$;

DROP TABLE IF EXISTS public.translations CASCADE;

COMMIT;
