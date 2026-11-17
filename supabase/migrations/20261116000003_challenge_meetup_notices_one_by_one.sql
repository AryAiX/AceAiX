-- ============================================================
-- Challenge and meetup notices arrive one by one (QA-195)
--
-- Five functions passed a group key to private.notify. A second
-- notice with the same key updated the first row, so several
-- entries on one challenge became one row ("Sara and 2 others
-- entered ..."), a second pop-up that arrived while the first
-- was on screen was dropped, and the updated row kept its first
-- type (an accepted then cancelled meetup kept the
-- meetup_accepted icon).
--
-- Each function now passes a null group key, so every notice is
-- its own row and its own pop-up, the same way likes are after
-- QA-173. Messages stay grouped per conversation, and profile
-- views stay grouped per day, on purpose. Rows that are already
-- grouped stay as they are.
-- ============================================================

create or replace function public.enter_challenge(
  p_challenge_id  uuid,
  p_media_id      uuid,
  p_claimed_value numeric default null,
  p_note          text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c        record;
  up       record;
  v_athlete uuid;
  v_age    integer;
  v_id     uuid;
begin
  select * into c from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'That challenge is gone.' using hint = 'not_found';
  end if;
  if c.status <> 'open' or c.closes_at <= now() then
    raise exception 'This challenge has closed.' using hint = 'challenge_closed';
  end if;

  select * into up from public.user_profiles where id = auth.uid();
  if not found or up.role <> 'athlete' then
    raise exception 'Only athletes can enter a challenge.' using hint = 'not_allowed';
  end if;
  if coalesce(up.is_suspended, false) then
    raise exception 'Your account is suspended.' using hint = 'suspended';
  end if;

  /* Entering puts a clip and a name on a public leaderboard. For a minor that
     is the same exposure as being discoverable, so it takes the same consent. */
  if coalesce(up.is_minor, false) and not coalesce(up.is_discoverable, false) then
    raise exception 'Ask your parent or guardian to turn on discovery before entering.'
      using hint = 'guardian_consent_required';
  end if;

  select id, date_part('year', age(birth_date))::int
    into v_athlete, v_age
  from public.athlete_profiles where user_id = auth.uid();

  if v_athlete is null then
    raise exception 'Finish your athlete profile first.' using hint = 'profile_incomplete';
  end if;
  if c.age_min is not null and coalesce(v_age, 0) < c.age_min then
    raise exception 'This challenge is for older age groups.' using hint = 'age_out_of_range';
  end if;
  if c.age_max is not null and coalesce(v_age, 200) > c.age_max then
    raise exception 'This challenge is for younger age groups.' using hint = 'age_out_of_range';
  end if;

  if not exists (
    select 1 from public.athlete_media m
    where m.id = p_media_id and m.athlete_id = v_athlete
      and m.is_public
      and m.media_type in ('video','highlight_reel')
  ) then
    raise exception 'Pick one of your own public clips.' using hint = 'media_not_found';
  end if;

  insert into public.challenge_entries (challenge_id, athlete_id, media_id, claimed_value, note)
  values (p_challenge_id, v_athlete, p_media_id, p_claimed_value,
          nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (challenge_id, athlete_id) do update
    set media_id      = excluded.media_id,
        claimed_value = excluded.claimed_value,
        note          = excluded.note,
        status        = 'submitted',
        verified_value = null,
        verified_by   = null,
        verified_at   = null,
        judge_note    = null
  returning id into v_id;

  perform private.notify(
    c.created_by, 'social', 'challenge_entry',
    up.full_name || ' entered ' || c.title,
    coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'A new clip is waiting for you.'),
    auth.uid(), 'challenge', c.id::text, null
  );

  return v_id;
end;
$$;

create or replace function public.judge_challenge_entry(
  p_entry_id uuid,
  p_accept   boolean,
  p_value    numeric default null,
  p_note     text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  e     record;
  c     record;
  v_user uuid;
begin
  select * into e from public.challenge_entries where id = p_entry_id;
  if not found then
    raise exception 'That entry is gone.' using hint = 'not_found';
  end if;

  select * into c from public.challenges where id = e.challenge_id;
  if c.created_by <> auth.uid()
     and not (c.organization_id is not null
              and private.is_org_member(c.organization_id, array['owner','admin','staff'])) then
    raise exception 'Only the coach who set this challenge can judge it.' using hint = 'not_allowed';
  end if;

  update public.challenge_entries
  set status         = case when p_accept then 'verified' else 'rejected' end,
      verified_value = case when p_accept then coalesce(p_value, claimed_value) else null end,
      verified_by    = auth.uid(),
      verified_at    = now(),
      judge_note     = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_entry_id;

  select a.user_id into v_user from public.athlete_profiles a where a.id = e.athlete_id;

  perform private.notify(
    v_user, 'social',
    case when p_accept then 'challenge_verified' else 'challenge_rejected' end,
    case when p_accept then 'Your ' || c.title || ' entry is confirmed'
         else 'Your ' || c.title || ' entry needs another go' end,
    coalesce(nullif(btrim(coalesce(p_note, '')), ''),
      case when p_accept then 'A coach watched it and confirmed the result.'
           else 'Read the brief again and send a new clip.' end),
    auth.uid(), 'challenge', c.id::text, null
  );
end;
$$;

create or replace function public.request_to_join_meetup(
  p_meetup  uuid,
  p_message text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.meetups;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not private.may_meet() then
    raise exception 'Meetups are for accounts aged 18 and over'
      using errcode = '42501', hint = 'meetups_adults_only';
  end if;

  select * into m from public.meetups where id = p_meetup;
  if m.id is null then
    raise exception 'That meetup no longer exists' using errcode = 'P0002';
  end if;
  if m.host_id = auth.uid() then
    raise exception 'You are hosting this one' using errcode = '22023';
  end if;
  if m.status <> 'open' then
    raise exception 'That meetup is not taking requests' using errcode = '22023';
  end if;
  if m.starts_at < now() then
    raise exception 'That meetup has already started' using errcode = '22023';
  end if;

  insert into public.meetup_participants (meetup_id, user_id, status, message)
  values (p_meetup, auth.uid(), 'requested', nullif(btrim(coalesce(p_message, '')), ''))
  on conflict (meetup_id, user_id) do update
    set status  = case
                    /* Asking again after changing your mind is allowed; asking
                       again after the host said no is not. */
                    when public.meetup_participants.status = 'declined' then 'declined'
                    else 'requested'
                  end,
        message = coalesce(excluded.message, public.meetup_participants.message);

  perform private.notify(
    m.host_id, 'meetup', 'meetup_request',
    private.display_name(auth.uid()) || ' wants to join ' || m.title,
    nullif(btrim(coalesce(p_message, '')), ''),
    auth.uid(), 'meetup', p_meetup::text, null,
    jsonb_build_object('meetup_id', p_meetup)
  );

  return (select status from public.meetup_participants
           where meetup_id = p_meetup and user_id = auth.uid());
end;
$$;

create or replace function public.decide_meetup_request(
  p_meetup uuid,
  p_user   uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.meetups;
begin
  select * into m from public.meetups where id = p_meetup;
  if m.id is null or m.host_id <> auth.uid() then
    raise exception 'Not your meetup' using errcode = '42501';
  end if;

  if p_accept and m.spots_taken >= m.spots_total then
    raise exception 'This meetup is full' using errcode = '22023';
  end if;

  update public.meetup_participants
     set status = case when p_accept then 'joined' else 'declined' end,
         decided_at = now()
   where meetup_id = p_meetup and user_id = p_user and status = 'requested';

  if not found then
    raise exception 'No open request from that person' using errcode = 'P0002';
  end if;

  perform private.notify(
    p_user, 'meetup',
    case when p_accept then 'meetup_accepted' else 'meetup_declined' end,
    case when p_accept then 'You are in: ' || m.title
         else 'Not this time: ' || m.title end,
    case when p_accept
         then m.city || ' · ' || to_char(m.starts_at, 'Mon DD, HH24:MI')
         else null end,
    auth.uid(), 'meetup', p_meetup::text, null,
    jsonb_build_object('meetup_id', p_meetup, 'accepted', p_accept)
  );
end;
$$;

create or replace function public.cancel_meetup(p_meetup uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.meetups;
  r record;
begin
  select * into m from public.meetups where id = p_meetup;
  if m.id is null or m.host_id <> auth.uid() then
    raise exception 'Not your meetup' using errcode = '42501';
  end if;

  update public.meetups set status = 'cancelled' where id = p_meetup;

  /* Everyone who rearranged their Saturday is told. */
  for r in select user_id from public.meetup_participants
            where meetup_id = p_meetup and status = 'joined' and user_id <> auth.uid()
  loop
    perform private.notify(
      r.user_id, 'meetup', 'meetup_cancelled',
      m.title || ' was called off',
      m.city || ' · ' || to_char(m.starts_at, 'Mon DD, HH24:MI'),
      auth.uid(), 'meetup', p_meetup::text, null,
      jsonb_build_object('meetup_id', p_meetup)
    );
  end loop;
end;
$$;
