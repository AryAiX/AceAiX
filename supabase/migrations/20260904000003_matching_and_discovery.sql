-- ============================================================
-- 0021 — Matching & discovery
--
-- Two directions of the same idea:
--   scout/coach/club  ->  ranked athletes           (discover_athletes)
--   athlete           ->  ranked clubs & openings   (recommended_opportunities)
--
-- The match percentage is a weighted, fully explainable fit score. Every
-- returned row carries `reasons`, so the UI never shows a number it cannot
-- justify — which is what stops "AI matching" from feeling like a slot machine.
-- ============================================================

-- ------------------------------------------------------------
-- Organisation membership
-- A club or coach account needs to act for an organisation: post trials,
-- review applicants, appear as the org on a profile. Until now only admins
-- could write organisations at all.
-- ------------------------------------------------------------
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  member_role     text not null default 'staff'
                    check (member_role in ('owner','manager','scout','coach','staff')),
  status          text not null default 'pending'
                    check (status in ('pending','active','revoked')),
  invited_by      uuid references public.user_profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
alter table public.organization_members enable row level security;
create index if not exists idx_org_members_org  on public.organization_members(organization_id);
create index if not exists idx_org_members_user on public.organization_members(user_id);
create trigger trg_org_members_updated_at before update on public.organization_members
  for each row execute function public.set_updated_at();

create or replace function private.is_org_member(p_org uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'active'
      and (p_roles is null or m.member_role = any(p_roles))
  );
$$;

/* The organisation this user acts for, if any. */
create or replace function private.my_organization()
returns uuid language sql stable security definer set search_path = public as $$
  select m.organization_id
  from public.organization_members m
  where m.user_id = auth.uid() and m.status = 'active'
  order by case m.member_role
    when 'owner' then 0 when 'manager' then 1 when 'scout' then 2
    when 'coach' then 3 else 4 end
  limit 1;
$$;

drop policy if exists om_select on public.organization_members;
create policy om_select on public.organization_members
  for select to authenticated
  using (user_id = auth.uid() or private.is_org_member(organization_id) or private.is_admin());

drop policy if exists om_insert on public.organization_members;
create policy om_insert on public.organization_members
  for insert to authenticated
  with check (
    private.is_admin()
    or private.is_org_member(organization_id, array['owner','manager'])
    /* Self-claim of an unclaimed organisation lands as 'pending' and must be
       approved by an admin — it never grants access on its own. */
    or (user_id = auth.uid() and status = 'pending')
  );

drop policy if exists om_update on public.organization_members;
create policy om_update on public.organization_members
  for update to authenticated
  using (private.is_admin() or private.is_org_member(organization_id, array['owner','manager']))
  with check (private.is_admin() or private.is_org_member(organization_id, array['owner','manager']));

drop policy if exists om_delete on public.organization_members;
create policy om_delete on public.organization_members
  for delete to authenticated
  using (private.is_admin() or private.is_org_member(organization_id, array['owner','manager']));

-- Organisation owners/managers may now edit their own organisation.
drop policy if exists org_write on public.organizations;
drop policy if exists org_insert on public.organizations;
create policy org_insert on public.organizations
  for insert to authenticated with check (private.is_admin() or auth.uid() is not null);
drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations
  for update to authenticated
  using (private.is_admin() or private.is_org_member(id, array['owner','manager']))
  with check (private.is_admin() or private.is_org_member(id, array['owner','manager']));
drop policy if exists org_delete on public.organizations;
create policy org_delete on public.organizations
  for delete to authenticated using (private.is_admin());

-- A club must never be able to mark itself verified.
create or replace function private.prevent_org_self_verification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.role() = 'service_role' or private.is_admin() then
    return new;
  end if;
  if new.is_verified is distinct from old.is_verified
     or new.verification_status is distinct from old.verification_status then
    raise exception 'Only administrators can change organisation verification'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_org_verification_guard on public.organizations;
create trigger trg_org_verification_guard
  before update of is_verified, verification_status on public.organizations
  for each row execute function private.prevent_org_self_verification();

-- ------------------------------------------------------------
-- What a recruiter is looking for
-- ------------------------------------------------------------
create table if not exists public.match_preferences (
  user_id         uuid primary key references public.user_profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  sports          text[] not null default '{}',
  positions       text[] not null default '{}',
  levels          text[] not null default '{}',
  countries       text[] not null default '{}',
  age_min         integer check (age_min between 8 and 60),
  age_max         integer check (age_max between 8 and 60),
  min_score       integer not null default 0 check (min_score between 0 and 100),
  height_min_cm   numeric(5,1),
  height_max_cm   numeric(5,1),
  dominant_foot   text,
  open_to_offers_only boolean not null default true,
  notify_on_match boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.match_preferences enable row level security;
create trigger trg_match_prefs_updated_at before update on public.match_preferences
  for each row execute function public.set_updated_at();

drop policy if exists mpf_all on public.match_preferences;
create policy mpf_all on public.match_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- Semantic layer (optional).
-- Populated by the `talent-insights` edge function when an embedding provider
-- is configured. Every RPC below works with or without it — the rule-based
-- scorer is always the floor, embeddings only re-rank.
-- ------------------------------------------------------------
alter table public.athlete_profiles
  add column if not exists profile_embedding vector(1536),
  add column if not exists embedding_updated_at timestamptz,
  add column if not exists search_text text;

create or replace function private.athlete_search_text(p_athlete uuid)
returns text language sql stable security definer set search_path = public as $$
  select concat_ws(' ',
    up.full_name, ap.sport, ap.position_primary, ap.position, ap.level, ap.league,
    ap.nationality, up.city, up.country, ap.current_club, ap.bio, up.bio)
  from public.athlete_profiles ap
  join public.user_profiles up on up.id = ap.user_id
  where ap.id = p_athlete;
$$;

create or replace function private.sync_athlete_search_text()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.search_text := concat_ws(' ',
    new.sport, new.position_primary, new.position, new.level, new.league,
    new.nationality, new.current_club, new.bio);
  return new;
end;
$$;
drop trigger if exists trg_athlete_search_text on public.athlete_profiles;
create trigger trg_athlete_search_text
  before insert or update on public.athlete_profiles
  for each row execute function private.sync_athlete_search_text();

create index if not exists idx_athlete_search_text
  on public.athlete_profiles using gin (to_tsvector('simple', coalesce(search_text, '')));

-- ------------------------------------------------------------
-- Fit scoring
--
-- 0–100. Talent score is the base (it already encodes quality); the criteria
-- move it up or down according to how well the athlete matches the brief.
-- ------------------------------------------------------------
create or replace function private.match_fit(
  p_talent      integer,
  p_sport_ok    boolean,
  p_position_ok boolean,
  p_age_ok      boolean,
  p_level_ok    boolean,
  p_country_ok  boolean,
  p_open        boolean
) returns integer language sql immutable as $$
  select greatest(0, least(100, round(
      coalesce(p_talent, 0) * 0.45
    + case when p_sport_ok    then 20 else 0 end
    + case when p_position_ok then 14 else 0 end
    + case when p_age_ok      then 10 else 0 end
    + case when p_level_ok    then  6 else 0 end
    + case when p_country_ok  then  3 else 0 end
    + case when p_open        then  2 else 0 end
  ))::int);
$$;

/* Human-readable reasons behind a match percentage. */
create or replace function private.match_reasons(
  p_sport_ok boolean, p_position_ok boolean, p_age_ok boolean,
  p_level_ok boolean, p_country_ok boolean, p_talent integer
) returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select 'Plays your sport'::text as x where p_sport_ok
    union all select 'Matches the position you need' where p_position_ok
    union all select 'Inside your age range' where p_age_ok
    union all select 'Competing at the level you scout' where p_level_ok
    union all select 'Based in your region' where p_country_ok
    union all select 'Top-tier talent score' where p_talent >= 85
    union all select 'Strong talent score' where p_talent >= 70 and p_talent < 85
  ) t;
$$;

-- ------------------------------------------------------------
-- discover_athletes — the recruiter search
-- ------------------------------------------------------------
create or replace function public.discover_athletes(
  p_query      text default null,
  p_sport      text default null,
  p_positions  text[] default null,
  p_levels     text[] default null,
  p_countries  text[] default null,
  p_age_min    integer default null,
  p_age_max    integer default null,
  p_min_score  integer default null,
  p_open_only  boolean default false,
  p_sort       text default 'match',   -- match | score | recent | name
  p_limit      integer default 20,
  p_offset     integer default 0
)
returns table (
  athlete_id     uuid,
  user_id        uuid,
  full_name      text,
  avatar_url     text,
  sport          text,
  "position"     text,
  level          text,
  league         text,
  club           text,
  city           text,
  country        text,
  age            integer,
  height_cm      numeric,
  is_verified    boolean,
  is_minor       boolean,
  open_to_offers boolean,
  talent_score   integer,
  tier           text,
  match_percent  integer,
  reasons        jsonb,
  total_count    bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return query
  with base as (
    select
      ap.id                                              as athlete_id,
      ap.user_id                                         as user_id,
      up.full_name::text                                 as full_name,
      up.avatar_url::text                                as avatar_url,
      ap.sport::text                                     as sport,
      coalesce(ap.position_primary, ap.position)::text   as position,
      ap.level::text                                     as level,
      ap.league::text                                    as league,
      coalesce(o.name, ap.current_club)::text            as club,
      up.city::text                                      as city,
      up.country::text                                   as country,
      case when ap.birth_date is not null
        then extract(year from age(ap.birth_date))::int end as age,
      ap.height_cm                                       as height_cm,
      up.is_verified                                     as is_verified,
      coalesce(up.is_minor, false)                       as is_minor,
      coalesce(ap.is_open_to_offers, true)               as open_to_offers,
      coalesce(ts.overall, 0)                            as talent_score,
      coalesce(ts.tier, 'rising')::text                  as tier,
      ap.updated_at                                      as updated_at
    from public.athlete_profiles ap
    join public.user_profiles up on up.id = ap.user_id
    left join public.talent_scores ts on ts.athlete_id = ap.id
    left join public.organizations o on o.id = ap.current_club_id
    where
      /* never surface an account the viewer blocked, or that blocked them */
      not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_viewer and b.blocked_id = ap.user_id)
           or (b.blocker_id = ap.user_id and b.blocked_id = v_viewer)
      )
      and coalesce(up.is_suspended, false) = false
      /* a minor is only discoverable once a guardian has approved it */
      and (coalesce(up.is_minor, false) = false or coalesce(up.is_discoverable, false))
      and ap.user_id <> v_viewer
  ),
  filtered as (
    select
      b.*,
      (p_sport     is null or b.sport ilike p_sport)                         as sport_ok,
      (p_positions is null or cardinality(p_positions) = 0
         or b.position = any(p_positions))                                    as position_ok,
      (p_age_min is null and p_age_max is null)
        or (b.age is not null
            and b.age >= coalesce(p_age_min, 0)
            and b.age <= coalesce(p_age_max, 99))                             as age_ok,
      (p_levels    is null or cardinality(p_levels) = 0
         or b.level = any(p_levels))                                          as level_ok,
      (p_countries is null or cardinality(p_countries) = 0
         or b.country = any(p_countries))                                     as country_ok
    from base b
    where (p_query is null or trim(p_query) = '' or
           b.full_name ilike '%' || p_query || '%' or
           b.club      ilike '%' || p_query || '%' or
           b.position  ilike '%' || p_query || '%' or
           b.sport     ilike '%' || p_query || '%')
      and (p_sport     is null or b.sport ilike p_sport)
      and (p_positions is null or cardinality(p_positions) = 0 or b.position = any(p_positions))
      and (p_levels    is null or cardinality(p_levels) = 0 or b.level = any(p_levels))
      and (p_countries is null or cardinality(p_countries) = 0 or b.country = any(p_countries))
      and (p_age_min   is null or (b.age is not null and b.age >= p_age_min))
      and (p_age_max   is null or (b.age is not null and b.age <= p_age_max))
      and (p_min_score is null or b.talent_score >= p_min_score)
      and (not p_open_only or b.open_to_offers)
  ),
  scored as (
    select
      f.*,
      private.match_fit(f.talent_score, f.sport_ok, f.position_ok, f.age_ok,
                        f.level_ok, f.country_ok, f.open_to_offers) as match_percent,
      private.match_reasons(f.sport_ok, f.position_ok, f.age_ok,
                            f.level_ok, f.country_ok, f.talent_score) as reasons,
      count(*) over () as total_count
    from filtered f
  )
  select
    s.athlete_id, s.user_id, s.full_name, s.avatar_url, s.sport, s.position,
    s.level, s.league, s.club, s.city, s.country, s.age, s.height_cm,
    s.is_verified, s.is_minor, s.open_to_offers, s.talent_score, s.tier,
    s.match_percent, s.reasons, s.total_count
  from scored s
  order by
    case when p_sort = 'match'  then s.match_percent end desc nulls last,
    case when p_sort = 'score'  then s.talent_score  end desc nulls last,
    case when p_sort = 'recent' then s.updated_at    end desc nulls last,
    case when p_sort = 'name'   then s.full_name     end asc  nulls last,
    s.match_percent desc, s.talent_score desc
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke all on function public.discover_athletes(text, text, text[], text[], text[], integer, integer, integer, boolean, text, integer, integer) from public, anon;
grant execute on function public.discover_athletes(text, text, text[], text[], text[], integer, integer, integer, boolean, text, integer, integer) to authenticated;

-- ------------------------------------------------------------
-- recommended_athletes — "for you", driven by saved preferences
-- ------------------------------------------------------------
create or replace function public.recommended_athletes(p_limit integer default 12)
returns table (
  athlete_id uuid, user_id uuid, full_name text, avatar_url text,
  sport text, "position" text, level text, club text, country text,
  age integer, is_verified boolean, is_minor boolean,
  talent_score integer, tier text, match_percent integer, reasons jsonb,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare p record;
begin
  select * into p from public.match_preferences where user_id = auth.uid();

  return query
  select d.athlete_id, d.user_id, d.full_name, d.avatar_url, d.sport, d.position,
         d.level, d.club, d.country, d.age, d.is_verified, d.is_minor,
         d.talent_score, d.tier, d.match_percent, d.reasons, d.total_count
  from public.discover_athletes(
    null,
    case when p.sports is not null and cardinality(p.sports) > 0 then p.sports[1] end,
    p.positions, p.levels, p.countries,
    p.age_min, p.age_max, p.min_score,
    coalesce(p.open_to_offers_only, true),
    'match',
    coalesce(p_limit, 12),
    0
  ) d;
end;
$$;

revoke all on function public.recommended_athletes(integer) from public, anon;
grant execute on function public.recommended_athletes(integer) to authenticated;

-- ------------------------------------------------------------
-- recommended_opportunities — the athlete's side of the match
-- ------------------------------------------------------------
create or replace function public.recommended_opportunities(p_limit integer default 20)
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
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;

revoke all on function public.recommended_opportunities(integer) from public, anon;
grant execute on function public.recommended_opportunities(integer) to authenticated;

-- ------------------------------------------------------------
-- Applicant review for the club side
-- ------------------------------------------------------------
create or replace function public.opportunity_applicants(p_opportunity uuid)
returns table (
  application_id uuid,
  athlete_user_id uuid,
  athlete_id     uuid,
  full_name      text,
  avatar_url     text,
  "position"     text,
  age            integer,
  country        text,
  talent_score   integer,
  tier           text,
  match_percent  integer,
  status         text,
  message        text,
  applied_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare o record;
begin
  select * into o from public.opportunities where id = p_opportunity;
  if not found then
    raise exception 'Opportunity not found' using errcode = 'P0002';
  end if;
  if not (o.created_by_id = auth.uid()
          or private.is_admin()
          or (o.organization_id is not null
              and private.is_org_member(o.organization_id, array['owner','manager','scout','coach']))) then
    raise exception 'Not allowed to review these applicants' using errcode = '42501';
  end if;

  return query
  select
    a.id, a.athlete_id, ap.id, up.full_name::text, up.avatar_url::text,
    coalesce(ap.position_primary, ap.position)::text,
    case when ap.birth_date is not null
      then extract(year from age(ap.birth_date))::int end,
    up.country::text,
    coalesce(ts.overall, 0), coalesce(ts.tier, 'rising')::text,
    private.match_fit(
      coalesce(ts.overall, 0),
      (o.sport is null or o.sport ilike ap.sport),
      (o.position is null or o.position = coalesce(ap.position_primary, ap.position)),
      true, true, true, coalesce(ap.is_open_to_offers, true)),
    a.status, a.message, a.created_at
  from public.applications a
  join public.user_profiles up on up.id = a.athlete_id
  left join public.athlete_profiles ap on ap.user_id = a.athlete_id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where a.opportunity_id = p_opportunity
  order by 11 desc, a.created_at asc;
end;
$$;

revoke all on function public.opportunity_applicants(uuid) from public, anon;
grant execute on function public.opportunity_applicants(uuid) to authenticated;

-- Applications: the posting side must be able to read and progress them.
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select to authenticated
  using (
    athlete_id = auth.uid()
    or private.is_admin()
    or exists (
      select 1 from public.opportunities o
      where o.id = applications.opportunity_id
        and (o.created_by_id = auth.uid()
             or (o.organization_id is not null
                 and private.is_org_member(o.organization_id,
                       array['owner','manager','scout','coach'])))
    )
  );

drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications
  for update to authenticated
  using (
    athlete_id = auth.uid()
    or exists (
      select 1 from public.opportunities o
      where o.id = applications.opportunity_id
        and (o.created_by_id = auth.uid()
             or (o.organization_id is not null
                 and private.is_org_member(o.organization_id,
                       array['owner','manager','scout','coach'])))
    )
  )
  with check (
    athlete_id = auth.uid()
    or exists (
      select 1 from public.opportunities o
      where o.id = applications.opportunity_id
        and (o.created_by_id = auth.uid()
             or (o.organization_id is not null
                 and private.is_org_member(o.organization_id,
                       array['owner','manager','scout','coach'])))
    )
  );

-- Opportunities may be posted by an org member on the org's behalf.
drop policy if exists opp_insert on public.opportunities;
create policy opp_insert on public.opportunities
  for insert to authenticated
  with check (
    created_by_id = auth.uid()
    and (
      organization_id is null
      or private.is_org_member(organization_id, array['owner','manager','scout','coach'])
      or private.is_admin()
    )
  );

drop policy if exists opp_update on public.opportunities;
create policy opp_update on public.opportunities
  for update to authenticated
  using (
    created_by_id = auth.uid()
    or private.is_admin()
    or (organization_id is not null
        and private.is_org_member(organization_id, array['owner','manager']))
  )
  with check (
    created_by_id = auth.uid()
    or private.is_admin()
    or (organization_id is not null
        and private.is_org_member(organization_id, array['owner','manager']))
  );

grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.match_preferences to authenticated;
