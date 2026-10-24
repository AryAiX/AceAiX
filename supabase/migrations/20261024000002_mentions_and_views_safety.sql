-- ============================================================
-- Mentions and post views: who may see what
--
-- 1. A minor who is not discoverable, or has no guardian consent to
--    message, cannot mention anyone. A mention notification carries the
--    author's name and a piece of the post, so it is contact.
-- 2. A mention notification is sent only to someone who may see the post:
--    the same checks as posts_select (20260910000001), with the person
--    mentioned as the viewer.
-- 3. post_views rows can only be written for a post the viewer may see and
--    did not write, so a direct insert cannot get round record_post_view.
-- ============================================================

create or replace function private.recipient_can_see_post(p_post uuid, p_viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.posts p
    join public.user_profiles a on a.id = p.author_id
    where p.id = p_post
      and not p.is_hidden
      and p.moderation_state = 'visible'
      and not coalesce(a.is_suspended, false)
      and (
        not coalesce(a.is_minor, false)
        or coalesce(a.is_discoverable, false)
        or exists (
          select 1 from public.guardian_consents g
          where g.minor_user_id = a.id
            and g.guardian_user_id = p_viewer
            and g.status = 'granted'
        )
      )
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = p_viewer and b.blocked_id = p.author_id)
           or (b.blocker_id = p.author_id and b.blocked_id = p_viewer)
      )
      and (
        p.audience = 'public'
        or (p.audience = 'followers' and exists (
          select 1 from public.follows f
          where f.follower_id = p_viewer and f.following_id = p.author_id))
        or (p.audience = 'connections' and exists (
          select 1 from public.follows outgoing
          join public.follows incoming
            on incoming.follower_id = p.author_id
           and incoming.following_id = p_viewer
          where outgoing.follower_id = p_viewer
            and outgoing.following_id = p.author_id))
      )
  );
$$;

revoke all on function private.recipient_can_see_post(uuid, uuid) from public, anon, authenticated;
grant execute on function private.recipient_can_see_post(uuid, uuid) to service_role;

-- Same as 20261023000008_mentions.sql, plus the check on the person mentioning.
create or replace function private.can_mention(p_actor uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_actor is not null
    and exists (
      select 1
      from public.user_profiles me
      where me.id = p_actor
        and not coalesce(me.is_suspended, false)
        and (
          not coalesce(me.is_minor, false)
          or (coalesce(me.is_discoverable, false)
              and private.has_guardian_consent(p_actor, 'messaging'))
        )
    )
    and exists (
      select 1
      from public.user_profiles up
      where up.id = p_target
        and not coalesce(up.is_suspended, false)
        -- Option A: a minor cannot be mentioned (20261023000008).
        and not coalesce(up.is_minor, false)
    )
    and not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = p_actor and b.blocked_id = p_target)
         or (b.blocker_id = p_target and b.blocked_id = p_actor)
    );
$$;

-- Same as 20261023000008_mentions.sql, plus recipient_can_see_post.
create or replace function private.notify_mentions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user          uuid;
  v_post_id       uuid;
  v_post_author   uuid;
  v_parent_author uuid;
  v_title         text;
  v_body          text;
  v_data          jsonb;
begin
  if coalesce(new.is_hidden, false) then
    return new;
  end if;

  if new.mentions is null or jsonb_typeof(new.mentions) <> 'array' then
    return new;
  end if;

  if tg_table_name = 'post_comments' then
    select p.author_id into v_post_author
    from public.posts p
    where p.id = new.post_id;

    if new.parent_id is not null then
      select c.author_id into v_parent_author
      from public.post_comments c
      where c.id = new.parent_id;
    end if;

    v_post_id := new.post_id;
    v_title := private.display_name(new.author_id) || ' mentioned you in a comment';
    v_body := left(new.body, 120);
    v_data := jsonb_build_object('post_id', new.post_id, 'comment_id', new.id);
  else
    v_post_id := new.id;
    v_title := private.display_name(new.author_id) || ' mentioned you in a post';
    v_body := left(coalesce(new.caption, new.text), 120);
    v_data := jsonb_build_object('post_id', new.id);
  end if;

  for v_user in
    select distinct (elem->>'user_id')::uuid
    from jsonb_array_elements(new.mentions) elem
    where (elem->>'user_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  loop
    -- The author already knows. private.notify would drop this too.
    if v_user = new.author_id then
      continue;
    end if;

    -- A comment already notifies the post author and, on a reply, the
    -- parent comment's author. Don't send them a second row.
    if tg_table_name = 'post_comments' then
      if v_user = v_post_author then
        continue;
      end if;
      if v_parent_author is not null and v_user = v_parent_author then
        continue;
      end if;
    end if;

    -- Nothing about a post goes to someone who may not see it.
    if not private.recipient_can_see_post(v_post_id, v_user) then
      continue;
    end if;

    perform private.notify(
      v_user, 'mention', 'mention',
      v_title, v_body,
      new.author_id, 'post', v_post_id::text, null,
      v_data
    );
  end loop;

  return new;
end;
$$;

drop policy if exists post_views_insert on public.post_views;
create policy post_views_insert on public.post_views
for insert to authenticated
with check (
  viewer_id = auth.uid()
  and exists (select 1 from public.posts p where p.id = post_id and p.author_id <> auth.uid())
);

drop policy if exists post_views_update on public.post_views;
create policy post_views_update on public.post_views
for update to authenticated
using (viewer_id = auth.uid())
with check (
  viewer_id = auth.uid()
  and exists (select 1 from public.posts p where p.id = post_id and p.author_id <> auth.uid())
);
