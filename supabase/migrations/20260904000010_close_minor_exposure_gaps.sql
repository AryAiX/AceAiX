-- ============================================================
-- 0904/10 — Closing the ways a minor could still be exposed
--
-- Writing the safety documentation turned up four routes around the
-- discovery gate. Each one is small on its own; together they meant a
-- 14-year-old whose guardian had not yet approved anything was still
-- reachable by name.
--
--   1. talent_leaderboard filtered on sport and country only — no minor,
--      discoverability, block or suspension check. A non-consented minor
--      appeared on a public ranking, by name, to every signed-in user.
--   2. Name search read user_profiles directly, so it bypassed the gate
--      entirely. This migration gives it an RPC with the same rules as
--      discovery.
--   3. discover_athletes and opportunity_applicants returned a minor's exact
--      age in years, which the UI rendered as "Age 14". Only the band should
--      leave the server; the age filters keep working on the real date.
--   4. guardian_user_id was never populated, so a parent who made their own
--      account could never see or revoke the consent they had given.
--
-- Also fixed here: the two dates of birth could drift apart, and deleting an
-- account left its uploaded files behind.
-- ============================================================

-- ------------------------------------------------------------
-- 1. The leaderboard obeys the same rules as everything else
-- ------------------------------------------------------------
create or replace function public.talent_leaderboard(
  p_sport   text default null,
  p_country text default null,
  p_limit   integer default 25
)
returns table (
  athlete_id uuid,
  user_id    uuid,
  full_name  text,
  avatar_url text,
  sport      text,
  "position" text,
  country    text,
  overall    integer,
  tier       text,
  rank       bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    ap.id,
    ap.user_id,
    up.full_name::text,
    up.avatar_url::text,
    ap.sport::text,
    coalesce(ap.position_primary, ap.position)::text,
    up.country::text,
    ts.overall,
    ts.tier,
    row_number() over (order by ts.overall desc, ts.updated_at asc)
  from public.talent_scores ts
  join public.athlete_profiles ap on ap.id = ts.athlete_id
  join public.user_profiles   up on up.id = ap.user_id
  where auth.uid() is not null
    and (p_sport   is null or ap.sport   ilike p_sport)
    and (p_country is null or up.country ilike p_country)
    and coalesce(ap.is_open_to_offers, true)
    and not coalesce(up.is_suspended, false)
    -- A minor appears only once a guardian has approved discovery.
    and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = ap.user_id)
         or (b.blocker_id = ap.user_id and b.blocked_id = auth.uid())
    )
  order by ts.overall desc, ts.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

revoke all on function public.talent_leaderboard(text, text, integer) from public, anon;
grant execute on function public.talent_leaderboard(text, text, integer) to authenticated;

-- ------------------------------------------------------------
-- 2. Searching for people, with the gate applied
--
-- The client used to select from user_profiles directly. That table is
-- readable by any signed-in account by design — the profile of someone you
-- are already talking to has to load — but a *search* is discovery, and
-- discovery for minors requires consent.
-- ------------------------------------------------------------
create or replace function public.search_people(
  p_query text,
  p_role  text default null,          -- athlete | coach | club | scout | null
  p_limit integer default 20
)
returns table (
  id              uuid,
  role            text,
  full_name       text,
  avatar_url      text,
  bio             text,
  city            text,
  country         text,
  is_verified     boolean,
  is_minor        boolean,
  followers_count integer,
  sport           text,
  "position"      text,
  talent_score    integer,
  tier            text,
  is_following    boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    up.id,
    up.role::text,
    up.full_name::text,
    up.avatar_url::text,
    up.bio,
    up.city::text,
    up.country::text,
    up.is_verified,
    up.is_minor,
    up.followers_count,
    ap.sport::text,
    coalesce(ap.position_primary, ap.position)::text,
    coalesce(ts.overall, 0),
    coalesce(ts.tier, 'rising')::text,
    exists (select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = up.id)
  from public.user_profiles up
  left join public.athlete_profiles ap on ap.user_id = up.id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where auth.uid() is not null
    and coalesce(trim(p_query), '') <> ''
    and up.full_name ilike '%' || trim(p_query) || '%'
    and up.id <> auth.uid()
    and not coalesce(up.is_suspended, false)
    and (p_role is null or up.role::text = p_role)
    and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
         or (b.blocker_id = up.id and b.blocked_id = auth.uid())
    )
  order by up.is_verified desc, coalesce(ts.overall, 0) desc, up.full_name asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.search_people(text, text, integer) from public, anon;
grant execute on function public.search_people(text, text, integer) to authenticated;

-- ------------------------------------------------------------
-- 3. A minor's exact age never leaves the server
--
-- Filtering on age stays exact — a recruiter looking for an U16 squad is
-- asking a question, not being told an answer. What comes back for an
-- under-18 is the band.
-- ------------------------------------------------------------
-- Signatures change below (a new `age_band` column), and PostgreSQL will not
-- replace a function whose OUT parameters differ. Dropping first is safe:
-- these are recreated a few lines down, in the same transaction-per-file run.
drop function if exists public.recommended_athletes(integer);
drop function if exists public.discover_athletes(
  text, text, text[], text[], text[], integer, integer, integer, boolean, text, integer, integer);
drop function if exists public.opportunity_applicants(uuid);

create or replace function public.discover_athletes(
  p_query      text default null,
  p_sport      text default null,
  p_positions  text[] default null,
  p_levels     text[] default null,
  p_countries  text[] default null,
  p_age_min    integer default null,
  p_age_max    integer default null,
  p_min_score  integer default null,
  p_open_only  boolean default false,
  p_sort       text default 'match',
  p_limit      integer default 20,
  p_offset     integer default 0
)
returns table (
  athlete_id     uuid,
  user_id        uuid,
  full_name      text,
  avatar_url     text,
  sport          text,
  "position"     text,
  level          text,
  league         text,
  club           text,
  city           text,
  country        text,
  age            integer,
  age_band       text,
  height_cm      numeric,
  is_verified    boolean,
  is_minor       boolean,
  open_to_offers boolean,
  talent_score   integer,
  tier           text,
  match_percent  integer,
  reasons        jsonb,
  total_count    bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return query
  with base as (
    select
      ap.id                                              as athlete_id,
      ap.user_id                                         as user_id,
      up.full_name::text                                 as full_name,
      up.avatar_url::text                                as avatar_url,
      ap.sport::text                                     as sport,
      coalesce(ap.position_primary, ap.position)::text   as position,
      ap.level::text                                     as level,
      ap.league::text                                    as league,
      coalesce(o.name, ap.current_club)::text            as club,
      up.city::text                                      as city,
      up.country::text                                   as country,
      case when ap.birth_date is not null
        then extract(year from age(ap.birth_date))::int end as real_age,
      up.age_band::text                                  as age_band,
      ap.height_cm                                       as height_cm,
      up.is_verified                                     as is_verified,
      coalesce(up.is_minor, false)                       as is_minor,
      coalesce(ap.is_open_to_offers, true)               as open_to_offers,
      coalesce(ts.overall, 0)                            as talent_score,
      coalesce(ts.tier, 'rising')::text                  as tier,
      ap.updated_at                                      as updated_at
    from public.athlete_profiles ap
    join public.user_profiles up on up.id = ap.user_id
    left join public.talent_scores ts on ts.athlete_id = ap.id
    left join public.organizations o on o.id = ap.current_club_id
    where
      not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_viewer and b.blocked_id = ap.user_id)
           or (b.blocker_id = ap.user_id and b.blocked_id = v_viewer)
      )
      and coalesce(up.is_suspended, false) = false
      and (coalesce(up.is_minor, false) = false or coalesce(up.is_discoverable, false))
      and ap.user_id <> v_viewer
  ),
  filtered as (
    select
      b.*,
      (p_sport     is null or b.sport ilike p_sport)                          as sport_ok,
      (p_positions is null or cardinality(p_positions) = 0
         or b.position = any(p_positions))                                    as position_ok,
      ((p_age_min is null and p_age_max is null)
        or (b.real_age is not null
            and b.real_age >= coalesce(p_age_min, 0)
            and b.real_age <= coalesce(p_age_max, 99)))                       as age_ok,
      (p_levels    is null or cardinality(p_levels) = 0
         or b.level = any(p_levels))                                          as level_ok,
      (p_countries is null or cardinality(p_countries) = 0
         or b.country = any(p_countries))                                     as country_ok
    from base b
    where (p_query is null or trim(p_query) = '' or
           b.full_name ilike '%' || p_query || '%' or
           b.club      ilike '%' || p_query || '%' or
           b.position  ilike '%' || p_query || '%' or
           b.sport     ilike '%' || p_query || '%')
      and (p_sport     is null or b.sport ilike p_sport)
      and (p_positions is null or cardinality(p_positions) = 0 or b.position = any(p_positions))
      and (p_levels    is null or cardinality(p_levels) = 0 or b.level = any(p_levels))
      and (p_countries is null or cardinality(p_countries) = 0 or b.country = any(p_countries))
      and (p_age_min   is null or (b.real_age is not null and b.real_age >= p_age_min))
      and (p_age_max   is null or (b.real_age is not null and b.real_age <= p_age_max))
      and (p_min_score is null or b.talent_score >= p_min_score)
      and (not p_open_only or b.open_to_offers)
  ),
  scored as (
    select
      f.*,
      private.match_fit(f.talent_score, f.sport_ok, f.position_ok, f.age_ok,
                        f.level_ok, f.country_ok, f.open_to_offers) as match_percent,
      private.match_reasons(f.sport_ok, f.position_ok, f.age_ok,
                            f.level_ok, f.country_ok, f.talent_score) as reasons,
      count(*) over () as total_count
    from filtered f
  )
  select
    s.athlete_id, s.user_id, s.full_name, s.avatar_url, s.sport, s.position,
    s.level, s.league, s.club, s.city, s.country,
    /* Exact years for adults; nothing for a minor. */
    case when s.is_minor then null else s.real_age end,
    s.age_band,
    s.height_cm,
    s.is_verified, s.is_minor, s.open_to_offers, s.talent_score, s.tier,
    s.match_percent, s.reasons, s.total_count
  from scored s
  order by
    case when p_sort = 'match'  then s.match_percent end desc nulls last,
    case when p_sort = 'score'  then s.talent_score  end desc nulls last,
    case when p_sort = 'recent' then s.updated_at    end desc nulls last,
    case when p_sort = 'name'   then s.full_name     end asc  nulls last,
    s.match_percent desc, s.talent_score desc
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke all on function public.discover_athletes(text, text, text[], text[], text[], integer, integer, integer, boolean, text, integer, integer) from public, anon;
grant execute on function public.discover_athletes(text, text, text[], text[], text[], integer, integer, integer, boolean, text, integer, integer) to authenticated;

-- recommended_athletes forwards the new columns.
create or replace function public.recommended_athletes(p_limit integer default 12)
returns table (
  athlete_id uuid, user_id uuid, full_name text, avatar_url text,
  sport text, "position" text, level text, club text, country text,
  age integer, age_band text, is_verified boolean, is_minor boolean,
  talent_score integer, tier text, match_percent integer, reasons jsonb,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare p record;
begin
  select mp.* into p from public.match_preferences mp where mp.user_id = auth.uid();

  return query
  select d.athlete_id, d.user_id, d.full_name, d.avatar_url, d.sport, d."position",
         d.level, d.club, d.country, d.age, d.age_band, d.is_verified, d.is_minor,
         d.talent_score, d.tier, d.match_percent, d.reasons, d.total_count
  from public.discover_athletes(
    null,
    case when p.sports is not null and cardinality(p.sports) > 0 then p.sports[1] end,
    p.positions, p.levels, p.countries,
    p.age_min, p.age_max, p.min_score,
    coalesce(p.open_to_offers_only, true),
    'match',
    coalesce(p_limit, 12),
    0
  ) d;
end;
$$;

revoke all on function public.recommended_athletes(integer) from public, anon;
grant execute on function public.recommended_athletes(integer) to authenticated;

-- The applicant list is read by the club the athlete applied to, so the band
-- is still the right level of detail before any contact has happened.
create or replace function public.opportunity_applicants(p_opportunity uuid)
returns table (
  application_id  uuid,
  athlete_user_id uuid,
  athlete_id      uuid,
  full_name       text,
  avatar_url      text,
  "position"      text,
  age             integer,
  age_band        text,
  is_minor        boolean,
  country         text,
  talent_score    integer,
  tier            text,
  match_percent   integer,
  status          text,
  message         text,
  applied_at      timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare o record;
begin
  select * into o from public.opportunities where id = p_opportunity;
  if not found then
    raise exception 'Opportunity not found' using errcode = 'P0002';
  end if;
  if not (o.created_by_id = auth.uid()
          or private.is_admin()
          or (o.organization_id is not null
              and private.is_org_member(o.organization_id, array['owner','manager','scout','coach']))) then
    raise exception 'Not allowed to review these applicants' using errcode = '42501';
  end if;

  return query
  select
    a.id, a.athlete_id, ap.id, up.full_name::text, up.avatar_url::text,
    coalesce(ap.position_primary, ap.position)::text,
    case when coalesce(up.is_minor, false) or ap.birth_date is null then null
         else extract(year from age(ap.birth_date))::int end,
    up.age_band::text,
    coalesce(up.is_minor, false),
    up.country::text,
    coalesce(ts.overall, 0), coalesce(ts.tier, 'rising')::text,
    private.match_fit(
      coalesce(ts.overall, 0),
      (o.sport is null or o.sport ilike ap.sport),
      (o.position is null or o.position = coalesce(ap.position_primary, ap.position)),
      true, true, true, coalesce(ap.is_open_to_offers, true)),
    a.status, a.message, a.created_at
  from public.applications a
  join public.user_profiles up on up.id = a.athlete_id
  left join public.athlete_profiles ap on ap.user_id = a.athlete_id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where a.opportunity_id = p_opportunity
  order by 13 desc, a.created_at asc;
end;
$$;

revoke all on function public.opportunity_applicants(uuid) from public, anon;
grant execute on function public.opportunity_applicants(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. Link a guardian's own account to the consent they gave
--
-- The RLS branches that let a guardian read and revoke consent matched on
-- guardian_user_id, which nothing ever set — so the guardian view of the app
-- was permanently empty. Matching on the address the consent was sent to
-- connects the two the moment that person signs up, in either order.
-- ------------------------------------------------------------
create or replace function private.link_guardian_account()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is null then return new; end if;

  update public.guardian_consents
  set guardian_user_id = new.user_id, updated_at = now()
  where guardian_user_id is null
    and lower(guardian_email) = lower(new.email);

  return new;
end;
$$;

drop trigger if exists trg_user_private_link_guardian on public.user_private;
create trigger trg_user_private_link_guardian
  after insert or update of email on public.user_private
  for each row execute function private.link_guardian_account();

create or replace function private.link_guardian_on_consent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.guardian_user_id is null then
    select p.user_id into new.guardian_user_id
    from public.user_private p
    where lower(p.email) = lower(new.guardian_email)
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guardian_consent_link on public.guardian_consents;
create trigger trg_guardian_consent_link
  before insert on public.guardian_consents
  for each row execute function private.link_guardian_on_consent();

-- Backfill both directions for rows that already exist.
update public.guardian_consents g
set guardian_user_id = p.user_id
from public.user_private p
where g.guardian_user_id is null
  and lower(p.email) = lower(g.guardian_email);

/* What a guardian is allowed to see: that a conversation exists and who it is
   with — never its contents. This is exactly what the in-app notice to
   minors promises, and nothing more. */
create or replace function public.guardian_conversation_overview(p_minor uuid)
returns table (
  conversation_id uuid,
  other_name      text,
  other_role      text,
  other_verified  boolean,
  message_count   integer,
  last_message_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.guardian_consents g
    where g.minor_user_id = p_minor
      and g.guardian_user_id = auth.uid()
      and g.status = 'granted'
  ) and not private.is_admin() then
    raise exception 'Not a linked guardian for this account' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    other.full_name::text,
    other.role::text,
    other.is_verified,
    (select count(*)::int from public.messages m where m.conversation_id = c.id),
    c.last_message_at
  from public.conversations c
  join public.user_profiles other
    on other.id = case when c.participant_1_id = p_minor
                       then c.participant_2_id else c.participant_1_id end
  where c.participant_1_id = p_minor or c.participant_2_id = p_minor
  order by coalesce(c.last_message_at, c.created_at) desc;
end;
$$;

revoke all on function public.guardian_conversation_overview(uuid) from public, anon;
grant execute on function public.guardian_conversation_overview(uuid) to authenticated;

/* The minors a signed-in guardian is linked to. */
create or replace function public.my_linked_minors()
returns table (
  minor_user_id uuid,
  full_name     text,
  avatar_url    text,
  age_band      text,
  consent_id    uuid,
  status        text,
  allow_discovery boolean,
  allow_messaging boolean,
  allow_media     boolean,
  granted_at      timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  /* One row per young person, not one per consent request. A minor may have
     asked more than once — expired, revoked, then granted — and the guardian
     screen only ever wants the one that is in force. */
  select distinct on (g.minor_user_id)
    g.minor_user_id, up.full_name::text, up.avatar_url::text, up.age_band::text,
    g.id, g.status, g.allow_discovery, g.allow_messaging, g.allow_media, g.granted_at
  from public.guardian_consents g
  join public.user_profiles up on up.id = g.minor_user_id
  where g.guardian_user_id = auth.uid()
  order by g.minor_user_id,
    case g.status when 'granted' then 0 when 'pending' then 1 else 2 end,
    g.created_at desc;
$$;

revoke all on function public.my_linked_minors() from public, anon;
grant execute on function public.my_linked_minors() to authenticated;

-- ------------------------------------------------------------
-- 5. One date of birth, two places — keep them in step
--
-- user_private.date_of_birth decides is_minor; athlete_profiles.birth_date
-- decides the displayed age and the age filters. Nothing kept them together,
-- so an athlete could edit one and present a different age to search than the
-- one their protections are based on.
-- ------------------------------------------------------------
create or replace function private.sync_athlete_birth_date()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.athlete_profiles
  set birth_date = new.date_of_birth
  where user_id = new.user_id
    and birth_date is distinct from new.date_of_birth;
  return new;
end;
$$;

drop trigger if exists trg_user_private_sync_birth_date on public.user_private;
create trigger trg_user_private_sync_birth_date
  after insert or update of date_of_birth on public.user_private
  for each row execute function private.sync_athlete_birth_date();

/* And the other way: writing birth_date on the athlete profile is the same
   act as declaring an age, so it must run through the same age checks. */
create or replace function private.mirror_birth_date_to_private()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.birth_date is distinct from old.birth_date and new.birth_date is not null then
    insert into public.user_private (user_id, date_of_birth)
    values (new.user_id, new.birth_date)
    on conflict (user_id) do update set date_of_birth = excluded.date_of_birth;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_athlete_birth_date_mirror on public.athlete_profiles;
create trigger trg_athlete_birth_date_mirror
  after update of birth_date on public.athlete_profiles
  for each row execute function private.mirror_birth_date_to_private();

update public.athlete_profiles ap
set birth_date = p.date_of_birth
from public.user_private p
where p.user_id = ap.user_id
  and p.date_of_birth is not null
  and ap.birth_date is distinct from p.date_of_birth;

-- ------------------------------------------------------------
-- 6. Deleting an account deletes its files too
--
-- delete_own_account removed the rows and left every uploaded photo and clip
-- in storage. Both Apple's deletion requirement and our own privacy policy
-- say otherwise.
-- ------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, storage, auth
as $$
declare
  requester uuid := auth.uid();
begin
  if requester is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Uploads are stored under a folder named for the account.
  delete from storage.objects
  where bucket_id in ('avatars', 'posts', 'stories')
    and (storage.foldername(name))[1] = requester::text;

  delete from public.user_profiles where id = requester;
  delete from auth.users where id = requester;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ------------------------------------------------------------
-- 7. Corrections to two comments that described the opposite of the code
-- ------------------------------------------------------------
comment on function private.can_message(uuid, uuid) is
  'Whether p_sender may open a conversation with p_recipient. Blocks and the '
  'recipient''s inbox setting are checked first. An adult may write to a minor '
  'only when they are a verified professional and the guardian allowed '
  'messaging; a minor may write to an adult only when that adult is verified '
  'or the minor already follows them.';

comment on function private.build_score_tips(jsonb) is
  'Suggestions for raising the score, emitted in a fixed order: media first, '
  'then profile, performance, verification, endorsements, club, activity. '
  'The client shows them in this order; it does not re-sort by points.';
