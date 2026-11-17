-- ============================================================
-- Who liked a post (QA-170)
--
-- post_likes_select was using (true), so any signed-in account
-- could read every like on every post. That gap is closed.
-- A like row is readable when it is the viewer's own like, or
-- when the post belongs to the viewer.
--
-- Everyone who can see a post can still see who liked it, by
-- calling post_likers. The viewer is always named. Anyone else
-- is named only when private.users_are_blocked says there is no
-- block either way, private.viewer_can_see_author says the
-- viewer can see that person, and the person is not a minor.
-- A minor is named only to the person who posted, the minor
-- themselves, and a parent with a granted guardian consent for
-- that minor. The list is the named people, newest like first,
-- up to the limit. Hidden is the total number of likes minus
-- every named person, so someone left off by the limit is not
-- hidden. A missing post, or a post the viewer did not write
-- and cannot see, is reported as not found.
--
-- The select policy has to be dropped and created again to
-- change it. Nothing else is dropped.
--
-- NEEDS TOORAJ'S OK because it changes who can see likes.
-- ============================================================

drop policy if exists post_likes_select on public.post_likes;

-- The exists on posts runs as the viewer, so posts_select applies.
-- The author can always read their own post, and so all of its likes.
create policy post_likes_select
on public.post_likes
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.posts
    where posts.id = post_likes.post_id
      and posts.author_id = auth.uid()
  )
);

-- Reads every like as the owner, then decides who is named.
-- The select policy above would hide the other rows from a caller.
create or replace function public.post_likers(
  p_post uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer uuid := auth.uid();
  v_author uuid;
  v_limit  integer;
  v_total  integer;
  v_named  integer;
  v_likers jsonb;
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 100), 1), 100);

  select p.author_id
    into v_author
  from public.posts p
  where p.id = p_post;

  if not found
     or (
       v_author is distinct from v_viewer
       and not private.recipient_can_see_post(p_post, v_viewer)
     ) then
    raise exception 'Not found' using errcode = 'P0002';
  end if;

  with likes as (
    select
      l.user_id,
      l.created_at as liked_at,
      up.full_name,
      up.avatar_url,
      up.role::text as role,
      up.is_verified,
      (
        l.user_id = v_viewer
        or (
          not private.users_are_blocked(v_viewer, l.user_id)
          and private.viewer_can_see_author(l.user_id)
          and (
            not coalesce(up.is_minor, false)
            or v_viewer = v_author
            or exists (
              select 1
              from public.guardian_consents g
              where g.minor_user_id = l.user_id
                and g.guardian_user_id = v_viewer
                and g.status = 'granted'
            )
          )
        )
      ) as named
    from public.post_likes l
    join public.user_profiles up on up.id = l.user_id
    where l.post_id = p_post
  )
  select
    count(*)::integer,
    count(*) filter (where named)::integer,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', page.user_id,
            'full_name', page.full_name,
            'avatar_url', page.avatar_url,
            'role', page.role,
            'is_verified', page.is_verified,
            'liked_at', page.liked_at
          )
          order by page.liked_at desc
        )
        from (
          select user_id, full_name, avatar_url, role, is_verified, liked_at
          from likes
          where named
          order by liked_at desc
          limit v_limit
        ) page
      ),
      '[]'::jsonb
    )
  into v_total, v_named, v_likers
  from likes;

  return jsonb_build_object(
    'likers', v_likers,
    'hidden', v_total - v_named,
    'total', v_total
  );
end;
$$;

revoke all on function public.post_likers(uuid, integer) from public, anon;
grant execute on function public.post_likers(uuid, integer) to authenticated;
