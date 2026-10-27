-- Custom cities stay private until an admin approves them.
--
-- search_cities used to return every row. A name someone typed in was
-- then suggested to everyone else, with no review. Suggestions are now
-- curated rows, plus the caller's own unapproved rows so they can see
-- what they just added. add_custom_city is unchanged apart from
-- search_path.
--
-- Re-runnable. Same signatures and grants as 20261021000001.

create or replace function public.search_cities(
  p_country text,
  p_query   text default null,
  p_limit   integer default 20
) returns table (name text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
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
      and (c.is_curated or c.created_by = auth.uid())
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
set search_path = public, pg_temp
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

-- Cities waiting for review. full_name is null when the account is gone.
create or replace function public.admin_list_custom_cities()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.require_admin();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'country', c.country,
          'name', c.name,
          'created_at', c.created_at,
          'created_by', c.created_by,
          'full_name', c.full_name
        )
        order by c.created_at desc
      )
      from (
        select c.id, c.country, c.name, c.created_at, c.created_by, up.full_name
        from public.cities c
        left join public.user_profiles up on up.id = c.created_by
        where not c.is_curated
        order by c.created_at desc
        limit 500
      ) c
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_review_city(p_city uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.cities;
begin
  perform private.require_admin();

  select * into r from public.cities where id = p_city for update;
  if not found or r.is_curated then
    raise exception 'City not found' using errcode = 'P0002';
  end if;

  if p_approve then
    update public.cities set is_curated = true where id = r.id;
  else
    delete from public.cities where id = r.id;
  end if;

  perform private.admin_audit(
    case when p_approve then 'city.approve' else 'city.remove' end,
    'cities',
    r.id,
    to_jsonb(r),
    case when p_approve then jsonb_build_object('is_curated', true) else null end
  );
end;
$$;

revoke all on function public.admin_list_custom_cities() from public, anon;
grant execute on function public.admin_list_custom_cities() to authenticated;

revoke all on function public.admin_review_city(uuid, boolean) from public, anon;
grant execute on function public.admin_review_city(uuid, boolean) to authenticated;
