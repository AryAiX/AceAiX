-- ============================================================
-- Child profiles for children under 13 (QA-174)
--
-- Decision (Tooraj, 19 November): option B. A parent can keep a
-- small profile for a child who is too young for an account. It
-- is not an account: it has no login, no email, no photo and no
-- public page. It holds a first name, a birth year, one sport
-- and a level, and nothing else. Only the parent who made it can
-- see it, and it never appears in search, discovery, leaderboards,
-- posts or anywhere else, because it lives in the private schema
-- and the app reaches it only through the three functions below.
--
-- The rule that nobody under 13 holds an account does not change.
-- private.sync_age_state still refuses an account with a date of
-- birth under 13, and an existing account found to be under 13 is
-- still quarantined and suspended until the age appeal resolves
-- it (20260910000001, 20261013000002). At 13 the child signs up
-- normally, with that same date-of-birth check, and the parent
-- approves through the normal consent email. The app then offers
-- the parent to delete the child profile; nothing is copied.
--
-- Behind a switch: platform_settings 'features' key child_profiles,
-- added here as false. It stays false on prd until the legal check.
-- Switched on (dev only, by hand) with:
--
--   update public.platform_settings
--      set value = jsonb_set(value, '{child_profiles}', 'true')
--    where key = 'features';
--
-- With the switch off nobody can add or change a child profile.
-- A parent can still list and delete the ones they have, so
-- turning the switch off never leaves data the parent cannot
-- remove.
--
-- Keeping data to the minimum:
-- * at most 5 child profiles per parent;
-- * the birth year must make the child 13 or younger this year;
-- * a profile is deleted for good once the child is surely past
--   13: from 1 January of the year after the child turns 14. This
--   happens whenever the parent opens their child profiles, and
--   private.purge_expired_child_profiles() removes every expired
--   profile when run by the service role (there is no scheduler);
-- * deleting a profile deletes the row; the audit log records only
--   that a profile was deleted, with no child details;
-- * deleting the parent's account deletes their child profiles;
-- * the parent's "Download my data" includes their child profiles.
--
-- NEEDS TOORAJ'S OK because it stores data about children under 13 (behind a switch that is off).
-- ============================================================

insert into public.platform_settings (key, value)
values ('features', jsonb_build_object('child_profiles', false))
on conflict (key) do update
  set value = jsonb_build_object('child_profiles', false) || public.platform_settings.value;

create table if not exists private.child_profiles (
  id               uuid primary key default gen_random_uuid(),
  guardian_user_id uuid not null references public.user_profiles(id) on delete cascade,
  first_name       text not null check (char_length(first_name) between 1 and 40),
  birth_year       smallint not null,
  sport            text not null,
  level            text not null check (level in ('casual', 'club', 'competitive')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_child_profiles_guardian
  on private.child_profiles (guardian_user_id);

alter table private.child_profiles enable row level security;
revoke all on private.child_profiles from public, anon, authenticated;
grant select, insert, update, delete on private.child_profiles to service_role;

/* The calendar year the age rules use. */
create or replace function private.child_profile_this_year()
returns integer
language sql
stable
set search_path = pg_temp
as $$
  select extract(year from (now() at time zone 'utc'))::int;
$$;

/* An adult parent account that is not suspended. */
create or replace function private.child_profile_parent(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user is not null and exists (
    select 1 from public.user_profiles u
    where u.id = p_user
      and u.role::text = 'guardian'
      and not coalesce(u.is_minor, false)
      and not coalesce(u.is_suspended, false)
  );
$$;

revoke all on function private.child_profile_this_year() from public, anon, authenticated;
revoke all on function private.child_profile_parent(uuid) from public, anon, authenticated;

/* Every profile whose child is surely past 13, for everyone.
   For the service role; there is no scheduler today. */
create or replace function private.purge_expired_child_profiles()
returns integer
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  delete from private.child_profiles
  where birth_year + 14 < private.child_profile_this_year();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.purge_expired_child_profiles() from public, anon, authenticated;
grant execute on function private.purge_expired_child_profiles() to service_role;

/* The signed-in parent's child profiles, after removing any that
   have expired. enabled says whether the parent may add or change
   them; the list is returned either way so they can always delete. */
create or replace function public.my_child_profiles()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_year integer := private.child_profile_this_year();
  v_enabled boolean;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  delete from private.child_profiles
  where guardian_user_id = v_user
    and birth_year + 14 < v_year;

  v_enabled := private.feature_enabled('child_profiles')
               and private.child_profile_parent(v_user);

  select count(*) into v_count
  from private.child_profiles where guardian_user_id = v_user;

  return jsonb_build_object(
    'enabled', v_enabled,
    'can_add', v_enabled and v_count < 5,
    'max', 5,
    'this_year', v_year,
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'first_name', c.first_name,
               'birth_year', c.birth_year,
               'sport', c.sport,
               'level', c.level,
               'can_have_account', v_year - c.birth_year >= 13,
               'removed_after_year', c.birth_year + 14)
             order by c.created_at)
      from private.child_profiles c
      where c.guardian_user_id = v_user
    ), '[]'::jsonb)
  );
end;
$$;

/* Add a child profile (p_id null) or change one of the parent's own. */
create or replace function public.save_child_profile(
  p_id         uuid,
  p_first_name text,
  p_birth_year integer,
  p_sport      text,
  p_level      text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_year integer := private.child_profile_this_year();
  v_name text := btrim(regexp_replace(coalesce(p_first_name, ''), '\s+', ' ', 'g'));
  v_sports constant text[] := array[
    'Football','Basketball','Tennis','Athletics','Swimming','Cricket',
    'Volleyball','Handball','Padel','Chess','Esports','Martial Arts',
    'Futsal','Rugby','Field Hockey','Badminton','Table Tennis','Squash',
    'Golf','Cycling','Gymnastics','Boxing','Wrestling','Judo',
    'Taekwondo','Jiu-Jitsu','Weightlifting','Equestrian','Fencing','Triathlon'];
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not private.feature_enabled('child_profiles') then
    raise exception 'Child profiles are not available' using errcode = '42501', hint = 'child_profiles_off';
  end if;
  if not private.child_profile_parent(v_user) then
    raise exception 'Only a parent account can keep child profiles' using errcode = '42501', hint = 'child_profile_parent_only';
  end if;

  /* A first name only: no digits, @ or markup, so an email, a
     phone number or a link cannot be stored here. */
  if char_length(v_name) not between 1 and 40 or v_name ~ '[[:digit:]@<>/\\]' then
    raise exception 'Enter the child''s first name' using errcode = '22023', hint = 'child_first_name';
  end if;
  if p_birth_year is null or p_birth_year > v_year or p_birth_year < v_year - 13 then
    raise exception 'A child profile is for a child under 13' using errcode = '22023', hint = 'child_birth_year';
  end if;
  if p_sport is null or not (p_sport = any (v_sports)) then
    raise exception 'Choose a sport' using errcode = '22023', hint = 'child_sport';
  end if;
  if p_level is null or p_level not in ('casual', 'club', 'competitive') then
    raise exception 'Choose a level' using errcode = '22023', hint = 'child_level';
  end if;

  if p_id is null then
    /* One add at a time per parent, so the limit holds. */
    perform 1 from public.user_profiles where id = v_user for update;
    if (select count(*) from private.child_profiles where guardian_user_id = v_user) >= 5 then
      raise exception 'A parent can keep up to 5 child profiles' using errcode = '22023', hint = 'child_profile_limit';
    end if;
    insert into private.child_profiles (guardian_user_id, first_name, birth_year, sport, level)
    values (v_user, v_name, p_birth_year, p_sport, p_level)
    returning id into v_id;
  else
    update private.child_profiles
       set first_name = v_name,
           birth_year = p_birth_year,
           sport      = p_sport,
           level      = p_level,
           updated_at = now()
     where id = p_id
       and guardian_user_id = v_user
    returning id into v_id;
    if v_id is null then
      raise exception 'Child profile not found' using errcode = 'P0002', hint = 'child_profile_not_found';
    end if;
  end if;

  return v_id;
end;
$$;

/* Delete one of the parent's child profiles for good. Works with the
   switch off too. The audit row names no child detail. */
create or replace function public.delete_child_profile(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  delete from private.child_profiles
  where id = p_id and guardian_user_id = v_user
  returning id into v_id;

  if v_id is null then
    return false;
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id)
  values (v_user, 'child_profile.deleted', 'child_profiles', v_id);

  return true;
end;
$$;

revoke all on function public.my_child_profiles() from public, anon;
revoke all on function public.save_child_profile(uuid, text, integer, text, text) from public, anon;
revoke all on function public.delete_child_profile(uuid) from public, anon;

grant execute on function public.my_child_profiles() to authenticated;
grant execute on function public.save_child_profile(uuid, text, integer, text, text) to authenticated;
grant execute on function public.delete_child_profile(uuid) to authenticated;

/* "Download my data" also lists the parent's child profiles.
   Copied from 20261025000007_export_hides_minor_invites.sql with
   only 'child profiles' and the child_profiles key added. */
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'included_data', jsonb_build_array(
      'account profile', 'private account details', 'athlete profile',
      'authored posts', 'authored comments', 'following relationships',
      'opportunity applications', 'owned athlete media',
      'game intelligence results', 'sport fit answers and results',
      'invites and tokens', 'child profiles'
    ),
    'account', jsonb_build_object(
      'id', v_user,
      'email', (select au.email from auth.users au where au.id = v_user)
    ),
    'profile', (select to_jsonb(up) from public.user_profiles up where up.id = v_user),
    'private', (select to_jsonb(pr) from public.user_private pr where pr.user_id = v_user),
    'athlete', (select to_jsonb(ap) from public.athlete_profiles ap where ap.user_id = v_user),
    'posts', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at)
      from public.posts p where p.author_id = v_user
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at)
      from public.post_comments c where c.author_id = v_user
    ), '[]'::jsonb),
    'following', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.created_at)
      from public.follows f where f.follower_id = v_user
    ), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at)
      from public.applications a where a.athlete_id = v_user
    ), '[]'::jsonb),
    'media', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at)
      from public.athlete_media m
      join public.athlete_profiles ap on ap.id = m.athlete_id
      where ap.user_id = v_user
    ), '[]'::jsonb),
    'game_intelligence', jsonb_build_object(
      'profile', (select to_jsonb(g) from public.gi_profiles g where g.user_id = v_user),
      'results', coalesce((
        select jsonb_agg(to_jsonb(r) order by r.created_at)
        from public.gi_results r where r.user_id = v_user
      ), '[]'::jsonb)
    ),
    'sport_fit', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.created_at)
      from public.sport_fit_results s where s.user_id = v_user
    ), '[]'::jsonb),
    'invites', jsonb_build_object(
      'code', (select code from public.referral_codes where user_id = v_user),
      'invited_by', (select private.referral_person(r.referrer_id) - 'is_minor'
                       from public.referrals r
                       join public.user_profiles up on up.id = r.referrer_id
                      where r.referred_id = v_user
                        and (not coalesce(up.is_minor, false)
                             or private.has_guardian_consent(r.referrer_id, 'discovery'))),
      'invited', coalesce((select jsonb_agg(
                   (private.referral_person(r.referred_id) - 'is_minor' - 'avatar_url')
                   || jsonb_build_object('status', r.status, 'joined_at', r.created_at) order by r.created_at)
                 from public.referrals r
                 join public.user_profiles up on up.id = r.referred_id
                where r.referrer_id = v_user
                  and (not coalesce(up.is_minor, false)
                       or private.has_guardian_consent(r.referred_id, 'discovery'))), '[]'::jsonb),
      'tokens', coalesce((select jsonb_agg(to_jsonb(l) - 'user_id' order by l.created_at)
                 from public.token_ledger l where l.user_id = v_user), '[]'::jsonb)
    ),
    'child_profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
               'first_name', c.first_name, 'birth_year', c.birth_year,
               'sport', c.sport, 'level', c.level,
               'created_at', c.created_at, 'updated_at', c.updated_at)
             order by c.created_at)
      from private.child_profiles c where c.guardian_user_id = v_user
    ), '[]'::jsonb)
  );
end;
$$;
