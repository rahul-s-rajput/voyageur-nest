## Multilingual Menu Translation Plan (Manali-focused)

### Status
- **State**: Proposed (ready to implement)
- **Owner**: TBD
- **Target**: Story 5.1 extension (Phase C), supports 5.2/5.3 downstream

### TL;DR
- **English (en-IN) is the source of truth.** Admins create/edit menu categories/items in English only.
- **Auto-translate via Gemini** to selected target languages when English changes; translations stored per-entity per-locale.
- **Manual overrides are preserved** and never overwritten by auto-translate unless explicitly “Regenerate”.
- **Prices are not translated or converted**; they remain identical and formatted with 2 decimals across languages.

---

## Goals and Non‑Goals

- **Goals**
  - **Auto-translation** of category and item names/descriptions when English is added/edited
  - **Locale-aware display** across Public and Admin UIs with fallback to English
  - **Manual translation overrides** with clear status and regenerate control
  - **Backfill** translations for newly enabled locales and existing content

- **Non‑Goals**
  - Currency conversion or per-locale pricing
  - Complex translation workflows (vendor portals, multi-stage approvals)
  - Full glossary/editor UI beyond basic override and regenerate (future enhancement)

---

## Target Languages (Manali-focused defaults)

- **Core**: en-IN (base), hi-IN
- **Domestic**: pa-IN (Punjabi), gu-IN (Gujarati), mr-IN (Marathi), bn-IN (Bengali), ta-IN (Tamil)
- **International**: he-IL (Hebrew), de-DE (German), fr-FR (French), es-ES (Spanish)

Notes:
- Languages are configurable per property (add/remove later). New locales can be backfilled for existing content.

---

## Architecture Overview

- **Data**
  - English remains in `menu_categories` and `menu_items`.
  - New normalized translation tables:
    - `menu_category_translations(category_id, locale, name, is_auto, source_hash, source_version, timestamps)`
    - `menu_item_translations(item_id, locale, name, description, is_auto, source_hash, source_version, timestamps)`
  - A small `translation_jobs` queue table coordinates background translation.

- **Worker**
  - Supabase Edge Function runs on a schedule to process pending jobs.
  - Uses Gemini for translation; provider is pluggable via env.
  - Batches work, retries with backoff, and respects manual overrides.

- **UI**
  - Public menu shows the active locale; fallback chain: selected → property default → English.
  - Admin edits English only; a Translations panel supports view/edit manual overrides and regenerate.

- **Security**
  - Public translations are readable by anon.
  - Only admin/service can create/update translations and jobs.
  - Gemini API key stored in worker env; never exposed client-side.

---

## Data Model Changes

### Property locales

- Add `supported_locales` per property (defaults listed above):

```sql
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS supported_locales TEXT[]
  DEFAULT ARRAY['en-IN','hi-IN','pa-IN','gu-IN','mr-IN','bn-IN','ta-IN','he-IL','de-DE','fr-FR','es-ES'];
```

### Translation tables

```sql
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
```

### Translation job queue

```sql
CREATE TABLE IF NOT EXISTS public.translation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('category','item')),
  entity_id UUID NOT NULL,
  base_locale TEXT NOT NULL DEFAULT 'en-IN',
  target_locale TEXT NOT NULL,
  payload JSONB,          -- optional snapshot (name/description)
  source_hash TEXT,
  source_version INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON public.translation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_target_locale ON public.translation_jobs(target_locale);
```

### RLS policy sketch

```sql
ALTER TABLE public.menu_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_jobs ENABLE ROW LEVEL SECURITY;

-- Public can read translations
CREATE POLICY tr_cat_read ON public.menu_category_translations FOR SELECT USING (true);
CREATE POLICY tr_item_read ON public.menu_item_translations FOR SELECT USING (true);

-- Only service/admin can write
-- (Implement using JWT role claims or using service role for worker)
```

---

## Change Detection & Triggers

- Use English as base. Only changes to English name/description trigger translation jobs.
- Compute a simple `source_hash` (e.g., sha256 of `name || '|' || description`).
- Increment `source_version` on meaningful base changes.
- For each `target_locale` in `properties.supported_locales` except base, insert a `pending` job unless the locale is manually locked.
- Do NOT call external APIs in triggers; just enqueue jobs. The worker processes asynchronously.

Trigger sketch (pseudocode):

```sql
-- On INSERT/UPDATE of menu_items (similar for categories)
-- 1) detect change in English text
-- 2) for each target locale, insert a pending translation_jobs row
```

---

## Translation Worker (Supabase Edge Function)

- **Runtime**: Deno on Supabase Edge Functions
- **Schedule**: every minute (configurable)
- **Auth**: SUPABASE_SERVICE_ROLE_KEY via env
- **Provider**: Gemini (pluggable: Google/DeepL/Azure)

Worker responsibilities:
- Pull a batch of `pending` jobs (use SKIP LOCKED semantics to avoid contention)
- For each job:
  - Fetch the latest English text from DB (avoid stale payload)
  - Call provider to translate name/description → `target_locale`
  - Upsert into translations with `is_auto=true`, `source_hash`, `source_version`
  - Mark job `done` (or `failed` with error)
- **Respect manual overrides**: never overwrite rows with `is_auto=false`
- **Cache**: if an identical `(source_hash, target_locale)` exists, skip re-translation
- **Retries**: basic backoff; cap attempts; leave as `failed` with `error` for ops

Environment variables:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `TRANSLATOR_PROVIDER=gemini`
- `GEMINI_API_KEY`

---

## UI Integration

### Public (`MenuPage.tsx`)
- Use selected locale (from `LanguageSelector`) to render names/descriptions
- Fallback chain: selected → property default → English
- Prices: same across languages; keep 2-decimal formatting

### Admin (`MenuManagement.tsx`)
- English-only edits for base fields
- Add a “Translations” panel for each item/category:
  - Show status per locale: **Auto**, **Manual**, **Out-of-date** (base changed)
  - Actions: **Edit** (switches to manual, sets `is_auto=false`), **Regenerate** (enqueue job), **Lock/Unlock** (optional)

---

## Backfill & Locale Updates

- When enabling a new locale for a property, enqueue `translation_jobs` for all existing categories/items
- Backfill script is idempotent and skips locales already present or manually locked

---

## Performance & Cost Controls

- Batch jobs in the worker to reduce API overhead
- Cache by `(source_hash, target_locale)` to avoid duplicate translations
- Keep payload minimal (only fields that need translation)

---

## Security

- Public read-only on translation tables; strict write permissions to service/admin
- Gemini key only in Edge Function env; never in the client
- Queue table writes restricted; triggers only enqueue

---

## Monitoring & Operations

- Structured logs from worker (translated count, failures)
- Dashboard metrics: jobs by status; recent failure reasons
- Optional notification for repeated failures (e.g., webhook or email)

---

## Tasks, Subtasks, Acceptance Criteria

- **T0: Locale configuration**
  - Add `supported_locales` to properties with Manali defaults
  - Admin-configurable per property (optional UI)
  - AC: Properties expose/update locales; enabling new locale triggers backfill

- **T1: Database migrations**
  - Create translation tables + job queue; add indexes
  - Add RLS policies: anon read, service/admin write
  - AC: Idempotent migrations; RLS enforced; indexes present

- **T2: Triggers for change detection**
  - On insert/update of base English fields, enqueue jobs for target locales
  - AC: Editing English creates one pending job per target locale; no duplicates when content unchanged

- **T3: Translation worker**
  - Scheduled function to process jobs; Gemini adapter; retries/backoff
  - AC: Jobs move pending → done/failed; translations appear within ~1–2 minutes; manual overrides preserved

- **T4: Public UI integration**
  - Locale-aware read with fallback; no price change
  - AC: Language switch reflects names/descriptions; English fallback works; prices stable

- **T5: Admin UI integration**
  - Translations panel: status display; edit/manual override; regenerate
  - AC: Admin can view/edit per-locale translations; regenerate uses latest English; manual is never auto-overwritten

- **T6: Services**
  - `menuTranslationService`: getters with fallback, upsert manual, regenerate helper
  - AC: Consumers can fetch localized content reliably with fallback

- **T7: Backfill tooling**
  - Script to enqueue jobs for existing content when locales are added
  - AC: Completes without duplicates; respects manual locks

- **T8: Tests**
  - Unit: hashing/versioning, job enqueue, provider adapter
  - Integration: English edit → job → worker → localized UI
  - UI: translation panel behavior; fallback correctness; a11y check for language switching
  - AC: Tests pass; lint/TS clean

- **T9: Documentation**
  - README/admin guide updates (how it works, overrides, regenerate, backfill)
  - AC: Clear dev/admin docs; basic ops runbook

---

## Definition of Done

- Migrations applied with RLS and indexes
- Worker deployed, scheduled, and configured with Gemini
- Public and Admin UIs localized with fallback; prices unchanged
- Manual override/regenerate flows functional
- Backfill tool available and verified
- Tests green; lint/TS clean; docs updated

---

## Risks & Mitigations

- **Translation quality for dish names**: allow manual overrides; support property-level glossary later
- **API cost/latency**: batch + cache; schedule worker; enable per-property locale pruning
- **Accidental overwrites**: enforce `is_auto=false` guard; require explicit regenerate

---

## Appendices

- **Fallback logic**: `selectedLocale → propertyDefaultLocale → 'en-IN'`
- **Job state machine**: `pending → processing → done | failed`
- **Provider adapter**: simple interface to swap Gemini/Google/DeepL via env


