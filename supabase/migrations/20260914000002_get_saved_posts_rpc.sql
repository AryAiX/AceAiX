create or replace function public.get_saved_posts(p_limit integer default 20, p_before timestamptz default null)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_avatar text,
  author_role text,
  author_verified boolean,
  author_score integer,
  author_tier text,
  athlete_sport text,
  athlete_position text,
  type text,
  caption text,
  media jsonb,
  tags jsonb,
  like_count integer,
  comment_count integer,
  view_count integer,
  viewer_liked boolean,
  viewer_saved boolean,
  viewer_follows boolean,
  created_at timestamptz,
  saved_at timestamptz
)
language plpgsql
security definer
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
    true, -- viewer_saved is always true on this screen by definition
    exists (select 1 from public.follows f
            where f.follower_id = v_viewer and f.following_id = p.author_id),
    p.created_at,
    ps.created_at as saved_at
  from public.post_saves ps
  join public.posts p on p.id = ps.post_id
  join public.user_profiles up on up.id = p.author_id
  left join public.athlete_profiles ap on ap.user_id = p.author_id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where ps.user_id = v_viewer
    and not p.is_hidden
    and p.moderation_state = 'visible'
    and not coalesce(up.is_suspended, false)
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = v_viewer and b.blocked_id = p.author_id)
         or (b.blocker_id = p.author_id and b.blocked_id = v_viewer)
    )
    and (p_before is null or ps.created_at < p_before)
  order by ps.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;