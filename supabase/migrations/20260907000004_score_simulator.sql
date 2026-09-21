-- ============================================================
-- 0907/04 — "What would it take?"
--
-- The score screen can already say what to do next. What it cannot say is what
-- the number would become — and that is the question every fifteen-year-old
-- actually asks. Answering it with client-side arithmetic would mean a second
-- copy of the model that drifts from this one within a month, so instead the
-- calculation is split in two:
--
--   private.collect_score_inputs(athlete)  — what is true about this person
--   private.score_from_inputs(inputs)      — what that is worth
--
-- `compute_talent_score` is now the composition of the two and behaves exactly
-- as before. The simulator collects the same inputs, changes the ones the
-- athlete is asking about, and runs the same weighting. There is one model.
--
-- Nothing about the weights, the pillars or any existing score changes here.
-- ============================================================

-- ------------------------------------------------------------
-- What is true
-- ------------------------------------------------------------
create or replace function private.collect_score_inputs(p_athlete uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ap             record;
  up             record;
  v_filled       integer := 0;
  v_fields       integer := 10;
  v_matches      integer := 0;
  v_recent       integer := 0;
  v_verified_rec integer := 0;
  v_goal_contrib numeric := 0;
  v_minutes      integer := 0;
  v_media        integer := 0;
  v_video        integer := 0;
  v_media_views  integer := 0;
  v_endorsements integer := 0;
  v_verified_end integer := 0;
  v_posts_30     integer := 0;
  v_followers    integer := 0;
  v_scout_views  integer := 0;
  v_last_active  timestamptz;
begin
  select * into ap from public.athlete_profiles where id = p_athlete;
  if not found then
    return null;
  end if;

  select * into up from public.user_profiles where id = ap.user_id;

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

  select
    count(*),
    count(*) filter (where match_date >= current_date - interval '12 months'),
    count(*) filter (where source = 'verified'),
    coalesce(sum(goals + assists), 0),
    coalesce(sum(minutes_played), 0)
  into v_matches, v_recent, v_verified_rec, v_goal_contrib, v_minutes
  from public.match_records
  where athlete_id = p_athlete;

  select
    count(*),
    count(*) filter (where media_type in ('video','highlight_reel')),
    coalesce(sum(views_count), 0)
  into v_media, v_video, v_media_views
  from public.athlete_media
  where athlete_id = p_athlete and is_public;

  select
    count(*),
    count(*) filter (where e.endorser_role in ('coach','scout','club','federation'))
  into v_endorsements, v_verified_end
  from public.endorsements e
  join public.user_profiles eu on eu.id = e.endorser_id and eu.is_verified
  where e.athlete_id = p_athlete;

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

  return jsonb_build_object(
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
    'account_verified',      coalesce(up.is_verified, false),
    'club_linked',           ap.current_club_id is not null,
    'posts_last_30_days',    v_posts_30,
    'followers',             v_followers,
    'scout_views_30_days',   v_scout_views,
    /* Kept as a day count rather than a timestamp so a simulated input is a
       number like every other one, and so the result is stable to compare. */
    'days_since_active',     greatest(0, extract(day from (now() - v_last_active))::int)
  );
end;
$$;

-- ------------------------------------------------------------
-- What it is worth
--
-- The weights, unchanged:
--   profile 15 · performance 30 · media 15 · credibility 20 · engagement 20
-- ------------------------------------------------------------
create or replace function private.score_from_inputs(i jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  n              numeric;
  v_profile      numeric := 0;
  v_performance  numeric := 0;
  v_media_score  numeric := 0;
  v_credibility  numeric := 0;
  v_engagement   numeric := 0;
  v_overall      integer;

  v_filled       integer := coalesce((i ->> 'profile_fields_filled')::int, 0);
  v_fields       integer := greatest(1, coalesce((i ->> 'profile_fields_total')::int, 10));
  v_matches      integer := coalesce((i ->> 'matches_total')::int, 0);
  v_recent       integer := coalesce((i ->> 'matches_last_year')::int, 0);
  v_verified_rec integer := coalesce((i ->> 'matches_verified')::int, 0);
  v_goal_contrib numeric := coalesce((i ->> 'goal_contributions')::numeric, 0);
  v_media        integer := coalesce((i ->> 'media_items')::int, 0);
  v_video        integer := coalesce((i ->> 'video_items')::int, 0);
  v_media_views  integer := coalesce((i ->> 'media_views')::int, 0);
  v_endorsements integer := coalesce((i ->> 'endorsements')::int, 0);
  v_verified_end integer := coalesce((i ->> 'endorsements_expert')::int, 0);
  v_is_verified  boolean := coalesce((i ->> 'account_verified')::boolean, false);
  v_club_linked  boolean := coalesce((i ->> 'club_linked')::boolean, false);
  v_posts_30     integer := coalesce((i ->> 'posts_last_30_days')::int, 0);
  v_followers    integer := coalesce((i ->> 'followers')::int, 0);
  v_scout_views  integer := coalesce((i ->> 'scout_views_30_days')::int, 0);
  v_idle_days    integer := coalesce((i ->> 'days_since_active')::int, 999);
begin
  if i is null then
    return null;
  end if;

  -- 1. Profile completeness
  v_profile := round((least(v_filled, v_fields)::numeric / v_fields) * 100);

  -- 2. Performance
  if v_matches > 0 then
    v_performance := least(45, v_recent * 3)
      + least(30, (v_goal_contrib / greatest(v_matches, 1)) * 22)
      + least(25, v_verified_rec * 5);
  end if;
  v_performance := least(100, v_performance);

  -- 3. Media
  if v_media > 0 then
    v_media_score := least(55, v_video * 18)
      + least(20, greatest(0, v_media - v_video) * 5)
      + least(25, v_media_views / 40.0);
  end if;
  v_media_score := least(100, v_media_score);

  -- 4. Credibility
  v_credibility :=
      case when v_is_verified then 35 else 0 end
    + case when v_club_linked then 20 else 0 end
    + least(30, v_verified_end * 10)
    + least(15, v_endorsements * 3);
  v_credibility := least(100, v_credibility);

  -- 5. Engagement
  v_engagement :=
      least(30, v_posts_30 * 6)
    + least(35, ln(greatest(v_followers, 1)::numeric + 1) * 9)
    + least(25, v_scout_views * 2.5)
    + case
        when v_idle_days <= 7  then 10
        when v_idle_days <= 30 then 5
        else 0
      end;
  v_engagement := least(100, v_engagement);

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
    'inputs',            i
  );
end;
$$;

-- ------------------------------------------------------------
-- The composition — same signature, same answer as before
-- ------------------------------------------------------------
create or replace function private.compute_talent_score(p_athlete uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.score_from_inputs(private.collect_score_inputs(p_athlete));
$$;

-- ------------------------------------------------------------
-- The simulator
--
-- Only these keys can be moved, and each is clamped to something a person
-- could actually reach, so the screen cannot promise a 98 for filling in a
-- bio. Everything else is read from the athlete's real rows.
-- ------------------------------------------------------------
create or replace function public.simulate_talent_score(p_changes jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_athlete uuid;
  v_now     jsonb;
  v_next    jsonb;
  v_key     text;
  v_val     numeric;
  v_allowed text[] := array[
    'profile_fields_filled', 'matches_last_year', 'matches_verified',
    'goal_contributions', 'media_items', 'video_items',
    'endorsements', 'endorsements_expert', 'posts_last_30_days',
    'followers', 'account_verified', 'club_linked'
  ];
begin
  select id into v_athlete from public.athlete_profiles where user_id = auth.uid();
  if v_athlete is null then
    raise exception 'Only athletes have a Talent Score.' using hint = 'not_an_athlete';
  end if;

  v_now  := private.collect_score_inputs(v_athlete);
  v_next := v_now;

  for v_key in select jsonb_object_keys(coalesce(p_changes, '{}'::jsonb))
  loop
    if not (v_key = any (v_allowed)) then
      continue;
    end if;

    if v_key in ('account_verified', 'club_linked') then
      v_next := jsonb_set(v_next, array[v_key],
        to_jsonb(coalesce((p_changes ->> v_key)::boolean, false)));
      continue;
    end if;

    v_val := coalesce((p_changes ->> v_key)::numeric, 0);

    /* Nobody logs a thousand matches this month. The caps are what a
       determined person could plausibly do, so the projection stays a promise
       we can keep. */
    v_val := case v_key
      when 'profile_fields_filled' then least(v_val, (v_now ->> 'profile_fields_total')::numeric)
      when 'matches_last_year'     then least(v_val, 60)
      when 'matches_verified'      then least(v_val, 60)
      when 'goal_contributions'    then least(v_val, 300)
      when 'media_items'           then least(v_val, 40)
      when 'video_items'           then least(v_val, 40)
      when 'endorsements'          then least(v_val, 30)
      when 'endorsements_expert'   then least(v_val, 30)
      when 'posts_last_30_days'    then least(v_val, 30)
      when 'followers'             then least(v_val, 100000)
      else v_val
    end;

    v_next := jsonb_set(v_next, array[v_key], to_jsonb(greatest(0, v_val)));
  end loop;

  -- Dependent inputs a person cannot break: videos are media, verified
  -- matches are matches, expert endorsements are endorsements.
  v_next := jsonb_set(v_next, '{media_items}',
    to_jsonb(greatest((v_next ->> 'media_items')::numeric, (v_next ->> 'video_items')::numeric)));
  v_next := jsonb_set(v_next, '{matches_total}',
    to_jsonb(greatest((v_now ->> 'matches_total')::numeric, (v_next ->> 'matches_last_year')::numeric)));
  v_next := jsonb_set(v_next, '{matches_verified}',
    to_jsonb(least((v_next ->> 'matches_verified')::numeric, (v_next ->> 'matches_total')::numeric)));
  v_next := jsonb_set(v_next, '{endorsements}',
    to_jsonb(greatest((v_next ->> 'endorsements')::numeric, (v_next ->> 'endorsements_expert')::numeric)));

  return jsonb_build_object(
    'current',   private.score_from_inputs(v_now),
    'projected', private.score_from_inputs(v_next),
    'limits',    jsonb_build_object(
      'profile_fields_total', (v_now ->> 'profile_fields_total')::int,
      'keys', to_jsonb(v_allowed)
    )
  );
end;
$$;

grant execute on function public.simulate_talent_score(jsonb) to authenticated;
