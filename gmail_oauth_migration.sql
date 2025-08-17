-- OAuth storage for Gmail
CREATE TABLE IF NOT EXISTS public.gmail_tokens (
  id INTEGER PRIMARY KEY DEFAULT 1,
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT,
  expiry_date TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gmail_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  label_id TEXT,
  watch_user TEXT NOT NULL DEFAULT 'me',
  start_history_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

