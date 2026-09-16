-- ============================================================
-- 0023 — Notifications that actually arrive, and go somewhere real
--
-- Before this migration a notification could only be written by the user it
-- belonged to (ntf_insert: user_id = auth.uid()), which is safe but means
-- nothing was ever generated for follows, messages, comments or applications:
-- the notification list was permanently empty, and the few rows that did
-- exist carried a free-text action_url with nothing to validate it against —
-- which is why taps landed on the wrong screen.
--
-- This migration:
--   * gives notifications a typed target (actor + entity type + entity id),
--     so the client routes from structured data instead of parsing strings;
--   * generates them server-side via SECURITY DEFINER triggers;
--   * adds per-user mute preferences that the triggers respect;
--   * keeps follower/following counters correct.
-- ============================================================

-- ------------------------------------------------------------
-- Typed notification targets
-- ------------------------------------------------------------
alter table public.notifications
  add column if not exists actor_id    uuid references public.user_profiles(id) on delete cascade,
  add column if not exists entity_type text,
  add column if not exists entity_id   text,
  /* Collapses "5 people liked your post" into a single row. */
  add column if not exists group_key   text,
  add column if not exists actor_count integer not null default 1,
  add column if not exists updated_at  timestamptz not null default now();

create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread
  on public.notifications(user_id) where not is_read;
create unique index if not exists idx_notifications_group
  on public.notifications(user_id, group_key) where group_key is not null;

-- ------------------------------------------------------------
-- Preferences
-- ------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id            uuid primary key references public.user_profiles(id) on delete cascade,
  follows            boolean not null default true,
  messages           boolean not null default true,
  comments           boolean not null default true,
  likes              boolean not null default true,
  opportunities      boolean not null default true,
  applications       boolean not null default true,
  scout_interest     boolean not null default true,
  score_updates      boolean not null default true,
  push_enabled       boolean not null default true,
  email_enabled      boolean not null default true,
  quiet_hours_start  smallint check (quiet_hours_start between 0 and 23),
  quiet_hours_end    smallint check (quiet_hours_end between 0 and 23),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create trigger trg_notification_prefs_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

drop policy if exists np_all on public.notification_preferences;
create policy np_all on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.notification_preferences to authenticated;

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
    else true
  end;
end;
$$;

-- ------------------------------------------------------------
-- The one place notifications are created
-- ------------------------------------------------------------
create or replace function private.notify(
  p_user        uuid,
  p_channel     text,       -- maps to notification_preferences
  p_type        text,       -- the client's routing discriminator
  p_title       text,
  p_body        text,
  p_actor       uuid default null,
  p_entity_type text default null,
  p_entity_id   text default null,
  p_group_key   text default null,
  p_data        jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user is null then return; end if;
  -- Never notify someone about their own action.
  if p_actor is not null and p_actor = p_user then return; end if;
  -- Respect blocks in both directions.
  if p_actor is not null and exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_user and b.blocked_id = p_actor)
       or (b.blocker_id = p_actor and b.blocked_id = p_user)
  ) then
    return;
  end if;
  if not private.wants_notification(p_user, p_channel) then return; end if;

  if p_group_key is not null then
    insert into public.notifications as n
      (user_id, type, title, body, actor_id, entity_type, entity_id,
       group_key, data, is_read, read, actor_count)
    values
      (p_user, p_type, p_title, p_body, p_actor, p_entity_type, p_entity_id,
       p_group_key, coalesce(p_data, '{}'::jsonb), false, false, 1)
    on conflict (user_id, group_key) where group_key is not null do update set
      title       = excluded.title,
      body        = excluded.body,
      actor_id    = excluded.actor_id,
      actor_count = n.actor_count + 1,
      is_read     = false,
      read        = false,
      created_at  = now(),
      updated_at  = now();
  else
    insert into public.notifications
      (user_id, type, title, body, actor_id, entity_type, entity_id, data, is_read, read)
    values
      (p_user, p_type, p_title, p_body, p_actor, p_entity_type, p_entity_id,
       coalesce(p_data, '{}'::jsonb), false, false);
  end if;
end;
$$;

create or replace function private.display_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(full_name), ''), 'Someone') from public.user_profiles where id = p_user;
$$;

-- ------------------------------------------------------------
-- Follows → notification + counters
-- ------------------------------------------------------------
create or replace function private.on_follow_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.user_profiles set followers_count = followers_count + 1
      where id = new.following_id;
    update public.user_profiles set following_count = following_count + 1
      where id = new.follower_id;

    perform private.notify(
      new.following_id, 'follow', 'follow',
      private.display_name(new.follower_id) || ' started following you',
      null, new.follower_id, 'user', new.follower_id::text, null,
      jsonb_build_object('follower_id', new.follower_id)
    );
    return new;
  else
    update public.user_profiles set followers_count = greatest(0, followers_count - 1)
      where id = old.following_id;
    update public.user_profiles set following_count = greatest(0, following_count - 1)
      where id = old.follower_id;
    return old;
  end if;
end;
$$;

drop trigger if exists trg_follows_notify on public.follows;
create trigger trg_follows_notify
  after insert or delete on public.follows
  for each row execute function private.on_follow_change();

-- ------------------------------------------------------------
-- Messages → notification + conversation preview
-- ------------------------------------------------------------
create or replace function private.on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c record;
  v_recipient uuid;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if not found then return new; end if;

  v_recipient := case when c.participant_1_id = new.sender_id
                      then c.participant_2_id else c.participant_1_id end;

  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = left(new.content, 140)
  where id = new.conversation_id;

  perform private.notify(
    v_recipient, 'message', 'message',
    private.display_name(new.sender_id) || ' sent you a message',
    left(new.content, 120),
    new.sender_id, 'conversation', new.conversation_id::text,
    'msg:' || new.conversation_id::text,
    jsonb_build_object('conversation_id', new.conversation_id)
  );
  return new;
end;
$$;

drop trigger if exists trg_messages_notify on public.messages;
create trigger trg_messages_notify
  after insert on public.messages
  for each row execute function private.on_message_insert();

-- ------------------------------------------------------------
-- Comments and likes
-- ------------------------------------------------------------
create or replace function private.on_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_author uuid; v_parent_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;

  perform private.notify(
    v_author, 'comment', 'comment',
    private.display_name(new.author_id) || ' commented on your post',
    left(new.body, 120),
    new.author_id, 'post', new.post_id::text, null,
    jsonb_build_object('post_id', new.post_id, 'comment_id', new.id)
  );

  if new.parent_id is not null then
    select author_id into v_parent_author from public.post_comments where id = new.parent_id;
    if v_parent_author is not null and v_parent_author <> v_author then
      perform private.notify(
        v_parent_author, 'comment', 'reply',
        private.display_name(new.author_id) || ' replied to you',
        left(new.body, 120),
        new.author_id, 'post', new.post_id::text, null,
        jsonb_build_object('post_id', new.post_id, 'comment_id', new.id)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_comments_notify on public.post_comments;
create trigger trg_comments_notify
  after insert on public.post_comments
  for each row execute function private.on_comment_insert();

create or replace function private.on_post_like_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  perform private.notify(
    v_author, 'like', 'like',
    private.display_name(new.user_id) || ' liked your post',
    null,
    new.user_id, 'post', new.post_id::text,
    'like:' || new.post_id::text,
    jsonb_build_object('post_id', new.post_id)
  );
  return new;
end;
$$;

drop trigger if exists trg_post_likes_notify on public.post_likes;
create trigger trg_post_likes_notify
  after insert on public.post_likes
  for each row execute function private.on_post_like_insert();

-- ------------------------------------------------------------
-- Applications, both directions
-- ------------------------------------------------------------
create or replace function private.on_application_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare o record;
begin
  select * into o from public.opportunities where id = coalesce(new.opportunity_id, old.opportunity_id);
  if not found then return coalesce(new, old); end if;

  if tg_op = 'INSERT' then
    perform private.notify(
      o.created_by_id, 'application', 'application_received',
      private.display_name(new.athlete_id) || ' applied to ' || o.title,
      null, new.athlete_id, 'opportunity', o.id::text, null,
      jsonb_build_object('opportunity_id', o.id, 'application_id', new.id)
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform private.notify(
      new.athlete_id, 'application', 'application_status',
      'Your application to ' || o.title || ' is now ' || new.status,
      null, o.created_by_id, 'opportunity', o.id::text, null,
      jsonb_build_object('opportunity_id', o.id, 'application_id', new.id, 'status', new.status)
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_applications_notify on public.applications;
create trigger trg_applications_notify
  after insert or update of status on public.applications
  for each row execute function private.on_application_change();

-- ------------------------------------------------------------
-- Scout interest: a verified recruiter viewed a profile
-- ------------------------------------------------------------
create or replace function private.on_profile_view()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_owner uuid;
begin
  if new.viewer_role not in ('scout','coach','club','federation') then
    return new;
  end if;
  select user_id into v_owner from public.athlete_profiles where id = new.athlete_id;

  perform private.notify(
    v_owner, 'scout_interest', 'profile_view',
    coalesce(nullif(new.viewer_org, ''), private.display_name(new.viewer_user_id))
      || ' viewed your profile',
    null, new.viewer_user_id, 'user', new.viewer_user_id::text,
    'view:' || to_char(now(), 'YYYY-MM-DD'),
    jsonb_build_object('viewer_role', new.viewer_role)
  );
  return new;
end;
$$;

drop trigger if exists trg_profile_views_notify on public.profile_views;
create trigger trg_profile_views_notify
  after insert on public.profile_views
  for each row execute function private.on_profile_view();

-- ------------------------------------------------------------
-- Endorsements and talent tier changes
-- ------------------------------------------------------------
create or replace function private.on_endorsement_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.athlete_profiles where id = new.athlete_id;
  perform private.notify(
    v_owner, 'scout_interest', 'endorsement',
    private.display_name(new.endorser_id) || ' endorsed you for ' || new.skill_or_trait,
    new.note, new.endorser_id, 'user', v_owner::text, null,
    jsonb_build_object('endorsement_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_endorsements_notify on public.endorsements;
create trigger trg_endorsements_notify
  after insert on public.endorsements
  for each row execute function private.on_endorsement_insert();

create or replace function private.on_talent_tier_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_owner uuid;
begin
  if tg_op = 'UPDATE' and new.tier is not distinct from old.tier then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.overall <= coalesce(old.overall, 0) then
    return new;
  end if;

  select user_id into v_owner from public.athlete_profiles where id = new.athlete_id;
  perform private.notify(
    v_owner, 'score', 'score_tier_up',
    'You reached ' || initcap(new.tier) || ' tier',
    'Your Talent Score is now ' || new.overall || '.',
    null, 'score', new.athlete_id::text, null,
    jsonb_build_object('overall', new.overall, 'tier', new.tier)
  );
  return new;
end;
$$;

drop trigger if exists trg_talent_tier_notify on public.talent_scores;
create trigger trg_talent_tier_notify
  after insert or update of tier on public.talent_scores
  for each row execute function private.on_talent_tier_change();

-- ------------------------------------------------------------
-- Read-state helpers
-- ------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  update public.notifications
  set is_read = true, read = true, updated_at = now()
  where user_id = auth.uid()
    and not is_read
    and (p_ids is null or id = any(p_ids));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

create or replace function public.unread_counts()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'notifications', (
      select count(*) from public.notifications
      where user_id = auth.uid() and not is_read and type <> 'message'
    ),
    'messages', (
      select count(*) from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.sender_id <> auth.uid()
        and not m.is_read
        and (c.participant_1_id = auth.uid() or c.participant_2_id = auth.uid())
    )
  );
$$;

revoke all on function public.unread_counts() from public, anon;
grant execute on function public.unread_counts() to authenticated;

-- ------------------------------------------------------------
-- Backfill counters that were never maintained
-- ------------------------------------------------------------
update public.user_profiles u
set followers_count = coalesce(f.c, 0)
from (select following_id, count(*) c from public.follows group by 1) f
where f.following_id = u.id;

update public.user_profiles u
set following_count = coalesce(f.c, 0)
from (select follower_id, count(*) c from public.follows group by 1) f
where f.follower_id = u.id;

update public.athlete_profiles ap
set followers_count = coalesce(u.followers_count, 0)
from public.user_profiles u
where u.id = ap.user_id;
