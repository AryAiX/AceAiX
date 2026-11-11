-- ============================================================
-- Trials search looks through every open trial (QA-166)
--
-- The search box and the Filters sheet only looked at the trials
-- already loaded on the phone, so anything past that first page
-- could not be found. search_opportunities uses the same match,
-- the same reasons and the same order as recommended_opportunities,
-- and the same rules: active, not past its deadline, and hidden
-- when either person has blocked the other. The words, sports and
-- types only narrow that set. Nothing new becomes visible.
-- ============================================================

create or replace function public.search_opportunities(
  p_query text default null,
  p_sports text[] default null,
  p_types text[] default null,
  p_limit integer default 50
)
returns table (
  id             uuid,
  title          text,
  type           text,
  description    text,
  location       text,
  sport          text,
  "position"     text,
  deadline       date,
  org_id         uuid,
  org_name       text,
  org_logo       text,
  org_verified   boolean,
  match_percent  integer,
  reasons        jsonb,
  has_applied    boolean,
  is_saved       boolean,
  created_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  ap record;
  v_score integer := 0;
  v_age integer;
  v_query text;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select a.*, up.country as user_country into ap
  from public.athlete_profiles a
  join public.user_profiles up on up.id = a.user_id
  where a.user_id = v_user;

  if ap.id is not null then
    select coalesce(ts.overall, 0) into v_score
    from public.talent_scores ts where ts.athlete_id = ap.id;
    if ap.birth_date is not null then
      v_age := extract(year from age(ap.birth_date))::int;
    end if;
  end if;

  /* Trim, then keep the first 100 characters, then escape \ % _ so the
     letters are matched as plain text. A blank search does not narrow. */
  v_query := left(btrim(coalesce(p_query, '')), 100);
  if v_query = '' then
    v_query := null;
  else
    v_query := replace(v_query, E'\\', E'\\\\');
    v_query := replace(v_query, '%', E'\\%');
    v_query := replace(v_query, '_', E'\\_');
  end if;

  return query
  with candidate as (
    select
      o.id, o.title::text, o.type::text, o.description, o.location::text,
      o.sport::text, o.position::text, o.application_deadline as deadline,
      org.id as org_id, org.name::text as org_name, org.logo_url::text as org_logo,
      coalesce(org.is_verified, false) as org_verified, o.created_at,
      (ap.sport is not null and o.sport is not null and o.sport ilike ap.sport) as sport_ok,
      (o.position is null or o.position = coalesce(ap.position_primary, ap.position)) as position_ok,
      (org.country is null or org.country = ap.user_country) as country_ok
    from public.opportunities o
    left join public.organizations org on org.id = o.organization_id
    where o.is_active
      and (o.application_deadline is null or o.application_deadline >= current_date)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_user and b.blocked_id = o.created_by_id)
           or (b.blocker_id = o.created_by_id and b.blocked_id = v_user)
      )
      and (
        v_query is null
        or o.title ilike '%' || v_query || '%' escape E'\\'
        or org.name ilike '%' || v_query || '%' escape E'\\'
        or (
          o.organization_id is null
          and private.viewer_can_see_author(o.created_by_id)
          and exists (
            select 1 from public.user_profiles poster
            where poster.id = o.created_by_id
              and poster.full_name ilike '%' || v_query || '%' escape E'\\'
          )
        )
      )
      and (
        p_sports is null
        or coalesce(cardinality(p_sports), 0) = 0
        or lower(o.sport) in (select lower(s) from unnest(p_sports) as u(s))
      )
      and (
        p_types is null
        or coalesce(cardinality(p_types), 0) = 0
        or exists (
          select 1 from unnest(p_types) as wanted(kind)
          where lower(o.type) = lower(wanted.kind)
             or (lower(wanted.kind) = 'contract' and lower(o.type) = 'offer')
        )
      )
  )
  select
    c.id, c.title, c.type, c.description, c.location, c.sport, c.position,
    c.deadline, c.org_id, c.org_name, c.org_logo, c.org_verified,
    private.match_fit(v_score, c.sport_ok, c.position_ok, true, true, c.country_ok, true),
    private.match_reasons(c.sport_ok, c.position_ok, true, true, c.country_ok, v_score),
    exists (select 1 from public.applications a where a.opportunity_id = c.id and a.athlete_id = v_user),
    exists (select 1 from public.opportunity_saves s where s.opportunity_id = c.id and s.athlete_id = v_user),
    c.created_at
  from candidate c
  order by 13 desc, c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

revoke all on function public.search_opportunities(text, text[], text[], integer) from public, anon;
grant execute on function public.search_opportunities(text, text[], text[], integer) to authenticated;
