-- ============================================================
-- 0907/01 — Who you support
--
-- A fourteen-year-old signing up has almost nothing to put in a profile yet:
-- no verified matches, no endorsements, often no footage. But they know
-- exactly which team they support and which ground they would rather be at,
-- and they will answer that question happily. So we ask it at sign-up, and it
-- earns its place three ways: the feed has something to show on day one, two
-- strangers who support the same club have a reason to follow each other, and
-- a club posting a trial can see which of the applicants grew up wanting to
-- play for them.
--
-- Two things this is deliberately NOT:
--
--   * It is not `athlete_profiles.current_club`. That is where someone plays
--     today and a scout depends on it being accurate. This is fandom. Mixing
--     the two would put "Real Madrid" in the box a recruiter reads as a fact.
--
--   * It does not touch the Talent Score. Nothing a person merely likes
--     should move a number that clubs use to rank them.
-- ============================================================

-- ------------------------------------------------------------
-- The catalogue
--
-- Curated rows ship with the product and are what search returns. Anyone can
-- add a club that is missing — a local academy, a national side we did not
-- think of — but their row stays private to them until a moderator curates
-- it, so the picker can never become a place to publish a slur.
-- ------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 2 and 80),
  short_name  text check (short_name is null or length(btrim(short_name)) between 2 and 24),
  sport       text not null,
  country     text,
  city        text,
  crest_url   text,
  is_curated  boolean not null default false,
  created_by  uuid references public.user_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.teams enable row level security;

create unique index if not exists idx_teams_identity
  on public.teams (lower(btrim(name)), sport, coalesce(country, ''));
create index if not exists idx_teams_search
  on public.teams (sport, is_curated) where is_curated;

-- ------------------------------------------------------------
-- The choice
--
-- `rank` is the order they picked them in — rank 1 is the shirt they own.
-- Five is plenty; the cap is enforced in the trigger below rather than by
-- trusting the client.
-- ------------------------------------------------------------
create table if not exists public.favorite_teams (
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  team_id    uuid not null references public.teams(id) on delete cascade,
  rank       smallint not null default 1 check (rank between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);
alter table public.favorite_teams enable row level security;

create index if not exists idx_favorite_teams_team on public.favorite_teams (team_id);

create or replace function private.cap_favorite_teams()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.favorite_teams where user_id = new.user_id) > 5 then
    raise exception 'You can follow up to five teams.'
      using hint = 'favorite_teams_max';
  end if;
  return null;
end;
$$;

drop trigger if exists trg_cap_favorite_teams on public.favorite_teams;
create constraint trigger trg_cap_favorite_teams
  after insert on public.favorite_teams
  deferrable initially deferred
  for each row execute function private.cap_favorite_teams();

-- ------------------------------------------------------------
-- The ground
--
-- One free-text line. A stadium someone loves is taste, not location: it says
-- nothing about where a child trains or lives, which is why this is safe to
-- show on a minor's profile when their current club would not be.
-- ------------------------------------------------------------
alter table public.user_profiles
  add column if not exists favorite_venue text
    check (favorite_venue is null or length(btrim(favorite_venue)) between 2 and 80);

grant update (favorite_venue) on public.user_profiles to authenticated;

-- ------------------------------------------------------------
-- Reading
-- ------------------------------------------------------------
drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams
  for select to authenticated
  using (is_curated or created_by = auth.uid());

drop policy if exists favorite_teams_read on public.favorite_teams;
create policy favorite_teams_read on public.favorite_teams
  for select to authenticated
  using (true);

-- Writes go through the functions below, which enforce the count and the
-- ownership rules; nothing here is writable directly.
revoke insert, update, delete on public.teams from authenticated, anon;
revoke insert, update, delete on public.favorite_teams from authenticated, anon;

-- ------------------------------------------------------------
-- Search
--
-- Curated rows first, then the caller's own additions, then anything whose
-- name merely contains the query — so typing "man" surfaces Manchester before
-- Al Mansoura.
-- ------------------------------------------------------------
create or replace function public.search_teams(
  p_query text default null,
  p_sport text default null,
  p_limit integer default 20
)
returns table (
  id         uuid,
  name       text,
  short_name text,
  sport      text,
  country    text,
  city       text,
  crest_url  text,
  is_curated boolean,
  followers  integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with q as (select nullif(btrim(coalesce(p_query, '')), '') as term)
  select
    t.id, t.name, t.short_name, t.sport, t.country, t.city, t.crest_url, t.is_curated,
    (select count(*)::int from public.favorite_teams f where f.team_id = t.id) as followers
  from public.teams t, q
  where (t.is_curated or t.created_by = auth.uid())
    and (p_sport is null or t.sport = p_sport)
    and (
      q.term is null
      or t.name ilike q.term || '%'
      or coalesce(t.short_name, '') ilike q.term || '%'
      or t.name ilike '%' || q.term || '%'
    )
  order by
    (q.term is not null and t.name ilike q.term || '%') desc,
    t.is_curated desc,
    followers desc,
    t.name
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

-- ------------------------------------------------------------
-- Adding one we do not have
-- ------------------------------------------------------------
create or replace function public.add_custom_team(
  p_name    text,
  p_sport   text,
  p_country text default null,
  p_city    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using hint = 'auth_required';
  end if;
  if length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Give the team a name.' using hint = 'team_name_required';
  end if;

  -- Somebody else may already have added it, curated or not.
  select t.id into v_id
  from public.teams t
  where lower(btrim(t.name)) = lower(btrim(p_name))
    and t.sport = p_sport
    and coalesce(t.country, '') = coalesce(p_country, '');

  if v_id is not null then
    return v_id;
  end if;

  -- One person adding fifty clubs is not a fan, it is a spammer.
  if (select count(*) from public.teams
      where created_by = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'That is a lot of teams for one day. Try again tomorrow.'
      using hint = 'rate_limited';
  end if;

  insert into public.teams (name, sport, country, city, created_by)
  values (btrim(p_name), p_sport, nullif(btrim(coalesce(p_country, '')), ''),
          nullif(btrim(coalesce(p_city, '')), ''), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Choosing
--
-- The whole set is replaced at once, in the order given, so the client never
-- has to reason about adds and removes.
-- ------------------------------------------------------------
create or replace function public.set_favorite_teams(p_team_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_ids  uuid[];
begin
  if v_uid is null then
    raise exception 'Sign in first.' using hint = 'auth_required';
  end if;

  -- De-duplicate while keeping the order they were given in.
  select array_agg(id order by ord)
  into v_ids
  from (
    select distinct on (id) id, ord
    from unnest(coalesce(p_team_ids, '{}'::uuid[])) with ordinality as t(id, ord)
    order by id, ord
  ) d;

  if coalesce(array_length(v_ids, 1), 0) > 5 then
    raise exception 'You can follow up to five teams.' using hint = 'favorite_teams_max';
  end if;

  delete from public.favorite_teams
  where user_id = v_uid
    and (v_ids is null or team_id <> all (v_ids));

  if v_ids is not null then
    insert into public.favorite_teams (user_id, team_id, rank)
    select v_uid, id, ord::smallint
    from unnest(v_ids) with ordinality as t(id, ord)
    where exists (
      select 1 from public.teams x
      where x.id = t.id and (x.is_curated or x.created_by = v_uid)
    )
    on conflict (user_id, team_id) do update set rank = excluded.rank;
  end if;
end;
$$;

create or replace function public.set_favorite_venue(p_venue text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.user_profiles
  set favorite_venue = nullif(btrim(coalesce(p_venue, '')), '')
  where id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Someone's teams, for a profile
-- ------------------------------------------------------------
create or replace function public.teams_of(p_user uuid)
returns table (
  id         uuid,
  name       text,
  short_name text,
  sport      text,
  country    text,
  crest_url  text,
  rank       smallint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.id, t.name, t.short_name, t.sport, t.country, t.crest_url, f.rank
  from public.favorite_teams f
  join public.teams t on t.id = f.team_id
  where f.user_id = p_user
  order by f.rank, t.name;
$$;

-- ------------------------------------------------------------
-- Other people who support them
--
-- Same discovery gate as everywhere else: a minor who has not been made
-- discoverable does not appear in a list a stranger can open, and no minor's
-- exact age is returned.
-- ------------------------------------------------------------
create or replace function public.fans_of_team(
  p_team_id uuid,
  p_limit   integer default 20,
  p_offset  integer default 0
)
returns table (
  user_id      uuid,
  full_name    text,
  avatar_url   text,
  role         text,
  sport        text,
  "position"   text,
  age          integer,
  age_band     text,
  talent_score integer,
  tier         text,
  is_verified  boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    up.id,
    up.full_name,
    up.avatar_url,
    up.role,
    ap.sport,
    coalesce(ap.position_primary, ap.position),
    case when coalesce(up.is_minor, false) then null
         else date_part('year', age(ap.birth_date))::int end,
    up.age_band,
    ts.overall,
    ts.tier,
    coalesce(up.is_verified, false)
  from public.favorite_teams f
  join public.user_profiles up on up.id = f.user_id
  left join public.athlete_profiles ap on ap.user_id = up.id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where f.team_id = p_team_id
    and coalesce(up.is_suspended, false) = false
    and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
    and up.id <> auth.uid()
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
         or (b.blocker_id = up.id and b.blocked_id = auth.uid())
    )
  order by ts.overall desc nulls last, up.full_name
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function
  public.search_teams(text, text, integer),
  public.add_custom_team(text, text, text, text),
  public.set_favorite_teams(uuid[]),
  public.set_favorite_venue(text),
  public.teams_of(uuid),
  public.fans_of_team(uuid, integer, integer)
to authenticated;

-- ------------------------------------------------------------
-- One team, for its own page
-- ------------------------------------------------------------
create or replace function public.team_detail(p_id uuid)
returns table (
  id         uuid,
  name       text,
  short_name text,
  sport      text,
  country    text,
  city       text,
  crest_url  text,
  is_curated boolean,
  followers  integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.id, t.name, t.short_name, t.sport, t.country, t.city, t.crest_url, t.is_curated,
         (select count(*)::int from public.favorite_teams f where f.team_id = t.id)
  from public.teams t
  where t.id = p_id
    and (t.is_curated or t.created_by = auth.uid());
$$;

grant execute on function public.team_detail(uuid) to authenticated;
-- ------------------------------------------------------------
-- Everything the fandom row on a profile needs, in one call
--
-- `get_profile_bundle` could carry these, but it is the hottest read in the
-- app and rewriting it to add two optional fields risks the screen that used
-- to be broken. One small function instead.
-- ------------------------------------------------------------
create or replace function public.fandom_of(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'venue', (select favorite_venue from public.user_profiles where id = p_user),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'name', t.name, 'short_name', t.short_name,
               'sport', t.sport, 'country', t.country, 'crest_url', t.crest_url,
               'rank', f.rank
             ) order by f.rank, t.name)
      from public.favorite_teams f
      join public.teams t on t.id = f.team_id
      where f.user_id = p_user
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.fandom_of(uuid) to authenticated;
