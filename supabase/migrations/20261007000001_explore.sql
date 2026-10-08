-- ============================================================
-- Explore: every public video in one grid
--
-- Discover gains an Explore view for every role: a mosaic of clips, the way a
-- photo app's explore page works. It draws on the two places video lives:
--
--   1. video posts  (public.posts with a video in `media`)
--   2. highlights   (public.athlete_media, video or highlight_reel)
--
-- Unlike the feed, Explore is for people you do NOT follow yet, so it shows
-- only what its owner made public. A followers-only post never appears here,
-- not even to a follower: that is what the feed is for.
--
-- Every gate is the one the feed and the profile already apply — suspension,
-- blocks in either direction, moderation, and the minor gates. A minor's
-- highlight needs both guardian scopes (discovery to be found at all, media
-- for the clip), because here it is shown to strangers.
--
-- The rows come back in the feed's shape, so the reels pager plays them
-- without a second player. A highlight has `type = 'highlight'` and no likes
-- or comments: those belong to posts.
--
-- Reels gain the same profile clips (section 3): a video an athlete uploads to
-- their own page now plays in Reels too, not only on the profile.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Highlight clips this viewer may watch, in the feed's shape
--
-- One definition, read by Explore and by Reels, so the two can never disagree
-- about whose profile clips are public. Not callable by a client: it is only
-- reached through the two RPCs below.
-- ------------------------------------------------------------
create or replace function private.visible_highlight_clips()
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
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    am.id,
    ap.user_id,
    up.full_name::text,
    up.avatar_url::text,
    up.role::text,
    up.is_verified,
    coalesce(ts.overall, 0),
    coalesce(ts.tier, 'rising')::text,
    ap.sport::text,
    coalesce(ap.position_primary, ap.position)::text,
    'highlight'::text,
    am.title::text,
    jsonb_build_array(
      jsonb_strip_nulls(jsonb_build_object(
        'url', am.storage_url,
        'type', 'video',
        'thumbnail', am.thumbnail_url,
        'duration', am.duration_seconds
      ))
    ),
    '[]'::jsonb,
    0,
    0,
    am.views_count,
    false,
    false,
    exists (select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = ap.user_id),
    am.created_at
  from public.athlete_media am
  join public.athlete_profiles ap on ap.id = am.athlete_id
  join public.user_profiles up on up.id = ap.user_id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where auth.uid() is not null
    and am.is_public
    and am.media_type in ('video', 'highlight_reel')
    and private.viewer_can_see_public_media(am.athlete_id)
    and private.viewer_can_see_author(ap.user_id)
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = ap.user_id)
         or (b.blocker_id = ap.user_id and b.blocked_id = auth.uid())
    )
    /* The same clip shared as a public post is shown once, as the post. */
    and not exists (
      select 1
      from public.posts p2,
           jsonb_array_elements(coalesce(p2.media, '[]'::jsonb)) m2
      where p2.author_id = ap.user_id
        and p2.audience = 'public'
        and not p2.is_hidden
        and p2.moderation_state = 'visible'
        and m2 ->> 'url' = am.storage_url
    );
$$;

revoke all on function private.visible_highlight_clips() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 2. Explore
-- ------------------------------------------------------------
create or replace function public.explore_videos(
  p_limit  integer default 24,
  p_offset integer default 0,
  p_sport  text    default null
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
  with clips as (
    -- Public video posts.
    select
      p.id,
      p.author_id,
      up.full_name::text                 as author_name,
      up.avatar_url::text                as author_avatar,
      up.role::text                      as author_role,
      up.is_verified                     as author_verified,
      coalesce(ts.overall, 0)            as author_score,
      coalesce(ts.tier, 'rising')::text  as author_tier,
      ap.sport::text                     as athlete_sport,
      coalesce(ap.position_primary, ap.position)::text as athlete_position,
      p.type::text                       as type,
      coalesce(p.caption, p.text)::text  as caption,
      p.media,
      p.tags,
      p.like_count,
      p.comments_count                   as comment_count,
      p.view_count,
      exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = v_viewer) as viewer_liked,
      exists (select 1 from public.post_saves s where s.post_id = p.id and s.user_id = v_viewer) as viewer_saved,
      exists (select 1 from public.follows f
              where f.follower_id = v_viewer and f.following_id = p.author_id) as viewer_follows,
      p.created_at
    from public.posts p
    join public.user_profiles up on up.id = p.author_id
    left join public.athlete_profiles ap on ap.user_id = p.author_id
    left join public.talent_scores ts on ts.athlete_id = ap.id
    where p.audience = 'public'
      and not p.is_hidden
      and p.moderation_state = 'visible'
      and private.viewer_can_see_author(p.author_id)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_viewer and b.blocked_id = p.author_id)
           or (b.blocker_id = p.author_id and b.blocked_id = v_viewer)
      )
      and exists (
        select 1 from jsonb_array_elements(coalesce(p.media, '[]'::jsonb)) m
        where m ->> 'type' = 'video'
      )

    union all

    -- Public highlight clips.
    select h.* from private.visible_highlight_clips() h
  )
  select c.*
  from clips c
  where p_sport is null or c.athlete_sport ilike p_sport
  order by
    /* Recent first, lifted a little by how much a clip has been watched and
       liked, so a good clip from last week is not buried under this morning's.
       The id breaks ties, which keeps offset paging stable. */
    c.created_at
      + ln(1 + greatest(c.view_count, 0) + 3 * greatest(c.like_count, 0)) * interval '3 hours' desc,
    c.id
  limit greatest(1, least(coalesce(p_limit, 24), 60))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

/* The sports that have something to watch — the filter chips. Counting through
   explore_videos keeps the chips honest: a sport appears only if this viewer
   would actually get a clip for it. */
create or replace function public.explore_sports()
returns table (sport text, clips integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.athlete_sport, count(*)::integer
  from public.explore_videos(60, 0, null) e
  where e.athlete_sport is not null
  group by e.athlete_sport
  order by count(*) desc, e.athlete_sport
  limit 12;
$$;

-- ------------------------------------------------------------
-- 3. Reels include the clips on a profile
--
-- Reels were the feed's video posts only (0925/01). A clip an athlete uploads
-- to their own page is just as much a reel, so it joins them. The posts still
-- come through get_feed with every one of its gates; the profile clips come
-- through the helper above. Newest first, same cursor as before.
-- ------------------------------------------------------------
create or replace function public.get_reels(p_limit integer default 12, p_before timestamptz default null)
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
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.*
  from (
    select f.*
    from public.get_feed('for_you', null, 50, p_before) f
    where exists (
      select 1 from jsonb_array_elements(coalesce(f.media, '[]'::jsonb)) m
      where m ->> 'type' = 'video'
    )
    union all
    select h.*
    from private.visible_highlight_clips() h
    where p_before is null or h.created_at < p_before
  ) r
  order by r.created_at desc, r.id
  limit greatest(1, least(coalesce(p_limit, 12), 30));
$$;

revoke all on function public.explore_videos(integer, integer, text) from public, anon;
revoke all on function public.explore_sports()                        from public, anon;
grant execute on function public.explore_videos(integer, integer, text) to authenticated;
grant execute on function public.explore_sports()                        to authenticated;

revoke all on function public.get_reels(integer, timestamptz) from public, anon;
grant execute on function public.get_reels(integer, timestamptz) to authenticated;
