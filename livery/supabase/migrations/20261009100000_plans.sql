-- Plans and billing settings.
--
--   subscriptions: who has Livery Pro. Polar (polar.sh) handles checkout,
--                  billing and tax; its webhooks (and a sync right after
--                  checkout) write here through the service role. An admin
--                  can also grant Pro by hand (source = 'admin'), which Polar
--                  syncs never take away. A user can read their own row.
--   app_settings:  settings the admin changes at runtime: whether payments
--                  are switched on, the limits for each plan and the prices
--                  shown. Service role only. Payments start switched off.
--
-- Safe to run more than once: an earlier draft of this file created
-- subscriptions without every column, so missing ones are added.

create table if not exists public.subscriptions (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  plan                  text not null default 'free' check (plan in ('free', 'pro')),
  source                text not null default 'polar' check (source in ('polar', 'admin')),
  status                text check (length(status) <= 30),
  interval              text check (interval in ('month', 'year')),
  polar_customer_id     text check (length(polar_customer_id) <= 100),
  polar_subscription_id text check (length(polar_subscription_id) <= 100),
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  updated_at            timestamptz not null default now()
);

alter table public.subscriptions add column if not exists plan text not null default 'free';
alter table public.subscriptions add column if not exists source text not null default 'polar';
alter table public.subscriptions add column if not exists status text;
alter table public.subscriptions add column if not exists interval text;
alter table public.subscriptions add column if not exists polar_customer_id text;
alter table public.subscriptions add column if not exists polar_subscription_id text;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();
alter table public.subscriptions drop constraint if exists subscriptions_source_check;
alter table public.subscriptions add constraint subscriptions_source_check check (source in ('polar', 'admin'));

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

drop policy if exists "Users see their own plan" on public.subscriptions;
create policy "Users see their own plan"
  on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.app_settings (
  key         text primary key check (key ~ '^[a-z_]{1,40}$'),
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value) values
  ('billing', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;
