-- Accounts (Supabase Auth: email + password, Google, GitHub).
--
-- auth.users is Supabase's own table. Each user gets a public profile row,
-- created by a trigger on sign-up from what the provider tells us (name,
-- avatar). Saved kits are a personal list. Everything here is private to its
-- owner; the service role (server code) can read all of it.

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (display_name is null or length(display_name) between 1 and 80),
  avatar_url    text check (avatar_url is null or avatar_url ~ '^https://'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

create function private.create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := nullif(trim(coalesce(v_meta ->> 'display_name', v_meta ->> 'full_name', v_meta ->> 'name', v_meta ->> 'user_name', '')), '');
  v_avatar text := nullif(v_meta ->> 'avatar_url', '');
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(v_name, 80),
    case when v_avatar ~ '^https://' then v_avatar else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.create_profile();

create table public.saved_kits (
  user_id     uuid not null references auth.users (id) on delete cascade,
  kit_id      uuid not null references public.kits (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, kit_id)
);

create index saved_kits_kit_id_idx on public.saved_kits (kit_id);

alter table public.profiles enable row level security;
alter table public.saved_kits enable row level security;

revoke all on public.profiles, public.saved_kits from anon, authenticated;
grant select, update (display_name, avatar_url) on public.profiles to authenticated;
grant select, insert, delete on public.saved_kits to authenticated;

create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users read their saved kits"
  on public.saved_kits for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users save kits for themselves"
  on public.saved_kits for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users unsave their own kits"
  on public.saved_kits for delete to authenticated
  using (user_id = (select auth.uid()));
