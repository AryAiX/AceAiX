create or replace function public.search_people(
  p_query text,
  p_role  text default null,          -- athlete | coach | club | scout | null
  p_limit integer default 20
)
returns table (
  id              uuid,
  role            text,
  full_name       text,
  avatar_url      text,
  bio             text,
  city            text,
  country         text,
  is_verified     boolean,
  is_minor        boolean,
  followers_count integer,
  sport           text,
  "position"      text,
  talent_score    integer,
  tier            text,
  is_following    boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    up.id,
    up.role::text,
    up.full_name::text,
    up.avatar_url::text,
    up.bio,
    up.city::text,
    up.country::text,
    up.is_verified,
    up.is_minor,
    up.followers_count,
    ap.sport::text,
    coalesce(ap.position_primary, ap.position)::text,
    coalesce(ts.overall, 0),
    coalesce(ts.tier, 'rising')::text,
    exists (select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = up.id)
  from public.user_profiles up
  left join public.athlete_profiles ap on ap.user_id = up.id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where auth.uid() is not null
    and coalesce(trim(p_query), '') <> ''
    and up.full_name ilike '%' || trim(p_query) || '%'
    and up.id <> auth.uid()
    and not coalesce(up.is_suspended, false)
    and (p_role is null or up.role::text = p_role)
    and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
    and not (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and up.id <> auth.uid())
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
         or (b.blocker_id = up.id and b.blocked_id = auth.uid())
    )
  order by up.is_verified desc, coalesce(ts.overall, 0) desc, up.full_name asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

create or replace function public.talent_leaderboard(
  p_sport   text default null,
  p_country text default null,
  p_limit   integer default 25
)
returns table (
  athlete_id uuid,
  user_id    uuid,
  full_name  text,
  avatar_url text,
  sport      text,
  "position" text,
  country    text,
  overall    integer,
  tier       text,
  rank       bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    ap.id,
    ap.user_id,
    up.full_name::text,
    up.avatar_url::text,
    ap.sport::text,
    coalesce(ap.position_primary, ap.position)::text,
    up.country::text,
    ts.overall,
    ts.tier,
    row_number() over (order by ts.overall desc, ts.updated_at asc)
  from public.talent_scores ts
  join public.athlete_profiles ap on ap.id = ts.athlete_id
  join public.user_profiles   up on up.id = ap.user_id
  where auth.uid() is not null
    and (p_sport   is null or ap.sport   ilike p_sport)
    and (p_country is null or up.country ilike p_country)
    and coalesce(ap.is_open_to_offers, true)
    and not coalesce(up.is_suspended, false)
    -- A minor appears only once a guardian has approved discovery.
    and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
    and not (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and ap.user_id <> auth.uid())
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = ap.user_id)
         or (b.blocker_id = ap.user_id and b.blocked_id = auth.uid())
    )
  order by ts.overall desc, ts.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

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
  p_sort       text default 'match',
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
  age_band       text,
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
        then extract(year from age(ap.birth_date))::int end as real_age,
      up.age_band::text                                  as age_band,
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
      not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_viewer and b.blocked_id = ap.user_id)
           or (b.blocker_id = ap.user_id and b.blocked_id = v_viewer)
      )
      and coalesce(up.is_suspended, false) = false
      and (coalesce(up.is_minor, false) = false or coalesce(up.is_discoverable, false))
      and not (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and ap.user_id <> auth.uid())
      and ap.user_id <> v_viewer
  ),
  filtered as (
    select
      b.*,
      (p_sport     is null or b.sport ilike p_sport)                          as sport_ok,
      (p_positions is null or cardinality(p_positions) = 0
         or b.position = any(p_positions))                                    as position_ok,
      ((p_age_min is null and p_age_max is null)
        or (b.real_age is not null
            and b.real_age >= coalesce(p_age_min, 0)
            and b.real_age <= coalesce(p_age_max, 99)))                       as age_ok,
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
      and (p_age_min   is null or (b.real_age is not null and b.real_age >= p_age_min))
      and (p_age_max   is null or (b.real_age is not null and b.real_age <= p_age_max))
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
    s.level, s.league, s.club, s.city, s.country,
    /* Exact years for adults; nothing for a minor. */
    case when s.is_minor then null else s.real_age end,
    s.age_band,
    s.height_cm,
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

-- The supporters list. There is no team_supporters function; this is it.
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
    and not (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and up.id <> auth.uid())
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

create or replace function public.challenge_leaderboard(
  p_challenge_id uuid,
  p_limit        integer default 25,
  p_offset       integer default 0
)
returns table (
  entry_id       uuid,
  rank           integer,
  athlete_id     uuid,
  user_id        uuid,
  full_name      text,
  avatar_url     text,
  age            integer,
  age_band       text,
  sport          text,
  "position"     text,
  talent_score   integer,
  tier           text,
  media_id       uuid,
  media_url      text,
  thumbnail_url  text,
  claimed_value  numeric,
  verified_value numeric,
  status         text,
  note           text,
  created_at     timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with c as (select * from public.challenges where id = p_challenge_id),
  rows as (
    select
      e.id as entry_id, e.athlete_id, up.id as user_id, up.full_name, up.avatar_url,
      case when coalesce(up.is_minor, false) then null
           else date_part('year', age(ap.birth_date))::int end as age,
      up.age_band, ap.sport, coalesce(ap.position_primary, ap.position) as "position",
      ts.overall as talent_score, ts.tier,
      e.media_id, m.storage_url as media_url, m.thumbnail_url,
      e.claimed_value, e.verified_value, e.status, e.note, e.created_at,
      coalesce(e.verified_value, e.claimed_value) as sort_value
    from public.challenge_entries e
    join c on c.id = e.challenge_id
    join public.athlete_profiles ap on ap.id = e.athlete_id
    join public.user_profiles up on up.id = ap.user_id
    left join public.talent_scores ts on ts.athlete_id = ap.id
    left join public.athlete_media m on m.id = e.media_id
    where e.status <> 'rejected'
      and coalesce(up.is_suspended, false) = false
      /* Entering required discovery to be on, but a guardian can revoke it
         afterwards — and when they do, the leaderboard has to forget the
         child too, not just search. */
      and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
      and not (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and up.id <> auth.uid())
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
           or (b.blocker_id = up.id and b.blocked_id = auth.uid())
      )
  )
  select
    r.entry_id,
    row_number() over (
      order by
        (r.status = 'verified') desc,
        case when (select metric_better from c) = 'lower' then r.sort_value end asc nulls last,
        case when (select metric_better from c) <> 'lower' then r.sort_value end desc nulls last,
        r.created_at
    )::int as rank,
    r.athlete_id, r.user_id, r.full_name, r.avatar_url, r.age, r.age_band,
    r.sport, r."position", r.talent_score, r.tier,
    r.media_id, r.media_url, r.thumbnail_url,
    r.claimed_value, r.verified_value, r.status, r.note, r.created_at
  from rows r
  order by rank
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

create or replace function public.get_game_intelligence(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_g    public.gi_profiles;
  v_up   public.user_profiles;
  v_me   public.user_profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_g from public.gi_profiles where user_id = p_user;
  if v_g.athlete_id is null or v_g.overall is null then return null; end if;

  if p_user = auth.uid() then
    return to_jsonb(v_g) || jsonb_build_object('view', 'owner');
  end if;

  select * into v_up from public.user_profiles where id = p_user;
  select * into v_me from public.user_profiles where id = auth.uid();

  if not v_g.share_with_clubs
     or coalesce(v_up.is_suspended, false)
     or (coalesce(v_up.is_minor, true) and not coalesce(v_up.is_discoverable, false))
     or (private.viewer_is_audience() and coalesce(v_up.age_band::text, '') not in ('18_24', '25_plus') and p_user <> auth.uid())
     or exists (
       select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = p_user)
           or (b.blocker_id = p_user and b.blocked_id = auth.uid()))
  then
    return null;
  end if;

  /* Recruiter roles are self-chosen at signup; the full view needs a check. */
  if private.is_admin() or private.is_verified_adult(auth.uid()) then
    return jsonb_build_object(
      'view', 'recruiter',
      'overall', v_g.overall,
      'percentile', v_g.percentile,
      'age_band', v_g.age_band,
      'confidence', v_g.confidence,
      'subscores', v_g.subscores,
      'tests_completed', v_g.tests_completed,
      'last_session_at', v_g.last_session_at
    );
  end if;

  if v_g.show_badge then
    return jsonb_build_object(
      'view', 'badge',
      'overall', v_g.overall,
      'percentile', v_g.percentile,
      'age_band', v_g.age_band
    );
  end if;

  return null;
end;
$$;
