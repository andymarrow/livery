-- Takedown and opt-out requests from site owners. Written only by the server
-- (service role) through a rate-limited form; never readable by clients.
create table public.takedown_requests (
  id          bigint generated always as identity primary key,
  domain      text not null check (domain = lower(domain) and length(domain) between 3 and 253),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  message     text not null check (length(message) between 1 and 4000),
  relationship text not null check (relationship in ('owner', 'agent', 'other')),
  status      text not null default 'open' check (status in ('open', 'actioned', 'rejected')),
  created_at  timestamptz not null default now()
);

create index takedown_requests_status_idx on public.takedown_requests (status, created_at desc);

alter table public.takedown_requests enable row level security;
revoke all on public.takedown_requests from anon, authenticated;
