-- Audience (role = guest) is adults only.
--
-- A birth date that makes a guest under 18 is refused, which rolls the
-- write back. Completing onboarding is refused until that date is a known
-- adult band. Suggested follows only names known adults.

-- ------------------------------------------------------------
-- 1. Age sync: guest and under 18 cannot store a birth date
--
-- Copied from 20260904000002_youth_safety_and_consent.sql. The only
-- addition is the guest check after the under-13 floor.
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

  if v_age < 18 and exists (
    select 1 from public.user_profiles u
    where u.id = new.user_id and u.role::text = 'guest'
  ) then
    raise exception 'Audience accounts are for adults (18+)'
      using errcode = '23514', hint = 'audience_adults_only';
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

-- ------------------------------------------------------------
-- 2. A guest cannot finish onboarding without a known adult age
-- ------------------------------------------------------------
create or replace function private.guard_audience_onboarding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role::text = 'guest'
     and new.onboarding_completed is true
     and old.onboarding_completed is not true
     and coalesce(new.age_band::text, '') not in ('18_24', '25_plus') then
    raise exception 'Add your date of birth to continue'
      using errcode = '23514', hint = 'audience_needs_adult_age';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_audience_onboarding() from public, anon, authenticated;

create or replace trigger trg_user_profiles_audience_onboarding
  before update of onboarding_completed on public.user_profiles
  for each row execute function private.guard_audience_onboarding();

-- ------------------------------------------------------------
-- 3. People a signed-in caller might follow
--
-- Known adults only, for every caller. plpgsql so a missing session
-- can raise; the body does not write.
-- ------------------------------------------------------------
create or replace function public.suggested_follows(p_limit integer default 12)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  role text,
  sport text,
  followers_count integer,
  is_verified boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 12), 30));
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.full_name::text,
    u.avatar_url::text,
    u.role::text,
    ap.sport::text,
    u.followers_count,
    u.is_verified
  from public.user_profiles u
  left join public.athlete_profiles ap on ap.user_id = u.id
  where u.age_band in ('18_24', '25_plus')
    and u.role::text in ('athlete', 'coach', 'club')
    and not u.is_suspended
    and u.id <> v_uid
    and not exists (
      select 1 from public.follows f
      where f.follower_id = v_uid and f.following_id = u.id
    )
    and not private.users_are_blocked(v_uid, u.id)
  order by u.is_verified desc, u.followers_count desc, u.full_name
  limit v_limit;
end;
$$;

revoke all on function public.suggested_follows(integer) from public, anon;
grant execute on function public.suggested_follows(integer) to authenticated;
