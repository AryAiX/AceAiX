-- ============================================================
-- Sport Fit: a mindset questionnaire, and the sports it points to
--
-- A player answers 22 short statements (21 scored, one attention check; about 4 minutes). The server turns the
-- answers into seven mindset dimensions, adds two Game Intelligence signals
-- when the player has them, and matches the profile against what each sport in
-- the app's catalogue asks of a player's mind. The player gets their top three
-- sports, each with the reasons ("you stay calm when it is close, and tennis
-- puts you alone in those moments") and one thing to develop.
--
-- What it is and is not (the copy in every language keeps to this):
--   * A suggestion to explore, never a verdict. It measures mindset and game
--     reading only: not body, fitness, skill or experience.
--   * Not a clinical or personality assessment. The statements are AceAiX's
--     own (no licensed instrument is reproduced) and are marked unreviewed
--     until a sports-psychology panel signs them and the sport matrix off.
--   * Private. Only the player sees their answers and result. Nothing reaches
--     clubs, scouts or the Talent Score.
--
-- Consent: the same age rule as Game Intelligence (self-consent from 15 by
-- default, per country in assessment_consent_ages), but a SEPARATE guardian
-- scope. A parent who approved the games has not approved a questionnaire
-- about how their child feels under pressure, so `allow_mindset` starts false
-- for everyone.
--
-- Docs: docs/31-sport-fit.md
-- ============================================================

-- ------------------------------------------------------------
-- 1. A seventh guardian scope
-- ------------------------------------------------------------
alter table public.guardian_consents
  add column if not exists allow_mindset boolean not null default false;

grant select (allow_mindset) on public.guardian_consents to authenticated;

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
            else true
          end
  );
$$;

drop function if exists public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean, boolean);

create or replace function public.confirm_guardian_consent(
  p_token             text,
  p_allow_discovery   boolean default true,
  p_allow_messaging   boolean default true,
  p_allow_media       boolean default true,
  p_allow_assessments boolean default false,
  p_allow_sponsorship boolean default false,
  p_allow_bookings    boolean default false,
  p_allow_mindset     boolean default false
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

  -- Grant before expiring the guardian's previous consent: the scope triggers
  -- read live consent, and in between the minor would hold none, cancelling
  -- every booking and offer even when the guardian re-ticked every box.
  update public.guardian_consents
  set status = 'granted',
      granted_at = now(),
      allow_discovery   = coalesce(p_allow_discovery, true),
      allow_messaging   = coalesce(p_allow_messaging, true),
      allow_media       = coalesce(p_allow_media, true),
      allow_assessments = coalesce(p_allow_assessments, false),
      allow_sponsorship = coalesce(p_allow_sponsorship, false),
      allow_bookings    = coalesce(p_allow_bookings, false),
      allow_mindset     = coalesce(p_allow_mindset, false),
      updated_at = now()
  where id = v_row.id
  returning * into v_row;

  update public.guardian_consents
     set status = 'expired', updated_at = now()
   where minor_user_id = v_row.minor_user_id
     and status = 'granted'
     and id <> v_row.id
     and lower(guardian_email) = lower(v_row.guardian_email);

  return jsonb_build_object(
    'ok', true,
    'minor_user_id', v_row.minor_user_id,
    'allow_discovery', v_row.allow_discovery,
    'allow_messaging', v_row.allow_messaging,
    'allow_assessments', v_row.allow_assessments,
    'allow_sponsorship', v_row.allow_sponsorship,
    'allow_bookings', v_row.allow_bookings,
    'allow_mindset', v_row.allow_mindset
  );
end;
$$;

revoke all on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean, boolean, boolean, boolean)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 2. Who may answer
-- ------------------------------------------------------------
/*
 *   ok                 go ahead
 *   guardian_required  under the self-consent age and no guardian ticked "mindset"
 *   age_unknown        no date of birth on file — treated as a minor
 *   not_athlete        only athletes have a profile this belongs to
 *   suspended
 */
create or replace function private.sf_consent_state(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_up  public.user_profiles;
  v_dob date;
begin
  select * into v_up from public.user_profiles where id = p_user;
  if not found then return 'not_athlete'; end if;
  if coalesce(v_up.is_suspended, false) then return 'suspended'; end if;
  if not exists (select 1 from public.athlete_profiles where user_id = p_user) then
    return 'not_athlete';
  end if;

  select date_of_birth into v_dob from public.user_private where user_id = p_user;
  if v_dob is null then return 'age_unknown'; end if;

  if extract(year from age(v_dob))::integer >= private.gi_self_consent_age(v_up.country) then
    return 'ok';
  end if;
  if private.has_guardian_consent(p_user, 'mindset') then
    return 'ok';
  end if;
  return 'guardian_required';
end;
$$;

-- ------------------------------------------------------------
-- 3. Tables
-- ------------------------------------------------------------
/* The statements. Their text lives in the app's seven languages, keyed by id;
   the server holds what scoring needs. */
create table if not exists public.sport_fit_items (
  id          text primary key check (id ~ '^[a-z]+[0-9]$'),
  dimension   text not null check (dimension in
                ('drive','composure','focus','resilience','team','boldness','discipline','check')),
  reverse     boolean not null default false,
  sort        smallint not null unique,
  /* The answer an attention check expects; null for scored statements. */
  expected    smallint check (expected is null or expected between 1 and 5)
);

/* What each sport asks of a player's mind. Weights 0–3 (0 = does not matter,
   3 = central); `team_target` 0 = alone, 0.5 = a partner, 1 = a team.
   Authored by AceAiX as a starting point: reviewed_by stays NULL until a
   sports-psychology panel and coaches sign each row off. */
create table if not exists public.sport_fit_sports (
  sport        text primary key,            -- the app's sport key (i18n sports.*)
  weights      jsonb not null,
  team_target  numeric not null check (team_target between 0 and 1),
  active       boolean not null default true,
  reviewed_by  text,
  updated_at   timestamptz not null default now()
);

create table if not exists public.sport_fit_results (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.user_profiles(id) on delete cascade,
  athlete_id        uuid not null references public.athlete_profiles(id) on delete cascade,
  answers           jsonb not null,
  duration_s        integer not null check (duration_s between 0 and 7200),
  quality           text not null check (quality in ('ok','too_fast','check_failed','straight_line')),
  /* 0–100 per dimension, rounded. Empty when quality is not ok. */
  dimensions        jsonb not null default '{}',
  /* Which Game Intelligence signals were used: { reading: 64, speed: 71 } or {}. */
  gi_signals        jsonb not null default '{}',
  /* Every active sport, best first:
     [{ sport, fit, team, team_match, strengths: [dim], develop: dim | null }] */
  fits              jsonb not null default '[]',
  algorithm_version integer not null default 1,
  created_at        timestamptz not null default now()
);

create index if not exists idx_sport_fit_results_user on public.sport_fit_results (user_id, created_at desc);

alter table public.sport_fit_items   enable row level security;
alter table public.sport_fit_sports  enable row level security;
alter table public.sport_fit_results enable row level security;

drop policy if exists sport_fit_items_read on public.sport_fit_items;
create policy sport_fit_items_read on public.sport_fit_items
  for select to authenticated using (true);

drop policy if exists sport_fit_sports_read on public.sport_fit_sports;
create policy sport_fit_sports_read on public.sport_fit_sports
  for select to authenticated using (true);

drop policy if exists sport_fit_results_own on public.sport_fit_results;
create policy sport_fit_results_own on public.sport_fit_results
  for select to authenticated using (user_id = auth.uid() or private.is_admin());

revoke all on public.sport_fit_items, public.sport_fit_sports, public.sport_fit_results from anon;
revoke insert, update, delete on public.sport_fit_items, public.sport_fit_sports, public.sport_fit_results
  from authenticated;
grant select on public.sport_fit_items, public.sport_fit_sports, public.sport_fit_results to authenticated;

-- ------------------------------------------------------------
-- 4. Seed: 21 statements + 1 attention check, 12 sports
-- ------------------------------------------------------------
insert into public.sport_fit_items (id, dimension, reverse, sort, expected) values
  ('drive1',      'drive',      false,  1, null),
  ('composure1',  'composure',  false,  2, null),
  ('team1',       'team',       false,  3, null),
  ('focus1',      'focus',      false,  4, null),
  ('boldness1',   'boldness',   false,  5, null),
  ('resilience1', 'resilience', false,  6, null),
  ('discipline1', 'discipline', false,  7, null),
  ('drive2',      'drive',      false,  8, null),
  ('composure2',  'composure',  true,   9, null),
  ('team2',       'team',       true,  10, null),
  ('focus2',      'focus',      true,  11, null),
  ('check1',      'check',      false, 12, 4),
  ('boldness2',   'boldness',   false, 13, null),
  ('resilience2', 'resilience', false, 14, null),
  ('discipline2', 'discipline', false, 15, null),
  ('drive3',      'drive',      true,  16, null),
  ('composure3',  'composure',  false, 17, null),
  ('team3',       'team',       false, 18, null),
  ('focus3',      'focus',      false, 19, null),
  ('boldness3',   'boldness',   true,  20, null),
  ('resilience3', 'resilience', true,  21, null),
  ('discipline3', 'discipline', true,  22, null)
on conflict (id) do update set
  dimension = excluded.dimension, reverse = excluded.reverse,
  sort = excluded.sort, expected = excluded.expected;

insert into public.sport_fit_sports (sport, weights, team_target) values
  --              drive composure focus resilience boldness discipline reading speed
  ('football',    '{"drive":2,"composure":2,"focus":1,"resilience":2,"boldness":2,"discipline":1,"reading":3,"speed":2}', 1.0),
  ('basketball',  '{"drive":2,"composure":2,"focus":1,"resilience":2,"boldness":2,"discipline":1,"reading":3,"speed":3}', 1.0),
  ('volleyball',  '{"drive":2,"composure":2,"focus":2,"resilience":2,"boldness":1,"discipline":1,"reading":2,"speed":3}', 1.0),
  ('handball',    '{"drive":2,"composure":2,"focus":1,"resilience":2,"boldness":3,"discipline":1,"reading":2,"speed":3}', 1.0),
  ('cricket',     '{"drive":2,"composure":3,"focus":3,"resilience":2,"boldness":1,"discipline":2,"reading":2,"speed":2}', 0.8),
  ('padel',       '{"drive":2,"composure":2,"focus":1,"resilience":2,"boldness":1,"discipline":1,"reading":3,"speed":3}', 0.5),
  ('esports',     '{"drive":2,"composure":2,"focus":3,"resilience":2,"boldness":1,"discipline":2,"reading":3,"speed":3}', 0.6),
  ('tennis',      '{"drive":3,"composure":3,"focus":2,"resilience":3,"boldness":2,"discipline":2,"reading":2,"speed":3}', 0.0),
  ('martialArts', '{"drive":2,"composure":3,"focus":2,"resilience":3,"boldness":3,"discipline":2,"reading":2,"speed":3}', 0.0),
  ('chess',       '{"drive":2,"composure":3,"focus":3,"resilience":3,"boldness":0,"discipline":2,"reading":3,"speed":0}', 0.0),
  ('swimming',    '{"drive":3,"composure":1,"focus":2,"resilience":2,"boldness":0,"discipline":3,"reading":0,"speed":1}', 0.1),
  ('athletics',   '{"drive":3,"composure":2,"focus":2,"resilience":2,"boldness":1,"discipline":3,"reading":0,"speed":2}', 0.1)
on conflict (sport) do update set
  weights = excluded.weights, team_target = excluded.team_target, updated_at = now();

-- ------------------------------------------------------------
-- 5. Scoring
-- ------------------------------------------------------------
/* Answers → dimensions (0–1). Reverse statements are flipped (6 − answer). */
create or replace function private.sf_dimensions(p_answers jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_object_agg(dimension, round(value::numeric, 4)), '{}')
  from (
    select i.dimension,
           avg(((case when i.reverse then 6 - (p_answers ->> i.id)::int
                      else (p_answers ->> i.id)::int end) - 1) / 4.0) as value
    from public.sport_fit_items i
    where i.dimension <> 'check'
    group by i.dimension
  ) d;
$$;

/*
 * Every active sport, best first.
 *
 *   fit = 0.25 × team match + 0.75 × Σ(weight × value) / Σ(weight)
 *
 * team match = 1 − |player's team preference − the sport's team target|.
 * `reading` and `speed` come from Game Intelligence and are left out of the
 * sum (and its weights) when the player has not played.
 *
 * Reasons: strengths are the two dimensions that add most to this sport's fit
 * (weight ≥ 2 and value ≥ 0.6); `develop` is the heaviest-weighted dimension
 * the player scored lowest on, if it is under 0.5.
 */
create or replace function private.sf_rank(p_features jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  s        record;
  k        text;
  w        numeric;
  x        numeric;
  v_sum    numeric;
  v_wsum   numeric;
  v_team   numeric := coalesce((p_features ->> 'team')::numeric, 0.5);
  v_match  numeric;
  v_fit    numeric;
  v_strong jsonb;
  v_dev    text;
  v_out    jsonb := '[]';
begin
  for s in select * from public.sport_fit_sports where active order by sport loop
    v_sum := 0; v_wsum := 0;
    for k, w in select key, value::numeric from jsonb_each_text(s.weights) loop
      x := (p_features ->> k)::numeric;
      if x is null or w <= 0 then continue; end if;
      v_sum := v_sum + w * x;
      v_wsum := v_wsum + w;
    end loop;

    v_match := 1 - abs(v_team - s.team_target);
    v_fit := 0.25 * v_match + 0.75 * case when v_wsum > 0 then v_sum / v_wsum else 0.5 end;

    select coalesce(jsonb_agg(key order by contribution desc), '[]') into v_strong
    from (
      select key, value::numeric * (p_features ->> key)::numeric as contribution
      from jsonb_each_text(s.weights)
      where value::numeric >= 2
        and (p_features ->> key) is not null
        and (p_features ->> key)::numeric >= 0.6
      order by 2 desc
      limit 2
    ) t;

    select key into v_dev
    from jsonb_each_text(s.weights)
    where value::numeric >= 2
      and (p_features ->> key) is not null
      and (p_features ->> key)::numeric < 0.5
    order by value::numeric desc, (p_features ->> key)::numeric asc
    limit 1;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'sport', s.sport,
      'fit', round(v_fit * 100)::int,
      'team', case when s.team_target >= 0.75 then 'team'
                   when s.team_target >= 0.35 then 'pairs'
                   else 'solo' end,
      'team_match', v_match >= 0.7,
      'strengths', v_strong,
      'develop', v_dev
    ));
  end loop;

  return coalesce((
    select jsonb_agg(e order by (e ->> 'fit')::int desc, e ->> 'sport')
    from jsonb_array_elements(v_out) e
  ), '[]');
end;
$$;

-- ------------------------------------------------------------
-- 6. The client API
-- ------------------------------------------------------------
/* Days between two valid results. A mindset does not change week to week, and
   a retake should not be a way to fish for a different answer. */
create or replace function private.sf_retake_days()
returns integer language sql immutable set search_path = public, pg_temp as $$ select 60 $$;

create or replace function public.sport_fit_my_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_state   text;
  v_country text;
  v_pending boolean;
  v_last    public.sport_fit_results;
  v_items   jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_state := private.sf_consent_state(auth.uid());
  select country into v_country from public.user_profiles where id = auth.uid();
  select exists (select 1 from public.guardian_consents
                  where minor_user_id = auth.uid() and status = 'pending') into v_pending;

  select * into v_last from public.sport_fit_results
   where user_id = auth.uid() and quality = 'ok'
   order by created_at desc limit 1;

  select coalesce(jsonb_agg(id order by sort), '[]') into v_items from public.sport_fit_items;

  return jsonb_build_object(
    'consent', v_state,
    'self_consent_age', private.gi_self_consent_age(v_country),
    'guardian_pending', coalesce(v_pending, false),
    'items', v_items,
    'has_game_intelligence', exists (
      select 1 from public.gi_profiles where user_id = auth.uid() and subscores <> '{}'),
    'result', case when v_last.id is null then null else jsonb_build_object(
        'id', v_last.id,
        'created_at', v_last.created_at,
        'dimensions', v_last.dimensions,
        'gi_signals', v_last.gi_signals,
        'fits', v_last.fits,
        'algorithm_version', v_last.algorithm_version) end,
    'next_retake_at', case when v_last.id is null then null
                           else v_last.created_at + make_interval(days => private.sf_retake_days()) end
  );
end;
$$;

create or replace function public.sport_fit_submit(p_answers jsonb, p_duration_s integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_state    text;
  v_athlete  uuid;
  v_item     record;
  v_val      text;
  v_distinct integer;
  v_quality  text := 'ok';
  v_dims     jsonb;
  v_features jsonb;
  v_gi       jsonb := '{}';
  v_subs     jsonb;
  v_fits     jsonb := '[]';
  v_first    boolean;
  v_id       uuid;
  g          record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_state := private.sf_consent_state(auth.uid());
  if v_state <> 'ok' then
    raise exception 'sport_fit_%', v_state using errcode = '42501', hint = 'sport_fit_consent_required';
  end if;
  select id into v_athlete from public.athlete_profiles where user_id = auth.uid();

  /* One answer, 1–5, for every statement and nothing else. */
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers are missing' using errcode = '22023';
  end if;
  for v_item in select * from public.sport_fit_items loop
    v_val := p_answers ->> v_item.id;
    if v_val is null or v_val !~ '^[1-5]$' then
      raise exception 'Answer every statement with 1 to 5 (%)', v_item.id using errcode = '22023';
    end if;
  end loop;
  if (select count(*) from jsonb_object_keys(p_answers)) <> (select count(*) from public.sport_fit_items) then
    raise exception 'Unknown statements in the answers' using errcode = '22023';
  end if;
  if p_duration_s is null or p_duration_s < 0 then
    raise exception 'Duration is missing' using errcode = '22023';
  end if;

  /* Retakes: one valid result per window; at most five tries a day. */
  if exists (select 1 from public.sport_fit_results
              where user_id = auth.uid() and quality = 'ok'
                and created_at > now() - make_interval(days => private.sf_retake_days())) then
    raise exception 'sport_fit_retake_too_soon' using errcode = '22023', hint = 'sport_fit_retake_too_soon';
  end if;
  if (select count(*) from public.sport_fit_results
       where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'sport_fit_rate_limited' using errcode = '54000', hint = 'rate_limited';
  end if;

  /* Was it read? Too fast, a missed attention check, or the same answer to
     everything is stored as unusable and shown as "let's try that again". */
  select count(distinct value) into v_distinct
    from jsonb_each_text(p_answers) where key <> 'check1';
  if p_duration_s < 45 then
    v_quality := 'too_fast';
  elsif exists (select 1 from public.sport_fit_items i
                 where i.expected is not null and (p_answers ->> i.id)::int <> i.expected) then
    v_quality := 'check_failed';
  elsif v_distinct = 1 then
    v_quality := 'straight_line';
  end if;

  v_first := not exists (select 1 from public.sport_fit_results
                          where user_id = auth.uid() and quality = 'ok');

  if v_quality = 'ok' then
    v_dims := private.sf_dimensions(p_answers);
    v_features := v_dims;

    /* Game Intelligence, when the player has it: reading the game and speed. */
    select subscores into v_subs from public.gi_profiles where user_id = auth.uid();
    if v_subs is not null and v_subs <> '{}' then
      with r as (
        select avg(value::numeric) as reading from jsonb_each_text(v_subs)
         where key in ('pitch_decision','anticipation','tracking')
      ), s as (
        select avg(value::numeric) as speed from jsonb_each_text(v_subs)
         where key in ('reaction','go_no_go')
      )
      select jsonb_strip_nulls(jsonb_build_object(
               'reading', round(r.reading)::int, 'speed', round(s.speed)::int))
        into v_gi from r, s;
      if v_gi ? 'reading' then
        v_features := v_features || jsonb_build_object('reading', (v_gi ->> 'reading')::numeric / 100);
      end if;
      if v_gi ? 'speed' then
        v_features := v_features || jsonb_build_object('speed', (v_gi ->> 'speed')::numeric / 100);
      end if;
    end if;

    v_fits := private.sf_rank(v_features);
    select coalesce(jsonb_object_agg(key, round(value::numeric * 100)::int), '{}')
      into v_dims from jsonb_each_text(v_dims);
  else
    v_dims := '{}';
  end if;

  insert into public.sport_fit_results
    (user_id, athlete_id, answers, duration_s, quality, dimensions, gi_signals, fits)
  values
    (auth.uid(), v_athlete, p_answers, least(p_duration_s, 7200), v_quality,
     coalesce(v_dims, '{}'), coalesce(v_gi, '{}'), v_fits)
  returning id into v_id;

  /* A minor who answered on their own consent (15–17 by default) has a
     guardian who is told, not asked — once, on the first valid result. */
  if v_quality = 'ok' and v_first and coalesce(private.is_minor(auth.uid()), false) then
    for g in
      select distinct guardian_user_id from public.guardian_consents
       where minor_user_id = auth.uid() and status = 'granted'
         and guardian_user_id is not null
    loop
      perform private.notify(
        g.guardian_user_id, 'score', 'sport_fit_completed',
        private.display_name(auth.uid()) || ' completed Sport Fit',
        'Their answers and result are private to them.',
        auth.uid(), 'user', auth.uid()::text
      );
    end loop;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'quality', v_quality,
    'dimensions', v_dims,
    'gi_signals', v_gi,
    'fits', v_fits
  );
end;
$$;

/* The player can erase every answer and result at any time. */
create or replace function public.sport_fit_delete_mine()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  with d as (delete from public.sport_fit_results where user_id = auth.uid() returning 1)
  select count(*) into v_n from d;
  return v_n;
end;
$$;

revoke all on function private.sf_consent_state(uuid) from public, anon, authenticated;
revoke all on function private.sf_dimensions(jsonb)   from public, anon, authenticated;
revoke all on function private.sf_rank(jsonb)         from public, anon, authenticated;
revoke all on function private.sf_retake_days()       from public, anon, authenticated;

revoke all on function public.sport_fit_my_state()                from public, anon;
revoke all on function public.sport_fit_submit(jsonb, integer)    from public, anon;
revoke all on function public.sport_fit_delete_mine()             from public, anon;
grant execute on function public.sport_fit_my_state()             to authenticated;
grant execute on function public.sport_fit_submit(jsonb, integer) to authenticated;
grant execute on function public.sport_fit_delete_mine()          to authenticated;


-- ------------------------------------------------------------
-- 7. Admin console: show the new scope beside the others
-- ------------------------------------------------------------
create or replace function public.admin_get_user(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb; u public.user_profiles;
begin
  perform private.require_admin();
  select * into u from public.user_profiles where id = p_user;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;

  select jsonb_build_object(
    'profile', to_jsonb(u),
    'email', (select email from public.user_private where user_id = u.id),
    'phone', (select phone from public.user_private where user_id = u.id),
    'date_of_birth', (select date_of_birth from public.user_private where user_id = u.id),
    'suspended_by', private.admin_person(u.suspended_by),
    'athlete', (select jsonb_build_object('id', ap.id, 'sport', ap.sport, 'position', coalesce(ap.position_primary, ap.position),
                                          'level', ap.level, 'club', ap.current_club, 'nationality', ap.nationality,
                                          'talent_score', (select overall from public.talent_scores t where t.athlete_id = ap.id),
                                          'tier', (select tier from public.talent_scores t where t.athlete_id = ap.id))
                from public.athlete_profiles ap where ap.user_id = u.id),
    'coach', (select jsonb_build_object('specialty', cp.specialty, 'years_experience', cp.years_experience,
                                        'licenses', cp.licenses, 'current_club', cp.current_club,
                                        'accepting', (select accepting from public.coaching_settings cs where cs.user_id = u.id))
              from public.coach_profiles cp where cp.user_id = u.id),
    'sponsor', (select to_jsonb(sp) - 'user_id' from public.sponsor_profiles sp where sp.user_id = u.id),
    'stats', jsonb_build_object(
      'posts', (select count(*) from public.posts where author_id = u.id),
      'posts_removed', (select count(*) from public.posts where author_id = u.id and moderation_state = 'removed'),
      'stories', (select count(*) from public.stories where author_id = u.id),
      'comments', (select count(*) from public.post_comments where author_id = u.id),
      'messages_sent', (select count(*) from public.messages where sender_id = u.id),
      'conversations', (select count(*) from public.conversations where participant_1_id = u.id or participant_2_id = u.id),
      'blocked_by', (select count(*) from public.user_blocks where blocked_id = u.id),
      'reports_filed', (select count(*) from public.moderation_reports where reporter_id = u.id),
      'followers', u.followers_count,
      'following', u.following_count),
    'guardian_consents', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', g.id, 'status', g.status, 'guardian_name', g.guardian_name, 'guardian_email', g.guardian_email,
          'relationship', g.relationship, 'guardian', private.admin_person(g.guardian_user_id),
          'allow_discovery', g.allow_discovery, 'allow_messaging', g.allow_messaging, 'allow_media', g.allow_media,
          'allow_assessments', g.allow_assessments, 'allow_sponsorship', g.allow_sponsorship, 'allow_bookings', g.allow_bookings, 'allow_mindset', g.allow_mindset,
          'granted_at', g.granted_at, 'revoked_at', g.revoked_at, 'created_at', g.created_at) order by g.created_at desc), '[]')
        from public.guardian_consents g where g.minor_user_id = u.id),
    'wards', (select coalesce(jsonb_agg(private.admin_person(g.minor_user_id)), '[]')
              from public.guardian_consents g where g.guardian_user_id = u.id and g.status = 'granted'),
    'reports_against', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', r.id, 'reason', r.reason, 'entity_type', r.reported_entity_type, 'status', r.status,
          'severity', r.severity, 'action_taken', r.action_taken, 'created_at', r.created_at) order by r.created_at desc), '[]')
        from (select * from public.moderation_reports where reported_user_id = u.id order by created_at desc limit 25) r),
    'verification_requests', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', r.id, 'type', r.type, 'status', r.status, 'decision_reason', r.decision_reason,
          'created_at', r.created_at) order by r.created_at desc), '[]')
        from public.verification_requests r where r.subject_user_id = u.id),
    'recent_posts', (select coalesce(jsonb_agg(jsonb_build_object(
          'kind','post','id', p.id, 'text', coalesce(p.caption, p.text), 'media', p.media, 'type', p.type,
          'state', p.moderation_state, 'created_at', p.created_at) order by p.created_at desc), '[]')
        from (select * from public.posts where author_id = u.id order by created_at desc limit 12) p),
    'history', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', a.id, 'action', a.action, 'created_at', a.created_at, 'by', private.admin_person(a.user_id),
          'note', a.new_value->>'reason') order by a.created_at desc), '[]')
        from (select * from public.audit_logs where record_id = u.id order by created_at desc limit 30) a)
  ) into v;
  return v;
end;
$$;

create or replace function public.admin_list_minors(p_filter text default 'all')  -- all | no_consent | pending | granted | revoked
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]') into v from (
    select jsonb_build_object(
      'user', private.admin_person(u.id),
      'email', pv.email,
      'is_discoverable', u.is_discoverable,
      'created_at', u.created_at,
      'consent_state', coalesce(g.status, 'none'),
      'consent', case when g.id is null then null else jsonb_build_object(
          'id', g.id, 'guardian_name', g.guardian_name, 'guardian_email', g.guardian_email,
          'guardian', private.admin_person(g.guardian_user_id), 'relationship', g.relationship,
          'allow_discovery', g.allow_discovery, 'allow_messaging', g.allow_messaging, 'allow_media', g.allow_media,
          'allow_assessments', g.allow_assessments, 'allow_sponsorship', g.allow_sponsorship,
          'allow_bookings', g.allow_bookings, 'allow_mindset', g.allow_mindset, 'granted_at', g.granted_at, 'created_at', g.created_at,
          'delivery_count', g.delivery_count, 'last_delivery_at', g.last_delivery_at) end,
      'adult_conversations', (select count(*) from public.conversations c
          join public.user_profiles o on o.id = case when c.participant_1_id = u.id then c.participant_2_id else c.participant_1_id end
          where (c.participant_1_id = u.id or c.participant_2_id = u.id) and not o.is_minor),
      'open_reports', (select count(*) from public.moderation_reports r
          where r.reported_user_id = u.id and r.status in ('open','reviewing','escalated')),
      'deals', (select count(*) from public.sponsorship_deals d where d.athlete_user_id = u.id),
      'bookings', (select count(*) from public.coaching_bookings b where b.athlete_user_id = u.id and b.status = 'booked')
    ) as x
    from public.user_profiles u
    left join public.user_private pv on pv.user_id = u.id
    left join lateral (
      select * from public.guardian_consents g
      where g.minor_user_id = u.id
      order by (g.status = 'granted') desc, g.created_at desc limit 1
    ) g on true
    where u.is_minor
      and (p_filter = 'all'
           or (p_filter = 'no_consent' and coalesce(g.status, 'none') <> 'granted')
           or g.status = p_filter)
  ) q;
  return v;
end;
$$;

-- ------------------------------------------------------------
-- 8. "Download my data" includes Game Intelligence and Sport Fit
-- ------------------------------------------------------------
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
      'game intelligence results', 'sport fit answers and results'
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
    ), '[]'::jsonb)
  );
end;
$$;

comment on table public.sport_fit_sports is
  'What each sport asks of a player''s mind (weights 0–3) and how team-based it is. reviewed_by NULL until a sports-psychology panel signs the row off.';
comment on table public.sport_fit_results is
  'Sport Fit answers and results. Owner-readable only; never shown to clubs, scouts or the Talent Score.';
