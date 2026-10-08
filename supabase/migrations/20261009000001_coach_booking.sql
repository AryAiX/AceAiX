-- ============================================================
-- Booking a coach
--
-- A coach — strength and conditioning, tennis, goalkeeping, anything — says
-- they are taking students, lists what they offer (a one-to-one session, a
-- consultation, a class), and opens times in a calendar. An athlete finds the
-- coach, sees the free places and books one. The coach sees every booking in
-- their own calendar.
--
--   coaching_settings   "I am taking students", and one line about it
--   coaching_services   what can be booked: kind, length, places, price, where
--   coaching_slots      when: one row per bookable time
--   coaching_bookings   who: one row per person per slot
--
-- Where: the coach names the place (`fixed`), runs it online (`online`), or
-- leaves it to the athlete (`flexible`), who then says where when booking.
--
-- A booking is confirmed at once: the calendar is the coach's standing yes.
-- Either side can cancel. No money moves through AceAiX; the price is shown so
-- nobody is surprised, and is paid to the coach directly.
--
-- Safety, in one place:
--
--   * A minor can book only a VERIFIED coach, and only while a guardian's
--     consent carries the new `bookings` scope. Meeting an adult in person is
--     a bigger step than a message, so it gets its own box.
--   * Guardians who hold an account are told about every booking and every
--     cancellation, and can cancel for the minor.
--   * Other people see how many places are left in a slot — never who took
--     them. Names are for the coach, the athlete and the guardian.
--   * A block in either direction hides the calendar and refuses the booking.
--   * Nothing is written by a client; every table refuses direct writes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. A sixth guardian scope
-- ------------------------------------------------------------
alter table public.guardian_consents
  add column if not exists allow_bookings boolean not null default false;

grant select (allow_bookings) on public.guardian_consents to authenticated;

create or replace function private.has_guardian_consent(p_user uuid, p_scope text default 'messaging')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.guardian_consents g
    where g.minor_user_id = p_user
      and g.status = 'granted'
      and case p_scope
            when 'messaging'   then g.allow_messaging
            when 'discovery'   then g.allow_discovery
            when 'media'       then g.allow_media
            when 'assessments' then g.allow_assessments
            when 'sponsorship' then g.allow_sponsorship
            when 'bookings'    then g.allow_bookings
            else true
          end
  );
$$;

drop function if exists public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean);

create or replace function public.confirm_guardian_consent(
  p_token             text,
  p_allow_discovery   boolean default true,
  p_allow_messaging   boolean default true,
  p_allow_media       boolean default true,
  p_allow_assessments boolean default false,
  p_allow_sponsorship boolean default false,
  p_allow_bookings    boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.guardian_consents;
begin
  select * into v_row from public.guardian_consents
  where token = p_token and status = 'pending';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_used_token');
  end if;
  if v_row.token_expires_at < now() then
    update public.guardian_consents set status = 'expired', updated_at = now()
    where id = v_row.id;
    return jsonb_build_object('ok', false, 'error', 'token_expired');
  end if;

  update public.guardian_consents
     set status = 'expired', updated_at = now()
   where minor_user_id = v_row.minor_user_id
     and status = 'granted'
     and id <> v_row.id
     and lower(guardian_email) = lower(v_row.guardian_email);

  update public.guardian_consents
  set status = 'granted',
      granted_at = now(),
      allow_discovery   = coalesce(p_allow_discovery, true),
      allow_messaging   = coalesce(p_allow_messaging, true),
      allow_media       = coalesce(p_allow_media, true),
      allow_assessments = coalesce(p_allow_assessments, false),
      allow_sponsorship = coalesce(p_allow_sponsorship, false),
      allow_bookings    = coalesce(p_allow_bookings, false),
      updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'minor_user_id', v_row.minor_user_id,
    'allow_discovery', v_row.allow_discovery,
    'allow_messaging', v_row.allow_messaging,
    'allow_assessments', v_row.allow_assessments,
    'allow_sponsorship', v_row.allow_sponsorship,
    'allow_bookings', v_row.allow_bookings
  );
end;
$$;

revoke all on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean, boolean)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 2. Tables
-- ------------------------------------------------------------
create table if not exists public.coaching_settings (
  user_id    uuid primary key references public.user_profiles(id) on delete cascade,
  accepting  boolean not null default false,
  headline   text check (headline is null or length(headline) <= 140),
  updated_at timestamptz not null default now()
);
alter table public.coaching_settings enable row level security;

create table if not exists public.coaching_services (
  id               uuid primary key default gen_random_uuid(),
  coach_user_id    uuid not null references public.user_profiles(id) on delete cascade,
  kind             text not null check (kind in ('session', 'consultation', 'class')),
  title            text not null check (length(btrim(title)) between 3 and 80),
  description      text check (description is null or length(description) <= 600),
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  /* How many people one slot takes. A session or a consultation is one person. */
  capacity         integer not null default 1 check (capacity between 1 and 100),
  price            integer check (price is null or price >= 0),
  currency         text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  location_mode    text not null default 'fixed' check (location_mode in ('fixed', 'flexible', 'online')),
  location         text check (location is null or length(location) <= 160),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (kind = 'class' or capacity = 1),
  check (location_mode <> 'fixed' or length(btrim(coalesce(location, ''))) >= 3)
);
alter table public.coaching_services enable row level security;
create index if not exists idx_coaching_services_coach on public.coaching_services (coach_user_id) where is_active;

create table if not exists public.coaching_slots (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references public.coaching_services(id) on delete cascade,
  coach_user_id uuid not null references public.user_profiles(id) on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  capacity      integer not null check (capacity between 1 and 100),
  status        text not null default 'open' check (status in ('open', 'cancelled')),
  created_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);
alter table public.coaching_slots enable row level security;
create index if not exists idx_coaching_slots_coach_time on public.coaching_slots (coach_user_id, starts_at);
create index if not exists idx_coaching_slots_service on public.coaching_slots (service_id, starts_at);

create table if not exists public.coaching_bookings (
  id              uuid primary key default gen_random_uuid(),
  slot_id         uuid not null references public.coaching_slots(id) on delete cascade,
  service_id      uuid not null references public.coaching_services(id) on delete cascade,
  coach_user_id   uuid not null references public.user_profiles(id) on delete cascade,
  athlete_user_id uuid not null references public.user_profiles(id) on delete cascade,
  status          text not null default 'booked' check (status in ('booked', 'cancelled')),
  cancelled_by    text check (cancelled_by is null or cancelled_by in ('athlete', 'coach', 'guardian')),
  note            text check (note is null or length(note) <= 400),
  /* Where it happens, fixed at booking time: the coach's place, "online", or
     the place the athlete named for a flexible service. */
  location        text check (location is null or length(location) <= 160),
  created_at      timestamptz not null default now(),
  cancelled_at    timestamptz
);
alter table public.coaching_bookings enable row level security;
create unique index if not exists uq_coaching_bookings_live
  on public.coaching_bookings (slot_id, athlete_user_id) where status = 'booked';
create index if not exists idx_coaching_bookings_athlete on public.coaching_bookings (athlete_user_id, created_at desc);
create index if not exists idx_coaching_bookings_coach on public.coaching_bookings (coach_user_id, created_at desc);

-- ------------------------------------------------------------
-- 3. Row-level security: read your own; the rest goes through an RPC
-- ------------------------------------------------------------
revoke insert, update, delete on public.coaching_settings, public.coaching_services,
                                 public.coaching_slots, public.coaching_bookings from authenticated, anon;
revoke select on public.coaching_settings, public.coaching_services,
                 public.coaching_slots, public.coaching_bookings from anon;
grant select on public.coaching_settings, public.coaching_services,
                public.coaching_slots, public.coaching_bookings to authenticated;

drop policy if exists coaching_settings_select on public.coaching_settings;
create policy coaching_settings_select on public.coaching_settings
for select to authenticated
using (user_id = auth.uid() or private.is_admin());

drop policy if exists coaching_services_select on public.coaching_services;
create policy coaching_services_select on public.coaching_services
for select to authenticated
using (coach_user_id = auth.uid() or private.is_admin());

drop policy if exists coaching_slots_select on public.coaching_slots;
create policy coaching_slots_select on public.coaching_slots
for select to authenticated
using (coach_user_id = auth.uid() or private.is_admin());

drop policy if exists coaching_bookings_select on public.coaching_bookings;
create policy coaching_bookings_select on public.coaching_bookings
for select to authenticated
using (
  coach_user_id = auth.uid()
  or athlete_user_id = auth.uid()
  or private.is_admin()
  or exists (
    select 1 from public.guardian_consents g
    where g.minor_user_id = coaching_bookings.athlete_user_id
      and g.guardian_user_id = auth.uid()
      and g.status = 'granted'
  )
);

-- ------------------------------------------------------------
-- 4. Private helpers
-- ------------------------------------------------------------
/* The caller, if they are a coach who may run a calendar. */
create or replace function private.require_coach()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_me public.user_profiles;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_me.role <> 'coach' or v_me.is_suspended then
    raise exception 'Only a coach can do this' using errcode = '42501', hint = 'coach_only';
  end if;
  if v_me.is_minor then
    raise exception 'Coaching bookings are for adult coaches' using errcode = '42501', hint = 'coach_only';
  end if;
end;
$$;

/* Why the caller cannot book this coach — or 'ok'. One word the client can
   branch on, and the same check the booking itself runs. */
create or replace function private.coaching_gate(p_coach uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me    public.user_profiles;
  v_coach public.user_profiles;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then return 'not_signed_in'; end if;
  select * into v_coach from public.user_profiles where id = p_coach;
  if not found or v_coach.role <> 'coach' or v_coach.is_suspended
     or private.users_are_blocked(v_me.id, p_coach) then
    return 'coach_unavailable';
  end if;
  if v_me.id = p_coach then return 'own_calendar'; end if;
  if v_me.is_suspended then return 'coach_unavailable'; end if;
  if not coalesce((select accepting from public.coaching_settings where user_id = p_coach), false) then
    return 'coach_not_accepting';
  end if;
  if v_me.is_minor then
    if not v_coach.is_verified then return 'minor_needs_verified_coach'; end if;
    if not private.has_guardian_consent(v_me.id, 'bookings') then return 'guardian_consent_required'; end if;
  end if;
  return 'ok';
end;
$$;

create or replace function private.coaching_notify(
  p_user uuid, p_type text, p_title text, p_actor uuid, p_booking uuid, p_athlete uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_guardian uuid;
begin
  if p_user is not null then
    perform private.notify(p_user, 'opportunity', p_type, p_title, null, p_actor,
                           'coaching', p_booking::text, null, jsonb_build_object('booking_id', p_booking));
  end if;
  /* Guardians of a minor hear about it too, whoever acted. */
  if exists (select 1 from public.user_profiles where id = p_athlete and is_minor) then
    for v_guardian in
      select distinct g.guardian_user_id from public.guardian_consents g
      where g.minor_user_id = p_athlete and g.status = 'granted' and g.guardian_user_id is not null
    loop
      perform private.notify(v_guardian, 'opportunity', p_type, p_title, null, p_actor,
                             'coaching', p_booking::text, null,
                             jsonb_build_object('booking_id', p_booking, 'minor_user_id', p_athlete));
    end loop;
  end if;
end;
$$;

revoke all on function private.require_coach()       from public, anon, authenticated;
revoke all on function private.coaching_gate(uuid)   from public, anon, authenticated;
revoke all on function private.coaching_notify(uuid, text, text, uuid, uuid, uuid)
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- 5. The coach's side
-- ------------------------------------------------------------
create or replace function public.set_coaching_status(p_accepting boolean, p_headline text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.require_coach();
  if length(coalesce(p_headline, '')) > 140 then
    raise exception 'Headline too long' using errcode = '22023';
  end if;
  insert into public.coaching_settings (user_id, accepting, headline, updated_at)
  values (auth.uid(), coalesce(p_accepting, false), nullif(btrim(p_headline), ''), now())
  on conflict (user_id) do update
    set accepting = excluded.accepting, headline = excluded.headline, updated_at = now();
end;
$$;

create or replace function public.save_coaching_service(p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id       uuid;
  v_kind     text := coalesce(p ->> 'kind', 'session');
  v_mode     text := coalesce(p ->> 'location_mode', 'fixed');
  v_capacity integer := coalesce(nullif(p ->> 'capacity', '')::integer, 1);
  v_location text := nullif(btrim(p ->> 'location'), '');
begin
  perform private.require_coach();
  if v_kind not in ('session', 'consultation', 'class') then
    raise exception 'Unknown kind' using errcode = '22023';
  end if;
  if v_mode not in ('fixed', 'flexible', 'online') then
    raise exception 'Unknown location mode' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p ->> 'title', ''))) < 3 then
    raise exception 'Give it a title' using errcode = '22023', hint = 'coaching_title';
  end if;
  if v_mode = 'fixed' and length(coalesce(v_location, '')) < 3 then
    raise exception 'Say where it happens' using errcode = '22023', hint = 'coaching_location_required';
  end if;
  /* One-to-one is one-to-one, whatever the form sent. */
  if v_kind <> 'class' then v_capacity := 1; end if;
  if v_mode <> 'fixed' then v_location := null; end if;

  if p_id is null then
    if (select count(*) from public.coaching_services
        where coach_user_id = auth.uid() and is_active) >= 12 then
      raise exception 'Twelve services at a time' using errcode = '22023', hint = 'coaching_service_limit';
    end if;
    insert into public.coaching_services
      (coach_user_id, kind, title, description, duration_minutes, capacity, price, currency, location_mode, location)
    values (
      auth.uid(), v_kind, btrim(p ->> 'title'), nullif(btrim(p ->> 'description'), ''),
      coalesce(nullif(p ->> 'duration_minutes', '')::integer, 60), v_capacity,
      nullif(p ->> 'price', '')::integer,
      coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      v_mode, v_location
    )
    returning id into v_id;
  else
    update public.coaching_services set
      kind = v_kind,
      title = btrim(p ->> 'title'),
      description = nullif(btrim(p ->> 'description'), ''),
      duration_minutes = coalesce(nullif(p ->> 'duration_minutes', '')::integer, 60),
      capacity = v_capacity,
      price = nullif(p ->> 'price', '')::integer,
      currency = coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      location_mode = v_mode,
      location = v_location,
      updated_at = now()
    where id = p_id and coach_user_id = auth.uid()
    returning id into v_id;
    if v_id is null then
      raise exception 'Service not found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

/* Retiring a service keeps what is already booked; it only stops new times
   being offered. Open slots with nobody in them are cancelled. */
create or replace function public.set_coaching_service_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.require_coach();
  update public.coaching_services set is_active = coalesce(p_active, false), updated_at = now()
  where id = p_id and coach_user_id = auth.uid();
  if not found then
    raise exception 'Service not found' using errcode = 'P0002';
  end if;
  if not coalesce(p_active, false) then
    update public.coaching_slots s set status = 'cancelled'
    where s.service_id = p_id and s.status = 'open' and s.starts_at > now()
      and not exists (select 1 from public.coaching_bookings b where b.slot_id = s.id and b.status = 'booked');
  end if;
end;
$$;

/* Open times for a service. Each start becomes one slot of the service's
   length. A coach cannot be in two places: a start that overlaps one of their
   own open slots is skipped, and the count that were added is returned. */
create or replace function public.add_coaching_slots(p_service uuid, p_starts timestamptz[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_service public.coaching_services;
  v_start   timestamptz;
  v_end     timestamptz;
  v_added   integer := 0;
begin
  perform private.require_coach();
  select * into v_service from public.coaching_services
  where id = p_service and coach_user_id = auth.uid() and is_active;
  if not found then
    raise exception 'Service not found' using errcode = 'P0002';
  end if;
  if coalesce(array_length(p_starts, 1), 0) = 0 then
    return 0;
  end if;
  if array_length(p_starts, 1) > 120 then
    raise exception 'Too many times at once' using errcode = '22023', hint = 'coaching_slot_limit';
  end if;

  foreach v_start in array p_starts loop
    v_end := v_start + make_interval(mins => v_service.duration_minutes);
    continue when v_start is null or v_start <= now() or v_start > now() + interval '180 days';
    continue when exists (
      select 1 from public.coaching_slots s
      where s.coach_user_id = auth.uid() and s.status = 'open'
        and tstzrange(s.starts_at, s.ends_at) && tstzrange(v_start, v_end)
    );
    insert into public.coaching_slots (service_id, coach_user_id, starts_at, ends_at, capacity)
    values (p_service, auth.uid(), v_start, v_end, v_service.capacity);
    v_added := v_added + 1;
  end loop;
  return v_added;
end;
$$;

create or replace function public.cancel_coaching_slot(p_slot uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slot    public.coaching_slots;
  v_booking record;
  v_name    text;
begin
  perform private.require_coach();
  select * into v_slot from public.coaching_slots
  where id = p_slot and coach_user_id = auth.uid() for update;
  if not found then
    raise exception 'Slot not found' using errcode = 'P0002';
  end if;
  if v_slot.status = 'cancelled' then return; end if;

  update public.coaching_slots set status = 'cancelled' where id = p_slot;
  select coalesce(full_name, 'Your coach') into v_name from public.user_profiles where id = auth.uid();

  for v_booking in
    update public.coaching_bookings
       set status = 'cancelled', cancelled_by = 'coach', cancelled_at = now()
     where slot_id = p_slot and status = 'booked'
    returning id, athlete_user_id
  loop
    perform private.coaching_notify(v_booking.athlete_user_id, 'coaching_cancelled',
      v_name || ' cancelled the session on ' || to_char(v_slot.starts_at at time zone 'UTC', 'DD Mon'),
      auth.uid(), v_booking.id, v_booking.athlete_user_id);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 6. The athlete's side
-- ------------------------------------------------------------
/* Everything needed to book one coach: what they offer and when. */
create or replace function public.coach_booking_page(p_coach uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_gate  text := private.coaching_gate(p_coach);
  v_coach public.user_profiles;
  v_set   public.coaching_settings;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_gate = 'coach_unavailable' then
    return null;
  end if;
  select * into v_coach from public.user_profiles where id = p_coach;
  select * into v_set from public.coaching_settings where user_id = p_coach;

  return jsonb_build_object(
    'coach', jsonb_build_object(
      'id', v_coach.id, 'full_name', v_coach.full_name, 'avatar_url', v_coach.avatar_url,
      'is_verified', v_coach.is_verified,
      'accepting', coalesce(v_set.accepting, false),
      'headline', v_set.headline),
    'gate', v_gate,
    /* A coach who is not taking students shows no calendar. */
    'services', case when coalesce(v_set.accepting, false) or p_coach = auth.uid() then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'kind', s.kind, 'title', s.title, 'description', s.description,
               'duration_minutes', s.duration_minutes, 'capacity', s.capacity, 'price', s.price,
               'currency', s.currency, 'location_mode', s.location_mode, 'location', s.location)
             order by s.created_at)
      from public.coaching_services s
      where s.coach_user_id = p_coach and s.is_active), '[]'::jsonb) else '[]'::jsonb end,
    'slots', case when coalesce(v_set.accepting, false) or p_coach = auth.uid() then coalesce((
      select jsonb_agg(to_jsonb(x) order by x.starts_at)
      from (
        select sl.id, sl.service_id, sl.starts_at, sl.ends_at, sl.capacity,
               greatest(0, sl.capacity - (select count(*) from public.coaching_bookings b
                                          where b.slot_id = sl.id and b.status = 'booked'))::integer as spots_left,
               (select b.id from public.coaching_bookings b
                where b.slot_id = sl.id and b.athlete_user_id = auth.uid() and b.status = 'booked') as my_booking_id
        from public.coaching_slots sl
        join public.coaching_services s on s.id = sl.service_id and s.is_active
        where sl.coach_user_id = p_coach and sl.status = 'open'
          and sl.starts_at > now() and sl.starts_at < now() + interval '90 days'
        order by sl.starts_at
        limit 400
      ) x), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

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

create or replace function public.cancel_coaching_booking(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_b     public.coaching_bookings;
  v_by    text;
  v_name  text;
  v_title text;
begin
  select * into v_b from public.coaching_bookings where id = p_booking for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  v_by := case
    when auth.uid() = v_b.athlete_user_id then 'athlete'
    when auth.uid() = v_b.coach_user_id then 'coach'
    when exists (select 1 from public.guardian_consents g
                 where g.minor_user_id = v_b.athlete_user_id and g.guardian_user_id = auth.uid()
                   and g.status = 'granted') then 'guardian'
  end;
  if v_by is null then
    raise exception 'Not yours to cancel' using errcode = '42501';
  end if;
  if v_b.status <> 'booked' then return; end if;

  update public.coaching_bookings
     set status = 'cancelled', cancelled_by = v_by, cancelled_at = now()
   where id = p_booking;

  select coalesce(full_name, 'Someone') into v_name from public.user_profiles where id = auth.uid();
  select title into v_title from public.coaching_services where id = v_b.service_id;
  perform private.coaching_notify(
    case when v_by = 'coach' then v_b.athlete_user_id else v_b.coach_user_id end,
    'coaching_cancelled', v_name || ' cancelled ' || coalesce(v_title, 'a session'),
    auth.uid(), p_booking, v_b.athlete_user_id);
  /* A guardian's cancellation is news to the minor as well. */
  if v_by = 'guardian' then
    perform private.notify(v_b.athlete_user_id, 'opportunity', 'coaching_cancelled',
      v_name || ' cancelled ' || coalesce(v_title, 'a session'), null, auth.uid(),
      'coaching', p_booking::text, null, jsonb_build_object('booking_id', p_booking));
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 7. One read for the coaching screen: my calendar, my bookings
-- ------------------------------------------------------------
create or replace function public.my_coaching()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me  public.user_profiles;
  v_set public.coaching_settings;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_set from public.coaching_settings where user_id = v_me.id;

  return jsonb_build_object(
    'role', v_me.role::text,
    'is_verified', v_me.is_verified,
    'is_minor', coalesce(v_me.is_minor, false),
    'has_bookings_scope', (not coalesce(v_me.is_minor, false)) or private.has_guardian_consent(v_me.id, 'bookings'),
    'accepting', coalesce(v_set.accepting, false),
    'headline', v_set.headline,
    'services', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.is_active desc, x.created_at)
      from (
        select s.id, s.kind, s.title, s.description, s.duration_minutes, s.capacity, s.price, s.currency,
               s.location_mode, s.location, s.is_active, s.created_at,
               (select count(*) from public.coaching_slots sl
                where sl.service_id = s.id and sl.status = 'open' and sl.starts_at > now()) as upcoming_slots
        from public.coaching_services s where s.coach_user_id = v_me.id
      ) x), '[]'::jsonb),
    /* The coach's calendar: a week back, ninety days on, with who is coming. */
    'slots', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.starts_at)
      from (
        select sl.id, sl.service_id, s.title as service_title, s.kind, sl.starts_at, sl.ends_at, sl.capacity,
               s.location_mode, s.location as service_location,
               coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', b.id, 'athlete_user_id', b.athlete_user_id, 'full_name', a.full_name,
                          'avatar_url', a.avatar_url, 'is_minor', coalesce(a.is_minor, false),
                          'note', b.note, 'location', b.location) order by b.created_at)
                 from public.coaching_bookings b
                 join public.user_profiles a on a.id = b.athlete_user_id
                 where b.slot_id = sl.id and b.status = 'booked'), '[]'::jsonb) as bookings
        from public.coaching_slots sl
        join public.coaching_services s on s.id = sl.service_id
        where sl.coach_user_id = v_me.id and sl.status = 'open'
          and sl.starts_at > now() - interval '7 days' and sl.starts_at < now() + interval '90 days'
        order by sl.starts_at
        limit 500
      ) x), '[]'::jsonb),
    /* What I booked — and, for a guardian, what my children booked. */
    'bookings', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.starts_at)
      from (
        select b.id, b.status, b.cancelled_by, b.note, b.location, b.created_at,
               sl.starts_at, sl.ends_at, s.title as service_title, s.kind, s.location_mode,
               s.price, s.currency, s.duration_minutes,
               b.coach_user_id, c.full_name as coach_name, c.avatar_url as coach_avatar,
               c.is_verified as coach_verified,
               b.athlete_user_id, a.full_name as athlete_name,
               (b.athlete_user_id <> v_me.id) as for_child
        from public.coaching_bookings b
        join public.coaching_slots sl on sl.id = b.slot_id
        join public.coaching_services s on s.id = b.service_id
        join public.user_profiles c on c.id = b.coach_user_id
        join public.user_profiles a on a.id = b.athlete_user_id
        where (b.athlete_user_id = v_me.id
               or exists (select 1 from public.guardian_consents g
                          where g.minor_user_id = b.athlete_user_id
                            and g.guardian_user_id = v_me.id and g.status = 'granted'))
          and sl.starts_at > now() - interval '30 days'
        order by sl.starts_at
        limit 200
      ) x), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------
-- 8. Finding a coach who is taking students
-- ------------------------------------------------------------
create or replace function public.bookable_coaches(p_query text default null, p_limit integer default 30)
returns table (
  id            uuid,
  full_name     text,
  avatar_url    text,
  is_verified   boolean,
  city          text,
  country       text,
  specialty     text,
  headline      text,
  kinds         text[],
  price_from    integer,
  currency      text,
  next_slot     timestamptz,
  open_slots    integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    up.id, up.full_name::text, up.avatar_url::text, up.is_verified,
    up.city::text, up.country::text, cp.specialty::text, cs.headline,
    (select coalesce(array_agg(distinct s.kind order by s.kind), '{}')
     from public.coaching_services s where s.coach_user_id = up.id and s.is_active),
    (select min(s.price) from public.coaching_services s
     where s.coach_user_id = up.id and s.is_active and s.price is not null),
    (select s.currency from public.coaching_services s
     where s.coach_user_id = up.id and s.is_active and s.price is not null
     order by s.price limit 1),
    nx.next_slot,
    nx.open_slots
  from public.coaching_settings cs
  join public.user_profiles up on up.id = cs.user_id
  left join public.coach_profiles cp on cp.user_id = up.id
  left join lateral (
    select min(sl.starts_at) as next_slot, count(*)::integer as open_slots
    from public.coaching_slots sl
    join public.coaching_services s on s.id = sl.service_id and s.is_active
    where sl.coach_user_id = up.id and sl.status = 'open' and sl.starts_at > now()
      and sl.capacity > (select count(*) from public.coaching_bookings b
                         where b.slot_id = sl.id and b.status = 'booked')
  ) nx on true
  where auth.uid() is not null
    and cs.accepting
    and up.role = 'coach'
    and not up.is_suspended
    and up.id <> auth.uid()
    and not private.users_are_blocked(auth.uid(), up.id)
    /* A minor is only shown coaches they could actually book. */
    and (up.is_verified or not exists (
          select 1 from public.user_profiles me where me.id = auth.uid() and me.is_minor))
    and (nullif(btrim(p_query), '') is null
         or up.full_name ilike '%' || btrim(p_query) || '%'
         or cp.specialty ilike '%' || btrim(p_query) || '%'
         or cs.headline ilike '%' || btrim(p_query) || '%')
  order by (nx.next_slot is null), nx.next_slot, up.is_verified desc, up.full_name
  limit greatest(1, least(coalesce(p_limit, 30), 60));
$$;

-- ------------------------------------------------------------
-- 9. A minor who loses the scope loses the bookings ahead of them
-- ------------------------------------------------------------
create or replace function private.on_bookings_consent_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_booking record;
begin
  if not private.has_guardian_consent(new.minor_user_id, 'bookings') then
    for v_booking in
      update public.coaching_bookings b
         set status = 'cancelled', cancelled_by = 'guardian', cancelled_at = now()
        from public.coaching_slots sl
       where sl.id = b.slot_id and b.athlete_user_id = new.minor_user_id
         and b.status = 'booked' and sl.starts_at > now()
      returning b.id, b.coach_user_id
    loop
      perform private.notify(v_booking.coach_user_id, 'opportunity', 'coaching_cancelled',
        'A booking was cancelled by a guardian', null, new.minor_user_id,
        'coaching', v_booking.id::text, null, jsonb_build_object('booking_id', v_booking.id));
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function private.on_bookings_consent_change() from public, anon, authenticated;

drop trigger if exists trg_guardian_consents_bookings on public.guardian_consents;
create trigger trg_guardian_consents_bookings
after update of status, allow_bookings on public.guardian_consents
for each row execute function private.on_bookings_consent_change();

-- ------------------------------------------------------------
-- 10. Privileges, by name
-- ------------------------------------------------------------
revoke all on function public.set_coaching_status(boolean, text)           from public, anon;
revoke all on function public.save_coaching_service(uuid, jsonb)           from public, anon;
revoke all on function public.set_coaching_service_active(uuid, boolean)   from public, anon;
revoke all on function public.add_coaching_slots(uuid, timestamptz[])      from public, anon;
revoke all on function public.cancel_coaching_slot(uuid)                   from public, anon;
revoke all on function public.coach_booking_page(uuid)                     from public, anon;
revoke all on function public.book_coaching_slot(uuid, text, text)         from public, anon;
revoke all on function public.cancel_coaching_booking(uuid)                from public, anon;
revoke all on function public.my_coaching()                                from public, anon;
revoke all on function public.bookable_coaches(text, integer)              from public, anon;

grant execute on function public.set_coaching_status(boolean, text)           to authenticated;
grant execute on function public.save_coaching_service(uuid, jsonb)           to authenticated;
grant execute on function public.set_coaching_service_active(uuid, boolean)   to authenticated;
grant execute on function public.add_coaching_slots(uuid, timestamptz[])      to authenticated;
grant execute on function public.cancel_coaching_slot(uuid)                   to authenticated;
grant execute on function public.coach_booking_page(uuid)                     to authenticated;
grant execute on function public.book_coaching_slot(uuid, text, text)         to authenticated;
grant execute on function public.cancel_coaching_booking(uuid)                to authenticated;
grant execute on function public.my_coaching()                                to authenticated;
grant execute on function public.bookable_coaches(text, integer)              to authenticated;
