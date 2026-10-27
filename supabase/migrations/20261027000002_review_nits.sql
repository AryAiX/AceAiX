-- Review nits. Three functions, replaced in place. Same signatures,
-- same security, search_path = public, pg_temp. The triggers already
-- call them, so nothing here creates or drops a trigger.
--
-- 1. add_custom_city returns a stored spelling only when that row is
--    curated or the caller added it. Another person's unapproved city
--    comes back as the caller's own trimmed spelling, and is not inserted.
-- 2. A client insert cannot choose transcode_status or ai_tags. anon and
--    authenticated are put back on the column defaults. Other writers
--    keep the values they set.
-- 3. View points in the Talent Score are least(25, total_media_views / 40).
--    A highlight view no longer recomputes on every watch. After the count
--    goes up, a public total of 40, 80, ... 1000 does.

create or replace function public.add_custom_city(
  p_country text,
  p_name    text
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_country  text := btrim(coalesce(p_country, ''));
  v_name     text := btrim(coalesce(p_name, ''));
  v_existing text;
  v_visible  boolean;
  v_recent   integer;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if v_country = '' then
    raise exception 'country_required';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'city_length';
  end if;

  -- Already there under some spelling. Hand back the one we hold when it
  -- is curated or this caller added it, so "dubai " can never become a
  -- second Dubai. Someone else's unapproved row stays theirs: return
  -- this caller's own spelling and do not insert.
  select c.name,
         coalesce(c.is_curated or c.created_by = auth.uid(), false)
    into v_existing, v_visible
  from public.cities c
  where lower(btrim(c.country)) = lower(v_country)
    and lower(btrim(c.name)) = lower(v_name)
  limit 1;

  if v_existing is not null then
    if v_visible then
      return v_existing;
    end if;
    return v_name;
  end if;

  select count(*) into v_recent
  from public.cities c
  where c.created_by = auth.uid()
    and c.created_at > now() - interval '1 day';

  if v_recent >= 10 then
    raise exception 'rate_limited';
  end if;

  insert into public.cities (country, name, created_by)
  values (v_country, v_name, auth.uid())
  on conflict do nothing;

  select c.name into v_existing
  from public.cities c
  where lower(btrim(c.country)) = lower(v_country)
    and lower(btrim(c.name)) = lower(v_name)
  limit 1;

  return coalesce(v_existing, v_name);
end;
$$;

create or replace function private.trg_zero_athlete_media_counters()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user::text in ('anon', 'authenticated') then
    new.views_count := 0;
    new.likes_count := 0;
    new.transcode_status := 'pending';
    new.ai_tags := '[]'::jsonb;
  end if;
  return new;
end;
$$;

create or replace function private.trg_highlight_view_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_athlete uuid;
  v_total   integer := 0;
begin
  update public.athlete_media
  set views_count = views_count + 1
  where id = new.media_id
  returning athlete_id into v_athlete;

  -- Same total private.collect_score_inputs stores as media_views:
  -- public clips for this athlete, nothing else. least(25, total / 40.0)
  -- steps at every 40th view and is already full at 1000.
  if v_athlete is not null then
    select coalesce(sum(views_count), 0)
      into v_total
    from public.athlete_media
    where athlete_id = v_athlete and is_public;
  end if;

  if v_total > 0 and v_total % 40 = 0 and v_total <= 1000 then
    perform private.refresh_talent_score(v_athlete);
  end if;

  return new;
end;
$$;
