-- Multilingual Menu Translation Migration
-- English (en-IN) as base; per-locale translations via translation tables and background jobs

-- 1) Property locales
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS supported_locales TEXT[]
  DEFAULT ARRAY['en-IN','hi-IN','pa-IN','gu-IN','mr-IN','bn-IN','ta-IN','he-IL','de-DE','fr-FR','es-ES'];

-- 2) Translation tables
CREATE TABLE IF NOT EXISTS public.menu_category_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  is_auto BOOLEAN NOT NULL DEFAULT true,
  source_hash TEXT,
  source_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, locale)
);

CREATE TABLE IF NOT EXISTS public.menu_item_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_auto BOOLEAN NOT NULL DEFAULT true,
  source_hash TEXT,
  source_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, locale)
);

-- 3) Translation jobs queue
CREATE TABLE IF NOT EXISTS public.translation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('category','item')),
  entity_id UUID NOT NULL,
  base_locale TEXT NOT NULL DEFAULT 'en-IN',
  target_locale TEXT NOT NULL,
  payload JSONB,
  source_hash TEXT,
  source_version INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON public.translation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_target_locale ON public.translation_jobs(target_locale);

-- 4) RLS policies (start permissive; tighten later)
ALTER TABLE public.menu_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_category_translations' AND policyname = 'menu_category_translations_read'
  ) THEN
    CREATE POLICY menu_category_translations_read ON public.menu_category_translations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_item_translations' AND policyname = 'menu_item_translations_read'
  ) THEN
    CREATE POLICY menu_item_translations_read ON public.menu_item_translations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'translation_jobs' AND policyname = 'translation_jobs_read'
  ) THEN
    CREATE POLICY translation_jobs_read ON public.translation_jobs FOR SELECT USING (false);
  END IF;
  -- permissive write for now (to be tightened to service/admin later)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_category_translations' AND policyname = 'menu_category_translations_write'
  ) THEN
    CREATE POLICY menu_category_translations_write ON public.menu_category_translations FOR INSERT WITH CHECK (true);
    CREATE POLICY menu_category_translations_update ON public.menu_category_translations FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_item_translations' AND policyname = 'menu_item_translations_write'
  ) THEN
    CREATE POLICY menu_item_translations_write ON public.menu_item_translations FOR INSERT WITH CHECK (true);
    CREATE POLICY menu_item_translations_update ON public.menu_item_translations FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'translation_jobs' AND policyname = 'translation_jobs_write'
  ) THEN
    CREATE POLICY translation_jobs_write ON public.translation_jobs FOR INSERT WITH CHECK (true);
    CREATE POLICY translation_jobs_update ON public.translation_jobs FOR UPDATE USING (true);
  END IF;
END $$;

-- 5) Trigger helpers: enqueue translation jobs on base changes

-- Helper to safely get supported locales for a property
CREATE OR REPLACE FUNCTION public.get_supported_locales(p_property_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  locales TEXT[];
BEGIN
  SELECT supported_locales INTO locales FROM public.properties WHERE id = p_property_id;
  IF locales IS NULL OR array_length(locales, 1) IS NULL THEN
    RETURN ARRAY['en-IN'];
  END IF;
  RETURN locales;
END; $$ LANGUAGE plpgsql;

-- Enqueue for items
CREATE OR REPLACE FUNCTION public.enqueue_item_translation_jobs()
RETURNS TRIGGER AS $$
DECLARE
  base_locale TEXT := 'en-IN';
  target TEXT;
  locales TEXT[];
  src_name TEXT;
  src_desc TEXT;
  src_hash TEXT;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
       COALESCE(NEW.name,'') IS DISTINCT FROM COALESCE(OLD.name,'')
    OR COALESCE(NEW.description,'') IS DISTINCT FROM COALESCE(OLD.description,''))) THEN
    locales := public.get_supported_locales(NEW.property_id);
    src_name := COALESCE(NEW.name, '');
    src_desc := COALESCE(NEW.description, '');
    src_hash := md5(src_name || '|' || src_desc);

    FOREACH target IN ARRAY locales LOOP
      IF target <> base_locale THEN
        -- Skip if we already have a translation with same hash (done) or a pending/processing job for same hash
        IF NOT EXISTS (
          SELECT 1 FROM public.translation_jobs j
          WHERE j.entity_type = 'item' AND j.entity_id = NEW.id AND j.target_locale = target AND j.source_hash = src_hash
            AND j.status IN ('pending','processing','done')
        ) THEN
          INSERT INTO public.translation_jobs (entity_type, entity_id, base_locale, target_locale, payload, source_hash, status)
          VALUES ('item', NEW.id, base_locale, target, jsonb_build_object('name', src_name, 'description', src_desc), src_hash, 'pending');
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_item_translation_jobs ON public.menu_items;
CREATE TRIGGER trg_enqueue_item_translation_jobs
AFTER INSERT OR UPDATE OF name, description ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.enqueue_item_translation_jobs();

-- Enqueue for categories
CREATE OR REPLACE FUNCTION public.enqueue_category_translation_jobs()
RETURNS TRIGGER AS $$
DECLARE
  base_locale TEXT := 'en-IN';
  target TEXT;
  locales TEXT[];
  src_name TEXT;
  src_hash TEXT;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND COALESCE(NEW.name,'') IS DISTINCT FROM COALESCE(OLD.name,'')) THEN
    locales := public.get_supported_locales(NEW.property_id);
    src_name := COALESCE(NEW.name, '');
    src_hash := md5(src_name);

    FOREACH target IN ARRAY locales LOOP
      IF target <> base_locale THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.translation_jobs j
          WHERE j.entity_type = 'category' AND j.entity_id = NEW.id AND j.target_locale = target AND j.source_hash = src_hash
            AND j.status IN ('pending','processing','done')
        ) THEN
          INSERT INTO public.translation_jobs (entity_type, entity_id, base_locale, target_locale, payload, source_hash, status)
          VALUES ('category', NEW.id, base_locale, target, jsonb_build_object('name', src_name), src_hash, 'pending');
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_category_translation_jobs ON public.menu_categories;
CREATE TRIGGER trg_enqueue_category_translation_jobs
AFTER INSERT OR UPDATE OF name ON public.menu_categories
FOR EACH ROW EXECUTE FUNCTION public.enqueue_category_translation_jobs();


