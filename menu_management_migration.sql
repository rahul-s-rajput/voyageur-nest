-- Menu Management Migration (Story 5.1)
-- Creates menu_categories and menu_items with property scoping

BEGIN;

-- Categories per property
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT GENERATED ALWAYS AS (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) STORED,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, name)
);

-- Items per property/category
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_i18n JSONB DEFAULT '{}',
  description TEXT,
  description_i18n JSONB DEFAULT '{}',
  price NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  cost NUMERIC(10,2),
  is_available BOOLEAN DEFAULT true,
  is_veg BOOLEAN DEFAULT true,
  allergens TEXT[] DEFAULT '{}',
  ingredients TEXT[] DEFAULT '{}',
  seasonal_flags JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  photo_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_menu_categories_updated_at ON public.menu_categories;
CREATE TRIGGER trg_menu_categories_updated_at
BEFORE UPDATE ON public.menu_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (initially permissive; tighten later to authenticated/admin and property match)
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_categories' AND policyname = 'menu_categories_read'
  ) THEN
    CREATE POLICY menu_categories_read ON public.menu_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_categories' AND policyname = 'menu_categories_write'
  ) THEN
    CREATE POLICY menu_categories_write ON public.menu_categories FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_categories' AND policyname = 'menu_categories_update'
  ) THEN
    CREATE POLICY menu_categories_update ON public.menu_categories FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_items' AND policyname = 'menu_items_read'
  ) THEN
    CREATE POLICY menu_items_read ON public.menu_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_items' AND policyname = 'menu_items_write'
  ) THEN
    CREATE POLICY menu_items_write ON public.menu_items FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_items' AND policyname = 'menu_items_update'
  ) THEN
    CREATE POLICY menu_items_update ON public.menu_items FOR UPDATE USING (true);
  END IF;
END $$;

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;

-- Optional seeding of categories is left to a separate script to avoid duplicates
-- You can seed categories per property using INSERT .. SELECT from properties where name in ('Old Manali','Baror')

COMMIT;

