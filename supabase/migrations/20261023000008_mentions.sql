-- @mentions in post captions and comments (QA-111, part 1 of 2)
--
-- People have no usernames, and full names are not unique, so the caption
-- or comment text keeps the visible "@Full Name" and a mentions column
-- records which account each "@" points at.
--
-- This file is the database half only. The app (part 2) has to turn its
-- own string offsets into Unicode character offsets before it writes
-- start/length — see the column comment. JavaScript counts UTF-16 code
-- units; char_length and substr count characters.
--
-- Grants. INSERT on public.posts and public.post_comments is table-level,
-- from "grant insert on all tables in schema public to authenticated" in
-- 0010 and 0012, not a per-column grant. A new column is already
-- insertable, so this migration does not add an INSERT grant.
-- UPDATE was revoked and then granted only on named columns in
-- 20260904000005_moderation_profiles_and_actions.sql:
--   posts:    caption, text, media, tags, audience, image_url
--   comments: body
-- mentions is not in either list, and it is not granted here, so
-- authenticated cannot update it.
--
-- notifications.type is varchar(50) with no check constraint
-- (0006_opportunities_messaging_notifications.sql). There is no allowed-
-- type list to extend; 'mention' needs no change there.

-- ------------------------------------------------------------
-- Columns
--
-- Each item is {"user_id": uuid, "start": int, "length": int}.
-- start is a 0-based offset and length is a count of Unicode characters,
-- the same units as char_length() and substr() — not JavaScript UTF-16
-- code units. substr() itself is 1-based, so the character at `start` is
-- substr(text, start + 1, 1). The app must convert its offsets.
-- ------------------------------------------------------------
alter table public.posts
  add column if not exists mentions jsonb not null default '[]'::jsonb;

alter table public.posts
  drop constraint if exists posts_mentions_is_array;
alter table public.posts
  add constraint posts_mentions_is_array
  check (jsonb_typeof(mentions) = 'array');

comment on column public.posts.mentions is
  'Who a caption @-mention points at. Each item is {"user_id": uuid, "start": int, "length": int}. start is a 0-based offset and length counts Unicode characters, the same units as char_length() and substr() (substr is 1-based, so the character at start is substr(text, start + 1, 1)). Not JavaScript UTF-16 code units — the app must convert.';

alter table public.post_comments
  add column if not exists mentions jsonb not null default '[]'::jsonb;

alter table public.post_comments
  drop constraint if exists post_comments_mentions_is_array;
alter table public.post_comments
  add constraint post_comments_mentions_is_array
  check (jsonb_typeof(mentions) = 'array');

comment on column public.post_comments.mentions is
  'Who a comment @-mention points at. Each item is {"user_id": uuid, "start": int, "length": int}. start is a 0-based offset and length counts Unicode characters, the same units as char_length() and substr() (substr is 1-based, so the character at start is substr(text, start + 1, 1)). Not JavaScript UTF-16 code units — the app must convert.';

-- ------------------------------------------------------------
-- Who may be mentioned
--
-- The minor rule is pending Tooraj's decision:
--   A  nobody
--   B  verified coaches and clubs
--   C  B, plus people the minor follows back
--   D  anyone, if the minor is discoverable
-- This is option A. Change only this function.
-- ------------------------------------------------------------
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
      from public.user_profiles up
      where up.id = p_target
        and not coalesce(up.is_suspended, false)
        -- Option A: a minor cannot be mentioned. See the comment above.
        and not coalesce(up.is_minor, false)
    )
    and not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = p_actor and b.blocked_id = p_target)
         or (b.blocker_id = p_target and b.blocked_id = p_actor)
    );
$$;

revoke all on function private.can_mention(uuid, uuid) from public, anon, authenticated;
grant execute on function private.can_mention(uuid, uuid) to service_role;

-- ------------------------------------------------------------
-- BEFORE INSERT: shape, then a silent drop
--
-- A mention that fails can_mention is removed and the insert continues,
-- so the writer is not told that the person blocked them, is a minor,
-- or is suspended.
-- ------------------------------------------------------------
create or replace function private.validate_mentions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_text  text;
  v_item  jsonb;
  v_kept  jsonb := '[]'::jsonb;
  v_uid   uuid;
  v_start integer;
  v_len   integer;
begin
  if new.mentions is null then
    new.mentions := '[]'::jsonb;
  end if;

  -- Service role writes are trusted (backfills, moderation).
  if auth.role() = 'service_role' then
    return new;
  end if;

  if jsonb_typeof(new.mentions) <> 'array' then
    raise exception 'That mention is not valid.'
      using errcode = '22023', hint = 'mention_invalid';
  end if;

  if jsonb_array_length(new.mentions) > 10 then
    raise exception 'You can mention at most 10 people.'
      using errcode = '22023', hint = 'mention_limit';
  end if;

  if tg_table_name = 'posts' then
    v_text := coalesce(new.caption, new.text, '');
  else
    v_text := coalesce(new.body, '');
  end if;

  for v_item in select value from jsonb_array_elements(new.mentions) as t(value)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item->'user_id') <> 'string'
       or jsonb_typeof(v_item->'start') <> 'number'
       or jsonb_typeof(v_item->'length') <> 'number'
       or (v_item->>'start') !~ '^[0-9]+$'
       or (v_item->>'length') !~ '^[0-9]+$'
    then
      raise exception 'That mention is not valid.'
        using errcode = '22023', hint = 'mention_invalid';
    end if;

    begin
      v_uid := (v_item->>'user_id')::uuid;
      v_start := (v_item->>'start')::integer;
      v_len := (v_item->>'length')::integer;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'That mention is not valid.'
          using errcode = '22023', hint = 'mention_invalid';
    end;

    -- start is 0-based. substr() is 1-based, so the "@" lives at start + 1.
    -- The sum is bigint so a huge start cannot overflow integer before the
    -- comparison rejects it.
    if v_start < 0
       or v_len < 2
       or v_len > 101
       or (v_start::bigint + v_len::bigint) > char_length(v_text)
       or substr(v_text, v_start + 1, 1) is distinct from '@'
    then
      raise exception 'That mention is not valid.'
        using errcode = '22023', hint = 'mention_invalid';
    end if;

    if private.can_mention(auth.uid(), v_uid) then
      v_kept := v_kept || jsonb_build_object(
        'user_id', v_uid,
        'start', v_start,
        'length', v_len
      );
    end if;
  end loop;

  new.mentions := v_kept;
  return new;
end;
$$;

revoke all on function private.validate_mentions() from public, anon, authenticated;
grant execute on function private.validate_mentions() to service_role;

-- ------------------------------------------------------------
-- AFTER INSERT: one notification per person
-- ------------------------------------------------------------
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

revoke all on function private.notify_mentions() from public, anon, authenticated;
grant execute on function private.notify_mentions() to service_role;

drop trigger if exists trg_posts_validate_mentions on public.posts;
create trigger trg_posts_validate_mentions
  before insert on public.posts
  for each row execute function private.validate_mentions();

drop trigger if exists trg_comments_validate_mentions on public.post_comments;
create trigger trg_comments_validate_mentions
  before insert on public.post_comments
  for each row execute function private.validate_mentions();

drop trigger if exists trg_posts_notify_mentions on public.posts;
create trigger trg_posts_notify_mentions
  after insert on public.posts
  for each row execute function private.notify_mentions();

drop trigger if exists trg_comments_notify_mentions on public.post_comments;
create trigger trg_comments_notify_mentions
  after insert on public.post_comments
  for each row execute function private.notify_mentions();

-- ------------------------------------------------------------
-- Preference. Same shape as club_updates in 20261015000001.
-- ------------------------------------------------------------
alter table public.notification_preferences
  add column if not exists mentions boolean not null default true;

create or replace function private.wants_notification(p_user uuid, p_channel text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare p record;
begin
  select * into p from public.notification_preferences where user_id = p_user;
  if not found then return true; end if;   -- opted in by default
  return case p_channel
    when 'follow'         then p.follows
    when 'message'        then p.messages
    when 'comment'        then p.comments
    when 'like'           then p.likes
    when 'opportunity'    then p.opportunities
    when 'application'    then p.applications
    when 'scout_interest' then p.scout_interest
    when 'score'          then p.score_updates
    when 'meetup'         then p.meetups
    when 'club'           then p.club_updates
    when 'mention'        then p.mentions
    else true
  end;
end;
$$;

-- ------------------------------------------------------------
-- Typeahead for the composer. Same discovery rules as search_people,
-- and then can_mention, so a discoverable minor still does not appear
-- while option A is in force. Limit is capped at 50, as search_people is.
-- ------------------------------------------------------------
create or replace function public.mention_candidates(
  p_query text,
  p_limit integer default 8
)
returns table (
  id          uuid,
  full_name   text,
  avatar_url  text,
  is_verified boolean,
  role        text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    up.id,
    up.full_name::text,
    up.avatar_url::text,
    up.is_verified,
    up.role::text
  from public.user_profiles up
  where auth.uid() is not null
    and coalesce(trim(p_query), '') <> ''
    and up.full_name ilike '%' || trim(p_query) || '%'
    and up.id <> auth.uid()
    and not coalesce(up.is_suspended, false)
    and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
         or (b.blocker_id = up.id and b.blocked_id = auth.uid())
    )
    and private.can_mention(auth.uid(), up.id)
  order by up.is_verified desc, up.full_name asc
  limit greatest(1, least(coalesce(p_limit, 8), 50));
$$;

revoke all on function public.mention_candidates(text, integer) from public, anon;
grant execute on function public.mention_candidates(text, integer) to authenticated;
