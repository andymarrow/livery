-- Server-side operations, called over RPC with the service role only.
-- Each one is a single short transaction (no network calls inside).

-- ---------------------------------------------------------------------------
-- bump_rate: atomic fixed-window counter. Two simultaneous requests cannot
-- both slip under the limit, because the increment and the read are one statement.
-- ---------------------------------------------------------------------------
create function public.bump_rate(p_key text, p_window_seconds integer, p_max integer)
returns table (allowed boolean, current_count integer, reset_at timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_window_seconds <= 0 or p_max <= 0 then
    raise exception 'window and max must be positive';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  return query select v_count <= p_max, v_count, v_window + make_interval(secs => p_window_seconds);
end;
$$;

-- ---------------------------------------------------------------------------
-- start_build: creates the site and kit if needed, then takes the build lock.
-- Returns claimed = false with the in-flight build when someone else holds it.
-- A build stuck for longer than p_stale_after is marked failed and replaced.
-- ---------------------------------------------------------------------------
create function public.start_build(
  p_source_url text,
  p_domain text,
  p_slug text,
  p_extractor_version integer,
  p_flow_version integer,
  p_stale_after interval default interval '10 minutes'
)
returns table (kit_id uuid, kit_version_id uuid, claimed boolean)
language plpgsql
set search_path = ''
as $$
declare
  v_kit_id uuid;
  v_version_id uuid;
begin
  insert into public.sites (domain) values (p_domain)
  on conflict (domain) do nothing;

  insert into public.kits (source_url, domain, slug)
  values (p_source_url, p_domain, p_slug)
  on conflict (source_url) do update set source_url = excluded.source_url
  returning id into v_kit_id;

  update public.kit_versions v
  set status = 'failed', error = 'stale build'
  where v.kit_id = v_kit_id
    and v.status = 'building'
    and v.build_started_at < now() - p_stale_after;

  begin
    insert into public.kit_versions (kit_id, extractor_version, flow_version)
    values (v_kit_id, p_extractor_version, p_flow_version)
    returning id into v_version_id;
  exception when unique_violation then
    select v.id into v_version_id
    from public.kit_versions v
    where v.kit_id = v_kit_id and v.status = 'building';
    return query select v_kit_id, v_version_id, false;
    return;
  end;

  return query select v_kit_id, v_version_id, true;
end;
$$;

-- ---------------------------------------------------------------------------
-- publish_build: freezes a finished build as the next version.
-- p_items is a JSON array of {kind, name, source, licence, licence_name, alternative}.
-- ---------------------------------------------------------------------------
create function public.publish_build(
  p_kit_version_id uuid,
  p_data jsonb,
  p_skill_md text,
  p_zip_path text,
  p_tar_path text,
  p_manifest jsonb,
  p_content_hash text,
  p_levels smallint[],
  p_items jsonb default '[]',
  p_grant_snapshot jsonb default null,
  p_grant_hash text default null
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_kit_id uuid;
  v_version integer;
begin
  select v.kit_id into v_kit_id
  from public.kit_versions v
  where v.id = p_kit_version_id and v.status = 'building';

  if v_kit_id is null then
    raise exception 'build % is not in progress', p_kit_version_id using errcode = 'P0002';
  end if;

  -- Serialise version numbering per kit.
  perform 1 from public.kits k where k.id = v_kit_id for update;

  select coalesce(max(v.version), 0) + 1 into v_version
  from public.kit_versions v
  where v.kit_id = v_kit_id;

  insert into public.kit_items (kit_version_id, kind, name, source, licence, licence_name, alternative)
  select p_kit_version_id, i.kind, i.name, i.source, i.licence, i.licence_name, i.alternative
  from jsonb_to_recordset(coalesce(p_items, '[]')) as i(
    kind text, name text, source text, licence text, licence_name text, alternative text
  );

  update public.kit_versions
  set status = 'ready',
      version = v_version,
      data = p_data,
      skill_md = p_skill_md,
      zip_path = p_zip_path,
      tar_path = p_tar_path,
      manifest = p_manifest,
      content_hash = p_content_hash,
      levels = p_levels,
      grant_snapshot = p_grant_snapshot,
      grant_hash = p_grant_hash,
      published_at = now()
  where id = p_kit_version_id;

  return v_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- fail_build: releases the lock and keeps the error for debugging.
-- ---------------------------------------------------------------------------
create function public.fail_build(p_kit_version_id uuid, p_error text)
returns void
language sql
set search_path = ''
as $$
  update public.kit_versions
  set status = 'failed', error = left(p_error, 2000)
  where id = p_kit_version_id and status = 'building';
$$;

-- ---------------------------------------------------------------------------
-- withdraw_version: the only change a published version accepts.
-- Returns the artefact paths so the caller can delete them from storage.
-- ---------------------------------------------------------------------------
create function public.withdraw_version(p_kit_version_id uuid)
returns table (zip_path text, tar_path text)
language plpgsql
set search_path = ''
as $$
declare
  v_zip text;
  v_tar text;
begin
  select v.zip_path, v.tar_path into v_zip, v_tar
  from public.kit_versions v
  where v.id = p_kit_version_id and v.status = 'ready'
  for update;

  if not found then
    raise exception 'version % is not published', p_kit_version_id using errcode = 'P0002';
  end if;

  update public.kit_versions v
  set status = 'withdrawn', withdrawn_at = now(), zip_path = null, tar_path = null
  where v.id = p_kit_version_id;

  return query select v_zip, v_tar;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_read_failure: remember a "couldn't read" result until retry_after.
-- ---------------------------------------------------------------------------
create function public.record_read_failure(
  p_source_url text,
  p_domain text,
  p_reason text,
  p_detail text,
  p_retry_after timestamptz
)
returns void
language sql
set search_path = ''
as $$
  insert into public.read_failures as f (source_url, domain, reason, detail, retry_after)
  values (p_source_url, p_domain, p_reason, left(p_detail, 500), p_retry_after)
  on conflict (source_url) do update
  set reason = excluded.reason,
      detail = excluded.detail,
      retry_after = excluded.retry_after,
      hits = f.hits + 1,
      last_at = now();
$$;

-- ---------------------------------------------------------------------------
-- prune: housekeeping, run on a schedule.
-- ---------------------------------------------------------------------------
create function public.prune_ephemeral()
returns void
language sql
set search_path = ''
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.read_failures where retry_after < now() - interval '7 days';
$$;

-- Only the server may call these.
revoke execute on function
  public.bump_rate(text, integer, integer),
  public.start_build(text, text, text, integer, integer, interval),
  public.publish_build(uuid, jsonb, text, text, text, jsonb, text, smallint[], jsonb, jsonb, text),
  public.fail_build(uuid, text),
  public.withdraw_version(uuid),
  public.record_read_failure(text, text, text, text, timestamptz),
  public.prune_ephemeral()
  from public, anon, authenticated;

grant execute on function
  public.bump_rate(text, integer, integer),
  public.start_build(text, text, text, integer, integer, interval),
  public.publish_build(uuid, jsonb, text, text, text, jsonb, text, smallint[], jsonb, jsonb, text),
  public.fail_build(uuid, text),
  public.withdraw_version(uuid),
  public.record_read_failure(text, text, text, text, timestamptz),
  public.prune_ephemeral()
  to service_role;
