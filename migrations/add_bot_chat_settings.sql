-- Migration: add_bot_chat_settings
-- Stores per-chat persistent settings for the Telegram bot (e.g., status_message_id)

create table if not exists public.bot_chat_settings (
  chat_id bigint primary key,
  status_message_id bigint,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_bot_chat_settings_updated_at on public.bot_chat_settings;
create trigger trg_bot_chat_settings_updated_at
before update on public.bot_chat_settings
for each row execute function public.set_updated_at();

-- RLS: access via service role only (no RLS policies needed here)
