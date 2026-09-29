-- previous_overall drives the "up 3" / "down 2" arrow on the score screen. The
-- screen now recomputes on open, so overwriting previous_overall on every
-- recompute erased the arrow the moment it appeared. Only a changed score moves
-- previous_overall; an unchanged recompute keeps the last real movement.

create or replace function private.refresh_talent_score(p_athlete uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  r         jsonb;
  v_prev    integer;
  v_pct     integer;
  v_sport   text;
  v_cohort  integer;
begin
  r := private.compute_talent_score(p_athlete);
  if r is null then return; end if;

  select overall into v_prev from public.talent_scores where athlete_id = p_athlete;
  select sport   into v_sport from public.athlete_profiles where id = p_athlete;

  select count(*) into v_cohort
  from public.talent_scores ts
  join public.athlete_profiles ap on ap.id = ts.athlete_id
  where v_sport is not null and ap.sport is not distinct from v_sport;

  if v_cohort >= 10 then
    select round(
      100.0 * (
        select count(*)
        from public.talent_scores ts
        join public.athlete_profiles ap on ap.id = ts.athlete_id
        where ap.sport is not distinct from v_sport
          and ts.overall <= (r ->> 'overall')::int
      ) / v_cohort
    )::int into v_pct;
  else
    v_pct := null;
  end if;

  insert into public.talent_scores as t (
    athlete_id, overall, tier,
    profile_score, performance_score, media_score, credibility_score, engagement_score,
    inputs, tips, percentile, previous_overall, computed_at, updated_at
  )
  values (
    p_athlete,
    (r ->> 'overall')::int,
    r ->> 'tier',
    (r ->> 'profile_score')::int,
    (r ->> 'performance_score')::int,
    (r ->> 'media_score')::int,
    (r ->> 'credibility_score')::int,
    (r ->> 'engagement_score')::int,
    r -> 'inputs',
    private.build_score_tips(r),
    v_pct,
    v_prev,
    now(),
    now()
  )
  on conflict (athlete_id) do update set
    overall           = excluded.overall,
    tier              = excluded.tier,
    profile_score     = excluded.profile_score,
    performance_score = excluded.performance_score,
    media_score       = excluded.media_score,
    credibility_score = excluded.credibility_score,
    engagement_score  = excluded.engagement_score,
    inputs            = excluded.inputs,
    tips              = excluded.tips,
    percentile        = excluded.percentile,
    previous_overall  = case
                          when t.overall is distinct from excluded.overall then t.overall
                          else t.previous_overall
                        end,
    computed_at       = now(),
    updated_at        = now();

  insert into public.talent_score_history (athlete_id, overall, tier, pillars, recorded_on)
  values (
    p_athlete,
    (r ->> 'overall')::int,
    r ->> 'tier',
    jsonb_build_object(
      'profile',     (r ->> 'profile_score')::int,
      'performance', (r ->> 'performance_score')::int,
      'media',       (r ->> 'media_score')::int,
      'credibility', (r ->> 'credibility_score')::int,
      'engagement',  (r ->> 'engagement_score')::int
    ),
    current_date
  )
  on conflict (athlete_id, recorded_on) do update set
    overall = excluded.overall,
    tier    = excluded.tier,
    pillars = excluded.pillars;

  update public.athlete_profiles
  set performance_score    = (r ->> 'performance_score')::int,
      visibility_score     = (r ->> 'overall')::int,
      profile_completeness = (r ->> 'profile_score')::int
  where id = p_athlete;
end;
$function$;
