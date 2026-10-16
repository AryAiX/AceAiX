-- Audience (role = guest) cannot do these writes.
-- A function refuses with errcode 42501 and hint audience_not_allowed.
-- A policy only gains a condition. Existing grants are left as they are.
--
-- stories_insert and end_insert were removed on purpose (writes go through
-- create_story and endorse_athlete, and INSERT is revoked). They are not
-- recreated here. There is no create-post RPC, no trial-apply RPC, and no
-- story reply or reaction that writes a row.

-- ------------------------------------------------------------
-- Posts, comments, comment likes, trial applications
-- ------------------------------------------------------------
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not private.viewer_is_audience()
  );

drop policy if exists post_comments_insert on public.post_comments;
create policy post_comments_insert on public.post_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not private.viewer_is_audience()
  );

drop policy if exists comment_likes_insert on public.comment_likes;
create policy comment_likes_insert on public.comment_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not private.viewer_is_audience()
  );

drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert to authenticated
  with check (
    athlete_id = auth.uid()
    and not private.viewer_is_audience()
  );

-- Saving a post or a trial, and writing a recommendation. Delete stays as it was.
drop policy if exists post_saves_insert on public.post_saves;
create policy post_saves_insert on public.post_saves
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not private.viewer_is_audience()
  );

drop policy if exists opp_saves_insert on public.opportunity_saves;
create policy opp_saves_insert on public.opportunity_saves
  for insert to authenticated
  with check (
    athlete_id = auth.uid()
    and not private.viewer_is_audience()
  );

drop policy if exists rec_insert on public.recommendations;
create policy rec_insert on public.recommendations
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not private.viewer_is_audience()
  );

-- ------------------------------------------------------------
-- Messaging. Either side being a guest is enough.
-- start_conversation already calls can_message, so it is not copied.
-- ------------------------------------------------------------
create or replace function private.can_message(p_sender uuid, p_recipient uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  s record;
  r record;
  v_follows boolean;
begin
  if p_sender is null or p_recipient is null or p_sender = p_recipient then
    return false;
  end if;

  select id, is_minor, is_verified, is_suspended, role, allow_messages_from
    into s from public.user_profiles where id = p_sender;
  select id, is_minor, is_verified, is_suspended, role, allow_messages_from
    into r from public.user_profiles where id = p_recipient;

  if s.id is null or r.id is null then return false; end if;
  if s.role::text = 'guest' or r.role::text = 'guest' then return false; end if;
  if s.is_suspended or r.is_suspended then return false; end if;

  -- Blocks in either direction end the conversation before it starts.
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_sender and b.blocked_id = p_recipient)
       or (b.blocker_id = p_recipient and b.blocked_id = p_sender)
  ) then
    return false;
  end if;

  select exists (
    select 1 from public.follows f
    where f.follower_id = p_recipient and f.following_id = p_sender
  ) into v_follows;

  -- Recipient's own inbox setting.
  if r.allow_messages_from = 'nobody' then return false; end if;
  if r.allow_messages_from = 'following' and not v_follows then return false; end if;
  if r.allow_messages_from = 'verified' and not (s.is_verified or v_follows) then
    return false;
  end if;

  -- Protecting minors.
  if r.is_minor and not s.is_minor then
    -- An adult may only initiate with a minor if they are a verified
    -- professional AND the minor's guardian allowed messaging.
    if not private.is_verified_adult(p_sender) then return false; end if;
    if not private.has_guardian_consent(p_recipient, 'messaging') then return false; end if;
  end if;

  if s.is_minor and not r.is_minor then
    -- A minor may write to an adult only if that adult is verified, or the
    -- minor already follows them (e.g. their own club).
    if not (r.is_verified or exists (
      select 1 from public.follows f
      where f.follower_id = p_sender and f.following_id = p_recipient
    )) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

-- True if either participant of that conversation has role 'guest'.
-- Existing chats keep the old reply rules; only a guest in the thread is blocked.
create or replace function private.conversation_has_audience(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.conversations c
    join public.user_profiles u
      on u.id in (c.participant_1_id, c.participant_2_id)
    where c.id = p_conversation
      and u.role::text = 'guest'
  );
$$;

revoke all on function private.conversation_has_audience(uuid) from public, anon;
grant execute on function private.conversation_has_audience(uuid) to authenticated, service_role;

drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and private.in_conversation(conversation_id)
    and not exists (
      select 1 from public.conversations c
      join public.user_blocks b on (
        (b.blocker_id = c.participant_1_id and b.blocked_id = c.participant_2_id)
        or (b.blocker_id = c.participant_2_id and b.blocked_id = c.participant_1_id)
      )
      where c.id = conversation_id
    )
    and not private.conversation_has_audience(conversation_id)
  );

-- ------------------------------------------------------------
-- Play. Every meetup read and write already calls this.
-- ------------------------------------------------------------
create or replace function private.may_meet()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and coalesce(up.is_minor, true)     -- unknown counts as minor, deliberately
          = false
      and coalesce(up.is_suspended, false) = false
      and not private.viewer_is_audience()
  );
$$;

-- ------------------------------------------------------------
-- Stories. Direct insert stays revoked.
-- ------------------------------------------------------------
create or replace function public.create_story(
  p_kind      text,
  p_media_url text default null,
  p_caption   text default null,
  p_card      jsonb default '{}'::jsonb,
  p_audience  text default 'followers'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me     public.user_profiles;
  v_card   jsonb := coalesce(p_card, '{}'::jsonb);
  v_text   text;
  v_recent integer;
  v_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if private.viewer_is_audience() then
    raise exception 'Audience accounts can''t do this'
      using errcode = '42501', hint = 'audience_not_allowed';
  end if;
  select * into v_me from public.user_profiles where id = auth.uid();
  if coalesce(v_me.is_suspended, false) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;

  if p_kind not in ('photo', 'video', 'card') then
    raise exception 'Unknown story kind' using errcode = '22023';
  end if;
  if coalesce(p_audience, '') not in ('public', 'followers', 'connections') then
    raise exception 'Unknown audience' using errcode = '22023';
  end if;
  if p_caption is not null and length(btrim(p_caption)) > 200 then
    raise exception 'Keep the caption under 200 characters' using errcode = '22023';
  end if;

  if p_kind = 'card' then
    v_text := nullif(btrim(coalesce(v_card ->> 'text', '')), '');
    if v_text is null or length(v_text) > 140 then
      raise exception 'A card needs some text, up to 140 characters'
        using errcode = '22023', hint = 'story_card_text';
    end if;
    if coalesce(v_card ->> 'background', 'hero')
       not in ('hero', 'action', 'cool', 'warm', 'party', 'score') then
      raise exception 'Unknown card background' using errcode = '22023';
    end if;
    /* Only the keys the client renders are kept. */
    v_card := jsonb_build_object(
      'text', v_text,
      'background', coalesce(v_card ->> 'background', 'hero'),
      'sticker', left(coalesce(v_card ->> 'sticker', ''), 24),
      'stat', left(coalesce(v_card ->> 'stat', ''), 16)
    );
  else
    /* Uploaded media lives under the author's own folder, as posts do. A
       minor needs the guardian's "photos and clips" scope, exactly as for
       profile media. */
    if p_media_url is null or split_part(p_media_url, '/', 1) <> auth.uid()::text then
      raise exception 'Upload the file first' using errcode = '22023', hint = 'story_media_missing';
    end if;
    if coalesce(v_me.is_minor, false) and not private.has_guardian_consent(auth.uid(), 'media') then
      raise exception 'A parent or guardian needs to approve photos and clips first'
        using errcode = '42501', hint = 'guardian_consent_required';
    end if;
    v_card := '{}'::jsonb;
  end if;

  select count(*) into v_recent from public.stories
   where author_id = auth.uid() and created_at > now() - interval '24 hours';
  if v_recent >= 30 then
    raise exception 'That is a lot of stories for one day' using errcode = '54000', hint = 'rate_limited';
  end if;

  insert into public.stories (author_id, media_url, media_type, caption, card, audience)
  values (
    auth.uid(),
    case when p_kind = 'card' then null else p_media_url end,
    p_kind,
    nullif(btrim(coalesce(p_caption, '')), ''),
    v_card,
    p_audience
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Saving a post. Unsaving still runs.
-- ------------------------------------------------------------
create or replace function public.toggle_post_save(p_post uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_saved boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.post_saves
    where post_id = p_post
      and user_id = auth.uid()
  ) into v_saved;

  if v_saved then
    delete from public.post_saves
    where post_id = p_post
      and user_id = auth.uid();
  else
    if private.viewer_is_audience() then
      raise exception 'Audience accounts can''t do this'
        using errcode = '42501', hint = 'audience_not_allowed';
    end if;
    insert into public.post_saves (post_id, user_id)
    values (p_post, auth.uid())
    on conflict do nothing;
  end if;

  return jsonb_build_object('saved', not v_saved);
end;
$$;

-- ------------------------------------------------------------
-- Endorsements. Direct insert stays revoked.
-- ------------------------------------------------------------
create or replace function public.endorse_athlete(
  p_athlete uuid,
  p_skill   text,
  p_note    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_skill    text := nullif(btrim(coalesce(p_skill, '')), '');
  v_me       public.user_profiles;
  v_owner    uuid;
  v_distinct integer;
  v_id       uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if private.viewer_is_audience() then
    raise exception 'Audience accounts can''t do this'
      using errcode = '42501', hint = 'audience_not_allowed';
  end if;
  if v_skill is null or length(v_skill) < 2 or length(v_skill) > 60 then
    raise exception 'Say what you are endorsing, in a word or two'
      using errcode = '22023';
  end if;

  select * into v_me from public.user_profiles where id = auth.uid();
  if coalesce(v_me.is_suspended, false) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;

  select user_id into v_owner from public.athlete_profiles where id = p_athlete;
  if v_owner is null then
    raise exception 'No such athlete' using errcode = 'P0002';
  end if;
  if v_owner = auth.uid() then
    raise exception 'You cannot endorse yourself'
      using errcode = '22023', hint = 'endorse_self';
  end if;

  /* Six distinct skills per endorser per athlete. Counted before the insert so
     an update to an existing one is never blocked by the cap. */
  select count(distinct lower(btrim(skill_or_trait))) into v_distinct
  from public.endorsements
  where athlete_id = p_athlete
    and endorser_id = auth.uid()
    and lower(btrim(skill_or_trait)) <> lower(v_skill);

  if v_distinct >= 6 then
    raise exception 'You have already endorsed six things about this athlete'
      using errcode = '22023', hint = 'endorse_limit';
  end if;

  insert into public.endorsements (athlete_id, endorser_id, endorser_role, skill_or_trait, note)
  values (
    p_athlete, auth.uid(),
    /* From the profile, never from the caller — see the header. */
    v_me.role,
    v_skill,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  on conflict (athlete_id, endorser_id, lower(btrim(skill_or_trait))) do update
    set note          = excluded.note,
        endorser_role = excluded.endorser_role
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Coach bookings. Direct insert stays revoked.
-- ------------------------------------------------------------
create or replace function public.book_coaching_slot(
  p_slot uuid, p_note text default null, p_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slot    public.coaching_slots;
  v_service public.coaching_services;
  v_gate    text;
  v_taken   integer;
  v_where   text;
  v_id      uuid;
  v_name    text;
begin
  if private.viewer_is_audience() then
    raise exception 'Audience accounts can''t do this'
      using errcode = '42501', hint = 'audience_not_allowed';
  end if;

  /* Lock the slot first: two people racing for the last place queue here. */
  select * into v_slot from public.coaching_slots where id = p_slot for update;
  if not found or v_slot.status <> 'open' or v_slot.starts_at <= now() then
    raise exception 'That time is no longer available' using errcode = 'P0002', hint = 'coaching_slot_gone';
  end if;
  select * into v_service from public.coaching_services where id = v_slot.service_id and is_active;
  if not found then
    raise exception 'That time is no longer available' using errcode = 'P0002', hint = 'coaching_slot_gone';
  end if;

  v_gate := private.coaching_gate(v_slot.coach_user_id);
  if v_gate <> 'ok' then
    raise exception 'You cannot book this coach' using errcode = '42501', hint = v_gate;
  end if;
  if length(coalesce(p_note, '')) > 400 then
    raise exception 'Note too long' using errcode = '22023';
  end if;
  if exists (select 1 from public.coaching_bookings
             where slot_id = p_slot and athlete_user_id = auth.uid() and status = 'booked') then
    raise exception 'You already booked this time' using errcode = '23505', hint = 'coaching_already_booked';
  end if;
  select count(*) into v_taken from public.coaching_bookings where slot_id = p_slot and status = 'booked';
  if v_taken >= v_slot.capacity then
    raise exception 'That time is full' using errcode = 'P0002', hint = 'coaching_slot_full';
  end if;

  v_where := case v_service.location_mode
    when 'fixed' then v_service.location
    when 'online' then null
    else nullif(btrim(p_location), '')
  end;
  if v_service.location_mode = 'flexible' and length(coalesce(v_where, '')) < 3 then
    raise exception 'Say where you would like to train' using errcode = '22023', hint = 'coaching_location_required';
  end if;

  insert into public.coaching_bookings (slot_id, service_id, coach_user_id, athlete_user_id, note, location)
  values (p_slot, v_service.id, v_slot.coach_user_id, auth.uid(), nullif(btrim(p_note), ''), v_where)
  returning id into v_id;

  select coalesce(full_name, 'Someone') into v_name from public.user_profiles where id = auth.uid();
  perform private.coaching_notify(v_slot.coach_user_id, 'coaching_booked',
    v_name || ' booked ' || v_service.title, auth.uid(), v_id, auth.uid());
  return v_id;
end;
$$;
