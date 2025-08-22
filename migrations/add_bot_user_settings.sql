-- Migration: add_bot_user_settings
-- Stores last selected property per Telegram user for the bot

create table if not exists public.bot_user_settings (
  telegram_user_id bigint primary key,
  last_property_id uuid,
  updated_at timestamptz not null default now(),
  constraint fk_bot_user_settings_property
    foreign key (last_property_id)
    references public.properties(id)
    on delete set null
);

-- Helpful index for reverse lookups (optional)
create index if not exists idx_bot_user_settings_last_property_id
  on public.bot_user_settings (last_property_id);

-- Trigger to auto-update updated_at (optional)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_bot_user_settings_updated_at on public.bot_user_settings;
create trigger trg_bot_user_settings_updated_at
before update on public.bot_user_settings
for each row execute function public.set_updated_at();

-- Note: RLS is intentionally left disabled; access is via Service Role in Edge Function.
