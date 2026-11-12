-- ============================================================
-- Each like is its own notice (QA-173)
--
-- A like used to call private.notify with the group key
-- 'like:' plus the post id. That key belongs to one row per
-- author, so each new like rewrote the row for that post and
-- the earlier likers disappeared. A comment is already its
-- own row. A like should be too.
--
-- on_post_like_insert now passes a null group key, so every
-- like is its own notification. The trigger itself is left
-- as it is.
--
-- One safeguard: if that author already has a like notice
-- from the same person on that same post, the new like stays
-- quiet. Unliking and liking again does not add a second
-- notice. A post with no author, and an author liking their
-- own post, still do nothing.
-- ============================================================

create or replace function private.on_post_like_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author uuid;
begin
  select author_id into v_author
  from public.posts
  where id = new.post_id;

  -- Nobody to tell, or the author liked their own post.
  if v_author is null or v_author = new.user_id then
    return new;
  end if;

  -- One notice per person per post. Liking again stays quiet.
  if exists (
    select 1
    from public.notifications
    where user_id = v_author
      and type = 'like'
      and actor_id = new.user_id
      and entity_type = 'post'
      and entity_id = new.post_id::text
  ) then
    return new;
  end if;

  perform private.notify(
    v_author, 'like', 'like',
    private.display_name(new.user_id) || ' liked your post',
    null,
    new.user_id, 'post', new.post_id::text,
    null,
    jsonb_build_object('post_id', new.post_id)
  );
  return new;
end;
$$;
