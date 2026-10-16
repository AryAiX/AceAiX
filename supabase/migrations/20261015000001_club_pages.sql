-- ============================================================
-- 1014/01 — Club and academy pages
--
-- A club or academy account sets up its own page and runs it:
--
--   organizations             + Arabic/local name, CEO, address and map pin,
--                               contacts, socials, facilities, the About story
--   organization_sports       which sports are active, and the categories in
--                               each (U12, U14, Senior, Women, Para …)
--   organization_locations    every branch / ground, one marked primary
--   organization_verification the licence and the document an admin checks
--                               (owner, managers and admins only)
--   organization_members      the page's team: owner, manager, editor,
--                               scorekeeper (+ the older coach/scout/staff)
--   club_broadcasts           an announcement to followers and/or the squad
--   club_events               trials, camps, clinics, tournaments, open days
--   club_event_registrations  who signed up
--   club_seasons / club_squads / club_squad_members
--                             the roster: season → sport → category, players
--                             and coaching staff, optionally linked to the
--                             person's AceAiX profile (they accept the link)
--   club_matches              fixtures, live score, result, live-stream link
--   club_match_events         goals, cards, substitutions, points, notes
--   club_awards               trophies and individual awards
--
-- Posts and stories gain `organization_id`, so a club account's posts appear
-- on its page and in the "Following" feed of everyone who follows the club.
-- Challenges already had `organization_id` (0907/03).
--
-- Who may do what (private.org_can):
--
--   manage   owner, manager        page details, team, broadcasts, verification
--   content  + editor              posts, stories, challenges, events, fixtures,
--                                  squads, awards
--   score    + scorekeeper, coach  live score and match events only
--
-- Safety, in one place:
--
--   * Page team members are adults. Nobody under 18 can be invited.
--   * A club cannot verify itself (the 0904/03 trigger still holds); it can
--     only send its documents back for review.
--   * Broadcasts are one-way announcements, never DMs. They reach followers
--     and linked squad members; minors only when the club is VERIFIED. Three
--     per club per day.
--   * Player names typed by a club for a youth category (U-anything up to 18,
--     "youth", "junior", "kids") are shortened to "First L." for everyone
--     outside the club (coaching staff are adults and keep their names). A linked profile shows in full only if that athlete
--     is visible in discovery anyway. Linking a minor needs the minor to
--     accept and a guardian's discovery consent.
--   * Raw match events (which carry typed names) are readable by the club
--     only; everyone else reads them through club_match_page, which applies
--     the naming rule. The public realtime signal is the club_matches row,
--     which holds no personal data.
--   * A minor can register for a club event only at a VERIFIED club and only
--     with the guardian `bookings` scope (in person, like coach booking).
--     Guardians with accounts are told.
--   * Live streams are links to the big platforms only (allow-list); AceAiX
--     hosts no live video.
--   * Nothing is written by a client directly except posts/stories (as
--     before); every new table refuses direct writes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Organisation details
-- ------------------------------------------------------------
alter table public.organizations
  add column if not exists name_local     varchar(255),
  add column if not exists ceo_name       varchar(150),
  add column if not exists address        varchar(300),
  add column if not exists latitude       numeric(9,6),
  add column if not exists longitude      numeric(9,6),
  add column if not exists contact_email  varchar(255),
  add column if not exists contact_phone  varchar(40),
  add column if not exists socials        jsonb not null default '{}'::jsonb,
  add column if not exists facilities     text[] not null default '{}',
  add column if not exists about_story    text,
  add column if not exists mission        text,
  add column if not exists philosophy     text,
  add column if not exists created_by     uuid references public.user_profiles(id) on delete set null;

alter table public.organizations drop constraint if exists organizations_club_page_lengths;
alter table public.organizations
  add constraint organizations_club_page_lengths check (
    (about_story is null or length(about_story) <= 5000)
    and (mission is null or length(mission) <= 600)
    and (philosophy is null or length(philosophy) <= 1500)
    and (latitude is null or latitude between -90 and 90)
    and (longitude is null or longitude between -180 and 180)
    and cardinality(facilities) <= 20
  ) not valid;

create table if not exists public.organization_sports (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sport           text not null check (length(btrim(sport)) between 2 and 40),
  categories      text[] not null default '{}' check (cardinality(categories) <= 20),
  sort            integer not null default 0,
  primary key (organization_id, sport)
);
alter table public.organization_sports enable row level security;
create index if not exists idx_org_sports_sport on public.organization_sports (sport);

create table if not exists public.organization_locations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label           text check (label is null or length(label) <= 80),
  address         text check (address is null or length(address) <= 300),
  city            text check (city is null or length(city) <= 100),
  country         text check (country is null or length(country) <= 100),
  latitude        numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude       numeric(9,6) check (longitude is null or longitude between -180 and 180),
  is_primary      boolean not null default false,
  created_at      timestamptz not null default now()
);
alter table public.organization_locations enable row level security;
create index if not exists idx_org_locations_org on public.organization_locations (organization_id);
create unique index if not exists uq_org_locations_primary
  on public.organization_locations (organization_id) where is_primary;

create table if not exists public.organization_verification (
  organization_id      uuid primary key references public.organizations(id) on delete cascade,
  license_number       text check (license_number is null or length(license_number) <= 80),
  document_path        text check (document_path is null or length(document_path) <= 500),
  contact_person_name  text check (contact_person_name is null or length(contact_person_name) <= 120),
  contact_person_title text check (contact_person_title is null or length(contact_person_title) <= 120),
  terms_accepted_at    timestamptz,
  submitted_by         uuid references public.user_profiles(id) on delete set null,
  submitted_at         timestamptz,
  review_note          text check (review_note is null or length(review_note) <= 1000),
  updated_at           timestamptz not null default now()
);
alter table public.organization_verification enable row level security;

-- ------------------------------------------------------------
-- 2. The page team
-- ------------------------------------------------------------
alter table public.organization_members drop constraint if exists organization_members_member_role_check;
alter table public.organization_members
  add constraint organization_members_member_role_check
  check (member_role in ('owner','manager','editor','scorekeeper','scout','coach','staff'));

/* The caller's active role on this page, or null. */
create or replace function private.org_role(p_org uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.member_role
  from public.organization_members m
  where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active'
  limit 1;
$$;

create or replace function private.org_can(p_org uuid, p_what text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null or p_org is null then false
    when exists (select 1 from public.user_profiles
                 where id = auth.uid() and coalesce(is_suspended, false)) then false
    when private.is_admin() then true
    else coalesce(private.org_role(p_org) = any (case p_what
      when 'manage'  then array['owner','manager']
      when 'content' then array['owner','manager','editor']
      when 'score'   then array['owner','manager','editor','scorekeeper','coach']
      when 'member'  then array['owner','manager','editor','scorekeeper','scout','coach','staff']
      else array[]::text[] end), false)
  end;
$$;

create or replace function private.require_org(p_org uuid, p_what text)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizations where id = p_org) then
    raise exception 'Club not found' using errcode = 'P0002', hint = 'club_not_found';
  end if;
  if not private.org_can(p_org, p_what) then
    raise exception 'You do not have permission to do this for this club'
      using errcode = '42501', hint = 'club_permission';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 3. Naming rule for rosters, match sheets and awards
-- ------------------------------------------------------------
create or replace function private.is_youth_category(p_category text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when p_category is null then false
    when p_category ~* '(youth|junior|kids|mini|cadet|براعم|ناشئين|شباب)' then true
    when p_category ~* '^\s*u\s*-?\s*[0-9]{1,2}' then
      (substring(p_category from '(?i)^\s*u\s*-?\s*([0-9]{1,2})'))::integer <= 18
    else false
  end;
$$;

/* "Layla Haddad" -> "Layla H." */
create or replace function private.short_person_name(p_name text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when p_name is null or btrim(p_name) = '' then p_name
    when position(' ' in btrim(p_name)) = 0 then btrim(p_name)
    else split_part(btrim(p_name), ' ', 1) || ' '
         || upper(left(regexp_replace(btrim(p_name), '^.*\s', ''), 1)) || '.'
  end;
$$;

/* Whether this user's profile may be shown and linked to the caller. */
create or replace function private.user_publicly_visible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_profiles up
    where up.id = p_user
      and not coalesce(up.is_suspended, false)
      and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false)
           or up.id = auth.uid())
      and not private.users_are_blocked(auth.uid(), up.id)
  );
$$;

-- ------------------------------------------------------------
-- 4. Tables: broadcasts, events, roster, matches, awards
-- ------------------------------------------------------------
create table if not exists public.club_broadcasts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sent_by         uuid references public.user_profiles(id) on delete set null,
  audience        text not null check (audience in ('followers','squad','all')),
  title           text not null check (length(btrim(title)) between 3 and 80),
  body            text not null check (length(btrim(body)) between 3 and 1000),
  recipients      integer not null default 0,
  created_at      timestamptz not null default now()
);
alter table public.club_broadcasts enable row level security;
create index if not exists idx_club_broadcasts_org on public.club_broadcasts (organization_id, created_at desc);

create table if not exists public.club_broadcast_recipients (
  broadcast_id uuid not null references public.club_broadcasts(id) on delete cascade,
  user_id      uuid not null references public.user_profiles(id) on delete cascade,
  primary key (broadcast_id, user_id)
);
alter table public.club_broadcast_recipients enable row level security;
create index if not exists idx_club_broadcast_recipients_user on public.club_broadcast_recipients (user_id);

create table if not exists public.club_events (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  created_by         uuid references public.user_profiles(id) on delete set null,
  kind               text not null default 'trial'
                       check (kind in ('trial','camp','clinic','tournament','open_day','showcase','other')),
  title              text not null check (length(btrim(title)) between 4 and 120),
  description        text check (description is null or length(description) <= 2000),
  sport              text check (sport is null or length(sport) <= 40),
  category           text check (category is null or length(category) <= 30),
  starts_at          timestamptz not null,
  ends_at            timestamptz,
  location           text check (location is null or length(location) <= 200),
  age_min            integer check (age_min is null or age_min between 5 and 60),
  age_max            integer check (age_max is null or age_max between 5 and 60),
  capacity           integer check (capacity is null or capacity between 1 and 5000),
  registration_open  boolean not null default true,
  price              integer check (price is null or price >= 0),
  currency           text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  status             text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  registration_count integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (age_min is null or age_max is null or age_max >= age_min)
);
alter table public.club_events enable row level security;
create index if not exists idx_club_events_org on public.club_events (organization_id, starts_at);

create table if not exists public.club_event_registrations (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.club_events(id) on delete cascade,
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  status     text not null default 'registered' check (status in ('registered','cancelled')),
  note       text check (note is null or length(note) <= 400),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
alter table public.club_event_registrations enable row level security;
create unique index if not exists uq_club_event_registration_live
  on public.club_event_registrations (event_id, user_id) where status = 'registered';
create index if not exists idx_club_event_registrations_user on public.club_event_registrations (user_id, created_at desc);

create table if not exists public.club_seasons (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label           text not null check (length(btrim(label)) between 2 and 20),
  is_current      boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (organization_id, label)
);
alter table public.club_seasons enable row level security;
create unique index if not exists uq_club_seasons_current
  on public.club_seasons (organization_id) where is_current;

create table if not exists public.club_squads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id       uuid not null references public.club_seasons(id) on delete cascade,
  sport           text not null check (length(btrim(sport)) between 2 and 40),
  category        text not null check (length(btrim(category)) between 1 and 30),
  name            text check (name is null or length(name) <= 60),
  created_at      timestamptz not null default now(),
  unique (season_id, sport, category)
);
alter table public.club_squads enable row level security;
create index if not exists idx_club_squads_org on public.club_squads (organization_id, season_id);

create table if not exists public.club_squad_members (
  id              uuid primary key default gen_random_uuid(),
  squad_id        uuid not null references public.club_squads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind            text not null default 'player' check (kind in ('player','staff')),
  display_name    text not null check (length(btrim(display_name)) between 2 and 80),
  user_id         uuid references public.user_profiles(id) on delete set null,
  link_status     text not null default 'none' check (link_status in ('none','invited','accepted','declined')),
  shirt_number    integer check (shirt_number is null or shirt_number between 0 and 999),
  position        text check (position is null or length(position) <= 40),
  staff_role      text check (staff_role is null or staff_role in
                    ('head_coach','assistant_coach','goalkeeper_coach','fitness_coach',
                     'physio','analyst','team_manager','other')),
  sort            integer not null default 0,
  created_at      timestamptz not null default now(),
  check (kind = 'staff' or staff_role is null),
  check (user_id is not null or link_status = 'none')
);
alter table public.club_squad_members enable row level security;
create index if not exists idx_club_squad_members_squad on public.club_squad_members (squad_id, kind, sort);
create index if not exists idx_club_squad_members_user on public.club_squad_members (user_id) where user_id is not null;
create unique index if not exists uq_club_squad_members_user
  on public.club_squad_members (squad_id, user_id) where user_id is not null;

create table if not exists public.club_matches (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  created_by       uuid references public.user_profiles(id) on delete set null,
  sport            text not null check (length(btrim(sport)) between 2 and 40),
  squad_id         uuid references public.club_squads(id) on delete set null,
  category         text check (category is null or length(category) <= 30),
  competition      text check (competition is null or length(competition) <= 120),
  opponent_name    text not null check (length(btrim(opponent_name)) between 2 and 120),
  opponent_org_id  uuid references public.organizations(id) on delete set null,
  is_home          boolean not null default true,
  venue            text check (venue is null or length(venue) <= 200),
  kickoff_at       timestamptz not null,
  status           text not null default 'scheduled'
                     check (status in ('scheduled','live','half_time','finished','postponed','cancelled')),
  our_score        integer not null default 0 check (our_score between 0 and 999),
  their_score      integer not null default 0 check (their_score between 0 and 999),
  period           text check (period is null or length(period) <= 20),
  minute           integer check (minute is null or minute between 0 and 300),
  stream_url       text check (stream_url is null or length(stream_url) <= 500),
  notes            text check (notes is null or length(notes) <= 1000),
  started_at       timestamptz,
  finished_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.club_matches enable row level security;
create index if not exists idx_club_matches_org on public.club_matches (organization_id, kickoff_at desc);
create index if not exists idx_club_matches_live on public.club_matches (status) where status in ('live','half_time');

create table if not exists public.club_match_events (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references public.club_matches(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  minute          integer check (minute is null or minute between 0 and 300),
  kind            text not null check (kind in ('goal','own_goal','penalty_goal','point','yellow_card',
                                                 'red_card','substitution','timeout','period','note')),
  side            text not null default 'us' check (side in ('us','them')),
  points          integer not null default 0 check (points between 0 and 6),
  squad_member_id uuid references public.club_squad_members(id) on delete set null,
  player_name     text check (player_name is null or length(player_name) <= 80),
  detail          text check (detail is null or length(detail) <= 200),
  created_by      uuid references public.user_profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
alter table public.club_match_events enable row level security;
create index if not exists idx_club_match_events_match on public.club_match_events (match_id, created_at);

create table if not exists public.club_awards (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  created_by        uuid references public.user_profiles(id) on delete set null,
  title             text not null check (length(btrim(title)) between 2 and 120),
  competition       text check (competition is null or length(competition) <= 120),
  year              integer check (year is null or year between 1850 and 2100),
  season_label      text check (season_label is null or length(season_label) <= 20),
  sport             text check (sport is null or length(sport) <= 40),
  category          text check (category is null or length(category) <= 30),
  placement         text not null default 'winner'
                      check (placement in ('winner','runner_up','third','finalist','individual','other')),
  recipient_kind    text not null default 'club' check (recipient_kind in ('club','player','coach')),
  recipient_name    text check (recipient_name is null or length(recipient_name) <= 80),
  recipient_user_id uuid references public.user_profiles(id) on delete set null,
  image_url         text check (image_url is null or length(image_url) <= 1000),
  description       text check (description is null or length(description) <= 600),
  created_at        timestamptz not null default now()
);
alter table public.club_awards enable row level security;
create index if not exists idx_club_awards_org on public.club_awards (organization_id, year desc nulls last);

-- ------------------------------------------------------------
-- 5. Row-level security. Public facts are readable; anything carrying a
--    typed person's name or a contact is read through an RPC.
-- ------------------------------------------------------------
revoke insert, update, delete on
  public.organization_sports, public.organization_locations, public.organization_verification,
  public.club_broadcasts, public.club_broadcast_recipients, public.club_events,
  public.club_event_registrations, public.club_seasons, public.club_squads,
  public.club_squad_members, public.club_matches, public.club_match_events, public.club_awards
from authenticated, anon;

grant select on public.organization_sports, public.organization_locations,
                public.club_events, public.club_seasons, public.club_squads, public.club_matches
  to anon, authenticated;
grant select on public.organization_verification, public.club_broadcasts,
                public.club_broadcast_recipients, public.club_event_registrations,
                public.club_squad_members, public.club_match_events, public.club_awards
  to authenticated;

drop policy if exists org_sports_read on public.organization_sports;
create policy org_sports_read on public.organization_sports for select to anon, authenticated using (true);
drop policy if exists org_locations_read on public.organization_locations;
create policy org_locations_read on public.organization_locations for select to anon, authenticated using (true);
drop policy if exists club_events_read on public.club_events;
create policy club_events_read on public.club_events for select to anon, authenticated using (true);
drop policy if exists club_seasons_read on public.club_seasons;
create policy club_seasons_read on public.club_seasons for select to anon, authenticated using (true);
drop policy if exists club_squads_read on public.club_squads;
create policy club_squads_read on public.club_squads for select to anon, authenticated using (true);
drop policy if exists club_matches_read on public.club_matches;
create policy club_matches_read on public.club_matches for select to anon, authenticated using (true);

drop policy if exists org_verification_read on public.organization_verification;
create policy org_verification_read on public.organization_verification for select to authenticated
  using (private.org_can(organization_id, 'manage'));

drop policy if exists club_broadcasts_read on public.club_broadcasts;
create policy club_broadcasts_read on public.club_broadcasts for select to authenticated
  using (private.org_can(organization_id, 'member')
         or exists (select 1 from public.club_broadcast_recipients r
                    where r.broadcast_id = club_broadcasts.id and r.user_id = auth.uid()));
drop policy if exists club_broadcast_recipients_read on public.club_broadcast_recipients;
create policy club_broadcast_recipients_read on public.club_broadcast_recipients for select to authenticated
  using (user_id = auth.uid());

drop policy if exists club_event_registrations_read on public.club_event_registrations;
create policy club_event_registrations_read on public.club_event_registrations for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.club_events e
               where e.id = club_event_registrations.event_id
                 and private.org_can(e.organization_id, 'content'))
    or exists (select 1 from public.guardian_consents g
               where g.minor_user_id = club_event_registrations.user_id
                 and g.guardian_user_id = auth.uid() and g.status = 'granted')
  );

drop policy if exists club_squad_members_read on public.club_squad_members;
create policy club_squad_members_read on public.club_squad_members for select to authenticated
  using (user_id = auth.uid() or private.org_can(organization_id, 'member'));

drop policy if exists club_match_events_read on public.club_match_events;
create policy club_match_events_read on public.club_match_events for select to authenticated
  using (private.org_can(organization_id, 'member'));

drop policy if exists club_awards_read on public.club_awards;
create policy club_awards_read on public.club_awards for select to authenticated
  using (private.org_can(organization_id, 'member'));

/* Realtime: the scoreboard row is the public signal. Events stay private
   (above) and are re-read through club_match_page. */
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public'
                       and tablename = 'club_matches') then
    execute 'alter publication supabase_realtime add table public.club_matches';
  end if;
end $$;

-- ------------------------------------------------------------
-- 6. Notifications: one more channel the person can switch off
-- ------------------------------------------------------------
alter table public.notification_preferences
  add column if not exists club_updates boolean not null default true;

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
    else true
  end;
end;
$$;

/* Everyone who should hear about something a club did: its followers, and
   (optionally) the people linked to its current squads. Minors only when the
   club is verified. Blocks are applied by private.notify. */
create or replace function private.club_audience(p_org uuid, p_audience text)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with candidates as (
    select f.follower_id as uid from public.organization_follows f
    where f.organization_id = p_org and p_audience in ('followers','all')
    union
    select m.user_id from public.club_squad_members m
    join public.club_squads s on s.id = m.squad_id
    join public.club_seasons se on se.id = s.season_id and se.is_current
    where m.organization_id = p_org and m.user_id is not null and m.link_status = 'accepted'
      and p_audience in ('squad','all')
  )
  select c.uid
  from candidates c
  join public.user_profiles up on up.id = c.uid
  join public.organizations o on o.id = p_org
  where not coalesce(up.is_suspended, false)
    and (not coalesce(up.is_minor, false) or o.is_verified)
    and not exists (select 1 from public.organization_members om
                    where om.organization_id = p_org and om.user_id = c.uid and om.status = 'active');
$$;

create or replace function private.club_notify_audience(
  p_org uuid, p_audience text, p_type text, p_title text, p_body text,
  p_entity_type text, p_entity_id text, p_group_key text, p_data jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid; v_count integer := 0;
begin
  for v_user in select user_id from private.club_audience(p_org, p_audience) loop
    perform private.notify(v_user, 'club', p_type, p_title, p_body, auth.uid(),
                           p_entity_type, p_entity_id,
                           case when p_group_key is null then null else p_group_key end,
                           coalesce(p_data, '{}'::jsonb) || jsonb_build_object('organization_id', p_org));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

/* Tell the people who run the page (owners and managers). */
create or replace function private.club_notify_managers(
  p_org uuid, p_type text, p_title text, p_body text, p_entity_type text, p_entity_id text, p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid;
begin
  for v_user in
    select m.user_id from public.organization_members m
    where m.organization_id = p_org and m.status = 'active' and m.member_role in ('owner','manager')
  loop
    perform private.notify(v_user, 'club', p_type, p_title, p_body, auth.uid(),
                           p_entity_type, p_entity_id, null,
                           coalesce(p_data, '{}'::jsonb) || jsonb_build_object('organization_id', p_org));
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 7. Posts and stories belong to a club page
-- ------------------------------------------------------------
alter table public.posts
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
create index if not exists idx_posts_organization on public.posts (organization_id, created_at desc)
  where organization_id is not null;

alter table public.stories
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
create index if not exists idx_stories_organization on public.stories (organization_id, expires_at desc)
  where organization_id is not null;

/* A club account's own posts and stories are the page's. Anyone else can
   post for a page only if they hold a content role on it. */
create or replace function private.tag_club_content()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_role text;
begin
  if new.organization_id is not null then
    if tg_op = 'UPDATE' and new.organization_id is not distinct from old.organization_id then
      return new;
    end if;
    if auth.role() = 'service_role' or private.org_can(new.organization_id, 'content') then
      return new;
    end if;
    raise exception 'You cannot post for this club' using errcode = '42501', hint = 'club_permission';
  end if;

  if tg_op = 'INSERT' then
    select role::text into v_role from public.user_profiles where id = new.author_id;
    if v_role = 'club' then
      select m.organization_id into new.organization_id
      from public.organization_members m
      where m.user_id = new.author_id and m.status = 'active'
        and m.member_role in ('owner','manager','editor')
      order by case m.member_role when 'owner' then 0 when 'manager' then 1 else 2 end, m.created_at
      limit 1;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_posts_club_tag on public.posts;
create trigger trg_posts_club_tag before insert or update of organization_id on public.posts
  for each row execute function private.tag_club_content();
drop trigger if exists trg_stories_club_tag on public.stories;
create trigger trg_stories_club_tag before insert or update of organization_id on public.stories
  for each row execute function private.tag_club_content();

-- The "Following" feed now also carries the pages you follow.
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
            where f.follower_id = v_viewer and f.following_id = p.author_id)
      or (p.organization_id is not null and exists (
            select 1 from public.organization_follows of2
            where of2.follower_id = v_viewer and of2.organization_id = p.organization_id)),
    p.created_at
  from public.posts p
  join public.user_profiles up on up.id = p.author_id
  left join public.athlete_profiles ap on ap.user_id = p.author_id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where
    not p.is_hidden
    and p.moderation_state = 'visible'
    and not up.is_suspended
    and (
      not coalesce(up.is_minor, false)
      or coalesce(up.is_discoverable, false)
      or p.author_id = v_viewer
      or private.is_admin()
      or exists (
        select 1 from public.guardian_consents g
        where g.minor_user_id = p.author_id
          and g.guardian_user_id = v_viewer
          and g.status = 'granted'
      )
    )
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = v_viewer and b.blocked_id = p.author_id)
         or (b.blocker_id = p.author_id and b.blocked_id = v_viewer)
    )
    and (
      p.author_id = v_viewer
      or p.audience = 'public'
      or (p.audience = 'followers' and (
            exists (select 1 from public.follows f
                    where f.follower_id = v_viewer and f.following_id = p.author_id)
            or (p.organization_id is not null and exists (
                    select 1 from public.organization_follows of3
                    where of3.follower_id = v_viewer and of3.organization_id = p.organization_id))))
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
      or (p.organization_id is not null and exists (
            select 1 from public.organization_follows of4
            where of4.follower_id = v_viewer and of4.organization_id = p.organization_id))
    )
    and (p_scope <> 'sport' or p_sport is null or ap.sport ilike p_sport)
  order by
    /* "For you" gently favours people and pages you follow and higher-scoring
       athletes, but stays chronological enough that the feed still feels live. */
    case when p_scope = 'for_you' then
      p.created_at
        + (case when exists (select 1 from public.follows f
                             where f.follower_id = v_viewer and f.following_id = p.author_id)
                  or (p.organization_id is not null and exists (
                        select 1 from public.organization_follows of5
                        where of5.follower_id = v_viewer and of5.organization_id = p.organization_id))
                then interval '12 hours' else interval '0' end)
        + (coalesce(ts.overall, 0) / 20.0) * interval '1 hour'
    else p.created_at end desc,
    p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;

revoke all on function public.get_feed(text, text, integer, timestamptz) from public, anon;
grant execute on function public.get_feed(text, text, integer, timestamptz) to authenticated;

-- ------------------------------------------------------------
-- 8. Verification: a club may send its papers back for review,
--    never mark itself verified.
-- ------------------------------------------------------------
create or replace function private.prevent_org_self_verification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.role() = 'service_role' or private.is_admin() then
    return new;
  end if;
  /* submit_club_verification may move a page back to "pending" — and only
     there, and only unverified. */
  if current_setting('aceaix.club_resubmit', true) = 'on'
     and new.verification_status = 'pending'
     and new.is_verified = false then
    return new;
  end if;
  if new.is_verified is distinct from old.is_verified
     or new.verification_status is distinct from old.verification_status then
    raise exception 'Only administrators can change organisation verification'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 9. Setting up and editing the page
-- ------------------------------------------------------------
create or replace function private.club_text(p jsonb, p_key text, p_max integer)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare v text := nullif(btrim(coalesce(p ->> p_key, '')), '');
begin
  if v is not null and length(v) > p_max then
    raise exception '% is too long (max % characters)', p_key, p_max
      using errcode = '22023', hint = 'club_field_too_long';
  end if;
  return v;
end;
$$;

create or replace function private.club_url(p_value text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare v text := nullif(btrim(coalesce(p_value, '')), '');
begin
  if v is null then return null; end if;
  if v !~* '^https?://' then v := 'https://' || v; end if;
  if v !~* '^https?://[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$' or length(v) > 500 then
    raise exception 'That link does not look right' using errcode = '22023', hint = 'club_bad_url';
  end if;
  return v;
end;
$$;

create or replace function private.club_apply_sports(p_org uuid, p_sports jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item  jsonb;
  v_sport text;
  v_cats  text[];
  v_i     integer := 0;
begin
  if p_sports is null or jsonb_typeof(p_sports) <> 'array' or jsonb_array_length(p_sports) = 0 then
    raise exception 'Choose at least one sport' using errcode = '22023', hint = 'club_sports_required';
  end if;
  if jsonb_array_length(p_sports) > 20 then
    raise exception 'Twenty sports at most' using errcode = '22023', hint = 'club_sports_limit';
  end if;
  delete from public.organization_sports where organization_id = p_org;
  for v_item in select * from jsonb_array_elements(p_sports) loop
    v_sport := nullif(btrim(coalesce(v_item ->> 'sport', '')), '');
    if v_sport is null or length(v_sport) > 40 then
      raise exception 'Unknown sport' using errcode = '22023', hint = 'club_sports_required';
    end if;
    select coalesce(array_agg(distinct c) filter (where c is not null), '{}') into v_cats
    from (
      select nullif(btrim(x), '') as c
      from jsonb_array_elements_text(coalesce(v_item -> 'categories', '[]'::jsonb)) x
    ) s;
    if cardinality(v_cats) > 20 or exists (select 1 from unnest(v_cats) c where length(c) > 30) then
      raise exception 'Too many categories, or one is too long' using errcode = '22023',
        hint = 'club_categories_invalid';
    end if;
    insert into public.organization_sports (organization_id, sport, categories, sort)
    values (p_org, v_sport, v_cats, v_i)
    on conflict (organization_id, sport) do update set categories = excluded.categories;
    v_i := v_i + 1;
  end loop;
end;
$$;

/* Step one of setting up a page. Only the basics are required; the wizard
   fills the rest in with update_club_page as the person moves forward. */
create or replace function public.create_club_page(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me    public.user_profiles;
  v_id    uuid;
  v_type  text := coalesce(p ->> 'type', 'club');
  v_name  text := private.club_text(p, 'name', 120);
  v_year  integer := nullif(p ->> 'founded_year', '')::integer;
  v_ceo   text := private.club_text(p, 'ceo_name', 150);
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_me.role::text <> 'club' or coalesce(v_me.is_suspended, false) or coalesce(v_me.is_minor, false) then
    raise exception 'Only a club or academy account can create a club page'
      using errcode = '42501', hint = 'club_account_only';
  end if;
  if exists (select 1 from public.organization_members
             where user_id = auth.uid() and member_role = 'owner' and status = 'active') then
    raise exception 'You already run a club page' using errcode = '23505', hint = 'club_page_exists';
  end if;
  if v_type not in ('club', 'academy') then
    raise exception 'Choose club or academy' using errcode = '22023', hint = 'club_type';
  end if;
  if v_name is null or length(v_name) < 2 then
    raise exception 'Give the club its name' using errcode = '22023', hint = 'club_name_required';
  end if;
  if v_year is null or v_year < 1800 or v_year > extract(year from now())::integer then
    raise exception 'Year founded looks wrong' using errcode = '22023', hint = 'club_founded_year';
  end if;
  if v_ceo is null or length(v_ceo) < 2 then
    raise exception 'Who is the CEO or director?' using errcode = '22023', hint = 'club_ceo_required';
  end if;

  insert into public.organizations
    (name, name_local, type, founded_year, ceo_name, country, city,
     verification_status, is_verified, created_by)
  values
    (v_name, private.club_text(p, 'name_local', 255), v_type::org_type, v_year, v_ceo,
     private.club_text(p, 'country', 100), private.club_text(p, 'city', 100),
     'pending', false, auth.uid())
  returning id into v_id;

  insert into public.organization_members (organization_id, user_id, member_role, status)
  values (v_id, auth.uid(), 'owner', 'active');

  insert into public.organization_verification (organization_id, submitted_by)
  values (v_id, auth.uid());

  return v_id;
end;
$$;

/* Change any part of the page. Only the keys present in `p` are touched, so
   each wizard step and each edit screen sends just what it owns. */
create or replace function public.update_club_page(p_org uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loc   jsonb;
  v_fac   text[];
  v_soc   jsonb := '{}'::jsonb;
  v_key   text;
begin
  perform private.require_org(p_org, 'manage');

  if p ? 'type' and coalesce(p ->> 'type', '') not in ('club', 'academy') then
    raise exception 'Choose club or academy' using errcode = '22023', hint = 'club_type';
  end if;
  if p ? 'name' and length(coalesce(private.club_text(p, 'name', 120), '')) < 2 then
    raise exception 'Give the club its name' using errcode = '22023', hint = 'club_name_required';
  end if;
  if p ? 'ceo_name' and length(coalesce(private.club_text(p, 'ceo_name', 150), '')) < 2 then
    raise exception 'Who is the CEO or director?' using errcode = '22023', hint = 'club_ceo_required';
  end if;
  if p ? 'founded_year' and (nullif(p ->> 'founded_year', '')::integer is null
       or (p ->> 'founded_year')::integer not between 1800 and extract(year from now())::integer) then
    raise exception 'Year founded looks wrong' using errcode = '22023', hint = 'club_founded_year';
  end if;
  if p ? 'contact_email' and nullif(btrim(p ->> 'contact_email'), '') is not null
     and btrim(p ->> 'contact_email') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That e-mail does not look right' using errcode = '22023', hint = 'club_bad_email';
  end if;
  if p ? 'contact_phone' and nullif(btrim(p ->> 'contact_phone'), '') is not null
     and btrim(p ->> 'contact_phone') !~ '^\+?[0-9 ()-]{6,30}$' then
    raise exception 'That phone number does not look right' using errcode = '22023', hint = 'club_bad_phone';
  end if;
  if p ? 'latitude' and nullif(p ->> 'latitude', '') is not null
     and (p ->> 'latitude')::numeric not between -90 and 90 then
    raise exception 'Bad map position' using errcode = '22023';
  end if;
  if p ? 'longitude' and nullif(p ->> 'longitude', '') is not null
     and (p ->> 'longitude')::numeric not between -180 and 180 then
    raise exception 'Bad map position' using errcode = '22023';
  end if;

  if p ? 'facilities' then
    select coalesce(array_agg(distinct f) filter (where f is not null), '{}') into v_fac
    from (select nullif(btrim(x), '') f from jsonb_array_elements_text(coalesce(p -> 'facilities', '[]'::jsonb)) x) s;
    if cardinality(v_fac) > 20 or exists (select 1 from unnest(v_fac) f where length(f) > 60) then
      raise exception 'Too many facilities' using errcode = '22023';
    end if;
  end if;

  if p ? 'socials' and jsonb_typeof(p -> 'socials') = 'object' then
    for v_key in select jsonb_object_keys(p -> 'socials') loop
      if v_key in ('instagram','x','facebook','youtube','tiktok','linkedin','snapchat')
         and nullif(btrim(p -> 'socials' ->> v_key), '') is not null then
        if length(p -> 'socials' ->> v_key) > 200 then
          raise exception 'Social link too long' using errcode = '22023';
        end if;
        v_soc := v_soc || jsonb_build_object(v_key, btrim(p -> 'socials' ->> v_key));
      end if;
    end loop;
  end if;

  update public.organizations o set
    type          = case when p ? 'type' then (p ->> 'type')::org_type else o.type end,
    name          = case when p ? 'name' then private.club_text(p, 'name', 120) else o.name end,
    name_local    = case when p ? 'name_local' then private.club_text(p, 'name_local', 255) else o.name_local end,
    founded_year  = case when p ? 'founded_year' then (p ->> 'founded_year')::integer else o.founded_year end,
    ceo_name      = case when p ? 'ceo_name' then private.club_text(p, 'ceo_name', 150) else o.ceo_name end,
    country       = case when p ? 'country' then private.club_text(p, 'country', 100) else o.country end,
    city          = case when p ? 'city' then private.club_text(p, 'city', 100) else o.city end,
    address       = case when p ? 'address' then private.club_text(p, 'address', 300) else o.address end,
    latitude      = case when p ? 'latitude' then nullif(p ->> 'latitude', '')::numeric else o.latitude end,
    longitude     = case when p ? 'longitude' then nullif(p ->> 'longitude', '')::numeric else o.longitude end,
    contact_email = case when p ? 'contact_email' then lower(private.club_text(p, 'contact_email', 255)) else o.contact_email end,
    contact_phone = case when p ? 'contact_phone' then private.club_text(p, 'contact_phone', 40) else o.contact_phone end,
    website       = case when p ? 'website' then private.club_url(p ->> 'website') else o.website end,
    socials       = case when p ? 'socials' then v_soc else o.socials end,
    facilities    = case when p ? 'facilities' then v_fac else o.facilities end,
    description   = case when p ? 'description' then private.club_text(p, 'description', 300) else o.description end,
    about_story   = case when p ? 'about_story' then private.club_text(p, 'about_story', 5000) else o.about_story end,
    mission       = case when p ? 'mission' then private.club_text(p, 'mission', 600) else o.mission end,
    philosophy    = case when p ? 'philosophy' then private.club_text(p, 'philosophy', 1500) else o.philosophy end,
    league        = case when p ? 'league' then private.club_text(p, 'league', 150) else o.league end,
    logo_url      = case when p ? 'logo_url' then private.club_text(p, 'logo_url', 1000) else o.logo_url end,
    cover_url     = case when p ? 'cover_url' then private.club_text(p, 'cover_url', 1000) else o.cover_url end,
    primary_color = case when p ? 'primary_color' then private.club_text(p, 'primary_color', 16) else o.primary_color end
  where o.id = p_org;

  if p ? 'sports' then
    perform private.club_apply_sports(p_org, p -> 'sports');
  end if;

  /* The primary location mirrors the page's own address fields. */
  if p ? 'address' or p ? 'city' or p ? 'country' or p ? 'latitude' or p ? 'longitude' then
    insert into public.organization_locations
      (organization_id, label, address, city, country, latitude, longitude, is_primary)
    select o.id, null, o.address, o.city, o.country, o.latitude, o.longitude, true
    from public.organizations o where o.id = p_org
    on conflict (organization_id) where is_primary do update set
      address = excluded.address, city = excluded.city, country = excluded.country,
      latitude = excluded.latitude, longitude = excluded.longitude;
  end if;

  if p ? 'locations' and jsonb_typeof(p -> 'locations') = 'array' then
    if jsonb_array_length(p -> 'locations') > 15 then
      raise exception 'Fifteen branches at most' using errcode = '22023';
    end if;
    delete from public.organization_locations where organization_id = p_org and not is_primary;
    for v_loc in select * from jsonb_array_elements(p -> 'locations') loop
      if nullif(btrim(coalesce(v_loc ->> 'address', v_loc ->> 'city', v_loc ->> 'label', '')), '') is not null then
        insert into public.organization_locations
          (organization_id, label, address, city, country, latitude, longitude, is_primary)
        values (
          p_org,
          private.club_text(v_loc, 'label', 80),
          private.club_text(v_loc, 'address', 300),
          private.club_text(v_loc, 'city', 100),
          private.club_text(v_loc, 'country', 100),
          nullif(v_loc ->> 'latitude', '')::numeric,
          nullif(v_loc ->> 'longitude', '')::numeric,
          false
        );
      end if;
    end loop;
  end if;
end;
$$;

/* Papers for the admin: licence number, the uploaded document (a path in the
   private `club-documents` bucket under the caller's own folder), and the
   person filling it in. Sending them moves a rejected / more-info page back
   to "pending". */
create or replace function public.submit_club_verification(p_org uuid, p jsonb)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc    text := private.club_text(p, 'document_path', 500);
  v_status text;
  v_docs   jsonb;
begin
  perform private.require_org(p_org, 'manage');
  if coalesce((p ->> 'accept_terms')::boolean, false) is not true then
    raise exception 'Please accept the Terms and the Child Safety policy'
      using errcode = '22023', hint = 'club_terms_required';
  end if;
  if length(coalesce(private.club_text(p, 'contact_person_name', 120), '')) < 2 then
    raise exception 'Tell us who is filling this in' using errcode = '22023', hint = 'club_contact_person_required';
  end if;
  if v_doc is not null and split_part(v_doc, '/', 1) <> auth.uid()::text then
    raise exception 'Upload the document first' using errcode = '22023', hint = 'club_document_missing';
  end if;

  insert into public.organization_verification
    (organization_id, license_number, document_path, contact_person_name, contact_person_title,
     terms_accepted_at, submitted_by, submitted_at, updated_at)
  values (
    p_org, private.club_text(p, 'license_number', 80), v_doc,
    private.club_text(p, 'contact_person_name', 120), private.club_text(p, 'contact_person_title', 120),
    now(), auth.uid(), case when v_doc is not null then now() end, now()
  )
  on conflict (organization_id) do update set
    license_number       = coalesce(excluded.license_number, organization_verification.license_number),
    document_path        = coalesce(excluded.document_path, organization_verification.document_path),
    contact_person_name  = excluded.contact_person_name,
    contact_person_title = excluded.contact_person_title,
    terms_accepted_at    = now(),
    submitted_by         = auth.uid(),
    submitted_at         = coalesce(excluded.submitted_at, organization_verification.submitted_at),
    updated_at           = now();

  /* Into the admin portal's existing queue (web/ → Verification). One open
     request per page; a resubmission refreshes it. */
  if v_doc is not null then
    v_docs := jsonb_build_array(jsonb_build_object(
      'name', 'Trade licence' || coalesce(' ' || private.club_text(p, 'license_number', 80), '')
              || ' — ' || private.club_text(p, 'contact_person_name', 120)
              || coalesce(' (' || private.club_text(p, 'contact_person_title', 120) || ')', ''),
      'bucket', 'club-documents', 'path', v_doc,
      'license_number', private.club_text(p, 'license_number', 80)));
    update public.verification_requests
       set documents = v_docs, subject_user_id = auth.uid(), updated_at = now()
     where organization_id = p_org and status in ('pending', 'more_info');
    if not found then
      insert into public.verification_requests (subject_user_id, organization_id, type, status, documents)
      values (auth.uid(), p_org, 'club', 'pending', v_docs);
    else
      update public.verification_requests set status = 'pending'
       where organization_id = p_org and status = 'more_info';
    end if;
  end if;

  select verification_status::text into v_status from public.organizations where id = p_org;
  if v_status in ('rejected', 'more_info', 'expired') then
    perform set_config('aceaix.club_resubmit', 'on', true);
    update public.organizations set verification_status = 'pending', is_verified = false where id = p_org;
    perform set_config('aceaix.club_resubmit', 'off', true);
    v_status := 'pending';
  end if;
  return v_status;
end;
$$;

/* A private bucket for licences. Only the uploader and admins can read. */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-documents', 'club-documents', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists club_documents_owner_insert on storage.objects;
create policy club_documents_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'club-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists club_documents_read on storage.objects;
create policy club_documents_read on storage.objects for select to authenticated
  using (bucket_id = 'club-documents'
         and ((storage.foldername(name))[1] = auth.uid()::text or private.is_admin()));
drop policy if exists club_documents_owner_delete on storage.objects;
create policy club_documents_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'club-documents' and (storage.foldername(name))[1] = auth.uid()::text);

/* When an admin decides a club request in the portal, the page follows:
   approved → verified, rejected → rejected (with the reason the club sees on
   its Manage screen). The portal already writes "approved" itself; this
   makes rejection visible too. */
create or replace function private.sync_club_verification_decision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.organization_id is null or new.status is not distinct from old.status then
    return new;
  end if;
  if new.status in ('approved', 'rejected', 'more_info') then
    update public.organizations
       set verification_status = new.status,
           is_verified = (new.status = 'approved')
     where id = new.organization_id;
    update public.organization_verification
       set review_note = new.decision_reason, updated_at = now()
     where organization_id = new.organization_id;
    perform private.club_notify_managers(new.organization_id,
      'club_verification_' || new.status::text,
      case new.status when 'approved' then 'Your club page is verified'
                      when 'rejected' then 'Your club verification was not approved'
                      else 'We need more information to verify your club' end,
      new.decision_reason, 'organization', new.organization_id::text, '{}'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verification_requests_club_sync on public.verification_requests;
create trigger trg_verification_requests_club_sync
  after update of status on public.verification_requests
  for each row execute function private.sync_club_verification_decision();
revoke all on function private.sync_club_verification_decision() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 10. The page team
-- ------------------------------------------------------------
create or replace function public.invite_club_member(p_org uuid, p_email text, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.user_profiles;
  v_org  public.organizations;
  v_existing public.organization_members;
  v_was_active boolean := false;
begin
  perform private.require_org(p_org, 'manage');
  if p_role not in ('manager','editor','scorekeeper','coach','staff') then
    raise exception 'Unknown role' using errcode = '22023', hint = 'club_role';
  end if;
  select up.* into v_user
  from auth.users au join public.user_profiles up on up.id = au.id
  where lower(au.email) = lower(btrim(coalesce(p_email, '')));
  if not found then
    raise exception 'No AceAiX account uses that e-mail' using errcode = 'P0002', hint = 'club_invitee_not_found';
  end if;
  if coalesce(v_user.is_minor, false) then
    raise exception 'Page team members must be 18 or over' using errcode = '42501', hint = 'club_invitee_minor';
  end if;
  if coalesce(v_user.is_suspended, false) or private.users_are_blocked(auth.uid(), v_user.id) then
    raise exception 'That account cannot be added' using errcode = '42501', hint = 'club_invitee_unavailable';
  end if;

  select * into v_existing from public.organization_members
  where organization_id = p_org and user_id = v_user.id;
  if found and v_existing.member_role = 'owner' then
    raise exception 'That person owns the page' using errcode = '22023', hint = 'club_role';
  end if;
  v_was_active := coalesce(v_existing.status = 'active', false);

  if v_was_active then
    update public.organization_members set member_role = p_role
    where id = v_existing.id;
  else
    insert into public.organization_members (organization_id, user_id, member_role, status, invited_by)
    values (p_org, v_user.id, p_role, 'pending', auth.uid())
    on conflict (organization_id, user_id) do update
      set member_role = excluded.member_role, status = 'pending', invited_by = auth.uid();
    select * into v_org from public.organizations where id = p_org;
    perform private.notify(v_user.id, 'club', 'club_invite',
      'You were invited to help run ' || v_org.name, null, auth.uid(),
      'organization', p_org::text, null,
      jsonb_build_object('organization_id', p_org, 'role', p_role));
  end if;

  return jsonb_build_object('user_id', v_user.id, 'full_name', v_user.full_name,
                            'status', case when v_was_active then 'active' else 'pending' end);
end;
$$;

create or replace function public.respond_club_invite(p_org uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_row public.organization_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_row from public.organization_members
  where organization_id = p_org and user_id = auth.uid() and status = 'pending' and invited_by is not null;
  if not found then
    raise exception 'No invitation' using errcode = 'P0002', hint = 'club_invite_missing';
  end if;
  if coalesce(p_accept, false) then
    update public.organization_members set status = 'active' where id = v_row.id;
    perform private.club_notify_managers(p_org, 'club_invite_accepted',
      'Your invitation was accepted', null, 'organization', p_org::text, '{}'::jsonb);
  else
    delete from public.organization_members where id = v_row.id;
  end if;
end;
$$;

create or replace function public.set_club_member_role(p_org uuid, p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.require_org(p_org, 'manage');
  if p_role not in ('manager','editor','scorekeeper','coach','staff') then
    raise exception 'Unknown role' using errcode = '22023', hint = 'club_role';
  end if;
  update public.organization_members set member_role = p_role
  where organization_id = p_org and user_id = p_user and member_role <> 'owner';
  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
end;
$$;

/* Remove someone, or leave yourself. The owner cannot be removed. */
create or replace function public.remove_club_member(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user is distinct from auth.uid() then
    perform private.require_org(p_org, 'manage');
  end if;
  if exists (select 1 from public.organization_members
             where organization_id = p_org and user_id = p_user and member_role = 'owner') then
    raise exception 'The owner cannot be removed' using errcode = '42501', hint = 'club_owner_stays';
  end if;
  delete from public.organization_members where organization_id = p_org and user_id = p_user;
end;
$$;

create or replace function public.club_team(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.org_can(p_org, 'member') then
    raise exception 'Not permitted' using errcode = '42501', hint = 'club_permission';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', m.user_id, 'full_name', up.full_name, 'avatar_url', up.avatar_url,
      'role', m.member_role, 'status', m.status, 'is_self', m.user_id = auth.uid(),
      'created_at', m.created_at
    ) order by case m.member_role when 'owner' then 0 when 'manager' then 1 when 'editor' then 2
                 when 'scorekeeper' then 3 else 4 end, up.full_name)
    from public.organization_members m
    join public.user_profiles up on up.id = m.user_id
    where m.organization_id = p_org
      and (m.status = 'active' or (m.status = 'pending' and m.invited_by is not null))
  ), '[]'::jsonb);
end;
$$;

/* Pages I help run, and invitations waiting for me. */
create or replace function public.my_club_pages()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id, 'name', o.name, 'type', o.type, 'logo_url', o.logo_url,
    'is_verified', o.is_verified, 'verification_status', o.verification_status,
    'role', m.member_role, 'status', m.status
  ) order by (m.status = 'pending') desc, m.created_at), '[]'::jsonb)
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and (m.status = 'active' or (m.status = 'pending' and m.invited_by is not null));
$$;

-- ------------------------------------------------------------
-- 11. Broadcasts
-- ------------------------------------------------------------
create or replace function public.send_club_broadcast(p_org uuid, p_title text, p_body text, p_audience text default 'followers')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id    uuid;
  v_count integer := 0;
  v_user  uuid;
  v_name  text;
begin
  perform private.require_org(p_org, 'manage');
  if coalesce(p_audience, '') not in ('followers', 'squad', 'all') then
    raise exception 'Unknown audience' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 3 and 80 then
    raise exception 'Title: 3 to 80 characters' using errcode = '22023', hint = 'club_broadcast_title';
  end if;
  if length(btrim(coalesce(p_body, ''))) not between 3 and 1000 then
    raise exception 'Message: 3 to 1000 characters' using errcode = '22023', hint = 'club_broadcast_body';
  end if;
  if (select count(*) from public.club_broadcasts
      where organization_id = p_org and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Three announcements a day at most' using errcode = '54000', hint = 'rate_limited';
  end if;

  select name into v_name from public.organizations where id = p_org;
  insert into public.club_broadcasts (organization_id, sent_by, audience, title, body)
  values (p_org, auth.uid(), p_audience, btrim(p_title), btrim(p_body))
  returning id into v_id;

  for v_user in select user_id from private.club_audience(p_org, p_audience) loop
    insert into public.club_broadcast_recipients (broadcast_id, user_id) values (v_id, v_user)
    on conflict do nothing;
    perform private.notify(v_user, 'club', 'club_broadcast', v_name || ': ' || btrim(p_title),
                           left(btrim(p_body), 240), auth.uid(), 'organization', p_org::text, null,
                           jsonb_build_object('organization_id', p_org, 'broadcast_id', v_id));
    v_count := v_count + 1;
  end loop;

  update public.club_broadcasts set recipients = v_count where id = v_id;
  return jsonb_build_object('id', v_id, 'recipients', v_count);
end;
$$;

/* What the caller can read: everything for the page team, otherwise only
   what was sent to them. */
create or replace function public.club_broadcasts_for(p_org uuid, p_limit integer default 10)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(x order by (x ->> 'created_at') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', b.id, 'title', b.title, 'body', b.body, 'audience', b.audience,
      'recipients', case when private.org_can(p_org, 'member') then b.recipients end,
      'created_at', b.created_at
    ) x
    from public.club_broadcasts b
    where b.organization_id = p_org
      and (private.org_can(p_org, 'member')
           or exists (select 1 from public.club_broadcast_recipients r
                      where r.broadcast_id = b.id and r.user_id = auth.uid()))
    order by b.created_at desc
    limit greatest(1, least(coalesce(p_limit, 10), 50))
  ) s;
$$;

-- ------------------------------------------------------------
-- 12. Challenges set by a club page
--
-- Also fixes the role list: 0907/03 checked for an 'admin' member role that
-- the membership table never allowed, and left out 'manager'.
-- ------------------------------------------------------------
create or replace function private.may_set_challenges(p_org uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (
      exists (
        select 1 from public.user_profiles up
        where up.id = auth.uid()
          and up.role in ('coach','club','scout')
          and coalesce(up.is_verified, false)
          and coalesce(up.is_suspended, false) = false
      )
      and (p_org is null or private.is_org_member(p_org, array['owner','manager','editor','coach','staff']))
    )
    or (
      p_org is not null
      and exists (select 1 from public.organizations o where o.id = p_org and o.is_verified)
      and private.org_can(p_org, 'content')
    );
$$;

create or replace function public.club_challenges(p_org uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'brief', c.brief, 'sport', c.sport,
    'metric_label', c.metric_label, 'metric_unit', c.metric_unit,
    'closes_at', c.closes_at, 'status', c.status, 'entry_count', c.entry_count,
    'age_min', c.age_min, 'age_max', c.age_max,
    'is_open', c.status = 'open' and c.closes_at > now()
  ) order by (c.status = 'open' and c.closes_at > now()) desc, c.closes_at desc), '[]'::jsonb)
  from (
    select * from public.challenges
    where organization_id = p_org
    order by closes_at desc
    limit 30
  ) c;
$$;

-- ------------------------------------------------------------
-- 13. Events
-- ------------------------------------------------------------
create or replace function public.save_club_event(p_org uuid, p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id     uuid;
  v_kind   text := coalesce(p ->> 'kind', 'trial');
  v_title  text := private.club_text(p, 'title', 120);
  v_starts timestamptz := nullif(p ->> 'starts_at', '')::timestamptz;
  v_ends   timestamptz := nullif(p ->> 'ends_at', '')::timestamptz;
  v_name   text;
begin
  perform private.require_org(p_org, 'content');
  if v_kind not in ('trial','camp','clinic','tournament','open_day','showcase','other') then
    raise exception 'Unknown event type' using errcode = '22023';
  end if;
  if length(coalesce(v_title, '')) < 4 then
    raise exception 'Give the event a title' using errcode = '22023', hint = 'club_event_title';
  end if;
  if v_starts is null or (p_id is null and v_starts < now()) then
    raise exception 'Pick a start time in the future' using errcode = '22023', hint = 'club_event_starts';
  end if;
  if v_ends is not null and v_ends <= v_starts then
    raise exception 'It has to end after it starts' using errcode = '22023', hint = 'club_event_ends';
  end if;

  if p_id is null then
    insert into public.club_events (organization_id, created_by, kind, title, description, sport, category,
      starts_at, ends_at, location, age_min, age_max, capacity, registration_open, price, currency)
    values (p_org, auth.uid(), v_kind, v_title, private.club_text(p, 'description', 2000),
      private.club_text(p, 'sport', 40), private.club_text(p, 'category', 30),
      v_starts, v_ends, private.club_text(p, 'location', 200),
      nullif(p ->> 'age_min', '')::integer, nullif(p ->> 'age_max', '')::integer,
      nullif(p ->> 'capacity', '')::integer,
      coalesce((p ->> 'registration_open')::boolean, true),
      nullif(p ->> 'price', '')::integer,
      coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'))
    returning id into v_id;

    select name into v_name from public.organizations where id = p_org;
    perform private.club_notify_audience(p_org, 'followers', 'club_event_new',
      v_name || ': ' || v_title, null, 'club_event', v_id::text,
      'club_event_new:' || p_org::text, jsonb_build_object('event_id', v_id));
  else
    update public.club_events set
      kind = v_kind, title = v_title, description = private.club_text(p, 'description', 2000),
      sport = private.club_text(p, 'sport', 40), category = private.club_text(p, 'category', 30),
      starts_at = v_starts, ends_at = v_ends, location = private.club_text(p, 'location', 200),
      age_min = nullif(p ->> 'age_min', '')::integer, age_max = nullif(p ->> 'age_max', '')::integer,
      capacity = nullif(p ->> 'capacity', '')::integer,
      registration_open = coalesce((p ->> 'registration_open')::boolean, true),
      price = nullif(p ->> 'price', '')::integer,
      currency = coalesce(nullif(upper(btrim(p ->> 'currency')), ''), 'AED'),
      updated_at = now()
    where id = p_id and organization_id = p_org
    returning id into v_id;
    if v_id is null then
      raise exception 'Event not found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.cancel_club_event(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_event public.club_events; v_user uuid;
begin
  select * into v_event from public.club_events where id = p_id;
  if not found then raise exception 'Event not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_event.organization_id, 'content');
  update public.club_events set status = 'cancelled', registration_open = false, updated_at = now()
  where id = p_id;
  for v_user in select user_id from public.club_event_registrations
                where event_id = p_id and status = 'registered' loop
    perform private.notify(v_user, 'club', 'club_event_cancelled',
      v_event.title || ' was cancelled', null, auth.uid(), 'club_event', p_id::text, null,
      jsonb_build_object('event_id', p_id, 'organization_id', v_event.organization_id));
  end loop;
end;
$$;

/* Why the caller cannot register — or 'ok'. */
create or replace function private.club_event_gate(p_event public.club_events)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me  public.user_profiles;
  v_org public.organizations;
  v_age integer;
  v_taken integer;
begin
  select * into v_me from public.user_profiles where id = auth.uid();
  if not found then return 'not_signed_in'; end if;
  if private.org_can(p_event.organization_id, 'member') then return 'own_club'; end if;
  if p_event.status <> 'scheduled' then return 'cancelled'; end if;
  if p_event.starts_at < now() then return 'past'; end if;
  if not p_event.registration_open then return 'closed'; end if;
  if v_me.is_suspended then return 'closed'; end if;
  select * into v_org from public.organizations where id = p_event.organization_id;
  select extract(year from age(current_date, up.date_of_birth))::integer into v_age
  from public.user_private up where up.user_id = auth.uid();
  if v_age is not null and ((p_event.age_min is not null and v_age < p_event.age_min)
                            or (p_event.age_max is not null and v_age > p_event.age_max)) then
    return 'age_out_of_range';
  end if;
  if p_event.capacity is not null then
    select count(*) into v_taken from public.club_event_registrations
    where event_id = p_event.id and status = 'registered';
    if v_taken >= p_event.capacity then return 'full'; end if;
  end if;
  if coalesce(v_me.is_minor, false) then
    if not v_org.is_verified then return 'minor_needs_verified_club'; end if;
    if not private.has_guardian_consent(v_me.id, 'bookings') then return 'guardian_consent_required'; end if;
  end if;
  return 'ok';
end;
$$;

create or replace function public.register_for_club_event(p_event uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.club_events;
  v_gate  text;
  v_id    uuid;
  v_guardian uuid;
  v_name  text;
begin
  select * into v_event from public.club_events where id = p_event for update;
  if not found then raise exception 'Event not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.club_event_registrations
             where event_id = p_event and user_id = auth.uid() and status = 'registered') then
    raise exception 'You are already registered' using errcode = '23505', hint = 'club_event_already';
  end if;
  v_gate := private.club_event_gate(v_event);
  if v_gate <> 'ok' then
    raise exception 'Registration not possible: %', v_gate using errcode = '42501', hint = v_gate;
  end if;
  if length(coalesce(p_note, '')) > 400 then
    raise exception 'Note too long' using errcode = '22023';
  end if;

  insert into public.club_event_registrations (event_id, user_id, note)
  values (p_event, auth.uid(), nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;
  update public.club_events set registration_count = registration_count + 1 where id = p_event;

  select full_name into v_name from public.user_profiles where id = auth.uid();
  perform private.club_notify_managers(v_event.organization_id, 'club_event_registration',
    coalesce(v_name, 'Someone') || ' registered for ' || v_event.title, null,
    'club_event', p_event::text, jsonb_build_object('event_id', p_event));

  if exists (select 1 from public.user_profiles where id = auth.uid() and is_minor) then
    for v_guardian in
      select distinct g.guardian_user_id from public.guardian_consents g
      where g.minor_user_id = auth.uid() and g.status = 'granted' and g.guardian_user_id is not null
    loop
      perform private.notify(v_guardian, 'club', 'club_event_registration_minor',
        coalesce(v_name, 'Your child') || ' registered for ' || v_event.title, null, auth.uid(),
        'club_event', p_event::text, null,
        jsonb_build_object('event_id', p_event, 'minor_user_id', auth.uid()));
    end loop;
  end if;
  return v_id;
end;
$$;

create or replace function public.cancel_club_event_registration(p_event uuid, p_user uuid default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  update public.club_event_registrations
  set status = 'cancelled', cancelled_at = now()
  where event_id = p_event and status = 'registered'
    and user_id = coalesce(p_user, auth.uid())
    and (user_id = auth.uid()
         or exists (select 1 from public.guardian_consents g
                    where g.minor_user_id = club_event_registrations.user_id
                      and g.guardian_user_id = auth.uid() and g.status = 'granted'));
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'No registration' using errcode = 'P0002';
  end if;
  update public.club_events set registration_count = greatest(0, registration_count - v_n) where id = p_event;
end;
$$;

create or replace function public.club_event_page(p_event uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.club_events;
  v_org   public.organizations;
  v_can   boolean;
  v_taken integer;
begin
  select * into v_event from public.club_events where id = p_event;
  if not found then return null; end if;
  select * into v_org from public.organizations where id = v_event.organization_id;
  v_can := private.org_can(v_event.organization_id, 'content');
  select count(*) into v_taken from public.club_event_registrations
  where event_id = p_event and status = 'registered';

  return jsonb_build_object(
    'event', to_jsonb(v_event) - 'created_by',
    'organization', jsonb_build_object('id', v_org.id, 'name', v_org.name, 'logo_url', v_org.logo_url,
                                       'is_verified', v_org.is_verified),
    'spots_left', case when v_event.capacity is null then null else greatest(0, v_event.capacity - v_taken) end,
    'gate', private.club_event_gate(v_event),
    'can_manage', v_can,
    'my_registration', (select jsonb_build_object('id', r.id, 'note', r.note, 'created_at', r.created_at)
                        from public.club_event_registrations r
                        where r.event_id = p_event and r.user_id = auth.uid() and r.status = 'registered'),
    'registrations', case when v_can then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id, 'user_id', r.user_id, 'full_name', up.full_name, 'avatar_url', up.avatar_url,
          'is_minor', coalesce(up.is_minor, false), 'note', r.note, 'created_at', r.created_at
        ) order by r.created_at)
        from public.club_event_registrations r
        join public.user_profiles up on up.id = r.user_id
        where r.event_id = p_event and r.status = 'registered'), '[]'::jsonb)
      else null end
  );
end;
$$;

create or replace function public.club_events_for(p_org uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'kind', e.kind, 'title', e.title, 'sport', e.sport, 'category', e.category,
    'starts_at', e.starts_at, 'ends_at', e.ends_at, 'location', e.location,
    'age_min', e.age_min, 'age_max', e.age_max, 'capacity', e.capacity,
    'registration_count', e.registration_count, 'registration_open', e.registration_open,
    'status', e.status, 'price', e.price, 'currency', e.currency,
    'is_upcoming', e.starts_at >= now(),
    'registered', exists (select 1 from public.club_event_registrations r
                          where r.event_id = e.id and r.user_id = auth.uid() and r.status = 'registered')
  ) order by (e.starts_at >= now()) desc,
             case when e.starts_at >= now() then e.starts_at end asc,
             e.starts_at desc), '[]'::jsonb)
  from (
    select * from public.club_events
    where organization_id = p_org
      and (starts_at >= now() - interval '120 days')
    order by starts_at desc
    limit 40
  ) e;
$$;

-- ------------------------------------------------------------
-- 14. Seasons, squads, members
-- ------------------------------------------------------------
create or replace function public.save_club_season(p_org uuid, p_id uuid, p_label text, p_current boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  perform private.require_org(p_org, 'content');
  if length(btrim(coalesce(p_label, ''))) not between 2 and 20 then
    raise exception 'Season name: 2 to 20 characters, e.g. 2026–27' using errcode = '22023', hint = 'club_season_label';
  end if;
  if coalesce(p_current, false) then
    update public.club_seasons set is_current = false
    where organization_id = p_org and is_current and id is distinct from p_id;
  end if;
  if p_id is null then
    insert into public.club_seasons (organization_id, label, is_current)
    values (p_org, btrim(p_label), coalesce(p_current, false))
    on conflict (organization_id, label) do update set is_current = excluded.is_current
    returning id into v_id;
  else
    update public.club_seasons set label = btrim(p_label), is_current = coalesce(p_current, false)
    where id = p_id and organization_id = p_org
    returning id into v_id;
    if v_id is null then raise exception 'Season not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_club_squad(p_org uuid, p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id     uuid;
  v_season uuid := nullif(p ->> 'season_id', '')::uuid;
  v_sport  text := private.club_text(p, 'sport', 40);
  v_cat    text := private.club_text(p, 'category', 30);
begin
  perform private.require_org(p_org, 'content');
  if not exists (select 1 from public.club_seasons where id = v_season and organization_id = p_org) then
    raise exception 'Pick a season' using errcode = '22023', hint = 'club_season_required';
  end if;
  if v_sport is null or v_cat is null then
    raise exception 'Pick a sport and a category' using errcode = '22023', hint = 'club_squad_fields';
  end if;
  if p_id is null then
    insert into public.club_squads (organization_id, season_id, sport, category, name)
    values (p_org, v_season, v_sport, v_cat, private.club_text(p, 'name', 60))
    returning id into v_id;
  else
    update public.club_squads set season_id = v_season, sport = v_sport, category = v_cat,
      name = private.club_text(p, 'name', 60)
    where id = p_id and organization_id = p_org
    returning id into v_id;
    if v_id is null then raise exception 'Squad not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'That squad already exists this season' using errcode = '23505', hint = 'club_squad_exists';
end;
$$;

create or replace function public.delete_club_squad(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.club_squads where id = p_id;
  if v_org is null then raise exception 'Squad not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_org, 'content');
  delete from public.club_squads where id = p_id;
end;
$$;

/* Add or edit a player or a member of staff. Naming an AceAiX profile
   (`user_id`) sends that person a link request; they accept it from the
   club page. */
create or replace function public.save_squad_member(p_squad uuid, p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_squad public.club_squads;
  v_id    uuid;
  v_kind  text := coalesce(p ->> 'kind', 'player');
  v_user  uuid := nullif(p ->> 'user_id', '')::uuid;
  v_name  text := private.club_text(p, 'display_name', 80);
  v_prev  public.club_squad_members;
  v_link  text := 'none';
  v_org_name text;
begin
  select * into v_squad from public.club_squads where id = p_squad;
  if not found then raise exception 'Squad not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_squad.organization_id, 'content');
  if v_kind not in ('player','staff') then
    raise exception 'Unknown kind' using errcode = '22023';
  end if;
  if v_kind = 'staff' and coalesce(p ->> 'staff_role', 'other') not in
     ('head_coach','assistant_coach','goalkeeper_coach','fitness_coach','physio','analyst','team_manager','other') then
    raise exception 'Unknown staff role' using errcode = '22023';
  end if;

  if v_user is not null then
    if not exists (select 1 from public.user_profiles where id = v_user and not coalesce(is_suspended, false))
       or private.users_are_blocked(auth.uid(), v_user) then
      raise exception 'That profile cannot be linked' using errcode = '42501', hint = 'club_link_unavailable';
    end if;
    if v_name is null then
      select full_name into v_name from public.user_profiles where id = v_user;
    end if;
  end if;
  if v_name is null or length(v_name) < 2 then
    raise exception 'Name the person' using errcode = '22023', hint = 'club_member_name';
  end if;

  if p_id is not null then
    select * into v_prev from public.club_squad_members where id = p_id and squad_id = p_squad;
    if not found then raise exception 'Member not found' using errcode = 'P0002'; end if;
    v_link := case when v_user is null then 'none'
                   when v_user = v_prev.user_id then v_prev.link_status
                   else 'invited' end;
    update public.club_squad_members set
      kind = v_kind, display_name = v_name, user_id = v_user, link_status = v_link,
      shirt_number = nullif(p ->> 'shirt_number', '')::integer,
      position = private.club_text(p, 'position', 40),
      staff_role = case when v_kind = 'staff' then coalesce(p ->> 'staff_role', 'other') end,
      sort = coalesce(nullif(p ->> 'sort', '')::integer, sort)
    where id = p_id
    returning id into v_id;
  else
    v_link := case when v_user is null then 'none' else 'invited' end;
    insert into public.club_squad_members (squad_id, organization_id, kind, display_name, user_id, link_status,
      shirt_number, position, staff_role, sort)
    values (p_squad, v_squad.organization_id, v_kind, v_name, v_user, v_link,
      nullif(p ->> 'shirt_number', '')::integer, private.club_text(p, 'position', 40),
      case when v_kind = 'staff' then coalesce(p ->> 'staff_role', 'other') end,
      coalesce(nullif(p ->> 'sort', '')::integer, 0))
    returning id into v_id;
  end if;

  if v_link = 'invited' and (p_id is null or v_prev.user_id is distinct from v_user) then
    select name into v_org_name from public.organizations where id = v_squad.organization_id;
    perform private.notify(v_user, 'club', 'club_squad_link',
      v_org_name || ' added you to its ' || v_squad.category || ' ' || v_squad.sport || ' squad',
      null, auth.uid(), 'organization', v_squad.organization_id::text, null,
      jsonb_build_object('organization_id', v_squad.organization_id, 'squad_member_id', v_id));
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'That person is already in this squad' using errcode = '23505', hint = 'club_member_exists';
end;
$$;

create or replace function public.delete_squad_member(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.club_squad_members where id = p_id;
  if v_org is null then raise exception 'Member not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_org, 'content');
  delete from public.club_squad_members where id = p_id;
end;
$$;

/* The linked person says yes or no. A minor's yes needs a guardian's
   discovery consent, because it puts them on a public roster. Saying no, or
   unlinking later, keeps the club's own line but drops the link. */
create or replace function public.respond_squad_link(p_member uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_row public.club_squad_members;
begin
  select * into v_row from public.club_squad_members where id = p_member and user_id = auth.uid();
  if not found then raise exception 'No link request' using errcode = 'P0002', hint = 'club_link_missing'; end if;
  if coalesce(p_accept, false) then
    if exists (select 1 from public.user_profiles where id = auth.uid() and is_minor)
       and not private.has_guardian_consent(auth.uid(), 'discovery') then
      raise exception 'A parent or guardian needs to approve this first'
        using errcode = '42501', hint = 'guardian_consent_required';
    end if;
    update public.club_squad_members set link_status = 'accepted' where id = p_member;
  else
    update public.club_squad_members set link_status = 'none', user_id = null where id = p_member;
  end if;
end;
$$;

/* One person on a public list, by the naming rule. */
create or replace function private.club_member_json(m public.club_squad_members, p_youth boolean, p_full boolean)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', m.id, 'kind', m.kind, 'shirt_number', m.shirt_number, 'position', m.position,
    'staff_role', m.staff_role, 'sort', m.sort,
    'display_name', case
        when p_full then m.display_name
        when m.link_status = 'accepted' and m.user_id is not null and private.user_publicly_visible(m.user_id)
          then coalesce(up.full_name, m.display_name)
        /* Coaching staff are adults; only players on a youth squad are shortened. */
        when p_youth and m.kind = 'player' then private.short_person_name(m.display_name)
        else m.display_name end,
    'user_id', case
        when m.link_status = 'accepted' and m.user_id is not null
             and (p_full or private.user_publicly_visible(m.user_id)) then m.user_id end,
    'avatar_url', case
        when m.link_status = 'accepted' and m.user_id is not null
             and (p_full or private.user_publicly_visible(m.user_id)) then up.avatar_url end,
    'link_status', case when p_full then m.link_status end,
    'linked_user_id', case when p_full then m.user_id end
  )
  from (select 1) one
  left join public.user_profiles up on up.id = m.user_id;
$$;

create or replace function public.club_squads_page(p_org uuid, p_season uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_full   boolean := private.org_can(p_org, 'member');
  v_season uuid;
begin
  v_season := coalesce(p_season,
    (select id from public.club_seasons where organization_id = p_org and is_current limit 1),
    (select id from public.club_seasons where organization_id = p_org order by created_at desc limit 1));

  return jsonb_build_object(
    'can_edit', private.org_can(p_org, 'content'),
    'season_id', v_season,
    'seasons', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'label', s.label, 'is_current', s.is_current)
                                          order by s.is_current desc, s.label desc)
                         from public.club_seasons s where s.organization_id = p_org), '[]'::jsonb),
    'squads', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'sport', q.sport, 'category', q.category, 'name', q.name,
        'is_youth', private.is_youth_category(q.category),
        'players', coalesce((select jsonb_agg(private.club_member_json(m, private.is_youth_category(q.category), v_full)
                                              order by m.sort, m.shirt_number nulls last, m.display_name)
                             from public.club_squad_members m where m.squad_id = q.id and m.kind = 'player'), '[]'::jsonb),
        'staff', coalesce((select jsonb_agg(private.club_member_json(m, private.is_youth_category(q.category), v_full)
                                            order by case m.staff_role when 'head_coach' then 0 when 'assistant_coach' then 1 else 2 end, m.sort)
                           from public.club_squad_members m where m.squad_id = q.id and m.kind = 'staff'), '[]'::jsonb)
      ) order by q.sport, q.category)
      from public.club_squads q
      where q.organization_id = p_org and q.season_id = v_season), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------
-- 15. Matches and live score
-- ------------------------------------------------------------
create or replace function private.club_stream_url(p_value text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare v text := nullif(btrim(coalesce(p_value, '')), '');
begin
  if v is null then return null; end if;
  if v !~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtu\.be|instagram\.com|twitch\.tv|facebook\.com|fb\.watch|tiktok\.com|x\.com|twitter\.com|kick\.com|vimeo\.com)(/\S*)?$'
     or length(v) > 500 then
    raise exception 'Live streams are links to YouTube, Instagram, Twitch, Facebook, TikTok, X, Kick or Vimeo'
      using errcode = '22023', hint = 'club_stream_url';
  end if;
  return v;
end;
$$;

create or replace function public.save_club_match(p_org uuid, p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      uuid;
  v_kick    timestamptz := nullif(p ->> 'kickoff_at', '')::timestamptz;
  v_opp     text := private.club_text(p, 'opponent_name', 120);
  v_sport   text := private.club_text(p, 'sport', 40);
  v_squad   uuid := nullif(p ->> 'squad_id', '')::uuid;
  v_cat     text := private.club_text(p, 'category', 30);
  v_name    text;
  v_status  text := coalesce(p ->> 'status', 'scheduled');
begin
  perform private.require_org(p_org, 'content');
  if v_opp is null or length(v_opp) < 2 then
    raise exception 'Who is the opponent?' using errcode = '22023', hint = 'club_match_opponent';
  end if;
  if v_sport is null then
    raise exception 'Pick a sport' using errcode = '22023', hint = 'club_match_sport';
  end if;
  if v_kick is null then
    raise exception 'Pick the date and time' using errcode = '22023', hint = 'club_match_kickoff';
  end if;
  if v_squad is not null then
    select coalesce(v_cat, category) into v_cat from public.club_squads
    where id = v_squad and organization_id = p_org;
    if not found then raise exception 'Squad not found' using errcode = 'P0002'; end if;
  end if;
  if v_status not in ('scheduled','postponed','cancelled') then
    v_status := 'scheduled';
  end if;

  if p_id is null then
    insert into public.club_matches (organization_id, created_by, sport, squad_id, category, competition,
      opponent_name, is_home, venue, kickoff_at, stream_url, notes)
    values (p_org, auth.uid(), v_sport, v_squad, v_cat, private.club_text(p, 'competition', 120),
      v_opp, coalesce((p ->> 'is_home')::boolean, true), private.club_text(p, 'venue', 200), v_kick,
      private.club_stream_url(p ->> 'stream_url'), private.club_text(p, 'notes', 1000))
    returning id into v_id;

    if v_kick > now() then
      select name into v_name from public.organizations where id = p_org;
      perform private.club_notify_audience(p_org, 'followers', 'club_match_scheduled',
        v_name || ' vs ' || v_opp, null, 'club_match', v_id::text,
        'club_match_scheduled:' || p_org::text, jsonb_build_object('match_id', v_id));
    end if;
  else
    update public.club_matches set
      sport = v_sport, squad_id = v_squad, category = v_cat,
      competition = private.club_text(p, 'competition', 120), opponent_name = v_opp,
      is_home = coalesce((p ->> 'is_home')::boolean, true),
      venue = private.club_text(p, 'venue', 200), kickoff_at = v_kick,
      stream_url = private.club_stream_url(p ->> 'stream_url'),
      notes = private.club_text(p, 'notes', 1000),
      status = case when status in ('live','half_time','finished') then status else v_status end,
      updated_at = now()
    where id = p_id and organization_id = p_org
    returning id into v_id;
    if v_id is null then raise exception 'Match not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_club_match(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.club_matches where id = p_id;
  if v_org is null then raise exception 'Match not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_org, 'content');
  delete from public.club_matches where id = p_id;
end;
$$;

/* The scoreboard: status, score, clock, period, stream. Going live and the
   final whistle tell the club's followers. */
create or replace function public.update_match_live(p_match uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_m      public.club_matches;
  v_status text;
  v_name   text;
  v_was_started  boolean;
  v_was_finished boolean;
begin
  select * into v_m from public.club_matches where id = p_match for update;
  if not found then raise exception 'Match not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_m.organization_id, 'score');
  v_was_started := v_m.started_at is not null;
  v_was_finished := v_m.status = 'finished';

  v_status := coalesce(p ->> 'status', v_m.status);
  if v_status not in ('scheduled','live','half_time','finished','postponed','cancelled') then
    raise exception 'Unknown status' using errcode = '22023';
  end if;

  update public.club_matches set
    status      = v_status,
    our_score   = case when p ? 'our_score' then greatest(0, (p ->> 'our_score')::integer) else our_score end,
    their_score = case when p ? 'their_score' then greatest(0, (p ->> 'their_score')::integer) else their_score end,
    minute      = case when p ? 'minute' then nullif(p ->> 'minute', '')::integer else minute end,
    period      = case when p ? 'period' then private.club_text(p, 'period', 20) else period end,
    stream_url  = case when p ? 'stream_url' then private.club_stream_url(p ->> 'stream_url') else stream_url end,
    started_at  = case when v_status in ('live','half_time') and started_at is null then now() else started_at end,
    finished_at = case when v_status = 'finished' and finished_at is null then now()
                       when v_status <> 'finished' then null else finished_at end,
    updated_at  = now()
  where id = p_match
  returning * into v_m;

  select name into v_name from public.organizations where id = v_m.organization_id;
  if v_status = 'live' and not v_was_started then
    perform private.club_notify_audience(v_m.organization_id, 'all', 'club_match_live',
      v_name || ' vs ' || v_m.opponent_name || ' is live', null, 'club_match', p_match::text,
      'club_match_live:' || p_match::text, jsonb_build_object('match_id', p_match));
  elsif v_status = 'finished' and not v_was_finished then
    perform private.club_notify_audience(v_m.organization_id, 'all', 'club_match_result',
      v_name || ' ' || v_m.our_score || '–' || v_m.their_score || ' ' || v_m.opponent_name, null,
      'club_match', p_match::text, 'club_match_result:' || p_match::text,
      jsonb_build_object('match_id', p_match));
  end if;

  return jsonb_build_object('status', v_m.status, 'our_score', v_m.our_score,
                            'their_score', v_m.their_score, 'minute', v_m.minute, 'period', v_m.period);
end;
$$;

/* A goal, a card, a substitution, a point. Scoring events move the score,
   so the board and the timeline never disagree. */
create or replace function public.add_match_event(p_match uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_m      public.club_matches;
  v_kind   text := p ->> 'kind';
  v_side   text := coalesce(p ->> 'side', 'us');
  v_points integer := 0;
  v_member uuid := nullif(p ->> 'squad_member_id', '')::uuid;
  v_name   text := private.club_text(p, 'player_name', 80);
  v_id     uuid;
begin
  select * into v_m from public.club_matches where id = p_match for update;
  if not found then raise exception 'Match not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_m.organization_id, 'score');
  if v_kind not in ('goal','own_goal','penalty_goal','point','yellow_card','red_card',
                    'substitution','timeout','period','note') then
    raise exception 'Unknown event' using errcode = '22023';
  end if;
  if v_side not in ('us','them') then
    raise exception 'Unknown side' using errcode = '22023';
  end if;
  if v_member is not null then
    if not exists (select 1 from public.club_squad_members
                   where id = v_member and organization_id = v_m.organization_id) then
      raise exception 'Player not found' using errcode = 'P0002';
    end if;
    if v_name is null then
      select display_name into v_name from public.club_squad_members where id = v_member;
    end if;
  end if;

  v_points := case v_kind
    when 'goal' then 1 when 'penalty_goal' then 1 when 'own_goal' then 1
    when 'point' then least(6, greatest(1, coalesce(nullif(p ->> 'points', '')::integer, 1)))
    else 0 end;

  insert into public.club_match_events (match_id, organization_id, minute, kind, side, points,
    squad_member_id, player_name, detail, created_by)
  values (p_match, v_m.organization_id, coalesce(nullif(p ->> 'minute', '')::integer, v_m.minute),
    v_kind, v_side, v_points, v_member, v_name, private.club_text(p, 'detail', 200), auth.uid())
  returning id into v_id;

  /* An own goal is recorded on the side that scored it — `side` is the team
     whose score goes up. */
  update public.club_matches set
    our_score   = our_score   + case when v_side = 'us'   then v_points else 0 end,
    their_score = their_score + case when v_side = 'them' then v_points else 0 end,
    updated_at  = now()
  where id = p_match;
  return v_id;
end;
$$;

create or replace function public.delete_match_event(p_event uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_e public.club_match_events;
begin
  select * into v_e from public.club_match_events where id = p_event;
  if not found then raise exception 'Event not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_e.organization_id, 'score');
  delete from public.club_match_events where id = p_event;
  update public.club_matches set
    our_score   = greatest(0, our_score   - case when v_e.side = 'us'   then v_e.points else 0 end),
    their_score = greatest(0, their_score - case when v_e.side = 'them' then v_e.points else 0 end),
    updated_at  = now()
  where id = v_e.match_id;
end;
$$;

create or replace function private.club_match_json(m public.club_matches)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', m.id, 'organization_id', m.organization_id, 'sport', m.sport, 'squad_id', m.squad_id,
    'category', m.category, 'competition', m.competition, 'opponent_name', m.opponent_name,
    'opponent_org_id', m.opponent_org_id, 'is_home', m.is_home, 'venue', m.venue,
    'kickoff_at', m.kickoff_at, 'status', m.status, 'our_score', m.our_score,
    'their_score', m.their_score, 'period', m.period, 'minute', m.minute,
    'stream_url', m.stream_url, 'notes', m.notes, 'started_at', m.started_at,
    'finished_at', m.finished_at, 'updated_at', m.updated_at
  );
$$;

create or replace function public.club_match_page(p_match uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_m     public.club_matches;
  v_org   public.organizations;
  v_full  boolean;
  v_youth boolean;
begin
  select * into v_m from public.club_matches where id = p_match;
  if not found then return null; end if;
  select * into v_org from public.organizations where id = v_m.organization_id;
  v_full := private.org_can(v_m.organization_id, 'member');
  v_youth := private.is_youth_category(v_m.category);

  return jsonb_build_object(
    'match', private.club_match_json(v_m),
    'organization', jsonb_build_object('id', v_org.id, 'name', v_org.name, 'logo_url', v_org.logo_url,
                                       'is_verified', v_org.is_verified),
    'can_score', private.org_can(v_m.organization_id, 'score'),
    'can_edit', private.org_can(v_m.organization_id, 'content'),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'minute', e.minute, 'kind', e.kind, 'side', e.side, 'points', e.points,
        'detail', e.detail, 'created_at', e.created_at,
        'player_name', case
            when e.player_name is null then null
            when v_full then e.player_name
            when e.squad_member_id is not null then
              (select private.club_member_json(sm, v_youth, false) ->> 'display_name'
               from public.club_squad_members sm where sm.id = e.squad_member_id)
            when v_youth and e.side = 'us' then private.short_person_name(e.player_name)
            else e.player_name end,
        'player_user_id', (select private.club_member_json(sm, v_youth, v_full) ->> 'user_id'
                           from public.club_squad_members sm where sm.id = e.squad_member_id)
      ) order by e.minute nulls last, e.created_at)
      from public.club_match_events e where e.match_id = p_match), '[]'::jsonb),
    'lineup', case when private.org_can(v_m.organization_id, 'score') and v_m.squad_id is not null then
      coalesce((select jsonb_agg(jsonb_build_object('id', sm.id, 'display_name', sm.display_name,
                                                    'shirt_number', sm.shirt_number)
                                 order by sm.shirt_number nulls last, sm.display_name)
                from public.club_squad_members sm
                where sm.squad_id = v_m.squad_id and sm.kind = 'player'), '[]'::jsonb)
      else null end
  );
end;
$$;

create or replace function public.club_matches_for(p_org uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'live', coalesce((select jsonb_agg(private.club_match_json(m) order by m.kickoff_at)
                      from public.club_matches m
                      where m.organization_id = p_org and m.status in ('live','half_time')), '[]'::jsonb),
    'upcoming', coalesce((select jsonb_agg(private.club_match_json(m) order by m.kickoff_at)
                          from (select * from public.club_matches
                                where organization_id = p_org and status in ('scheduled','postponed')
                                  and kickoff_at >= now() - interval '6 hours'
                                order by kickoff_at limit 20) m), '[]'::jsonb),
    'results', coalesce((select jsonb_agg(private.club_match_json(m) order by m.kickoff_at desc)
                         from (select * from public.club_matches
                               where organization_id = p_org
                                 and (status in ('finished','cancelled')
                                      or (status in ('scheduled','postponed') and kickoff_at < now() - interval '6 hours'))
                               order by kickoff_at desc limit 30) m), '[]'::jsonb)
  );
$$;

-- ------------------------------------------------------------
-- 16. Awards
-- ------------------------------------------------------------
create or replace function public.save_club_award(p_org uuid, p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id    uuid;
  v_kind  text := coalesce(p ->> 'recipient_kind', 'club');
  v_place text := coalesce(p ->> 'placement', 'winner');
  v_user  uuid := nullif(p ->> 'recipient_user_id', '')::uuid;
begin
  perform private.require_org(p_org, 'content');
  if length(coalesce(private.club_text(p, 'title', 120), '')) < 2 then
    raise exception 'Name the award' using errcode = '22023', hint = 'club_award_title';
  end if;
  if v_kind not in ('club','player','coach') or v_place not in
     ('winner','runner_up','third','finalist','individual','other') then
    raise exception 'Unknown award type' using errcode = '22023';
  end if;
  /* A profile can be linked only if that person accepted a place on one of
     this club's squads. */
  if v_user is not null and not exists (
       select 1 from public.club_squad_members m
       where m.organization_id = p_org and m.user_id = v_user and m.link_status = 'accepted') then
    raise exception 'Link only people on your squads' using errcode = '42501', hint = 'club_award_link';
  end if;
  if v_kind = 'club' then v_user := null; end if;

  if p_id is null then
    insert into public.club_awards (organization_id, created_by, title, competition, year, season_label,
      sport, category, placement, recipient_kind, recipient_name, recipient_user_id, image_url, description)
    values (p_org, auth.uid(), private.club_text(p, 'title', 120), private.club_text(p, 'competition', 120),
      nullif(p ->> 'year', '')::integer, private.club_text(p, 'season_label', 20),
      private.club_text(p, 'sport', 40), private.club_text(p, 'category', 30), v_place, v_kind,
      case when v_kind = 'club' then null else private.club_text(p, 'recipient_name', 80) end,
      v_user, private.club_text(p, 'image_url', 1000), private.club_text(p, 'description', 600))
    returning id into v_id;
  else
    update public.club_awards set
      title = private.club_text(p, 'title', 120), competition = private.club_text(p, 'competition', 120),
      year = nullif(p ->> 'year', '')::integer, season_label = private.club_text(p, 'season_label', 20),
      sport = private.club_text(p, 'sport', 40), category = private.club_text(p, 'category', 30),
      placement = v_place, recipient_kind = v_kind,
      recipient_name = case when v_kind = 'club' then null else private.club_text(p, 'recipient_name', 80) end,
      recipient_user_id = v_user, image_url = private.club_text(p, 'image_url', 1000),
      description = private.club_text(p, 'description', 600)
    where id = p_id and organization_id = p_org
    returning id into v_id;
    if v_id is null then raise exception 'Award not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_club_award(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.club_awards where id = p_id;
  if v_org is null then raise exception 'Award not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_org, 'content');
  delete from public.club_awards where id = p_id;
end;
$$;

create or replace function public.club_awards_for(p_org uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'title', a.title, 'competition', a.competition, 'year', a.year,
    'season_label', a.season_label, 'sport', a.sport, 'category', a.category,
    'placement', a.placement, 'recipient_kind', a.recipient_kind,
    'recipient_name', case
        when a.recipient_name is null then null
        when private.org_can(p_org, 'member') then a.recipient_name
        when a.recipient_user_id is not null and private.user_publicly_visible(a.recipient_user_id)
          then coalesce(up.full_name, a.recipient_name)
        when private.is_youth_category(a.category) then private.short_person_name(a.recipient_name)
        else a.recipient_name end,
    'recipient_user_id', case when a.recipient_user_id is not null
        and (private.org_can(p_org, 'member') or private.user_publicly_visible(a.recipient_user_id))
        then a.recipient_user_id end,
    'image_url', a.image_url, 'description', a.description
  ) order by a.year desc nulls last, a.created_at desc), '[]'::jsonb)
  from public.club_awards a
  left join public.user_profiles up on up.id = a.recipient_user_id
  where a.organization_id = p_org;
$$;

-- ------------------------------------------------------------
-- 17. Posts on the page, and the page itself
-- ------------------------------------------------------------
create or replace function public.club_posts(p_org uuid, p_limit integer default 24, p_before timestamptz default null)
returns table (
  id uuid, author_id uuid, author_name text, author_avatar text, type text, caption text, media jsonb,
  like_count integer, comment_count integer, viewer_liked boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.author_id, up.full_name::text, up.avatar_url::text, p.type::text,
         coalesce(p.caption, p.text)::text, p.media, p.like_count, p.comments_count,
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.created_at
  from public.posts p
  join public.user_profiles up on up.id = p.author_id
  where auth.uid() is not null
    and p.organization_id = p_org
    and not p.is_hidden
    and p.moderation_state = 'visible'
    and not up.is_suspended
    and not private.users_are_blocked(auth.uid(), p.author_id)
    and (
      p.author_id = auth.uid()
      or p.audience = 'public'
      or private.org_can(p_org, 'member')
      or (p.audience = 'followers' and (
            exists (select 1 from public.organization_follows f
                    where f.follower_id = auth.uid() and f.organization_id = p_org)
            or exists (select 1 from public.follows f
                       where f.follower_id = auth.uid() and f.following_id = p.author_id)))
    )
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 24), 50));
$$;

create or replace function public.club_page(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_org   public.organizations;
  v_role  text;
  v_story_author uuid;
  v_story_unseen integer;
begin
  select * into v_org from public.organizations where id = p_org;
  if not found then return null; end if;
  v_role := private.org_role(p_org);

  select s.author_id,
         count(*) filter (where not exists (select 1 from public.story_views v
                                            where v.story_id = s.id and v.viewer_id = auth.uid()))
    into v_story_author, v_story_unseen
  from public.stories s
  where s.organization_id = p_org and s.expires_at > now()
    and private.viewer_can_see_story(s.author_id, s.audience, s.expires_at)
  group by s.author_id
  order by max(s.created_at) desc
  limit 1;

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_org.id, 'name', v_org.name, 'name_local', v_org.name_local, 'type', v_org.type,
      'logo_url', v_org.logo_url, 'cover_url', v_org.cover_url, 'description', v_org.description,
      'country', v_org.country, 'city', v_org.city, 'address', v_org.address,
      'latitude', v_org.latitude, 'longitude', v_org.longitude,
      'website', v_org.website, 'contact_email', v_org.contact_email, 'contact_phone', v_org.contact_phone,
      'socials', v_org.socials, 'facilities', v_org.facilities, 'league', v_org.league,
      'founded_year', v_org.founded_year, 'ceo_name', v_org.ceo_name,
      'about_story', v_org.about_story, 'mission', v_org.mission, 'philosophy', v_org.philosophy,
      'is_verified', v_org.is_verified, 'verification_status', v_org.verification_status,
      'followers_count', v_org.followers_count, 'primary_color', v_org.primary_color
    ),
    'sports', coalesce((select jsonb_agg(jsonb_build_object('sport', s.sport, 'categories', to_jsonb(s.categories))
                                         order by s.sort, s.sport)
                        from public.organization_sports s where s.organization_id = p_org), '[]'::jsonb),
    'locations', coalesce((select jsonb_agg(jsonb_build_object(
                             'id', l.id, 'label', l.label, 'address', l.address, 'city', l.city,
                             'country', l.country, 'latitude', l.latitude, 'longitude', l.longitude,
                             'is_primary', l.is_primary) order by l.is_primary desc, l.created_at)
                           from public.organization_locations l where l.organization_id = p_org), '[]'::jsonb),
    'viewer', jsonb_build_object(
      'following', exists (select 1 from public.organization_follows f
                           where f.organization_id = p_org and f.follower_id = auth.uid()),
      'role', v_role,
      'can_manage', private.org_can(p_org, 'manage'),
      'can_post', private.org_can(p_org, 'content'),
      'can_score', private.org_can(p_org, 'score'),
      'pending_invite', (select jsonb_build_object('role', m.member_role)
                         from public.organization_members m
                         where m.organization_id = p_org and m.user_id = auth.uid()
                           and m.status = 'pending' and m.invited_by is not null),
      'squad_links', coalesce((select jsonb_agg(jsonb_build_object(
                                 'id', m.id, 'kind', m.kind, 'sport', q.sport, 'category', q.category,
                                 'status', m.link_status))
                               from public.club_squad_members m
                               join public.club_squads q on q.id = m.squad_id
                               where m.organization_id = p_org and m.user_id = auth.uid()
                                 and m.link_status in ('invited','accepted')), '[]'::jsonb)
    ),
    'verification', case when private.org_can(p_org, 'manage') then
      (select jsonb_build_object('license_number', v.license_number,
                                 'has_document', v.document_path is not null,
                                 'contact_person_name', v.contact_person_name,
                                 'contact_person_title', v.contact_person_title,
                                 'terms_accepted', v.terms_accepted_at is not null,
                                 'submitted_at', v.submitted_at, 'review_note', v.review_note)
       from public.organization_verification v where v.organization_id = p_org)
      else null end,
    'story', case when v_story_author is null then null
                  else jsonb_build_object('author_id', v_story_author, 'unseen', v_story_unseen) end,
    'live_match', (select private.club_match_json(m) from public.club_matches m
                   where m.organization_id = p_org and m.status in ('live','half_time')
                   order by m.kickoff_at limit 1),
    'next_match', (select private.club_match_json(m) from public.club_matches m
                   where m.organization_id = p_org and m.status = 'scheduled' and m.kickoff_at > now()
                   order by m.kickoff_at limit 1),
    'counts', jsonb_build_object(
      'posts', (select count(*) from public.posts p where p.organization_id = p_org
                and not p.is_hidden and p.moderation_state = 'visible'),
      'awards', (select count(*) from public.club_awards a where a.organization_id = p_org),
      'players', (select count(*) from public.club_squad_members m
                  join public.club_squads q on q.id = m.squad_id
                  join public.club_seasons se on se.id = q.season_id and se.is_current
                  where m.organization_id = p_org and m.kind = 'player'),
      'open_events', (select count(*) from public.club_events e where e.organization_id = p_org
                      and e.status = 'scheduled' and e.starts_at > now()),
      'open_challenges', (select count(*) from public.challenges c where c.organization_id = p_org
                          and c.status = 'open' and c.closes_at > now())
    )
  );
end;
$$;

-- ------------------------------------------------------------
-- 18. Grants
-- ------------------------------------------------------------
/* org_can is named in the read policies of the new tables (a policy runs as
   the querying user), so signed-in users keep EXECUTE on it. Everything else
   here is reachable only through the SECURITY DEFINER functions above. */
revoke all on function private.org_can(uuid, text) from public, anon;
grant execute on function private.org_can(uuid, text) to authenticated;
revoke all on function private.org_role(uuid) from public, anon, authenticated;
revoke all on function private.is_youth_category(text) from public, anon, authenticated;
revoke all on function private.short_person_name(text) from public, anon, authenticated;
revoke all on function private.club_text(jsonb, text, integer) from public, anon, authenticated;
revoke all on function private.club_url(text) from public, anon, authenticated;
revoke all on function private.club_stream_url(text) from public, anon, authenticated;

revoke all on function private.require_org(uuid, text) from public, anon, authenticated;
revoke all on function private.club_audience(uuid, text) from public, anon, authenticated;
revoke all on function private.club_notify_audience(uuid, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.club_notify_managers(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.club_apply_sports(uuid, jsonb) from public, anon, authenticated;
revoke all on function private.club_event_gate(public.club_events) from public, anon, authenticated;
revoke all on function private.club_member_json(public.club_squad_members, boolean, boolean) from public, anon, authenticated;
revoke all on function private.club_match_json(public.club_matches) from public, anon, authenticated;
revoke all on function private.user_publicly_visible(uuid) from public, anon, authenticated;
revoke all on function private.tag_club_content() from public, anon, authenticated;

do $$
declare v_fn text;
begin
  foreach v_fn in array array[
    'public.create_club_page(jsonb)',
    'public.update_club_page(uuid, jsonb)',
    'public.submit_club_verification(uuid, jsonb)',
    'public.invite_club_member(uuid, text, text)',
    'public.respond_club_invite(uuid, boolean)',
    'public.set_club_member_role(uuid, uuid, text)',
    'public.remove_club_member(uuid, uuid)',
    'public.club_team(uuid)',
    'public.my_club_pages()',
    'public.send_club_broadcast(uuid, text, text, text)',
    'public.club_broadcasts_for(uuid, integer)',
    'public.club_challenges(uuid)',
    'public.save_club_event(uuid, uuid, jsonb)',
    'public.cancel_club_event(uuid)',
    'public.register_for_club_event(uuid, text)',
    'public.cancel_club_event_registration(uuid, uuid)',
    'public.club_event_page(uuid)',
    'public.club_events_for(uuid)',
    'public.save_club_season(uuid, uuid, text, boolean)',
    'public.save_club_squad(uuid, uuid, jsonb)',
    'public.delete_club_squad(uuid)',
    'public.save_squad_member(uuid, uuid, jsonb)',
    'public.delete_squad_member(uuid)',
    'public.respond_squad_link(uuid, boolean)',
    'public.club_squads_page(uuid, uuid)',
    'public.save_club_match(uuid, uuid, jsonb)',
    'public.delete_club_match(uuid)',
    'public.update_match_live(uuid, jsonb)',
    'public.add_match_event(uuid, jsonb)',
    'public.delete_match_event(uuid)',
    'public.club_match_page(uuid)',
    'public.club_matches_for(uuid)',
    'public.save_club_award(uuid, uuid, jsonb)',
    'public.delete_club_award(uuid)',
    'public.club_awards_for(uuid)',
    'public.club_posts(uuid, integer, timestamptz)',
    'public.club_page(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', v_fn);
    execute format('grant execute on function %s to authenticated', v_fn);
  end loop;
end $$;
