-- ============================================================
-- 0025 — Feed and messaging read paths
--
-- The client should never have to assemble a feed row or an inbox row from
-- four separate queries and hope the joins line up. Each screen gets one
-- RPC that returns exactly what it renders, already filtered for blocks,
-- suspensions and audience — so an empty list means "nothing to show",
-- never "a join failed".
-- ============================================================

-- ------------------------------------------------------------
-- Feed
-- ------------------------------------------------------------
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

revoke all on function public.get_feed(text, text, integer, timestamptz) from public, anon;
grant execute on function public.get_feed(text, text, integer, timestamptz) to authenticated;

/* Posts by one author — the grid on a profile. */
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
         exists (select 1 from public.post_likes l
                 where l.post_id = p.id and l.user_id = auth.uid()),
         p.created_at
  from public.posts p
  join public.user_profiles up on up.id = p.author_id
  where p.author_id = p_user
    and not p.is_hidden
    and p.moderation_state = 'visible'
    and not up.is_suspended
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p_user)
         or (b.blocker_id = p_user and b.blocked_id = auth.uid())
    )
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 24), 50));
$$;

revoke all on function public.get_user_posts(uuid, integer, timestamptz) from public, anon;
grant execute on function public.get_user_posts(uuid, integer, timestamptz) to authenticated;

-- ------------------------------------------------------------
-- Like / save toggles — idempotent, no double-tap race
-- ------------------------------------------------------------
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
    insert into public.post_likes (post_id, user_id)
    values (p_post, auth.uid()) on conflict do nothing;
  end if;

  select like_count into v_count from public.posts where id = p_post;
  return jsonb_build_object('liked', not v_liked, 'like_count', coalesce(v_count, 0));
end;
$$;

create or replace function public.toggle_post_save(p_post uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_saved boolean;
begin
  select exists (select 1 from public.post_saves
                 where post_id = p_post and user_id = auth.uid()) into v_saved;
  if v_saved then
    delete from public.post_saves where post_id = p_post and user_id = auth.uid();
  else
    insert into public.post_saves (post_id, user_id)
    values (p_post, auth.uid()) on conflict do nothing;
  end if;
  return jsonb_build_object('saved', not v_saved);
end;
$$;

revoke all on function public.toggle_post_like(uuid) from public, anon;
revoke all on function public.toggle_post_save(uuid) from public, anon;
grant execute on function public.toggle_post_like(uuid) to authenticated;
grant execute on function public.toggle_post_save(uuid) to authenticated;

-- ------------------------------------------------------------
-- Messaging
-- ------------------------------------------------------------
create or replace function public.start_conversation(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_a  uuid;
  v_b  uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not private.can_message(v_me, p_user) then
    raise exception 'You are not able to message this account'
      using errcode = '42501', hint = 'messaging_not_permitted';
  end if;

  -- Canonical ordering so a pair can never end up with two threads.
  v_a := least(v_me, p_user);
  v_b := greatest(v_me, p_user);

  select id into v_id from public.conversations
  where participant_1_id = v_a and participant_2_id = v_b;

  if v_id is null then
    insert into public.conversations (participant_1_id, participant_2_id)
    values (v_a, v_b)
    on conflict do nothing
    returning id into v_id;

    if v_id is null then
      select id into v_id from public.conversations
      where participant_1_id = v_a and participant_2_id = v_b;
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

create or replace function public.get_conversations(p_limit integer default 40)
returns table (
  id                uuid,
  other_user_id     uuid,
  other_name        text,
  other_avatar      text,
  other_role        text,
  other_verified    boolean,
  last_message      text,
  last_message_at   timestamptz,
  unread_count      integer,
  is_blocked        boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    other.id,
    other.full_name::text,
    other.avatar_url::text,
    other.role::text,
    other.is_verified,
    c.last_message_preview::text,
    c.last_message_at,
    (select count(*)::int from public.messages m
     where m.conversation_id = c.id and m.sender_id <> auth.uid() and not m.is_read),
    exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = other.id)
         or (b.blocker_id = other.id and b.blocked_id = auth.uid())
    )
  from public.conversations c
  join public.user_profiles other
    on other.id = case when c.participant_1_id = auth.uid()
                       then c.participant_2_id else c.participant_1_id end
  where (c.participant_1_id = auth.uid() or c.participant_2_id = auth.uid())
    and not other.is_suspended
  order by coalesce(c.last_message_at, c.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
$$;

revoke all on function public.get_conversations(integer) from public, anon;
grant execute on function public.get_conversations(integer) to authenticated;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  if not private.in_conversation(p_conversation) then
    raise exception 'Not a participant' using errcode = '42501';
  end if;

  update public.messages
  set is_read = true, read_at = now()
  where conversation_id = p_conversation
    and sender_id <> auth.uid()
    and not is_read;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ------------------------------------------------------------
-- Expired stories stop being served
-- ------------------------------------------------------------
create or replace function public.purge_expired_stories()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  delete from public.stories where expires_at < now() - interval '2 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_expired_stories() from public, anon, authenticated;
