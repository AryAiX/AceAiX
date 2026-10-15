-- ------------------------------------------------------------
-- 4. RPCs that copy the minor rule instead of calling the helpers.
--    CREATE OR REPLACE keeps existing grants.
-- ------------------------------------------------------------

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
  if (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and p_user <> auth.uid())
     or (
       coalesce(up.is_minor, false)
       and not coalesce(up.is_discoverable, false)
       and v_viewer <> p_user
       and not private.is_admin()
       and not exists (
         select 1 from public.guardian_consents g
         where g.minor_user_id = p_user
           and g.guardian_user_id = v_viewer
           and g.status = 'granted'
       )
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

create or replace function public.get_user_posts(
  p_user uuid,
  p_limit integer default 24,
  p_before timestamptz default null
)
returns table (
  id uuid, type text, caption text, media jsonb,
  like_count integer, comment_count integer, viewer_liked boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.type::text, coalesce(p.caption, p.text)::text, p.media,
         p.like_count, p.comments_count,
         exists (
           select 1 from public.post_likes l
           where l.post_id = p.id and l.user_id = auth.uid()
         ),
         p.created_at
  from public.posts p
  join public.user_profiles up on up.id = p.author_id
  where auth.uid() is not null
    and p.author_id = p_user
    and not p.is_hidden
    and p.moderation_state = 'visible'
    and not up.is_suspended
    and (
      not coalesce(up.is_minor, false)
      or coalesce(up.is_discoverable, false)
      or p.author_id = auth.uid()
      or private.is_admin()
      or exists (
        select 1 from public.guardian_consents g
        where g.minor_user_id = p.author_id
          and g.guardian_user_id = auth.uid()
          and g.status = 'granted'
      )
    )
    and not (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and p.author_id <> auth.uid())
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p_user)
         or (b.blocker_id = p_user and b.blocked_id = auth.uid())
    )
    and (
      p.author_id = auth.uid()
      or p.audience = 'public'
      or (
        p.audience = 'followers'
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.following_id = p.author_id
        )
      )
      or (
        p.audience = 'connections'
        and exists (
          select 1
          from public.follows outgoing
          join public.follows incoming
            on incoming.follower_id = p.author_id
           and incoming.following_id = auth.uid()
          where outgoing.follower_id = auth.uid()
            and outgoing.following_id = p.author_id
        )
      )
    )
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 24), 50));
$$;

create or replace function public.get_feed(
  p_scope  text default 'for_you',    -- for_you | following | sport
  p_sport  text default null,
  p_limit  integer default 20,
  p_before timestamptz default null   -- keyset cursor
)
returns table (
  id              uuid,
  author_id       uuid,
  author_name     text,
  author_avatar   text,
  author_role     text,
  author_verified boolean,
  author_score    integer,
  author_tier     text,
  athlete_sport   text,
  athlete_position text,
  type            text,
  caption         text,
  media           jsonb,
  tags            jsonb,
  like_count      integer,
  comment_count   integer,
  view_count      integer,
  viewer_liked    boolean,
  viewer_saved    boolean,
  viewer_follows  boolean,
  created_at      timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.author_id,
    up.full_name::text,
    up.avatar_url::text,
    up.role::text,
    up.is_verified,
    coalesce(ts.overall, 0),
    coalesce(ts.tier, 'rising')::text,
    ap.sport::text,
    coalesce(ap.position_primary, ap.position)::text,
    p.type::text,
    coalesce(p.caption, p.text)::text,
    p.media,
    p.tags,
    p.like_count,
    p.comments_count,
    p.view_count,
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = v_viewer),
    exists (select 1 from public.post_saves s where s.post_id = p.id and s.user_id = v_viewer),
    exists (select 1 from public.follows f
            where f.follower_id = v_viewer and f.following_id = p.author_id),
    p.created_at
  from public.posts p
  join public.user_profiles up on up.id = p.author_id
  left join public.athlete_profiles ap on ap.user_id = p.author_id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where
    not p.is_hidden
    and p.moderation_state = 'visible'
    and not up.is_suspended
    and (
      not coalesce(up.is_minor, false)
      or coalesce(up.is_discoverable, false)
      or p.author_id = v_viewer
      or private.is_admin()
      or exists (
        select 1 from public.guardian_consents g
        where g.minor_user_id = p.author_id
          and g.guardian_user_id = v_viewer
          and g.status = 'granted'
      )
    )
    and not (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and p.author_id <> auth.uid())
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = v_viewer and b.blocked_id = p.author_id)
         or (b.blocker_id = p.author_id and b.blocked_id = v_viewer)
    )
    and (
      p.author_id = v_viewer
      or p.audience = 'public'
      or (p.audience = 'followers' and exists (
            select 1 from public.follows f
            where f.follower_id = v_viewer and f.following_id = p.author_id))
      or (p.audience = 'connections' and exists (
            select 1 from public.follows o
            join public.follows i on i.follower_id = p.author_id and i.following_id = v_viewer
            where o.follower_id = v_viewer and o.following_id = p.author_id))
    )
    and (p_before is null or p.created_at < p_before)
    and (
      p_scope <> 'following'
      or p.author_id = v_viewer
      or exists (select 1 from public.follows f
                 where f.follower_id = v_viewer and f.following_id = p.author_id)
    )
    and (p_scope <> 'sport' or p_sport is null or ap.sport ilike p_sport)
  order by
    /* "For you" gently favours people you follow and higher-scoring athletes,
       but stays chronological enough that the feed still feels live. */
    case when p_scope = 'for_you' then
      p.created_at
        + (case when exists (select 1 from public.follows f
                             where f.follower_id = v_viewer and f.following_id = p.author_id)
                then interval '12 hours' else interval '0' end)
        + (coalesce(ts.overall, 0) / 20.0) * interval '1 hour'
    else p.created_at end desc,
    p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;

create or replace function public.get_saved_posts(
  p_limit  integer default 20,
  p_before timestamptz default null   -- keyset cursor on save time
)
returns table (
  id               uuid,
  author_id        uuid,
  author_name      text,
  author_avatar    text,
  author_role      text,
  author_verified  boolean,
  author_score     integer,
  author_tier      text,
  athlete_sport    text,
  athlete_position text,
  type             text,
  caption         text,
  media            jsonb,
  tags             jsonb,
  like_count       integer,
  comment_count    integer,
  view_count       integer,
  viewer_liked     boolean,
  viewer_saved     boolean,
  viewer_follows   boolean,
  created_at       timestamptz,
  saved_at         timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.author_id,
    up.full_name::text,
    up.avatar_url::text,
    up.role::text,
    up.is_verified,
    coalesce(ts.overall, 0),
    coalesce(ts.tier, 'rising')::text,
    ap.sport::text,
    coalesce(ap.position_primary, ap.position)::text,
    p.type::text,
    coalesce(p.caption, p.text)::text,
    p.media,
    p.tags,
    p.like_count,
    p.comments_count,
    p.view_count,
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = v_viewer),
    true, -- this function only ever returns posts the viewer has saved
    exists (select 1 from public.follows f
            where f.follower_id = v_viewer and f.following_id = p.author_id),
    p.created_at,
    s.created_at
  from public.post_saves s
  join public.posts p on p.id = s.post_id
  join public.user_profiles up on up.id = p.author_id
  left join public.athlete_profiles ap on ap.user_id = p.author_id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where
    s.user_id = v_viewer
    and not p.is_hidden
    and p.moderation_state = 'visible'
    and not up.is_suspended
    and (
      not coalesce(up.is_minor, false)
      or coalesce(up.is_discoverable, false)
      or p.author_id = v_viewer
      or private.is_admin()
      or exists (
        select 1 from public.guardian_consents g
        where g.minor_user_id = p.author_id
          and g.guardian_user_id = v_viewer
          and g.status = 'granted'
      )
    )
    and not (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and p.author_id <> auth.uid())
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = v_viewer and b.blocked_id = p.author_id)
         or (b.blocker_id = p.author_id and b.blocked_id = v_viewer)
    )
    and (
      p.author_id = v_viewer
      or p.audience = 'public'
      or (p.audience = 'followers' and exists (
            select 1 from public.follows f
            where f.follower_id = v_viewer and f.following_id = p.author_id))
      or (p.audience = 'connections' and exists (
            select 1 from public.follows o
            join public.follows i on i.follower_id = p.author_id and i.following_id = v_viewer
            where o.follower_id = v_viewer and o.following_id = p.author_id))
    )
    and (p_before is null or s.created_at < p_before)
  order by s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;
