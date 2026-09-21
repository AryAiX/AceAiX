-- ============================================================
-- 0904/08 — get_profile_bundle must work for people who are not athletes
--
-- The talent-score record was only assigned inside `if ap.id is not null`,
-- so opening a coach's or a club's profile raised
--
--   record "ts" is not assigned yet   (SQLSTATE 55000)
--
-- which the client showed as "Something went wrong". Tapping a coach in the
-- feed — the single most common way a young athlete meets a recruiter —
-- landed on an error screen every time.
--
-- The select now always runs. A SELECT INTO that matches no rows still marks
-- the record assigned, with every field null, which is exactly what the
-- CASE below is testing for.
-- ============================================================

create or replace function public.get_profile_bundle(p_user uuid)
returns jsonb
language plpgsql
/* Volatile on purpose: reading a profile also records scout interest. */
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer  uuid := auth.uid();
  up        record;
  ap        record;
  cp        record;
  ts        record;
  v_blocked boolean;
  v_org     jsonb;
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into up from public.user_profiles where id = p_user;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_viewer and b.blocked_id = p_user)
       or (b.blocker_id = p_user and b.blocked_id = v_viewer)
  ) into v_blocked;

  if v_blocked and v_viewer <> p_user then
    return jsonb_build_object(
      'user', jsonb_build_object('id', up.id, 'full_name', up.full_name),
      'blocked', true,
      'viewer', jsonb_build_object('is_self', false)
    );
  end if;

  if up.is_suspended and v_viewer <> p_user and not private.is_admin() then
    return jsonb_build_object(
      'user', jsonb_build_object('id', up.id, 'full_name', up.full_name),
      'suspended', true,
      'viewer', jsonb_build_object('is_self', false)
    );
  end if;

  select * into ap from public.athlete_profiles where user_id = p_user;
  select * into cp from public.coach_profiles   where user_id = p_user;
  -- Unconditional: `ap.id` is simply null for a coach or a club, and the
  -- lookup then matches nothing without leaving `ts` unassigned.
  select * into ts from public.talent_scores where athlete_id = ap.id;

  select to_jsonb(o) - 'branding' into v_org
  from public.organizations o
  where o.id = coalesce(ap.current_club_id, cp.current_club_id);

  /* Log scout interest, but never for self-views. */
  if ap.id is not null and v_viewer <> p_user then
    insert into public.profile_views (
      athlete_id, viewer_user_id, viewer_name, viewer_role, viewer_org, viewer_verified
    )
    select ap.id, v_viewer, vu.full_name, vu.role::text,
           (select name from public.organizations org where org.id = private.my_organization()),
           vu.is_verified
    from public.user_profiles vu
    where vu.id = v_viewer;
  end if;

  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', up.id,
      'role', up.role,
      'full_name', up.full_name,
      'first_name', up.first_name,
      'last_name', up.last_name,
      'avatar_url', up.avatar_url,
      'bio', up.bio,
      'city', up.city,
      'country', up.country,
      'is_verified', up.is_verified,
      'is_minor', up.is_minor,
      'age_band', up.age_band,
      'followers_count', up.followers_count,
      'following_count', up.following_count,
      'allow_messages_from', up.allow_messages_from,
      'created_at', up.created_at
    ),
    'athlete', case when ap.id is null then null else jsonb_build_object(
      'id', ap.id,
      'sport', ap.sport,
      'position', coalesce(ap.position_primary, ap.position),
      'position_secondary', ap.position_secondary,
      'level', ap.level,
      'league', ap.league,
      'club', ap.current_club,
      'club_id', ap.current_club_id,
      'nationality', ap.nationality,
      'dominant_foot', ap.dominant_foot,
      'height_cm', ap.height_cm,
      'weight_kg', ap.weight_kg,
      /* Never expose a minor's exact date of birth — age band only. */
      'age', case when ap.birth_date is null then null
                  when up.is_minor then null
                  else extract(year from age(ap.birth_date))::int end,
      'age_band', up.age_band,
      'is_open_to_offers', ap.is_open_to_offers,
      'honors', ap.honors,
      'languages', ap.languages,
      'certifications', ap.certifications
    ) end,
    'coach', case when cp.id is null then null else jsonb_build_object(
      'id', cp.id,
      'specialty', cp.specialty,
      'years_experience', cp.years_experience,
      'philosophy', cp.philosophy,
      'licenses', cp.licenses,
      'current_club', cp.current_club,
      'is_open_to_opportunities', cp.is_open_to_opportunities
    ) end,
    'score', case when ts.athlete_id is null then null else jsonb_build_object(
      'overall', ts.overall,
      'tier', ts.tier,
      'percentile', ts.percentile,
      'previous_overall', ts.previous_overall,
      'pillars', jsonb_build_object(
        'profile', ts.profile_score,
        'performance', ts.performance_score,
        'media', ts.media_score,
        'credibility', ts.credibility_score,
        'engagement', ts.engagement_score
      ),
      'computed_at', ts.computed_at
    ) end,
    'organization', v_org,
    'stats', jsonb_build_object(
      'posts', (select count(*) from public.posts where author_id = p_user),
      'media', (select count(*) from public.athlete_media
                where athlete_id = ap.id and is_public),
      'matches', (select count(*) from public.match_records where athlete_id = ap.id),
      'endorsements', (select count(*) from public.endorsements where athlete_id = ap.id)
    ),
    'viewer', jsonb_build_object(
      'is_self', v_viewer = p_user,
      'is_following', exists (
        select 1 from public.follows
        where follower_id = v_viewer and following_id = p_user),
      'follows_you', exists (
        select 1 from public.follows
        where follower_id = p_user and following_id = v_viewer),
      'can_message', private.can_message(v_viewer, p_user),
      'has_blocked', exists (
        select 1 from public.user_blocks
        where blocker_id = v_viewer and blocked_id = p_user)
    )
  );
end;
$$;

revoke all on function public.get_profile_bundle(uuid) from public, anon;
grant execute on function public.get_profile_bundle(uuid) to authenticated;
