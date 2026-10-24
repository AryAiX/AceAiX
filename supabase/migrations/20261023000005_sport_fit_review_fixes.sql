-- ============================================================
-- Tooraj's review of PR #42
-- ============================================================

-- An unknown guardian scope is not consent. Same body as
-- 20261019000001_sport_fit.sql, except the final else.
create or replace function private.has_guardian_consent(p_user uuid, p_scope text default 'messaging')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.guardian_consents g
    where g.minor_user_id = p_user
      and g.status = 'granted'
      and case p_scope
            when 'messaging'   then g.allow_messaging
            when 'discovery'   then g.allow_discovery
            when 'media'       then g.allow_media
            when 'assessments' then g.allow_assessments
            when 'sponsorship' then g.allow_sponsorship
            when 'bookings'    then g.allow_bookings
            when 'mindset'     then g.allow_mindset
            else false
          end
  );
$$;

-- sport_fit_results_own was the only Sport Fit policy with
-- "or private.is_admin()". That let an admin select one person's answers.
-- sport_fit_items_read and sport_fit_sports_read are catalogue reads
-- (using true) and do not expose answers or results. The admin overview
-- is security definer and does not need this policy.
drop policy if exists sport_fit_results_own on public.sport_fit_results;
create policy sport_fit_results_own on public.sport_fit_results
  for select to authenticated using (user_id = auth.uid());

-- Same body as 20261019000002_admin_sport_fit.sql. Sports chosen by fewer
-- than five players are not named; they share one "other" row, shown as
-- "fewer than 5" the same way a small count is hidden.
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

  /* A sport chosen by fewer than five players is not named. Those sports
     share one "other" row, shown as "fewer than 5". */
  v := jsonb_set(v, '{top_sports}', coalesce((
    select jsonb_agg(obj order by n desc nulls last, sport)
    from (
      select e || '{"hidden": false}'::jsonb as obj,
             (e ->> 'count')::int as n,
             e ->> 'sport' as sport
      from jsonb_array_elements(v -> 'top_sports') e
      where (e ->> 'count')::int >= 5
      union all
      select jsonb_build_object('sport', 'other', 'count', null::int, 'hidden', true),
             null::int,
             'other'
      where exists (
        select 1 from jsonb_array_elements(v -> 'top_sports') e
        where (e ->> 'count')::int < 5
      )
    ) t
  ), '[]'));

  return v;
end;
$$;
