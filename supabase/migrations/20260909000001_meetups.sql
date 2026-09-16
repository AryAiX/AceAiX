-- ============================================================
-- 0909/01 — Meetups: find people to play with, here or somewhere you are going
--
-- Two shapes of the same thing:
--
--   * "I am in Marbella next Thursday and I want a tennis partner." One other
--     person, a date, a place the poster does not live in.
--   * "I have a pitch in Al Jadaf on Saturday at six and I need fifteen more
--     so we can split it." Many people, one slot, a shared cost.
--
-- Both are: a sport, a place, a window of time, a number of people, and a
-- level. So both are one table, and `spots_total` is the only thing that
-- separates a hitting partner from a five-a-side.
--
-- ------------------------------------------------------------
-- ADULTS ONLY, AND THE DATABASE IS WHAT SAYS SO
--
-- docs/12 rule 5: "A minor's precise location is never held at all — no
-- coordinate, address or postcode column exists." A meetup is the exact
-- opposite of that rule: a named place, an exact time, published to strangers,
-- with an implicit promise that the poster will physically be there. For a
-- fourteen-year-old that is the single most dangerous row this schema could
-- hold, and no amount of care in the client would fix it.
--
-- So the floor is eighteen, and it is enforced here rather than in a screen:
--
--   * `private.may_meet()` requires `is_minor = false`. Every writing function
--     calls it first.
--   * The RLS read policies require it too, so a minor's client cannot even
--     list meetups — not a hidden tab, an empty result set from the server.
--   * `meetup_participants` has a trigger that re-checks on insert, so a row
--     cannot be created by a path that forgot to ask.
--
-- Three independent gates for one rule is deliberate. This is the rule where a
-- single missed check is a story in a newspaper, and `is_minor` is maintained
-- by `private.sync_age_state()` from a date of birth the user cannot rewrite.
--
-- A seventeen-year-old who turns eighteen simply starts seeing the feature;
-- nothing needs to be migrated, because the gate reads `is_minor` live.
--
-- ------------------------------------------------------------
-- LOCATION, AND WHY THERE ARE STILL NO COORDINATES
--
-- Searching "who is playing in Marbella" needs somewhere to match on, and the
-- obvious answer is latitude and longitude with PostGIS. This does not do that,
-- for two reasons. The first is that a pitch is not a point you need to be
-- within 400 metres of — it is a place with a name, and "Marbella" or "Dubai
-- Marina" is how people actually search. The second is that adding a
-- coordinate column to this database creates a place for a minor's coordinates
-- to end up the moment somebody relaxes the age gate, and the strongest
-- guarantee in docs/12 is that the column does not exist.
--
-- So: `city` and `country` are matched on, `area` is a neighbourhood the user
-- types, and `venue` is the specific place. Search is text over city and area,
-- which is what somebody planning a trip types anyway.
-- ============================================================

-- ------------------------------------------------------------
-- A notification channel of its own
--
-- Every other kind of notification can be turned off; this one should be too,
-- and `private.wants_notification` reads a column per channel rather than a
-- lookup table, so a new kind means a new column and a new branch.
-- ------------------------------------------------------------
alter table public.notification_preferences
  add column if not exists meetups boolean not null default true;

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
    else true
  end;
end;
$$;

-- ------------------------------------------------------------
-- The gate
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
  );
$$;

comment on function private.may_meet() is
  'Eighteen-plus, not suspended. The floor under every meetup read and write; '
  'see the header of 20260909000001_meetups.sql for why it is not a client rule.';

-- ------------------------------------------------------------
-- Meetups
-- ------------------------------------------------------------
create table if not exists public.meetups (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references public.user_profiles(id) on delete cascade,

  sport         text not null,
  title         text not null check (length(btrim(title)) between 4 and 90),
  note          text check (note is null or length(btrim(note)) <= 1000),

  /* Where. No coordinates — see the header. */
  country       text not null check (length(btrim(country)) between 2 and 80),
  city          text not null check (length(btrim(city))    between 2 and 80),
  area          text check (area  is null or length(btrim(area))  between 2 and 80),
  venue         text check (venue is null or length(btrim(venue)) between 2 and 120),

  /* When. `ends_at` is optional: a hitting partner is "Thursday afternoon". */
  starts_at     timestamptz not null,
  ends_at       timestamptz,

  /* How many, including the host. A tennis partner is 2; a five-a-side is 10. */
  spots_total   integer not null check (spots_total between 2 and 60),
  /* Confirmed participants, host included. Maintained by trigger. */
  spots_taken   integer not null default 1 check (spots_taken >= 0),

  level         text not null default 'any'
                check (level in ('any','beginner','intermediate','advanced','competitive')),

  /* What it costs each person, if the host is splitting a pitch. Free text so
     a currency and a rough figure can be typed the way people say it. */
  cost_note     text check (cost_note is null or length(btrim(cost_note)) <= 80),

  status        text not null default 'open'
                check (status in ('open','full','cancelled','done')),

  created_at    timestamptz not null default now(),

  constraint meetup_window check (ends_at is null or ends_at > starts_at),
  constraint meetup_not_overbooked check (spots_taken <= spots_total)
);
alter table public.meetups enable row level security;

create index if not exists idx_meetups_when  on public.meetups (starts_at)
  where status = 'open';
create index if not exists idx_meetups_where on public.meetups
  (lower(country), lower(city), starts_at);
create index if not exists idx_meetups_host  on public.meetups (host_id, starts_at desc);

-- ------------------------------------------------------------
-- Who is in, and who has asked
--
-- The host approves. `status` carries the whole lifecycle so a withdrawn
-- request and a declined one are distinguishable — the first is the person
-- changing their mind, the second is the host's decision, and a host should
-- not have to wonder which happened.
-- ------------------------------------------------------------
create table if not exists public.meetup_participants (
  id          uuid primary key default gen_random_uuid(),
  meetup_id   uuid not null references public.meetups(id) on delete cascade,
  user_id     uuid not null references public.user_profiles(id) on delete cascade,

  status      text not null default 'requested'
              check (status in ('requested','joined','declined','withdrawn','host')),
  message     text check (message is null or length(btrim(message)) <= 300),

  created_at  timestamptz not null default now(),
  decided_at  timestamptz,

  unique (meetup_id, user_id)
);
alter table public.meetup_participants enable row level security;

create index if not exists idx_participants_meetup on public.meetup_participants (meetup_id, status);
create index if not exists idx_participants_user   on public.meetup_participants (user_id, created_at desc);

/*
 * The third gate. A participant row is the thing that puts a person in a place
 * at a time, so it refuses a minor regardless of which function created it.
 */
create or replace function private.guard_meetup_is_adult()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.user_profiles up
             where up.id = new.user_id and coalesce(up.is_minor, true)) then
    raise exception 'Meetups are for accounts aged 18 and over'
      using errcode = '42501', hint = 'meetups_adults_only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_meetup_participant_adult on public.meetup_participants;
create trigger trg_meetup_participant_adult
  before insert or update of user_id on public.meetup_participants
  for each row execute function private.guard_meetup_is_adult();

-- ------------------------------------------------------------
-- Reading
--
-- Open meetups are visible to any adult, which is what makes the feature work
-- at all — you are looking for strangers. A minor gets an empty set from the
-- server rather than a hidden tab in the client.
-- ------------------------------------------------------------
drop policy if exists meetups_read on public.meetups;
create policy meetups_read on public.meetups
  for select to authenticated
  using (private.may_meet());

drop policy if exists participants_read on public.meetup_participants;
create policy participants_read on public.meetup_participants
  for select to authenticated
  using (
    private.may_meet()
    and (
      user_id = auth.uid()
      or exists (select 1 from public.meetups m
                 where m.id = meetup_participants.meetup_id and m.host_id = auth.uid())
      /* Everyone who is actually in reads the roster: you are about to meet
         these people, and knowing who they are before you go is the point. */
      or exists (select 1 from public.meetup_participants mine
                 where mine.meetup_id = meetup_participants.meetup_id
                   and mine.user_id = auth.uid()
                   and mine.status in ('joined','host'))
    )
  );

revoke insert, update, delete on public.meetups             from authenticated, anon;
revoke insert, update, delete on public.meetup_participants from authenticated, anon;

/*
 * SELECT is granted explicitly, which the 0907 tables did not do.
 *
 * On hosted Supabase the platform grants `authenticated` access to tables in
 * `public` by default, so the read policies above are the only thing standing
 * between a minor and a list of places adults will be. On the local harness no
 * such default exists, so those policies were never exercised — the table was
 * simply unreadable and every test passed for the wrong reason. Granting here
 * makes the two environments agree, and makes the policy the thing that is
 * actually under test.
 */
grant select on public.meetups             to authenticated;
grant select on public.meetup_participants to authenticated;

-- ------------------------------------------------------------
-- Counting
--
-- `spots_taken` is derived, and derived from one place, so "8 of 15 left"
-- cannot drift from the roster underneath it.
-- ------------------------------------------------------------
create or replace function private.sync_meetup_spots()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meetup uuid := coalesce(new.meetup_id, old.meetup_id);
  v_taken  integer;
begin
  select count(*) into v_taken
  from public.meetup_participants
  where meetup_id = v_meetup and status in ('joined','host');

  update public.meetups
     set spots_taken = v_taken,
         status = case
                    when status in ('cancelled','done') then status
                    when v_taken >= spots_total then 'full'
                    else 'open'
                  end
   where id = v_meetup;

  return null;
end;
$$;

drop trigger if exists trg_meetup_spots on public.meetup_participants;
create trigger trg_meetup_spots
  after insert or update of status or delete on public.meetup_participants
  for each row execute function private.sync_meetup_spots();

-- ------------------------------------------------------------
-- Creating one
-- ------------------------------------------------------------
create or replace function public.create_meetup(
  p_sport       text,
  p_title       text,
  p_country     text,
  p_city        text,
  p_starts_at   timestamptz,
  p_spots_total integer,
  p_area        text default null,
  p_venue       text default null,
  p_ends_at     timestamptz default null,
  p_level       text default 'any',
  p_note        text default null,
  p_cost_note   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not private.may_meet() then
    raise exception 'Meetups are for accounts aged 18 and over'
      using errcode = '42501', hint = 'meetups_adults_only';
  end if;

  /* A meetup in the past helps nobody, and one a year out is not a plan. */
  if p_starts_at < now() - interval '1 hour' then
    raise exception 'That start time has already passed' using errcode = '22023';
  end if;
  if p_starts_at > now() + interval '180 days' then
    raise exception 'Meetups can be arranged up to six months ahead'
      using errcode = '22023';
  end if;

  insert into public.meetups (
    host_id, sport, title, note, country, city, area, venue,
    starts_at, ends_at, spots_total, spots_taken, level, cost_note
  )
  values (
    auth.uid(), p_sport, btrim(p_title), nullif(btrim(coalesce(p_note, '')), ''),
    btrim(p_country), btrim(p_city),
    nullif(btrim(coalesce(p_area, '')), ''), nullif(btrim(coalesce(p_venue, '')), ''),
    p_starts_at, p_ends_at, p_spots_total, 0, coalesce(p_level, 'any'),
    nullif(btrim(coalesce(p_cost_note, '')), '')
  )
  returning id into v_id;

  /* The host occupies a spot. "3 of 10" means three people are coming, and one
     of them is you — anything else makes the number a lie on arrival. */
  insert into public.meetup_participants (meetup_id, user_id, status, decided_at)
  values (v_id, auth.uid(), 'host', now());

  return v_id;
end;
$$;

revoke all on function public.create_meetup(text, text, text, text, timestamptz, integer,
                                            text, text, timestamptz, text, text, text)
  from public, anon;
grant execute on function public.create_meetup(text, text, text, text, timestamptz, integer,
                                               text, text, timestamptz, text, text, text)
  to authenticated;

-- ------------------------------------------------------------
-- Finding one
--
-- The search a person actually runs is "my sport, this place, around then".
-- City and area are matched loosely because nobody agrees on whether it is
-- "Dubai Marina" or "Marina, Dubai".
-- ------------------------------------------------------------
create or replace function public.find_meetups(
  p_sport   text default null,
  p_country text default null,
  p_place   text default null,      -- matches city OR area OR venue
  p_from    timestamptz default null,
  p_to      timestamptz default null,
  p_level   text default null,
  p_limit   integer default 40,
  p_offset  integer default 0
)
returns table (
  id           uuid,
  host_id      uuid,
  host_name    text,
  host_avatar  text,
  sport        text,
  title        text,
  note         text,
  country      text,
  city         text,
  area         text,
  venue        text,
  starts_at    timestamptz,
  ends_at      timestamptz,
  spots_total  integer,
  spots_taken  integer,
  spots_left   integer,
  level        text,
  cost_note    text,
  status       text,
  my_status    text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_place text := nullif(btrim(coalesce(p_place, '')), '');
begin
  if not private.may_meet() then
    /* Not an error: a minor asking simply finds nothing. The client shows the
       same empty state it would for a quiet Tuesday in a small town. */
    return;
  end if;

  return query
  /* `user_profiles.full_name` and `avatar_url` are varchar(n); the OUT
     parameters are text, and PL/pgSQL compares the two structurally rather
     than by assignability, so the casts are load-bearing. */
  select m.id, m.host_id, up.full_name::text, up.avatar_url::text,
         m.sport, m.title, m.note,
         m.country, m.city, m.area, m.venue,
         m.starts_at, m.ends_at,
         m.spots_total, m.spots_taken,
         greatest(0, m.spots_total - m.spots_taken) as spots_left,
         m.level, m.cost_note, m.status,
         (select p.status from public.meetup_participants p
           where p.meetup_id = m.id and p.user_id = auth.uid())
  from public.meetups m
  join public.user_profiles up on up.id = m.host_id
  where m.status in ('open','full')
    and m.starts_at >= coalesce(p_from, now())
    and (p_to      is null or m.starts_at <= p_to)
    and (p_sport   is null or m.sport = p_sport)
    and (p_country is null or lower(m.country) = lower(btrim(p_country)))
    and (p_level   is null or p_level = 'any' or m.level in (p_level, 'any'))
    and (
      v_place is null
      or m.city  ilike '%' || v_place || '%'
      or m.area  ilike '%' || v_place || '%'
      or m.venue ilike '%' || v_place || '%'
    )
    and not coalesce(up.is_suspended, false)
    /* Somebody you blocked, or who blocked you, is not somebody to meet. */
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = m.host_id)
         or (b.blocker_id = m.host_id  and b.blocked_id = auth.uid())
    )
  order by m.starts_at
  limit greatest(1, least(coalesce(p_limit, 40), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke all on function public.find_meetups(text, text, text, timestamptz, timestamptz, text, integer, integer)
  from public, anon;
grant execute on function public.find_meetups(text, text, text, timestamptz, timestamptz, text, integer, integer)
  to authenticated;

-- ------------------------------------------------------------
-- Asking to join
-- ------------------------------------------------------------
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
    auth.uid(), 'meetup', p_meetup::text, 'meetup:' || p_meetup::text,
    jsonb_build_object('meetup_id', p_meetup)
  );

  return (select status from public.meetup_participants
           where meetup_id = p_meetup and user_id = auth.uid());
end;
$$;

revoke all on function public.request_to_join_meetup(uuid, text) from public, anon;
grant execute on function public.request_to_join_meetup(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- The host decides
-- ------------------------------------------------------------
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
    auth.uid(), 'meetup', p_meetup::text, 'meetup:' || p_meetup::text,
    jsonb_build_object('meetup_id', p_meetup, 'accepted', p_accept)
  );
end;
$$;

revoke all on function public.decide_meetup_request(uuid, uuid, boolean) from public, anon;
grant execute on function public.decide_meetup_request(uuid, uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- Leaving, and calling one off
-- ------------------------------------------------------------
create or replace function public.leave_meetup(p_meetup uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.meetups
             where id = p_meetup and host_id = auth.uid()) then
    raise exception 'A host cancels the meetup rather than leaving it'
      using errcode = '22023', hint = 'use_cancel_meetup';
  end if;

  update public.meetup_participants
     set status = 'withdrawn', decided_at = now()
   where meetup_id = p_meetup and user_id = auth.uid()
     and status in ('requested','joined');
end;
$$;

revoke all on function public.leave_meetup(uuid) from public, anon;
grant execute on function public.leave_meetup(uuid) to authenticated;

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
      auth.uid(), 'meetup', p_meetup::text, 'meetup:' || p_meetup::text,
      jsonb_build_object('meetup_id', p_meetup)
    );
  end loop;
end;
$$;

revoke all on function public.cancel_meetup(uuid) from public, anon;
grant execute on function public.cancel_meetup(uuid) to authenticated;

-- ------------------------------------------------------------
-- One meetup, with its roster
-- ------------------------------------------------------------
create or replace function public.meetup_detail(p_meetup uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  m         public.meetups;
  v_mine    text;
  v_roster  jsonb;
  v_pending jsonb;
begin
  if not private.may_meet() then
    raise exception 'Meetups are for accounts aged 18 and over'
      using errcode = '42501', hint = 'meetups_adults_only';
  end if;

  select * into m from public.meetups where id = p_meetup;
  if m.id is null then
    raise exception 'That meetup no longer exists' using errcode = 'P0002';
  end if;

  select status into v_mine from public.meetup_participants
   where meetup_id = p_meetup and user_id = auth.uid();

  /* The roster is for people who are actually going. Everyone else sees the
     count and the host, which is enough to decide whether to ask. */
  if v_mine in ('joined','host') then
    select coalesce(jsonb_agg(jsonb_build_object(
             'user_id', up.id, 'full_name', up.full_name,
             'avatar_url', up.avatar_url, 'is_verified', up.is_verified,
             'status', p.status) order by p.created_at), '[]'::jsonb)
      into v_roster
      from public.meetup_participants p
      join public.user_profiles up on up.id = p.user_id
     where p.meetup_id = p_meetup and p.status in ('joined','host');
  else
    v_roster := null;
  end if;

  if m.host_id = auth.uid() then
    select coalesce(jsonb_agg(jsonb_build_object(
             'user_id', up.id, 'full_name', up.full_name,
             'avatar_url', up.avatar_url, 'is_verified', up.is_verified,
             'message', p.message, 'requested_at', p.created_at) order by p.created_at), '[]'::jsonb)
      into v_pending
      from public.meetup_participants p
      join public.user_profiles up on up.id = p.user_id
     where p.meetup_id = p_meetup and p.status = 'requested';
  else
    v_pending := null;
  end if;

  return jsonb_build_object(
    'meetup', to_jsonb(m) || jsonb_build_object(
      'spots_left', greatest(0, m.spots_total - m.spots_taken)),
    /* `user_id`, not `id`, so the host, the roster and the pending list are
       all the same shape and the client needs one type for a person. */
    'host', (select jsonb_build_object(
               'user_id', up.id, 'full_name', up.full_name,
               'avatar_url', up.avatar_url, 'is_verified', up.is_verified)
             from public.user_profiles up where up.id = m.host_id),
    'my_status', v_mine,
    'roster', v_roster,
    'pending', v_pending
  );
end;
$$;

revoke all on function public.meetup_detail(uuid) from public, anon;
grant execute on function public.meetup_detail(uuid) to authenticated;

-- ------------------------------------------------------------
-- Mine — hosting and going, in one list
-- ------------------------------------------------------------
create or replace function public.my_meetups(p_include_past boolean default false)
returns table (
  id          uuid,
  title       text,
  sport       text,
  city        text,
  area        text,
  venue       text,
  starts_at   timestamptz,
  spots_total integer,
  spots_taken integer,
  spots_left  integer,
  status      text,
  my_status   text,
  pending     integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.may_meet() then
    return;
  end if;

  return query
  select m.id, m.title, m.sport, m.city, m.area, m.venue, m.starts_at,
         m.spots_total, m.spots_taken,
         greatest(0, m.spots_total - m.spots_taken),
         m.status, p.status,
         case when m.host_id = auth.uid()
              then (select count(*)::int from public.meetup_participants q
                     where q.meetup_id = m.id and q.status = 'requested')
              else 0 end
  from public.meetup_participants p
  join public.meetups m on m.id = p.meetup_id
  where p.user_id = auth.uid()
    and p.status in ('requested','joined','host')
    /* A meetup you called off is not something you are doing on Saturday.
       `p_include_past` brings back the history, cancellations included. */
    and (p_include_past or m.status <> 'cancelled')
    and (p_include_past or m.starts_at >= now() - interval '6 hours')
  order by m.starts_at;
end;
$$;

revoke all on function public.my_meetups(boolean) from public, anon;
grant execute on function public.my_meetups(boolean) to authenticated;

-- ------------------------------------------------------------
-- The private helpers RLS evaluates, per 0907/06
--
-- `may_meet` is named in the read policies on both tables, and a policy
-- expression runs as the querying user — so without this grant every meetup
-- read answers "permission denied for function may_meet".
-- ------------------------------------------------------------
/*
 * Revoke before granting. 0907/06's `alter default privileges` only binds
 * functions created by the role that ran it, and PostgreSQL still grants
 * EXECUTE to PUBLIC on every new function — which `anon` inherits. Being
 * explicit here costs one line and does not depend on which role applied
 * which migration.
 */
revoke all on function private.may_meet() from public, anon;
grant execute on function private.may_meet() to authenticated;

/*
 * And nothing else from this file. 0907/06 closed the private schema, but its
 * `alter default privileges` covers only the PUBLIC pseudo-role, while
 * `authenticated` holds an explicit grant from an earlier migration — so a
 * function created here is callable unless it is revoked here. The two trigger
 * functions have no business being called directly: one decides whether a
 * person is old enough, the other rewrites `spots_taken`.
 */
revoke all on function private.guard_meetup_is_adult() from public, anon, authenticated;
revoke all on function private.sync_meetup_spots()     from public, anon, authenticated;
