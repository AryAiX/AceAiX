-- 1. New column for League, separate from Level
alter table public.athlete_profiles
  add column if not exists league character varying null;

-- 2. Remove the old-signature function (safe only because nothing else calls it — confirm above first)
drop function if exists public.update_own_profile(
  text, text, text, text, text, text, text, text, text, text, date
);

-- 3. Recreate with the new signature: first/middle/last name in, full_name auto-derived,
--    level and league now separate
create or replace function public.update_own_profile(
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_bio text,
  p_city text,
  p_country text,
  p_sport text,
  p_position text,
  p_current_club text,
  p_level text,
  p_league text,
  p_nationality text,
  p_phone text,
  p_date_of_birth date
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_full_name text;
begin
  v_full_name := regexp_replace(
    trim(both ' ' from
      coalesce(p_first_name, '') || ' ' || coalesce(p_middle_name, '') || ' ' || coalesce(p_last_name, '')
    ),
    '\s+', ' ', 'g'
  );

  update public.user_profiles
  set full_name = v_full_name,
      first_name = p_first_name,
      middle_name = p_middle_name,
      last_name = p_last_name,
      bio = p_bio,
      city = p_city,
      country = p_country
  where id = auth.uid();

  update public.athlete_profiles
  set sport = p_sport,
      position = p_position,
      position_primary = p_position,
      current_club = p_current_club,
      level = coalesce(p_level, 'amateur'),
      league = p_league,
      nationality = p_nationality,
      bio = p_bio
  where user_id = auth.uid();

  insert into public.user_private (user_id, phone, date_of_birth)
  values (auth.uid(), p_phone, p_date_of_birth)
  on conflict (user_id) do update
  set phone = excluded.phone,
      date_of_birth = excluded.date_of_birth;
end;
$function$;