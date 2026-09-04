-- ============================================================
-- 0020 — Talent Score
--
-- The Talent Score is the product's core object: a 0–100 number, broken
-- into five pillars, that tells an athlete where they stand and tells a
-- scout who is worth a look.
--
-- Design rules:
--   * Deterministic and explainable. Every point is traceable to a pillar,
--     and every pillar to rows in this database. No black box.
--   * Server-computed only. An athlete can never write their own score.
--   * Verified data is worth more than self-reported data — always.
--   * Recomputed on write via triggers, so the number is never stale.
-- ============================================================

-- ------------------------------------------------------------
-- Storage
-- ------------------------------------------------------------
create table if not exists public.talent_scores (
  athlete_id     uuid primary key references public.athlete_profiles(id) on delete cascade,
  overall        integer not null default 0 check (overall between 0 and 100),
  tier           text    not null default 'rising'
                   check (tier in ('rising','bronze','silver','gold','elite')),

  -- Pillar sub-scores, each 0–100 before weighting.
  profile_score      integer not null default 0 check (profile_score      between 0 and 100),
  performance_score  integer not null default 0 check (performance_score  between 0 and 100),
  media_score        integer not null default 0 check (media_score        between 0 and 100),
  credibility_score  integer not null default 0 check (credibility_score  between 0 and 100),
  engagement_score   integer not null default 0 check (engagement_score   between 0 and 100),

  /* Raw inputs used for the calculation — shown in the "why this number"
     screen so the athlete can see exactly what to improve. */
  inputs         jsonb   not null default '{}'::jsonb,
  /* Ordered, actionable suggestions: [{key, label, points, priority}] */
  tips           jsonb   not null default '[]'::jsonb,
  /* Optional natural-language summary written by the insights edge function. */
  ai_summary     text,

  percentile     integer check (percentile between 0 and 100),
  previous_overall integer,
  algorithm_version integer not null default 1,
  computed_at    timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.talent_scores enable row level security;

create index if not exists idx_talent_scores_overall on public.talent_scores(overall desc);
create index if not exists idx_talent_scores_tier    on public.talent_scores(tier);

create trigger trg_talent_scores_updated_at before update on public.talent_scores
  for each row execute function public.set_updated_at();

-- History, so an athlete can see their curve over time.
create table if not exists public.talent_score_history (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athlete_profiles(id) on delete cascade,
  overall     integer not null,
  tier        text not null,
  pillars     jsonb not null default '{}'::jsonb,
  recorded_on date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (athlete_id, recorded_on)
);
alter table public.talent_score_history enable row level security;
create index if not exists idx_tsh_athlete on public.talent_score_history(athlete_id, recorded_on desc);

-- ------------------------------------------------------------
-- Tier banding
-- ------------------------------------------------------------
create or replace function private.tier_for_score(p_score integer)
returns text language sql immutable as $$
  select case
    when p_score >= 85 then 'elite'
    when p_score >= 70 then 'gold'
    when p_score >= 55 then 'silver'
    when p_score >= 40 then 'bronze'
    else 'rising'
  end;
$$;

-- ------------------------------------------------------------
-- The calculation
--
-- Weights (sum = 100):
--   profile      15   is the portfolio actually filled in?
--   performance  30   what have they done on the pitch?
--   media        15   can a scout watch them play?
--   credibility  20   who vouches for them, and is any of it verified?
--   engagement   20   are they active, and are scouts looking?
-- ------------------------------------------------------------
create or replace function private.compute_talent_score(p_athlete uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ap              record;
  up              record;

  -- profile
  v_profile       numeric := 0;
  v_filled        integer := 0;
  v_fields        integer := 10;

  -- performance
  v_matches       integer := 0;
  v_recent        integer := 0;
  v_verified_rec  integer := 0;
  v_goal_contrib  numeric := 0;
  v_minutes       integer := 0;
  v_performance   numeric := 0;

  -- media
  v_media         integer := 0;
  v_video         integer := 0;
  v_media_views   integer := 0;
  v_media_score   numeric := 0;

  -- credibility
  v_endorsements  integer := 0;
  v_verified_end  integer := 0;
  v_is_verified   boolean := false;
  v_club_linked   boolean := false;
  v_credibility   numeric := 0;

  -- engagement
  v_posts_30      integer := 0;
  v_followers     integer := 0;
  v_scout_views   integer := 0;
  v_last_active   timestamptz;
  v_engagement    numeric := 0;

  v_overall       integer;
begin
  select * into ap from public.athlete_profiles where id = p_athlete;
  if not found then
    return null;
  end if;

  select * into up from public.user_profiles where id = ap.user_id;

  -- ---------- 1. Profile completeness (15) ----------
  if coalesce(nullif(trim(ap.sport), ''), null) is not null           then v_filled := v_filled + 1; end if;
  if coalesce(ap.position_primary, ap.position) is not null           then v_filled := v_filled + 1; end if;
  if ap.birth_date is not null                                        then v_filled := v_filled + 1; end if;
  if ap.height_cm is not null and ap.weight_kg is not null            then v_filled := v_filled + 1; end if;
  if coalesce(nullif(trim(ap.bio), ''), null) is not null             then v_filled := v_filled + 1; end if;
  if ap.nationality is not null                                       then v_filled := v_filled + 1; end if;
  if coalesce(ap.current_club_id::text, nullif(ap.current_club, '')) is not null
                                                                      then v_filled := v_filled + 1; end if;
  if up.avatar_url is not null                                        then v_filled := v_filled + 1; end if;
  if up.city is not null and up.country is not null                   then v_filled := v_filled + 1; end if;
  if coalesce(ap.level, '') <> ''                                     then v_filled := v_filled + 1; end if;

  v_profile := round((v_filled::numeric / v_fields) * 100);

  -- ---------- 2. Performance (30) ----------
  select
    count(*),
    count(*) filter (where match_date >= current_date - interval '12 months'),
    count(*) filter (where source = 'verified'),
    coalesce(sum(goals + assists), 0),
    coalesce(sum(minutes_played), 0)
  into v_matches, v_recent, v_verified_rec, v_goal_contrib, v_minutes
  from public.match_records
  where athlete_id = p_athlete;

  if v_matches > 0 then
    -- Volume of recent, evidenced play (up to 45 pts)
    v_performance := least(45, v_recent * 3);
    -- Output relative to games played (up to 30 pts)
    v_performance := v_performance
      + least(30, (v_goal_contrib / greatest(v_matches, 1)) * 22);
    -- Verified records are worth roughly double self-reported ones (up to 25)
    v_performance := v_performance + least(25, v_verified_rec * 5);
  end if;
  v_performance := least(100, v_performance);

  -- ---------- 3. Media (15) ----------
  select
    count(*),
    count(*) filter (where media_type in ('video','highlight_reel')),
    coalesce(sum(views_count), 0)
  into v_media, v_video, v_media_views
  from public.athlete_media
  where athlete_id = p_athlete and is_public;

  if v_media > 0 then
    v_media_score := least(55, v_video * 18)          -- a scout needs footage
                   + least(20, (v_media - v_video) * 5)
                   + least(25, v_media_views / 40.0);
  end if;
  v_media_score := least(100, v_media_score);

  -- ---------- 4. Credibility (20) ----------
  select
    count(*),
    count(*) filter (where e.endorser_role in ('coach','scout','club','federation'))
  into v_endorsements, v_verified_end
  from public.endorsements e
  join public.user_profiles eu on eu.id = e.endorser_id and eu.is_verified
  where e.athlete_id = p_athlete;

  v_is_verified := coalesce(up.is_verified, false);
  v_club_linked := ap.current_club_id is not null;

  v_credibility :=
      case when v_is_verified then 35 else 0 end
    + case when v_club_linked then 20 else 0 end
    + least(30, v_verified_end * 10)
    + least(15, v_endorsements * 3);
  v_credibility := least(100, v_credibility);

  -- ---------- 5. Engagement (20) ----------
  select count(*) into v_posts_30
  from public.posts
  where author_id = ap.user_id and created_at >= now() - interval '30 days';

  select count(*) into v_followers
  from public.follows where following_id = ap.user_id;

  select count(*) into v_scout_views
  from public.profile_views
  where athlete_id = p_athlete
    and created_at >= now() - interval '30 days'
    and viewer_role in ('scout','coach','club');

  select greatest(ap.updated_at, coalesce(up.updated_at, ap.updated_at))
    into v_last_active;

  v_engagement :=
      least(30, v_posts_30 * 6)
    + least(35, ln(greatest(v_followers, 1)::numeric + 1) * 9)
    + least(25, v_scout_views * 2.5)
    + case
        when v_last_active >= now() - interval '7 days'  then 10
        when v_last_active >= now() - interval '30 days' then 5
        else 0
      end;
  v_engagement := least(100, v_engagement);

  -- ---------- Weighted total ----------
  v_overall := round(
      v_profile      * 0.15
    + v_performance  * 0.30
    + v_media_score  * 0.15
    + v_credibility  * 0.20
    + v_engagement   * 0.20
  );
  v_overall := greatest(0, least(100, v_overall));

  return jsonb_build_object(
    'overall',           v_overall,
    'tier',              private.tier_for_score(v_overall),
    'profile_score',     round(v_profile),
    'performance_score', round(v_performance),
    'media_score',       round(v_media_score),
    'credibility_score', round(v_credibility),
    'engagement_score',  round(v_engagement),
    'inputs', jsonb_build_object(
      'profile_fields_filled', v_filled,
      'profile_fields_total',  v_fields,
      'matches_total',         v_matches,
      'matches_last_year',     v_recent,
      'matches_verified',      v_verified_rec,
      'goal_contributions',    v_goal_contrib,
      'minutes_played',        v_minutes,
      'media_items',           v_media,
      'video_items',           v_video,
      'media_views',           v_media_views,
      'endorsements',          v_endorsements,
      'endorsements_expert',   v_verified_end,
      'account_verified',      v_is_verified,
      'club_linked',           v_club_linked,
      'posts_last_30_days',    v_posts_30,
      'followers',             v_followers,
      'scout_views_30_days',   v_scout_views
    )
  );
end;
$$;

-- ------------------------------------------------------------
-- Tips: what to do next, ordered by points available
-- ------------------------------------------------------------
create or replace function private.build_score_tips(p_result jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  i     jsonb := p_result -> 'inputs';
  tips  jsonb := '[]'::jsonb;
begin
  if (i ->> 'video_items')::int < 3 then
    tips := tips || jsonb_build_object(
      'key','add_highlights',
      'label','Upload ' || (3 - (i ->> 'video_items')::int) || ' more highlight clip(s)',
      'detail','Scouts open footage before anything else. Three short clips is the sweet spot.',
      'points', least(15, (3 - (i ->> 'video_items')::int) * 5),
      'pillar','media');
  end if;

  if (i ->> 'profile_fields_filled')::int < (i ->> 'profile_fields_total')::int then
    tips := tips || jsonb_build_object(
      'key','complete_profile',
      'label','Finish your profile',
      'detail', (i ->> 'profile_fields_total')::int - (i ->> 'profile_fields_filled')::int
        || ' field(s) left — each one adds points.',
      'points', ((i ->> 'profile_fields_total')::int - (i ->> 'profile_fields_filled')::int) * 2,
      'pillar','profile');
  end if;

  if (i ->> 'matches_last_year')::int < 5 then
    tips := tips || jsonb_build_object(
      'key','log_matches',
      'label','Log your recent matches',
      'detail','Add match results from the last 12 months so your form is visible.',
      'points', 12,
      'pillar','performance');
  end if;

  if not (i ->> 'account_verified')::boolean then
    tips := tips || jsonb_build_object(
      'key','get_verified',
      'label','Request account verification',
      'detail','A verified badge is the single biggest jump in your credibility score.',
      'points', 7,
      'pillar','credibility');
  end if;

  if (i ->> 'endorsements_expert')::int = 0 then
    tips := tips || jsonb_build_object(
      'key','ask_endorsement',
      'label','Ask a coach to endorse you',
      'detail','One endorsement from a verified coach or club counts for a lot.',
      'points', 6,
      'pillar','credibility');
  end if;

  if not (i ->> 'club_linked')::boolean then
    tips := tips || jsonb_build_object(
      'key','link_club',
      'label','Link your current club or academy',
      'detail','Connecting to a listed club confirms where you play.',
      'points', 4,
      'pillar','credibility');
  end if;

  if (i ->> 'posts_last_30_days')::int = 0 then
    tips := tips || jsonb_build_object(
      'key','post_update',
      'label','Post an update',
      'detail','Active profiles surface higher in scout searches.',
      'points', 6,
      'pillar','engagement');
  end if;

  return tips;
end;
$$;

-- ------------------------------------------------------------
-- Persist a freshly computed score
-- ------------------------------------------------------------
create or replace function private.refresh_talent_score(p_athlete uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r        jsonb;
  v_prev   integer;
  v_pct    integer;
begin
  r := private.compute_talent_score(p_athlete);
  if r is null then return; end if;

  select overall into v_prev from public.talent_scores where athlete_id = p_athlete;

  select round(
    100.0 * (
      select count(*) from public.talent_scores ts
      where ts.overall <= (r ->> 'overall')::int
    ) / greatest((select count(*) from public.talent_scores), 1)
  )::int into v_pct;

  insert into public.talent_scores as t (
    athlete_id, overall, tier,
    profile_score, performance_score, media_score, credibility_score, engagement_score,
    inputs, tips, percentile, previous_overall, computed_at, updated_at
  )
  values (
    p_athlete,
    (r ->> 'overall')::int,
    r ->> 'tier',
    (r ->> 'profile_score')::int,
    (r ->> 'performance_score')::int,
    (r ->> 'media_score')::int,
    (r ->> 'credibility_score')::int,
    (r ->> 'engagement_score')::int,
    r -> 'inputs',
    private.build_score_tips(r),
    v_pct,
    v_prev,
    now(),
    now()
  )
  on conflict (athlete_id) do update set
    overall           = excluded.overall,
    tier              = excluded.tier,
    profile_score     = excluded.profile_score,
    performance_score = excluded.performance_score,
    media_score       = excluded.media_score,
    credibility_score = excluded.credibility_score,
    engagement_score  = excluded.engagement_score,
    inputs            = excluded.inputs,
    tips              = excluded.tips,
    percentile        = excluded.percentile,
    previous_overall  = t.overall,
    computed_at       = now(),
    updated_at        = now();

  insert into public.talent_score_history (athlete_id, overall, tier, pillars, recorded_on)
  values (
    p_athlete,
    (r ->> 'overall')::int,
    r ->> 'tier',
    jsonb_build_object(
      'profile',     (r ->> 'profile_score')::int,
      'performance', (r ->> 'performance_score')::int,
      'media',       (r ->> 'media_score')::int,
      'credibility', (r ->> 'credibility_score')::int,
      'engagement',  (r ->> 'engagement_score')::int
    ),
    current_date
  )
  on conflict (athlete_id, recorded_on) do update set
    overall = excluded.overall,
    tier    = excluded.tier,
    pillars = excluded.pillars;

  -- Keep the legacy display column in sync so older surfaces don't drift.
  update public.athlete_profiles
  set performance_score = (r ->> 'performance_score')::int,
      visibility_score  = (r ->> 'overall')::int,
      profile_completeness = (r ->> 'profile_score')::int
  where id = p_athlete;
end;
$$;

-- ------------------------------------------------------------
-- Recompute triggers — the score is never stale
-- ------------------------------------------------------------
create or replace function private.trg_refresh_score_by_athlete()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform private.refresh_talent_score(coalesce(new.athlete_id, old.athlete_id));
  return coalesce(new, old);
end;
$$;

create or replace function private.trg_refresh_score_by_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform private.refresh_talent_score(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

create or replace function private.trg_refresh_score_by_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_athlete uuid;
begin
  select id into v_athlete from public.athlete_profiles
  where user_id = coalesce(new.author_id, old.author_id, new.following_id, old.following_id);
  if v_athlete is not null then
    perform private.refresh_talent_score(v_athlete);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_score_athlete_profile on public.athlete_profiles;
create trigger trg_score_athlete_profile
  after insert or update of sport, position_primary, position, birth_date, height_cm,
    weight_kg, bio, nationality, current_club_id, current_club, level
  on public.athlete_profiles
  for each row execute function private.trg_refresh_score_by_profile();

drop trigger if exists trg_score_media on public.athlete_media;
create trigger trg_score_media
  after insert or update or delete on public.athlete_media
  for each row execute function private.trg_refresh_score_by_athlete();

drop trigger if exists trg_score_matches on public.match_records;
create trigger trg_score_matches
  after insert or update or delete on public.match_records
  for each row execute function private.trg_refresh_score_by_athlete();

drop trigger if exists trg_score_endorsements on public.endorsements;
create trigger trg_score_endorsements
  after insert or delete on public.endorsements
  for each row execute function private.trg_refresh_score_by_athlete();

-- ------------------------------------------------------------
-- Public RPCs
-- ------------------------------------------------------------

/* Recompute my own score on demand (pull-to-refresh on the score screen). */
create or replace function public.refresh_my_talent_score()
returns public.talent_scores
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_athlete uuid;
  v_row public.talent_scores;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select id into v_athlete from public.athlete_profiles where user_id = auth.uid();
  if v_athlete is null then
    raise exception 'No athlete profile for this account' using errcode = 'P0002';
  end if;

  perform private.refresh_talent_score(v_athlete);
  select * into v_row from public.talent_scores where athlete_id = v_athlete;
  return v_row;
end;
$$;

revoke all on function public.refresh_my_talent_score() from public, anon;
grant execute on function public.refresh_my_talent_score() to authenticated;

/* Leaderboard, scoped so nobody can enumerate the whole database. */
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
  where (p_sport   is null or ap.sport   ilike p_sport)
    and (p_country is null or up.country ilike p_country)
    and coalesce(ap.is_open_to_offers, true)
  order by ts.overall desc, ts.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

revoke all on function public.talent_leaderboard(text, text, integer) from public;
grant execute on function public.talent_leaderboard(text, text, integer) to authenticated;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
drop policy if exists ts_select on public.talent_scores;
create policy ts_select on public.talent_scores
  for select to authenticated using (true);

-- Nobody writes a score by hand. Only SECURITY DEFINER functions and the
-- service role can touch this table.
revoke insert, update, delete on public.talent_scores from authenticated, anon;

drop policy if exists tsh_select on public.talent_score_history;
create policy tsh_select on public.talent_score_history
  for select to authenticated
  using (private.owns_athlete(athlete_id) or private.is_admin());

revoke insert, update, delete on public.talent_score_history from authenticated, anon;

grant select on public.talent_scores, public.talent_score_history to authenticated;

-- ------------------------------------------------------------
-- Backfill
-- ------------------------------------------------------------
do $$
declare r record;
begin
  for r in select id from public.athlete_profiles loop
    perform private.refresh_talent_score(r.id);
  end loop;
end;
$$;
