-- Migration: add_bot_wizard_state
-- Stores per-chat booking wizard state to survive serverless cold starts

create table if not exists public.bot_wizard_state (
  chat_id bigint primary key,
  user_id bigint,
  step text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Trigger to auto-update updated_at
create or replace function public.set_updated_at_wizard()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_bot_wizard_state_updated_at on public.bot_wizard_state;
create trigger trg_bot_wizard_state_updated_at
before update on public.bot_wizard_state
for each row execute function public.set_updated_at_wizard();

-- RLS intentionally disabled; access via Service Role in Edge Function.
