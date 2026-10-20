-- ============================================================
-- Admin console: Sport Fit
--
-- Two jobs, and one rule.
--
--   1. Totals, so the team can see whether Sport Fit is used and whether the
--      answers are usable: completions, unusable sets by reason, which sports
--      come out on top, average mindset by age group.
--   2. The sport matrix (weights 0–3 and the team target per sport) is edited
--      here, and each row is marked reviewed when a sports psychologist has
--      signed it off (docs/31 §6).
--
--   The rule: nothing here returns one person's answers or result. Every
--   number is a count or an average over a group, and a group smaller than
--   five is reported as "fewer than 5" rather than as a number that could
--   point at someone.
-- ============================================================

create or replace function public.admin_sport_fit_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform private.require_admin();

  with latest as (
    /* One row per player: their most recent usable result. */
    select distinct on (r.user_id) r.user_id, r.dimensions, r.fits, r.gi_signals, r.created_at,
           u.is_minor, u.age_band
    from public.sport_fit_results r
    join public.user_profiles u on u.id = r.user_id
    where r.quality = 'ok'
    order by r.user_id, r.created_at desc
  ), tops as (
    select fits -> 0 ->> 'sport' as sport, count(*) as n from latest group by 1
  ), bands as (
    select coalesce(age_band, 'unknown') as band, count(*) as n,
           round(avg((dimensions ->> 'drive')::numeric))      as drive,
           round(avg((dimensions ->> 'composure')::numeric))  as composure,
           round(avg((dimensions ->> 'focus')::numeric))      as focus,
           round(avg((dimensions ->> 'resilience')::numeric)) as resilience,
           round(avg((dimensions ->> 'boldness')::numeric))   as boldness,
           round(avg((dimensions ->> 'discipline')::numeric)) as discipline,
           round(avg((dimensions ->> 'team')::numeric))       as team
    from latest group by 1
  )
  select jsonb_build_object(
    'players',        (select count(*) from latest),
    'players_minor',  (select count(*) from latest where is_minor),
    'with_game_intelligence', (select count(*) from latest where gi_signals <> '{}'),
    'last_30d',       (select count(*) from public.sport_fit_results
                        where quality = 'ok' and created_at > now() - interval '30 days'),
    'submissions',    (select count(*) from public.sport_fit_results),
    'quality',        (select coalesce(jsonb_object_agg(quality, n), '{}') from (
                        select quality, count(*) as n from public.sport_fit_results group by 1) q),
    'top_sports',     (select coalesce(jsonb_agg(jsonb_build_object('sport', sport, 'count', n) order by n desc, sport), '[]')
                        from tops),
    'by_age_band',    (select coalesce(jsonb_agg(
                         case when n < 5 then jsonb_build_object('band', band, 'count', n, 'hidden', true)
                         else jsonb_build_object('band', band, 'count', n, 'hidden', false,
                           'dimensions', jsonb_build_object('drive', drive, 'composure', composure, 'focus', focus,
                             'resilience', resilience, 'boldness', boldness, 'discipline', discipline, 'team', team))
                         end order by band), '[]') from bands),
    'by_day',         (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c.n, 0)) order by d), '[]')
                        from generate_series(current_date - 29, current_date, interval '1 day') d
                        left join (select created_at::date as day, count(*) as n from public.sport_fit_results
                                   where quality = 'ok' and created_at > current_date - 30 group by 1) c
                          on c.day = d::date),
    'pending_consents', (select count(*) from public.user_profiles u
                          where u.is_minor and private.sf_consent_state(u.id) = 'guardian_required'),
    'sports',         (select coalesce(jsonb_agg(jsonb_build_object(
                         'sport', s.sport, 'weights', s.weights, 'team_target', s.team_target,
                         'active', s.active, 'reviewed_by', s.reviewed_by, 'updated_at', s.updated_at)
                         order by s.sport), '[]') from public.sport_fit_sports s),
    'items',          (select coalesce(jsonb_agg(jsonb_build_object(
                         'id', i.id, 'dimension', i.dimension, 'reverse', i.reverse, 'sort', i.sort)
                         order by i.sort), '[]') from public.sport_fit_items i)
  ) into v;

  /* A count under five is a hint at a person; say "fewer than 5" instead. */
  v := jsonb_set(v, '{top_sports}', coalesce((
    select jsonb_agg(case when (e ->> 'count')::int < 5
                          then jsonb_build_object('sport', e ->> 'sport', 'count', null, 'hidden', true)
                          else e || '{"hidden": false}'::jsonb end)
    from jsonb_array_elements(v -> 'top_sports') e), '[]'));

  return v;
end;
$$;

/* Edit one sport's row of the matrix. Any edit clears the review mark: a
   signed-off row that has since changed is no longer signed off. */
create or replace function public.admin_update_sport_fit_sport(
  p_sport       text,
  p_weights     jsonb,
  p_team_target numeric,
  p_active      boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old  public.sport_fit_sports;
  v_new  public.sport_fit_sports;
  k      text;
  w      text;
  v_keys text[] := array['drive','composure','focus','resilience','boldness','discipline','reading','speed'];
begin
  perform private.require_admin();

  select * into v_old from public.sport_fit_sports where sport = p_sport for update;
  if not found then raise exception 'Unknown sport' using errcode = 'P0002'; end if;

  if p_weights is null or jsonb_typeof(p_weights) <> 'object' then
    raise exception 'Weights are missing' using errcode = '22023';
  end if;
  for k, w in select key, value from jsonb_each_text(p_weights) loop
    if not (k = any (v_keys)) then
      raise exception 'Unknown dimension: %', k using errcode = '22023';
    end if;
    if w !~ '^[0-3]$' then
      raise exception 'Weights are whole numbers from 0 to 3 (%)', k using errcode = '22023';
    end if;
  end loop;
  if (select count(*) from jsonb_object_keys(p_weights)) <> array_length(v_keys, 1) then
    raise exception 'Give a weight for every dimension' using errcode = '22023';
  end if;
  if p_team_target is null or p_team_target < 0 or p_team_target > 1 then
    raise exception 'Team target is between 0 and 1' using errcode = '22023';
  end if;

  update public.sport_fit_sports
     set weights = p_weights,
         team_target = round(p_team_target, 2),
         active = coalesce(p_active, true),
         reviewed_by = case when weights = p_weights and team_target = round(p_team_target, 2)
                            then reviewed_by else null end,
         updated_at = now()
   where sport = p_sport
  returning * into v_new;

  perform private.admin_audit('sport_fit.sport.update', 'sport_fit_sports', null,
    to_jsonb(v_old), to_jsonb(v_new));
  return to_jsonb(v_new);
end;
$$;

/* Record who signed a row off (a name, as written by the reviewer), or clear it. */
create or replace function public.admin_review_sport_fit_sport(p_sport text, p_reviewed_by text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old public.sport_fit_sports; v_new public.sport_fit_sports;
begin
  perform private.require_admin();
  select * into v_old from public.sport_fit_sports where sport = p_sport for update;
  if not found then raise exception 'Unknown sport' using errcode = 'P0002'; end if;

  update public.sport_fit_sports
     set reviewed_by = nullif(btrim(coalesce(p_reviewed_by, '')), ''), updated_at = now()
   where sport = p_sport
  returning * into v_new;

  perform private.admin_audit(
    case when v_new.reviewed_by is null then 'sport_fit.sport.unreview' else 'sport_fit.sport.review' end,
    'sport_fit_sports', null, to_jsonb(v_old),
    jsonb_build_object('sport', p_sport, 'reason', v_new.reviewed_by));
  return to_jsonb(v_new);
end;
$$;

revoke all on function public.admin_sport_fit_overview() from public, anon;
revoke all on function public.admin_update_sport_fit_sport(text, jsonb, numeric, boolean) from public, anon;
revoke all on function public.admin_review_sport_fit_sport(text, text) from public, anon;
grant execute on function public.admin_sport_fit_overview() to authenticated;
grant execute on function public.admin_update_sport_fit_sport(text, jsonb, numeric, boolean) to authenticated;
grant execute on function public.admin_review_sport_fit_sport(text, text) to authenticated;
