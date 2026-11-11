-- ============================================================
-- Your Rundown reads clips from people you follow (QA-167)
--
-- The clip row on Home's Following tab, its See all grid, and
-- the full-screen pager read the newest reels from everyone
-- and then keep only the ones from people the viewer follows,
-- so the row often looks almost empty. get_following_reels
-- reads those clips from the people and club pages the viewer
-- follows.
--
-- Posts come through get_feed on the following scope, and
-- profile clips come through the same highlight helper Reels
-- uses, so nothing new becomes visible. It looks through at
-- most 1000 posts (20 pages of 50). A stable function cannot
-- write, so it cannot use a temporary table; the rows it
-- keeps sit in an array of private.feed_reel.
-- ============================================================

-- The same 21 columns get_reels returns. Held only in memory.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'private'
      and t.typname = 'feed_reel'
  ) then
    create type private.feed_reel as (
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
      caption          text,
      media            jsonb,
      tags             jsonb,
      like_count       integer,
      comment_count    integer,
      view_count       integer,
      viewer_liked     boolean,
      viewer_saved     boolean,
      viewer_follows   boolean,
      created_at       timestamptz
    );
  end if;
end
$$;

revoke all on type private.feed_reel from public;

create or replace function public.get_following_reels(
  p_limit integer default 12,
  p_before timestamptz default null
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
  caption          text,
  media            jsonb,
  tags             jsonb,
  like_count       integer,
  comment_count    integer,
  view_count       integer,
  viewer_liked     boolean,
  viewer_saved     boolean,
  viewer_follows   boolean,
  created_at       timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer uuid := auth.uid();
  v_limit integer;
  v_cursor timestamptz;
  v_kept private.feed_reel[] := array[]::private.feed_reel[];
  v_row private.feed_reel;
  v_page_count integer;
  v_oldest timestamptz;
  v_floor timestamptz := null;
  v_pages integer := 0;
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 12), 30));
  v_cursor := p_before;

  loop
    v_page_count := 0;
    v_oldest := null;

    for v_row in
      select
        f.id, f.author_id, f.author_name, f.author_avatar, f.author_role,
        f.author_verified, f.author_score, f.author_tier, f.athlete_sport,
        f.athlete_position, f.type, f.caption, f.media, f.tags,
        f.like_count, f.comment_count, f.view_count, f.viewer_liked,
        f.viewer_saved, f.viewer_follows, f.created_at
      from public.get_feed('following', null, 50, v_cursor) f
    loop
      v_page_count := v_page_count + 1;
      if v_oldest is null or v_row.created_at < v_oldest then
        v_oldest := v_row.created_at;
      end if;
      /* viewer_follows is false on the viewer's own posts, so those
         stay out. A photo has no video item, so it stays out too. */
      if v_row.viewer_follows
         and exists (
           select 1
           from jsonb_array_elements(coalesce(v_row.media, '[]'::jsonb)) m
           where m ->> 'type' = 'video'
         )
      then
        v_kept := array_append(v_kept, v_row);
      end if;
    end loop;

    v_pages := v_pages + 1;

    /* The feed has run out. Every highlight before the cursor is fair. */
    exit when v_page_count < 50;

    /* Enough clips, or 1000 posts. Anything older than the oldest
       post read is left for the next page, so a highlight from
       further back cannot jump the cursor past posts not read yet. */
    if coalesce(cardinality(v_kept), 0) >= v_limit or v_pages >= 20 then
      v_floor := v_oldest;
      exit;
    end if;

    v_cursor := v_oldest;
  end loop;

  return query
  select
    r.id, r.author_id, r.author_name, r.author_avatar, r.author_role,
    r.author_verified, r.author_score, r.author_tier, r.athlete_sport,
    r.athlete_position, r.type, r.caption, r.media, r.tags,
    r.like_count, r.comment_count, r.view_count, r.viewer_liked,
    r.viewer_saved, r.viewer_follows, r.created_at
  from (
    select
      k.id, k.author_id, k.author_name, k.author_avatar, k.author_role,
      k.author_verified, k.author_score, k.author_tier, k.athlete_sport,
      k.athlete_position, k.type, k.caption, k.media, k.tags,
      k.like_count, k.comment_count, k.view_count, k.viewer_liked,
      k.viewer_saved, k.viewer_follows, k.created_at
    from unnest(v_kept) k
    union all
    select
      h.id, h.author_id, h.author_name, h.author_avatar, h.author_role,
      h.author_verified, h.author_score, h.author_tier, h.athlete_sport,
      h.athlete_position, h.type, h.caption, h.media, h.tags,
      h.like_count, h.comment_count, h.view_count, h.viewer_liked,
      h.viewer_saved, h.viewer_follows, h.created_at
    from private.visible_highlight_clips() h
    where h.viewer_follows
      and (p_before is null or h.created_at < p_before)
      and (v_floor is null or h.created_at >= v_floor)
  ) r
  order by r.created_at desc, r.id
  limit v_limit;
end;
$$;

revoke all on function public.get_following_reels(integer, timestamptz) from public, anon;
grant execute on function public.get_following_reels(integer, timestamptz) to authenticated;
