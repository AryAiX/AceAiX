-- Audience may follow and like a known adult.
-- A guest may not follow a minor, and a minor may not follow a guest.
-- A guest may not like a post whose author is a minor.
-- Unfollowing and un-liking are unchanged.

create or replace function public.toggle_follow(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_following boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot follow yourself' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_user)
       or (b.blocker_id = p_user and b.blocked_id = auth.uid())
  ) then
    raise exception 'This account is not available' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = p_user
  ) into v_following;

  if v_following then
    delete from public.follows where follower_id = auth.uid() and following_id = p_user;
  else
    if (private.viewer_is_audience() and private.profile_is_minor(p_user))
       or (
         private.profile_is_minor(auth.uid())
         and exists (
           select 1 from public.user_profiles u
           where u.id = p_user and u.role::text = 'guest'
         )
       ) then
      raise exception 'Audience accounts can''t do this'
        using errcode = '42501', hint = 'audience_not_allowed';
    end if;
    insert into public.follows (follower_id, following_id)
    values (auth.uid(), p_user)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'following', not v_following,
    'followers_count', (select followers_count from public.user_profiles where id = p_user)
  );
end;
$$;

drop policy if exists fol_insert on public.follows;
create policy fol_insert
on public.follows for insert
to authenticated
with check (
  follower_id = auth.uid()
  and following_id <> auth.uid()
  and not private.users_are_blocked(follower_id, following_id)
  and not (
    (private.viewer_is_audience() and private.profile_is_minor(following_id))
    or (
      private.profile_is_minor(follower_id)
      and exists (
        select 1 from public.user_profiles u
        where u.id = following_id and u.role::text = 'guest'
      )
    )
  )
);

create or replace function public.toggle_post_like(p_post uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_liked boolean; v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select exists (select 1 from public.post_likes
                 where post_id = p_post and user_id = auth.uid()) into v_liked;

  if v_liked then
    delete from public.post_likes where post_id = p_post and user_id = auth.uid();
  else
    if private.viewer_is_audience()
       and exists (
         select 1 from public.posts p
         where p.id = p_post
           and private.profile_is_minor(p.author_id)
       ) then
      raise exception 'Audience accounts can''t do this'
        using errcode = '42501', hint = 'audience_not_allowed';
    end if;
    insert into public.post_likes (post_id, user_id)
    values (p_post, auth.uid()) on conflict do nothing;
  end if;

  select like_count into v_count from public.posts where id = p_post;
  return jsonb_build_object('liked', not v_liked, 'like_count', coalesce(v_count, 0));
end;
$$;

-- Direct inserts bypass toggle_post_like. Un-liking is the delete policy, unchanged.
drop policy if exists post_likes_insert on public.post_likes;
create policy post_likes_insert on public.post_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not (
      private.viewer_is_audience()
      and private.profile_is_minor(
        (select p.author_id from public.posts p where p.id = post_id)
      )
    )
  );

drop policy if exists media_likes_insert on public.media_likes;
create policy media_likes_insert on public.media_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not (
      private.viewer_is_audience()
      and private.profile_is_minor(
        (
          select ap.user_id
          from public.athlete_media m
          join public.athlete_profiles ap on ap.id = m.athlete_id
          where m.id = media_id
        )
      )
    )
  );

create or replace function public.toggle_media_like(p_media_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_liked boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.media_likes
    where media_id = p_media_id and user_id = auth.uid()
  ) then
    delete from public.media_likes
    where media_id = p_media_id and user_id = auth.uid();
    v_liked := false;
  else
    if private.viewer_is_audience()
       and private.profile_is_minor(
         (
           select ap.user_id
           from public.athlete_media m
           join public.athlete_profiles ap on ap.id = m.athlete_id
           where m.id = p_media_id
         )
       ) then
      raise exception 'Audience accounts can''t do this'
        using errcode = '42501', hint = 'audience_not_allowed';
    end if;
    insert into public.media_likes (media_id, user_id)
    values (p_media_id, auth.uid());
    v_liked := true;
  end if;

  return v_liked;
end;
$$;
