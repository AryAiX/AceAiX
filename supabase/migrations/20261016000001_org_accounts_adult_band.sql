-- QA-61: organisation accounts (club, sponsor) have no date of birth.
-- Without one, sync_age_state never runs for them and age_band stays null,
-- which several adult-only rules read as "not an adult":
--   suggested_follows, meetup alerts, private.profile_is_minor.
-- Give those roles an explicit adult band at signup instead of leaving it
-- to a null. is_minor keeps its own default of false.
--
-- Note: '25_plus' is reused rather than adding an 'org' band, so every
-- existing rule testing age_band in ('18_24','25_plus') keeps working
-- unchanged. See the PR notes for the trade-off.
--
-- Copied from 20261008000002_sponsorship.sql lines 45-104; the only change
-- is the age_band column in the user_profiles insert.

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role      public.user_role;
  v_full_name text;
  v_first     text;
  v_last      text;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_first     := nullif(new.raw_user_meta_data ->> 'first_name', '');
  v_last      := nullif(new.raw_user_meta_data ->> 'last_name', '');

  if v_full_name = '' and (v_first is not null or v_last is not null) then
    v_full_name := trim(coalesce(v_first, '') || ' ' || coalesce(v_last, ''));
  end if;

  begin
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    v_role := 'athlete';
  end;

  -- Roles are never escalated through signup metadata: anything that is not a
  -- role a person may choose for themselves becomes an athlete.
  if v_role is null
     or v_role::text not in ('athlete', 'coach', 'club', 'scout', 'guardian', 'guest', 'sponsor') then
    v_role := 'athlete';
  end if;

  insert into public.user_profiles (id, role, full_name, first_name, last_name, age_band)
  values (
    new.id,
    v_role,
    nullif(v_full_name, ''),
    v_first,
    v_last,
    case when v_role::text in ('club', 'sponsor') then '25_plus' else null end
  )
  on conflict (id) do nothing;

  insert into public.user_private (user_id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if v_role = 'athlete' then
    insert into public.athlete_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role = 'coach' then
    insert into public.coach_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role in ('scout','club') then
    insert into public.scout_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
    insert into public.match_preferences (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role::text = 'sponsor' then
    insert into public.sponsor_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;