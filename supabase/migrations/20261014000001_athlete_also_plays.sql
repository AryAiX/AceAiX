-- 20261014000001_athlete_also_plays.sql
-- "Also plays": athletes can add up to 3 extra sports, each with a level
-- (casual / club / competitive), shown on their profile only.
-- Safe to run more than once.

-- 1. The column ------------------------------------------------------------
alter table public.athlete_profiles
  add column if not exists other_sports jsonb not null default '[]'::jsonb;

comment on column public.athlete_profiles.other_sports is
  'Up to 3 extra sports the athlete plays, as [{"sport": key, "level": casual|club|competitive}]. Profile display only.';

-- 2. Check and tidy the list on every save ---------------------------------
create or replace function private.normalize_other_sports()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sports constant text[] := array[
    'Football','Basketball','Tennis','Athletics','Swimming','Cricket',
    'Volleyball','Handball','Padel','Chess','Esports','Martial Arts'];
  v_levels constant text[] := array['casual','club','competitive'];
  v_item  jsonb;
  v_sport text;
  v_level text;
  v_seen  text[] := array[]::text[];
  v_clean jsonb  := '[]'::jsonb;
begin
  if new.other_sports is null then
    new.other_sports := '[]'::jsonb;
  end if;

  if jsonb_typeof(new.other_sports) <> 'array' then
    raise exception 'other_sports must be a list';
  end if;

  for v_item in select value from jsonb_array_elements(new.other_sports) loop
    v_sport := v_item ->> 'sport';
    v_level := v_item ->> 'level';

    if v_sport is null or not (v_sport = any (v_sports)) then
      raise exception 'Unknown sport in other_sports';
    end if;
    if v_level is null or not (v_level = any (v_levels)) then
      raise exception 'Unknown level in other_sports';
    end if;

    -- The main sport is never also an "also plays" sport. Drop it quietly:
    -- the athlete may have just switched their main sport to this one.
    if new.sport is not null and lower(v_sport) = lower(new.sport) then
      continue;
    end if;

    if v_sport = any (v_seen) then
      raise exception 'Duplicate sport in other_sports';
    end if;

    v_seen  := v_seen || v_sport;
    v_clean := v_clean || jsonb_build_array(
                 jsonb_build_object('sport', v_sport, 'level', v_level));
  end loop;

  if jsonb_array_length(v_clean) > 3 then
    raise exception 'You can add up to 3 other sports';
  end if;

  new.other_sports := v_clean;
  return new;
end;
$$;

drop trigger if exists trg_athlete_other_sports on public.athlete_profiles;
create trigger trg_athlete_other_sports
  before insert or update of other_sports, sport on public.athlete_profiles
  for each row execute function private.normalize_other_sports();

-- 3. Let athletes edit their own list --------------------------------------
-- (Row-level security already limits updates to the athlete's own row.)
grant update (other_sports) on public.athlete_profiles to authenticated;

-- 4. Return it with the profile --------------------------------------------
-- Same as the current definition, plus one line: 'other_sports'.
CREATE OR REPLACE FUNCTION public.get_profile_bundle(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- A SECURITY DEFINER RPC bypasses table RLS, so it must enforce the hidden
  -- minor boundary itself. Return the same not-found shape as an unknown id to
  -- prevent account enumeration.
  if coalesce(up.is_minor, false)
     and not coalesce(up.is_discoverable, false)
     and v_viewer <> p_user
     and not private.is_admin()
     and not exists (
       select 1 from public.guardian_consents g
       where g.minor_user_id = p_user
         and g.guardian_user_id = v_viewer
         and g.status = 'granted'
     ) then
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
      'cover_url', coalesce(nullif(up.cover_url, ''), nullif(ap.cover_url, '')),
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
      'other_sports', coalesce(ap.other_sports, '[]'::jsonb),  -- NEW
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
$function$;