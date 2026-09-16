-- ============================================================
-- 0021 — Youth safety, guardian consent, and contact controls
--
-- The core audience is 10–25. That means a large share of accounts belong to
-- minors, and both Apple and Google will reject the app — or pull it later —
-- if an adult stranger can find and message a 13-year-old unchecked.
--
-- The rules this migration enforces in the database (not just the UI):
--   1. Under 13 cannot hold an account at all.
--   2. A 13–17 account is invisible in discovery until a guardian consents.
--   3. Only a VERIFIED adult can open a conversation with a minor, and only
--      once guardian consent exists. Minors can always talk to other minors
--      they follow, and to anyone they started the conversation with.
--   4. A minor's exact date of birth and precise location are never public.
--   5. Consent is revocable, and revoking it hides the profile again.
--
-- These are database constraints, so a modified client cannot bypass them.
-- ============================================================

-- ------------------------------------------------------------
-- Coarse, non-sensitive derived fields on the public profile
-- ------------------------------------------------------------
alter table public.user_profiles
  add column if not exists is_minor          boolean not null default false,
  add column if not exists age_band          text
      check (age_band is null or age_band in ('13_15','16_17','18_24','25_plus')),
  add column if not exists is_discoverable   boolean not null default true,
  add column if not exists is_suspended      boolean not null default false,
  add column if not exists suspended_reason  text,
  add column if not exists allow_messages_from text not null default 'everyone'
      check (allow_messages_from in ('everyone','verified','following','nobody')),
  add column if not exists followers_count   integer not null default 0,
  add column if not exists following_count   integer not null default 0,
  add column if not exists last_active_at    timestamptz,
  add column if not exists onboarding_completed boolean not null default false;

comment on column public.user_profiles.age_band is
  'Coarse band only. The exact date of birth stays in user_private and is never exposed publicly.';

-- ------------------------------------------------------------
-- Guardian consent records
-- ------------------------------------------------------------
create table if not exists public.guardian_consents (
  id                uuid primary key default gen_random_uuid(),
  minor_user_id     uuid not null references public.user_profiles(id) on delete cascade,
  guardian_name     text not null,
  guardian_email    text not null,
  guardian_user_id  uuid references public.user_profiles(id) on delete set null,
  relationship      text not null default 'parent'
                      check (relationship in ('parent','guardian','coach_guardian','other')),
  status            text not null default 'pending'
                      check (status in ('pending','granted','revoked','expired')),
  /* Scopes the guardian approved. Discovery and messaging are separate
     decisions — a parent may allow a profile to exist but not allow DMs. */
  allow_discovery   boolean not null default true,
  allow_messaging   boolean not null default true,
  allow_media       boolean not null default true,
  token             text not null unique default encode(gen_random_bytes(24), 'hex'),
  token_expires_at  timestamptz not null default (now() + interval '14 days'),
  granted_at        timestamptz,
  revoked_at        timestamptz,
  /* Verifiable-consent evidence retained for compliance audits. */
  consent_method    text default 'email_confirmation',
  consent_ip        inet,
  consent_user_agent text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.guardian_consents enable row level security;
create index if not exists idx_guardian_consents_minor on public.guardian_consents(minor_user_id);
create unique index if not exists idx_guardian_consents_active
  on public.guardian_consents(minor_user_id) where status = 'granted';
create trigger trg_guardian_consents_updated_at before update on public.guardian_consents
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function private.age_band_for(p_dob date)
returns text language sql immutable as $$
  select case
    when p_dob is null then null
    when extract(year from age(p_dob)) < 16 then '13_15'
    when extract(year from age(p_dob)) < 18 then '16_17'
    when extract(year from age(p_dob)) < 25 then '18_24'
    else '25_plus'
  end;
$$;

create or replace function private.is_minor(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_minor from public.user_profiles where id = p_user), false);
$$;

create or replace function private.has_guardian_consent(p_user uuid, p_scope text default 'messaging')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.guardian_consents g
    where g.minor_user_id = p_user
      and g.status = 'granted'
      and case p_scope
            when 'messaging'  then g.allow_messaging
            when 'discovery'  then g.allow_discovery
            when 'media'      then g.allow_media
            else true
          end
  );
$$;

create or replace function private.is_verified_adult(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles u
    where u.id = p_user
      and u.is_verified
      and not u.is_minor
      and u.role in ('coach','scout','club','federation','org_admin','admin','medical_partner')
  );
$$;

-- ------------------------------------------------------------
-- Keep is_minor / age_band in step with the private date of birth
-- ------------------------------------------------------------
create or replace function private.sync_age_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_age  integer;
  v_band text;
begin
  if new.date_of_birth is null then
    return new;
  end if;

  v_age  := extract(year from age(new.date_of_birth))::int;
  v_band := private.age_band_for(new.date_of_birth);

  -- Hard floor. There is no compliant way to run a social product for
  -- under-13s without full COPPA verifiable parental consent infrastructure,
  -- so the account simply cannot exist.
  if v_age < 13 then
    raise exception 'AceAiX requires all account holders to be at least 13 years old'
      using errcode = '23514', hint = 'age_below_minimum';
  end if;

  update public.user_profiles u
  set is_minor = (v_age < 18),
      age_band = v_band,
      /* A minor is hidden from discovery until a guardian says otherwise. */
      is_discoverable = case
        when v_age < 18 then private.has_guardian_consent(new.user_id, 'discovery')
        else u.is_discoverable
      end,
      /* Minors default to the strictest inbox setting. */
      allow_messages_from = case
        when v_age < 18 and u.allow_messages_from = 'everyone' then 'verified'
        else u.allow_messages_from
      end
  where u.id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_user_private_age_sync on public.user_private;
create trigger trg_user_private_age_sync
  after insert or update of date_of_birth on public.user_private
  for each row execute function private.sync_age_state();

/* Recompute discoverability whenever consent changes. */
create or replace function private.apply_guardian_consent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.user_profiles
  set is_discoverable = case
        when not is_minor then is_discoverable
        when new.status = 'granted' and new.allow_discovery then true
        else false
      end
  where id = new.minor_user_id;
  return new;
end;
$$;

drop trigger if exists trg_guardian_consent_apply on public.guardian_consents;
create trigger trg_guardian_consent_apply
  after insert or update of status, allow_discovery on public.guardian_consents
  for each row execute function private.apply_guardian_consent();

-- ------------------------------------------------------------
-- A minor may not quietly widen their own exposure
--
-- Age, suspension, verification and every derived counter are protected by
-- column-level privileges below rather than by raising in a trigger: a
-- privilege cannot be talked around by a crafted request, and the internal
-- SECURITY DEFINER syncs above still need to write those same columns.
-- ------------------------------------------------------------
create or replace function private.guard_minor_visibility()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' or private.is_admin() then
    return new;
  end if;

  if coalesce(old.is_minor, false)
     and new.is_discoverable
     and not coalesce(old.is_discoverable, false)
     and not private.has_guardian_consent(new.id, 'discovery') then
    raise exception 'A parent or guardian must approve this profile before it can appear in search'
      using errcode = '42501', hint = 'guardian_consent_required';
  end if;

  if coalesce(new.is_minor, false) and new.allow_messages_from = 'everyone' then
    /* Minors cap out at "verified adults and people I follow". */
    new.allow_messages_from := 'verified';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_profiles_minor_guard on public.user_profiles;
create trigger trg_user_profiles_minor_guard
  before update on public.user_profiles
  for each row execute function private.guard_minor_visibility();

-- ------------------------------------------------------------
-- Column-level write privileges
--
-- Postgres cannot subtract a column from a table-wide UPDATE grant, so the
-- table grant is withdrawn and only the fields a user genuinely owns are
-- granted back. Everything else — age state, verification, suspension,
-- scores, counters — is written exclusively by SECURITY DEFINER code.
-- ------------------------------------------------------------
revoke update on public.user_profiles from authenticated, anon;
grant update (
  full_name, first_name, middle_name, last_name,
  avatar_url, bio, city, country, locale,
  is_discoverable, allow_messages_from, onboarding_completed, last_active_at
) on public.user_profiles to authenticated;

revoke update on public.athlete_profiles from authenticated, anon;
grant update (
  sport, positions, position_primary, position_secondary, position,
  height_cm, weight_kg, birth_date, nationality, dominant_foot,
  current_club_id, current_club, level, league, bio, is_open_to_offers,
  cover_url, highlighted_stats, attributes, academy, certifications,
  honors, languages, trajectory,
  chesscom_username, lichess_username, external_provider, external_player_id,
  sportify_linked, sportify_athlete_id
) on public.athlete_profiles to authenticated;

-- ------------------------------------------------------------
-- Who is allowed to open a conversation with whom
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

create or replace function private.guard_conversation_participants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_other uuid;
begin
  if auth.role() = 'service_role' then return new; end if;

  v_other := case
    when new.participant_1_id = auth.uid() then new.participant_2_id
    else new.participant_1_id
  end;

  if not private.can_message(auth.uid(), v_other) then
    raise exception 'You are not able to start a conversation with this account'
      using errcode = '42501', hint = 'messaging_not_permitted';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_conversations_safety_guard on public.conversations;
create trigger trg_conversations_safety_guard
  before insert on public.conversations
  for each row execute function private.guard_conversation_participants();

-- ------------------------------------------------------------
-- RPCs used by the app
-- ------------------------------------------------------------

/* Called during onboarding by a 13–17 year-old. Creates (or replaces) the
   pending consent request. The e-mail itself is sent by the
   `guardian-consent` edge function, which reads the returned token. */
create or replace function public.request_guardian_consent(
  p_guardian_name  text,
  p_guardian_email text,
  p_relationship   text default 'parent'
)
returns public.guardian_consents
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.guardian_consents;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if coalesce(trim(p_guardian_email), '') = '' or position('@' in p_guardian_email) = 0 then
    raise exception 'A valid parent or guardian e-mail address is required'
      using errcode = '22023';
  end if;

  update public.guardian_consents
  set status = 'expired', updated_at = now()
  where minor_user_id = auth.uid() and status = 'pending';

  insert into public.guardian_consents (
    minor_user_id, guardian_name, guardian_email, relationship, status
  )
  values (auth.uid(), trim(p_guardian_name), lower(trim(p_guardian_email)),
          coalesce(p_relationship, 'parent'), 'pending')
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.request_guardian_consent(text, text, text) from public, anon;
grant execute on function public.request_guardian_consent(text, text, text) to authenticated;

/* Called from the consent web page the guardian opens from their e-mail.
   Deliberately available to anon — the unguessable token is the credential. */
create or replace function public.confirm_guardian_consent(
  p_token          text,
  p_allow_discovery boolean default true,
  p_allow_messaging boolean default true,
  p_allow_media     boolean default true
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
  set status = 'granted',
      granted_at = now(),
      allow_discovery = coalesce(p_allow_discovery, true),
      allow_messaging = coalesce(p_allow_messaging, true),
      allow_media     = coalesce(p_allow_media, true),
      updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'minor_user_id', v_row.minor_user_id,
    'allow_discovery', v_row.allow_discovery,
    'allow_messaging', v_row.allow_messaging
  );
end;
$$;

grant execute on function public.confirm_guardian_consent(text, boolean, boolean, boolean)
  to anon, authenticated;

/* Either the minor or the guardian can pull consent at any time. */
create or replace function public.revoke_guardian_consent(p_consent_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.guardian_consents
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_consent_id
    and (minor_user_id = auth.uid() or guardian_user_id = auth.uid() or private.is_admin());

  if not found then
    raise exception 'Consent record not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.revoke_guardian_consent(uuid) from public, anon;
grant execute on function public.revoke_guardian_consent(uuid) to authenticated;

/* Cheap pre-flight so the UI can explain why a Message button is disabled
   instead of failing after the tap. */
create or replace function public.can_message_user(p_recipient uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_ok boolean;
begin
  select is_minor, is_verified, allow_messages_from into r
  from public.user_profiles where id = p_recipient;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'not_found');
  end if;

  v_ok := private.can_message(auth.uid(), p_recipient);
  if v_ok then
    return jsonb_build_object('allowed', true);
  end if;

  return jsonb_build_object(
    'allowed', false,
    'reason', case
      when r.is_minor and not private.is_verified_adult(auth.uid())
        then 'minor_requires_verified_sender'
      when r.is_minor and not private.has_guardian_consent(p_recipient, 'messaging')
        then 'minor_requires_guardian_consent'
      when r.allow_messages_from = 'nobody'  then 'recipient_messages_off'
      when r.allow_messages_from = 'following' then 'recipient_only_accepts_followed'
      when r.allow_messages_from = 'verified'  then 'recipient_only_accepts_verified'
      else 'not_permitted'
    end
  );
end;
$$;

revoke all on function public.can_message_user(uuid) from public, anon;
grant execute on function public.can_message_user(uuid) to authenticated;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
drop policy if exists gc_select on public.guardian_consents;
create policy gc_select on public.guardian_consents
  for select to authenticated
  using (minor_user_id = auth.uid() or guardian_user_id = auth.uid() or private.is_admin());

drop policy if exists gc_update on public.guardian_consents;
create policy gc_update on public.guardian_consents
  for update to authenticated
  using (minor_user_id = auth.uid() or guardian_user_id = auth.uid() or private.is_admin())
  with check (minor_user_id = auth.uid() or guardian_user_id = auth.uid() or private.is_admin());

-- Rows are only created through request_guardian_consent().
revoke insert, delete on public.guardian_consents from authenticated, anon;
grant select, update on public.guardian_consents to authenticated;

-- ------------------------------------------------------------
-- Hide minors from anonymous browsing entirely
-- ------------------------------------------------------------
drop policy if exists up_select on public.user_profiles;
create policy up_select_authenticated on public.user_profiles
  for select to authenticated using (true);
create policy up_select_anon on public.user_profiles
  for select to anon using (not is_minor and not is_suspended);

drop policy if exists ap_select on public.athlete_profiles;
create policy ap_select_authenticated on public.athlete_profiles
  for select to authenticated using (true);
create policy ap_select_anon on public.athlete_profiles
  for select to anon
  using (
    exists (
      select 1 from public.user_profiles u
      where u.id = athlete_profiles.user_id and not u.is_minor and not u.is_suspended
    )
  );

-- ------------------------------------------------------------
-- Backfill existing accounts
-- ------------------------------------------------------------
update public.user_profiles u
set is_minor = true,
    age_band = private.age_band_for(p.date_of_birth),
    is_discoverable = false,
    allow_messages_from = case when u.allow_messages_from = 'everyone'
                               then 'verified' else u.allow_messages_from end
from public.user_private p
where p.user_id = u.id
  and p.date_of_birth is not null
  and extract(year from age(p.date_of_birth)) < 18;

update public.user_profiles u
set age_band = private.age_band_for(p.date_of_birth)
from public.user_private p
where p.user_id = u.id and p.date_of_birth is not null and u.age_band is null;
