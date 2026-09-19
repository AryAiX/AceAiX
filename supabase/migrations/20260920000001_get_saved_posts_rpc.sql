-- Lets a signed-in person list their own saved posts, most-recently-saved
-- first. Modeled on get_feed's shape and safety filters (suspended
-- authors, moderation state, minor-discoverability/guardian-consent,
-- blocks, audience) so a saved post that later becomes invisible in the
-- normal feed (author suspended, blocked, etc.) stays hidden here too.
-- Paginates on post_saves.created_at (when it was saved), not the post's
-- own created_at, so recently-saved old posts surface above older saves.

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
  caption          text,
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

revoke all on function public.get_saved_posts(integer, timestamptz) from public, anon;
grant execute on function public.get_saved_posts(integer, timestamptz) to authenticated;