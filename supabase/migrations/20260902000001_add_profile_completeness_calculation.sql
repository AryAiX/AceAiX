-- 1. The shared calculator
create or replace function public.recalculate_profile_completeness(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_required numeric := 0;
  v_optional numeric := 0;
  v_up record;
  v_ap record;
  v_pr record;
  v_current integer;
begin
  select first_name, last_name, country, avatar_url, bio
  into v_up
  from public.user_profiles
  where id = p_user_id;

  select sport, position, position_primary, current_club, nationality, bio, profile_completeness
  into v_ap
  from public.athlete_profiles
  where user_id = p_user_id;

  if not found then
    return;
  end if;

  v_current := v_ap.profile_completeness;

  select date_of_birth, phone
  into v_pr
  from public.user_private
  where user_id = p_user_id;

  -- Required (14 pts each)
  if coalesce(trim(v_up.first_name), '') <> '' then v_required := v_required + 14; end if;
  if coalesce(trim(v_up.last_name), '') <> '' then v_required := v_required + 14; end if;
  if coalesce(trim(v_ap.sport), '') <> '' then v_required := v_required + 14; end if;
  if coalesce(trim(v_up.country), '') <> '' then v_required := v_required + 14; end if;
  if v_pr.date_of_birth is not null then v_required := v_required + 14; end if;

  -- Optional (5 pts each)
  if coalesce(trim(v_up.avatar_url), '') <> '' then v_optional := v_optional + 5; end if;
  if coalesce(trim(v_up.bio), '') <> '' or coalesce(trim(v_ap.bio), '') <> '' then v_optional := v_optional + 5; end if;
  if coalesce(trim(coalesce(v_ap.position_primary, v_ap.position)), '') <> '' then v_optional := v_optional + 5; end if;
  if coalesce(trim(v_ap.current_club), '') <> '' then v_optional := v_optional + 5; end if;
  if coalesce(trim(v_ap.nationality), '') <> '' then v_optional := v_optional + 5; end if;
  if coalesce(trim(v_pr.phone), '') <> '' then v_optional := v_optional + 5; end if;

  if v_current is distinct from round(v_required + v_optional) then
    update public.athlete_profiles
    set profile_completeness = round(v_required + v_optional)
    where user_id = p_user_id;
  end if;
end;
$function$;

-- 2. Trigger wrapper for user_profiles
create or replace function public.trg_recalc_completeness_from_user_profiles()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.recalculate_profile_completeness(NEW.id);
  return NEW;
end;
$function$;

drop trigger if exists trg_user_profiles_recalc_completeness on public.user_profiles;
create trigger trg_user_profiles_recalc_completeness
after insert or update on public.user_profiles
for each row execute function public.trg_recalc_completeness_from_user_profiles();

-- 3. Trigger wrapper for athlete_profiles
create or replace function public.trg_recalc_completeness_from_athlete_profiles()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.recalculate_profile_completeness(NEW.user_id);
  return NEW;
end;
$function$;

drop trigger if exists trg_athlete_profiles_recalc_completeness on public.athlete_profiles;
create trigger trg_athlete_profiles_recalc_completeness
after insert or update on public.athlete_profiles
for each row execute function public.trg_recalc_completeness_from_athlete_profiles();

-- 4. Trigger wrapper for user_private
create or replace function public.trg_recalc_completeness_from_user_private()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.recalculate_profile_completeness(NEW.user_id);
  return NEW;
end;
$function$;

drop trigger if exists trg_user_private_recalc_completeness on public.user_private;
create trigger trg_user_private_recalc_completeness
after insert or update on public.user_private
for each row execute function public.trg_recalc_completeness_from_user_private();

-- 5. One-time backfill for existing athletes (including your two test accounts)
select public.recalculate_profile_completeness(user_id) from public.athlete_profiles;

-- 6. Reload PostgREST's schema cache
NOTIFY pgrst, 'reload schema';