-- ============================================================
-- Thirty sports on also plays (QA-177)
--
-- The app's sport list grows from 12 to 30. The 18 new sports
-- are Futsal, Rugby, Field Hockey, Badminton, Table Tennis,
-- Squash, Golf, Cycling, Gymnastics, Boxing, Wrestling, Judo,
-- Taekwondo, Jiu-Jitsu, Weightlifting, Equestrian, Fencing and
-- Triathlon.
--
-- private.normalize_other_sports is the only place the database
-- checks sport names. It checks the "also plays" list on an
-- athlete profile. A new sport named as a second sport was
-- refused, because the list still held the original 12. The
-- list now holds all 30 names, in the same spelling the app
-- uses. The trigger that calls the function does not change.
-- ============================================================

create or replace function private.normalize_other_sports()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sports constant text[] := array[
    'Football','Basketball','Tennis','Athletics','Swimming','Cricket',
    'Volleyball','Handball','Padel','Chess','Esports','Martial Arts',
    'Futsal','Rugby','Field Hockey','Badminton','Table Tennis','Squash',
    'Golf','Cycling','Gymnastics','Boxing','Wrestling','Judo',
    'Taekwondo','Jiu-Jitsu','Weightlifting','Equestrian','Fencing','Triathlon'];
  v_levels constant text[] := array['casual','club','competitive'];
  v_item  jsonb;
  v_sport text;
  v_level text;
  v_seen  text[] := array[]::text[];
  v_clean jsonb  := '[]'::jsonb;
begin
  if new.other_sports is null then
    new.other_sports := '[]'::jsonb;
  end if;

  if jsonb_typeof(new.other_sports) <> 'array' then
    raise exception 'other_sports must be a list';
  end if;

  for v_item in select value from jsonb_array_elements(new.other_sports) loop
    v_sport := v_item ->> 'sport';
    v_level := v_item ->> 'level';

    if v_sport is null or not (v_sport = any (v_sports)) then
      raise exception 'Unknown sport in other_sports';
    end if;
    if v_level is null or not (v_level = any (v_levels)) then
      raise exception 'Unknown level in other_sports';
    end if;

    -- The main sport is never also an "also plays" sport. Drop it quietly:
    -- the athlete may have just switched their main sport to this one.
    if new.sport is not null and lower(v_sport) = lower(new.sport) then
      continue;
    end if;

    if v_sport = any (v_seen) then
      raise exception 'Duplicate sport in other_sports';
    end if;

    v_seen  := v_seen || v_sport;
    v_clean := v_clean || jsonb_build_array(
                 jsonb_build_object('sport', v_sport, 'level', v_level));
  end loop;

  if jsonb_array_length(v_clean) > 3 then
    raise exception 'You can add up to 3 other sports';
  end if;

  new.other_sports := v_clean;
  return new;
end;
$$;

revoke all on function private.normalize_other_sports() from public, anon, authenticated;
