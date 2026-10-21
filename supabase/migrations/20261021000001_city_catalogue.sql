-- City catalogue (QA-87)
--
-- The city on a profile was a free text box. Play alerts compare it with
-- lower(btrim(...)) against a game's city, so "Dubai Marina" and "dubai "
-- silently never match "Dubai", and those players miss every game near them.
--
-- Suggestions come from this table, never from user_profiles, so nothing
-- about a person is exposed. The table is not readable directly: the only
-- way in is search_cities, which returns names and nothing else.

create table if not exists public.cities (
  id          uuid primary key default gen_random_uuid(),
  country     text not null,
  name        text not null,
  is_curated  boolean not null default false,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint cities_name_length check (char_length(btrim(name)) between 2 and 80)
);

create unique index if not exists cities_country_name_key
  on public.cities (lower(btrim(country)), lower(btrim(name)));

alter table public.cities enable row level security;

-- No policy for anon or authenticated on purpose. Direct reads return
-- nothing; created_by must never reach a client.
revoke all on public.cities from anon, authenticated;

create or replace function public.search_cities(
  p_country text,
  p_query   text default null,
  p_limit   integer default 20
) returns table (name text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_country text := lower(btrim(coalesce(p_country, '')));
  v_q       text := lower(btrim(coalesce(p_query, '')));
begin
  if auth.uid() is null or v_country = '' then
    return;
  end if;

  return query
    select c.name
    from public.cities c
    where lower(btrim(c.country)) = v_country
      and (v_q = '' or strpos(lower(c.name), v_q) > 0)
    order by
      case
        when v_q = '' then 0
        when strpos(lower(c.name), v_q) = 1 then 0
        else 1
      end,
      c.is_curated desc,
      c.name
    limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

create or replace function public.add_custom_city(
  p_country text,
  p_name    text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country  text := btrim(coalesce(p_country, ''));
  v_name     text := btrim(coalesce(p_name, ''));
  v_existing text;
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

  -- Already there under some spelling: hand back the one we already hold,
  -- so "dubai " can never become a second Dubai.
  select c.name into v_existing
  from public.cities c
  where lower(btrim(c.country)) = lower(v_country)
    and lower(btrim(c.name)) = lower(v_name)
  limit 1;

  if v_existing is not null then
    return v_existing;
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

revoke all on function public.search_cities(text, text, integer) from public, anon;
revoke all on function public.add_custom_city(text, text) from public, anon;
grant execute on function public.search_cities(text, text, integer) to authenticated;
grant execute on function public.add_custom_city(text, text) to authenticated;