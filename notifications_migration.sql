-- Notifications schema (configs, notifications, push subscriptions)

-- 1) notification_configs: defines channels and templates per property/event type
create table if not exists public.notification_configs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  platform text default 'all', -- booking.com | gommt | all (optional)
  type text not null,          -- reminder | alert | update | deadline | booking_event | expense_event
  enabled boolean default true,
  schedule jsonb,              -- optional schedule block
  conditions jsonb,            -- optional conditions block
  channels jsonb not null default '{"inApp": true, "email": false, "sms": false}',
  message jsonb not null,      -- { title, body, priority }
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint notification_configs_property_type_unique unique(property_id, type)
);

-- 2) notifications: emitted notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  config_id uuid references public.notification_configs(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  priority text default 'medium',
  platform text,
  data jsonb,
  read boolean default false,
  dismissed boolean default false,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- 3) notification_subscriptions: browser push subscriptions (optional)
create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  property_id uuid references public.properties(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz default now()
);

-- triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notification_configs_updated_at on public.notification_configs;
create trigger trg_notification_configs_updated_at
before update on public.notification_configs
for each row execute function public.set_updated_at();

-- indexes
create index if not exists idx_notifications_property_created on public.notifications(property_id, created_at desc);
create index if not exists idx_notification_subs_property on public.notification_subscriptions(property_id);

-- RLS (dev-permissive; tighten in production)
alter table public.notification_configs enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_subscriptions enable row level security;

drop policy if exists notification_configs_all on public.notification_configs;
create policy notification_configs_all on public.notification_configs for all using (true) with check (true);

drop policy if exists notifications_all on public.notifications;
create policy notifications_all on public.notifications for all using (true) with check (true);

-- Ensure notifications table is included in realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception
      when duplicate_object then null; -- already added
      when insufficient_privilege then null; -- dashboard may restrict; safe to ignore
    end;
  end if;
end $$;

drop policy if exists notification_subscriptions_all on public.notification_subscriptions;
create policy notification_subscriptions_all on public.notification_subscriptions for all using (true) with check (true);



