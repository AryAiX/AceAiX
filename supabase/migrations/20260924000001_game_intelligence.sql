-- ============================================================
-- 0924/01 — Game Intelligence
--
-- Six short mini-games that measure how a player perceives, decides and holds
-- back: a football decision test on an animated pitch, ball-flight
-- anticipation, Go/No-Go, a flanker task, multiple-object tracking and choice
-- reaction time. Design and reasoning: docs/26-game-intelligence.md.
--
-- What this migration is careful about, in order of importance:
--
-- 1. Consent before any test, by age and by country.
--    A player can consent for themselves from `assessment_consent_ages` —
--    15 by default, higher where local law says so (Germany, the Netherlands
--    and Ireland are 16). Below that, a guardian must have ticked the new
--    `allow_assessments` scope. The client shows the gate; `gi_start_session`
--    is the gate.
--
-- 2. Nobody sees a result the athlete did not choose to share.
--    `gi_profiles` is readable by its owner only. Everyone else goes through
--    `get_game_intelligence`, which answers nothing unless `share_with_clubs`
--    is on, and then applies the same discovery gate as every other surface
--    that can name a minor (docs/12 §5): suspended, blocked, or a minor whose
--    guardian has not approved discovery — nothing comes back.
--
-- 3. The answer key never reaches the phone.
--    Pitch-decision scenarios live in `gi_scenarios`, which has RLS on and no
--    policy at all. `gi_scenarios_for_session` hands out the layout without the
--    key; `gi_submit_result` scores the choices server-side.
--
-- 4. It is not (yet) part of the Talent Score.
--    The Talent Score measures the profile, not the player (docs/11 §1).
--    Game Intelligence measures the player, and until a pilot has produced
--    age-band norms and test–retest reliability it is shown beside the score,
--    never inside it. `gi_profiles.algorithm_version` exists so that the day it
--    is folded in is visible in the data.
--
-- What it cannot do: the five cognitive tests are timed on the device, so
-- their raw metrics are the client's word. They are range-checked here and a
-- result outside human limits is stored as invalid rather than scored, but a
-- determined person with an API client could still submit tidy numbers. The
-- pitch-decision test — the one weighted highest — is the one that cannot be
-- faked that way.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Who can consent for themselves
-- ------------------------------------------------------------
create table if not exists public.assessment_consent_ages (
  /* Lower-cased country name as `user_profiles.country` stores it, or '*' for
     the default. */
  country          text primary key,
  self_consent_age integer not null check (self_consent_age between 13 and 18),
  note             text,
  updated_at       timestamptz not null default now()
);

alter table public.assessment_consent_ages enable row level security;

drop policy if exists aca_read on public.assessment_consent_ages;
create policy aca_read on public.assessment_consent_ages
  for select to authenticated using (true);

revoke insert, update, delete on public.assessment_consent_ages from authenticated, anon;
grant select on public.assessment_consent_ages to authenticated;

insert into public.assessment_consent_ages (country, self_consent_age, note) values
  ('*',           15, 'Product default, decided September 2026. Confirm per market with counsel.'),
  ('germany',     16, 'GDPR Art. 8 age of digital consent is 16.'),
  ('netherlands', 16, 'GDPR Art. 8 age of digital consent is 16.'),
  ('ireland',     16, 'GDPR Art. 8 age of digital consent is 16.')
on conflict (country) do nothing;

create or replace function private.gi_self_consent_age(p_country text)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select self_consent_age from public.assessment_consent_ages
      where country = lower(btrim(coalesce(p_country, '')))),
    (select self_consent_age from public.assessment_consent_ages where country = '*'),
    15
  );
$$;

-- ------------------------------------------------------------
-- 2. A fourth guardian scope
-- ------------------------------------------------------------
alter table public.guardian_consents
  add column if not exists allow_assessments boolean not null default false;

/* 0904/02 grants SELECT column by column so `token` stays unreadable; a new
   column is invisible to the app until it is named here too. */
grant select (allow_assessments) on public.guardian_consents to authenticated;

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
            else true
          end
  );
$$;

/*
 * The confirm call gains the fourth decision. Assessments default to false: a
 * guardian who approved discovery two weeks ago did not approve cognitive
 * testing, and a checkbox left alone must not be read as a yes.
 *
 * A guardian's newest decision replaces their own earlier one. Since 0910/01
 * a minor may hold several live consents (two parents, say) and the scopes
 * are the union of them, so a second approval would otherwise sit beside the
 * first — and a guardian who re-approved with the games box unticked would
 * still find the earlier "yes" in force. Earlier grants from the *same
 * address* are expired here; other guardians' consents are left alone.
 */
drop function if exists public.confirm_guardian_consent(text, boolean, boolean, boolean);

create or replace function public.confirm_guardian_consent(
  p_token             text,
  p_allow_discovery   boolean default true,
  p_allow_messaging   boolean default true,
  p_allow_media       boolean default true,
  p_allow_assessments boolean default false
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

  update public.guardian_consents
     set status = 'expired', updated_at = now()
   where minor_user_id = v_row.minor_user_id
     and status = 'granted'
     and id <> v_row.id
     and lower(guardian_email) = lower(v_row.guardian_email);

  update public.guardian_consents
  set status = 'granted',
      granted_at = now(),
      allow_discovery   = coalesce(p_allow_discovery, true),
      allow_messaging   = coalesce(p_allow_messaging, true),
      allow_media       = coalesce(p_allow_media, true),
      allow_assessments = coalesce(p_allow_assessments, false),
      updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'minor_user_id', v_row.minor_user_id,
    'allow_discovery', v_row.allow_discovery,
    'allow_messaging', v_row.allow_messaging,
    'allow_assessments', v_row.allow_assessments
  );
end;
$$;

revoke all on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean) from public;
grant execute on function public.confirm_guardian_consent(text, boolean, boolean, boolean, boolean)
  to anon, authenticated;

/*
 * The gate, as one word the client can branch on:
 *
 *   ok                 test away
 *   guardian_required  under the self-consent age, and no guardian has ticked assessments
 *   age_unknown        no date of birth on file — treated as a minor, deliberately
 *   not_athlete        only athletes have an athlete profile to attach results to
 *   suspended
 */
create or replace function private.gi_consent_state(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_up  public.user_profiles;
  v_dob date;
  v_age integer;
begin
  select * into v_up from public.user_profiles where id = p_user;
  if not found then return 'not_athlete'; end if;
  if coalesce(v_up.is_suspended, false) then return 'suspended'; end if;
  if not exists (select 1 from public.athlete_profiles where user_id = p_user) then
    return 'not_athlete';
  end if;

  select date_of_birth into v_dob from public.user_private where user_id = p_user;
  if v_dob is null then return 'age_unknown'; end if;

  v_age := extract(year from age(v_dob))::integer;
  if v_age >= private.gi_self_consent_age(v_up.country) then
    return 'ok';
  end if;
  if private.has_guardian_consent(p_user, 'assessments') then
    return 'ok';
  end if;
  return 'guardian_required';
end;
$$;

-- ------------------------------------------------------------
-- 3. Tables
-- ------------------------------------------------------------
create table if not exists public.gi_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  athlete_id      uuid not null references public.athlete_profiles(id) on delete cascade,
  status          text not null default 'in_progress'
                  check (status in ('in_progress', 'completed', 'abandoned')),
  /* 'ios' | 'android' | 'web', plus a coarse model class. Percentiles will be
     split by this once there is enough data to know whether they need to be. */
  device_class    text not null default 'unknown' check (length(device_class) <= 60),
  /* Median simple reaction time from the warm-up, in ms. Touch latency differs
     by 20–100 ms between phones; this is what a later correction reads. */
  baseline_ms     numeric check (baseline_ms is null or baseline_ms between 80 and 2000),
  /* 1 = fresh, 5 = exhausted, self-reported before starting. */
  fatigue         smallint check (fatigue is null or fatigue between 1 and 5),
  scenario_ids    uuid[] not null default '{}',
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_gi_sessions_user on public.gi_sessions (user_id, started_at desc);

create table if not exists public.gi_results (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.gi_sessions(id) on delete cascade,
  user_id     uuid not null references public.user_profiles(id) on delete cascade,
  test_key    text not null check (test_key in
                ('pitch_decision', 'anticipation', 'tracking', 'go_no_go', 'flanker', 'reaction')),
  metrics     jsonb not null,
  score       numeric check (score is null or score between 0 and 100),
  valid       boolean not null,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (session_id, test_key)
);

create index if not exists idx_gi_results_user on public.gi_results (user_id, test_key, created_at desc);

create table if not exists public.gi_profiles (
  athlete_id        uuid primary key references public.athlete_profiles(id) on delete cascade,
  user_id           uuid not null unique references public.user_profiles(id) on delete cascade,
  overall           integer check (overall is null or overall between 0 and 100),
  /* { pitch_decision: 72, tracking: 55, … } — only tests with a valid result. */
  subscores         jsonb not null default '{}',
  tests_completed   integer not null default 0,
  confidence        text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  age_band          text,
  /* Share of the same age band at or below this overall. NULL below ten. */
  percentile        integer check (percentile is null or percentile between 0 and 100),
  share_with_clubs  boolean not null default false,
  show_badge        boolean not null default false,
  last_session_at   timestamptz,
  next_retest_at    timestamptz,
  algorithm_version integer not null default 1,
  updated_at        timestamptz not null default now()
);

create table if not exists public.gi_history (
  athlete_id  uuid not null references public.athlete_profiles(id) on delete cascade,
  recorded_on date not null default current_date,
  overall     integer,
  subscores   jsonb not null default '{}',
  primary key (athlete_id, recorded_on)
);

/*
 * The pitch-decision library. Coordinates are fractions of the attacking half:
 * x 0 → 1 left to right, y 0 at the opponent's goal line → 1 at halfway.
 * Each entity moves from (x, y) to (tx, ty) during the clip, then the clip
 * freezes and the player has three seconds to choose.
 *
 * `answer_key` maps an option id to its quality: 1 the best choice, 0.5 a good
 * one, 0.25 defensible, missing or 0 poor. It is authored by coaches — the
 * seed below is a starting set, reviewed_by NULL until a panel signs it off.
 */
create table if not exists public.gi_scenarios (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  kind         text not null default 'decision' check (kind in ('decision')),
  layout       jsonb not null,
  answer_key   jsonb not null,
  active       boolean not null default true,
  reviewed_by  text,
  created_at   timestamptz not null default now()
);

alter table public.gi_sessions   enable row level security;
alter table public.gi_results    enable row level security;
alter table public.gi_profiles   enable row level security;
alter table public.gi_history    enable row level security;
alter table public.gi_scenarios  enable row level security;

drop policy if exists gi_sessions_own on public.gi_sessions;
create policy gi_sessions_own on public.gi_sessions
  for select to authenticated using (user_id = auth.uid() or private.is_admin());

drop policy if exists gi_results_own on public.gi_results;
create policy gi_results_own on public.gi_results
  for select to authenticated using (user_id = auth.uid() or private.is_admin());

drop policy if exists gi_profiles_own on public.gi_profiles;
create policy gi_profiles_own on public.gi_profiles
  for select to authenticated using (user_id = auth.uid() or private.is_admin());

drop policy if exists gi_history_own on public.gi_history;
create policy gi_history_own on public.gi_history
  for select to authenticated using (
    exists (select 1 from public.athlete_profiles ap
             where ap.id = athlete_id and ap.user_id = auth.uid())
    or private.is_admin()
  );

/* gi_scenarios: RLS on, no policy. Nobody reads it directly — that is where
   the answer key lives. */

revoke all on public.gi_sessions, public.gi_results, public.gi_profiles,
              public.gi_history, public.gi_scenarios from anon;
revoke insert, update, delete on public.gi_sessions, public.gi_results, public.gi_profiles,
              public.gi_history, public.gi_scenarios from authenticated;
revoke select on public.gi_scenarios from authenticated;
grant select on public.gi_sessions, public.gi_results, public.gi_profiles, public.gi_history
  to authenticated;

-- ------------------------------------------------------------
-- 4. Scoring
-- ------------------------------------------------------------
create or replace function private.gi_clamp01(p numeric)
returns numeric language sql immutable set search_path = public, pg_temp as $$
  select greatest(0::numeric, least(1::numeric, coalesce(p, 0)));
$$;

/* Test weights inside the Game Intelligence overall. The football-specific
   tests carry half; see docs/26 §4. */
create or replace function private.gi_weight(p_test text)
returns numeric language sql immutable set search_path = public, pg_temp as $$
  select case p_test
    when 'pitch_decision' then 0.35
    when 'anticipation'   then 0.15
    when 'tracking'       then 0.15
    when 'go_no_go'       then 0.15
    when 'flanker'        then 0.10
    when 'reaction'       then 0.10
    else 0
  end::numeric;
$$;

/*
 * One test's metrics → { score, valid, reason }.
 *
 * Every branch range-checks before it scores. A result outside what a human
 * hand can do (a 120 ms median choice reaction, say) is kept — the athlete can
 * see they need to retake it — but it is marked invalid and never scored.
 */
create or replace function private.gi_score_test(p_test text, m jsonb, p_session uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  n        numeric;
  hits     numeric;
  med      numeric;
  a        numeric;
  b        numeric;
  acc      numeric;
  speed    numeric;
  score    numeric;
  v_issued uuid[];
  v_choice jsonb;
  v_sid    uuid;
  v_key    jsonb;
  v_q      numeric := 0;
  v_seen   uuid[] := '{}';
  v_ms     numeric[] := '{}';
  v_count  integer := 0;
begin
  begin
    case p_test
    when 'reaction' then
      n    := (m->>'trials')::numeric;
      hits := (m->>'correct')::numeric;
      med  := (m->>'median_ms')::numeric;
      a    := coalesce((m->>'anticipations')::numeric, 0);
      if n is null or n < 12 or hits is null or hits > n then
        return jsonb_build_object('valid', false, 'reason', 'too_few_trials');
      end if;
      if hits < n * 0.5 or med is null or med < 180 or med > 1500 or a > 3 then
        return jsonb_build_object('valid', false, 'reason', 'implausible');
      end if;
      acc   := hits / n;
      speed := private.gi_clamp01((800 - med) / 450);
      score := 100 * acc * speed;

    when 'go_no_go' then
      n    := (m->>'go_trials')::numeric;
      hits := (m->>'go_hits')::numeric;
      med  := (m->>'go_median_ms')::numeric;
      a    := (m->>'nogo_trials')::numeric;
      b    := (m->>'nogo_withheld')::numeric;
      if n is null or n < 20 or a is null or a < 6 or hits > n or b > a then
        return jsonb_build_object('valid', false, 'reason', 'too_few_trials');
      end if;
      /* Never tapping would be a perfect no-go score. Half the go balls, at least. */
      if hits < n * 0.5 or med is null or med < 180 or med > 1200 then
        return jsonb_build_object('valid', false, 'reason', 'implausible');
      end if;
      acc   := hits / n;
      speed := private.gi_clamp01((650 - med) / 350);
      score := 100 * (0.55 * (b / a) + 0.25 * acc + 0.20 * speed * acc);

    when 'flanker' then
      n    := (m->>'trials')::numeric;
      hits := (m->>'correct')::numeric;
      a    := (m->>'congruent_ms')::numeric;
      b    := (m->>'incongruent_ms')::numeric;
      if n is null or n < 16 or hits > n then
        return jsonb_build_object('valid', false, 'reason', 'too_few_trials');
      end if;
      if hits < n * 0.5 or a is null or b is null
         or a < 200 or b < 200 or a > 2000 or b > 2000 then
        return jsonb_build_object('valid', false, 'reason', 'implausible');
      end if;
      acc   := hits / n;
      /* The interference cost (incongruent − congruent) is a difference of two
         times on the same screen, so touch latency cancels out of it. */
      score := 100 * acc * (0.5 * private.gi_clamp01((160 - (b - a)) / 150)
                          + 0.5 * private.gi_clamp01((1000 - b) / 550));

    when 'tracking' then
      n    := (m->>'rounds')::numeric;
      a    := (m->>'targets_total')::numeric;
      b    := (m->>'targets_found')::numeric;
      med  := (m->>'max_level')::numeric;
      if n is null or n < 4 or a is null or a < 12 or b > a then
        return jsonb_build_object('valid', false, 'reason', 'too_few_trials');
      end if;
      if med is null or med < 1 or med > 8 then
        return jsonb_build_object('valid', false, 'reason', 'implausible');
      end if;
      score := 100 * (0.5 * (b / a) + 0.5 * ((med - 1) / 7));

    when 'anticipation' then
      n    := (m->>'trials')::numeric;
      a    := (m->>'answered')::numeric;
      b    := (m->>'mean_error')::numeric;
      if n is null or n < 8 or a is null or a > n then
        return jsonb_build_object('valid', false, 'reason', 'too_few_trials');
      end if;
      if a < n * 0.6 or b is null or b < 0 or b > 1 then
        return jsonb_build_object('valid', false, 'reason', 'implausible');
      end if;
      /* A ball not answered counts as half a pitch-width wrong. */
      score := 100 * private.gi_clamp01(1 - ((b * a + 0.5 * (n - a)) / n) / 0.3);

    when 'pitch_decision' then
      select scenario_ids into v_issued from public.gi_sessions where id = p_session;
      if jsonb_typeof(m->'choices') <> 'array' then
        return jsonb_build_object('valid', false, 'reason', 'too_few_trials');
      end if;
      for v_choice in select * from jsonb_array_elements(m->'choices') loop
        v_sid := (v_choice->>'scenario')::uuid;
        /* Only scenarios this session was handed, each counted once. */
        if v_sid is null or not (v_sid = any(v_issued)) or v_sid = any(v_seen) then
          continue;
        end if;
        v_seen  := v_seen || v_sid;
        v_count := v_count + 1;
        select answer_key into v_key from public.gi_scenarios where id = v_sid;
        if v_choice->>'option' is not null then
          v_q := v_q + least(1, greatest(0,
                   coalesce((v_key->>(v_choice->>'option'))::numeric, 0)));
          if (v_choice->>'ms')::numeric between 150 and 3500 then
            v_ms := v_ms || (v_choice->>'ms')::numeric;
          end if;
        end if;
      end loop;
      if v_count < 6 then
        return jsonb_build_object('valid', false, 'reason', 'too_few_trials');
      end if;
      select percentile_cont(0.5) within group (order by x) into med from unnest(v_ms) x;
      acc   := v_q / v_count;
      speed := case when med is null then 0 else private.gi_clamp01((3000 - med) / 2100) end;
      score := 100 * (0.75 * acc + 0.25 * speed * acc);

    else
      return jsonb_build_object('valid', false, 'reason', 'unknown_test');
    end case;
  exception when invalid_text_representation or numeric_value_out_of_range
                 or data_exception then
    return jsonb_build_object('valid', false, 'reason', 'malformed');
  end;

  /* A metric left out makes a comparison NULL, which every range check above
     reads as "not out of range" — and `least(100, NULL)` is 100. So a missing
     field is caught here, whatever branch it slipped through. */
  if score is null then
    return jsonb_build_object('valid', false, 'reason', 'malformed');
  end if;

  return jsonb_build_object(
    'valid', true,
    'score', round(greatest(0, least(100, score)), 1)
  );
end;
$$;

/*
 * Rebuild one athlete's Game Intelligence profile from their results.
 *
 * Best valid score per test inside the fourteen days that end at their latest
 * result. Best-of rather than latest, because a bad day — a bus, a phone call,
 * a late night — should cost a retake, not a number. The window stops the
 * best-of reaching back to a lucky afternoon six months ago.
 */
create or replace function private.gi_refresh(p_athlete uuid)
returns public.gi_profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user     uuid;
  v_latest   timestamptz;
  v_subs     jsonb := '{}';
  v_tests    integer := 0;
  v_sum      numeric := 0;
  v_wsum     numeric := 0;
  v_overall  integer;
  v_fatigue  numeric;
  v_conf     text;
  v_band     text;
  v_cohort   integer;
  v_below    integer;
  v_pct      integer;
  v_last     timestamptz;
  r          record;
  v_row      public.gi_profiles;
begin
  select user_id into v_user from public.athlete_profiles where id = p_athlete;
  if v_user is null then return null; end if;

  select max(created_at) into v_latest
    from public.gi_results where user_id = v_user and valid;

  if v_latest is not null then
    for r in
      select test_key, max(score) as best
        from public.gi_results
       where user_id = v_user and valid and created_at > v_latest - interval '14 days'
       group by test_key
    loop
      v_subs  := v_subs || jsonb_build_object(r.test_key, round(r.best)::integer);
      v_tests := v_tests + 1;
      v_sum   := v_sum + r.best * private.gi_weight(r.test_key);
      v_wsum  := v_wsum + private.gi_weight(r.test_key);
    end loop;
  end if;

  /* Four of six, or no overall. Two reaction games are not a profile. */
  v_overall := case when v_tests >= 4 and v_wsum > 0
                    then round(v_sum / v_wsum)::integer end;

  select avg(s.fatigue) into v_fatigue
    from public.gi_sessions s
   where s.user_id = v_user and s.status = 'completed'
     and v_latest is not null and s.started_at > v_latest - interval '14 days';

  v_conf := case
    when v_tests = 6 and coalesce(v_fatigue, 3) <= 3 then 'high'
    when v_tests >= 4 then 'medium'
    else 'low'
  end;

  select age_band into v_band from public.user_profiles where id = v_user;

  select max(completed_at) into v_last
    from public.gi_sessions where user_id = v_user and status = 'completed';

  insert into public.gi_profiles as g (
    athlete_id, user_id, overall, subscores, tests_completed, confidence, age_band,
    last_session_at, next_retest_at, updated_at
  ) values (
    p_athlete, v_user, v_overall, v_subs, v_tests, v_conf, v_band,
    v_last, v_last + interval '90 days', now()
  )
  on conflict (athlete_id) do update set
    overall         = excluded.overall,
    subscores       = excluded.subscores,
    tests_completed = excluded.tests_completed,
    confidence      = excluded.confidence,
    age_band        = excluded.age_band,
    last_session_at = excluded.last_session_at,
    next_retest_at  = excluded.next_retest_at,
    updated_at      = now();

  /* Percentile against the same age band — a 13-year-old against 13–15s,
     never against 22-year-olds. Hidden below ten, as the Talent Score is. */
  if v_overall is not null then
    select count(*), count(*) filter (where overall <= v_overall)
      into v_cohort, v_below
      from public.gi_profiles
     where overall is not null and age_band is not distinct from v_band;
    v_pct := case when v_cohort >= 10
                  then round(100.0 * v_below / v_cohort)::integer end;
  end if;

  update public.gi_profiles set percentile = v_pct
   where athlete_id = p_athlete
   returning * into v_row;

  if v_overall is not null then
    insert into public.gi_history (athlete_id, recorded_on, overall, subscores)
    values (p_athlete, current_date, v_overall, v_subs)
    on conflict (athlete_id, recorded_on) do update
      set overall = excluded.overall, subscores = excluded.subscores;
  end if;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- 5. The client API
-- ------------------------------------------------------------

/* Everything the Game Intelligence screen needs, in one call. */
create or replace function public.gi_my_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_state   text;
  v_country text;
  v_athlete uuid;
  v_profile public.gi_profiles;
  v_open    public.gi_sessions;
  v_done    jsonb;
  v_left    jsonb := '{}';
  v_history jsonb;
  v_pending boolean;
  t         text;
  v_used    integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_state := private.gi_consent_state(auth.uid());
  select country into v_country from public.user_profiles where id = auth.uid();
  select id into v_athlete from public.athlete_profiles where user_id = auth.uid();
  select * into v_profile from public.gi_profiles where user_id = auth.uid();

  select exists (
    select 1 from public.guardian_consents
     where minor_user_id = auth.uid() and status = 'pending'
  ) into v_pending;

  select * into v_open from public.gi_sessions
   where user_id = auth.uid() and status = 'in_progress'
     and started_at > now() - interval '24 hours'
   order by started_at desc limit 1;

  if v_open.id is not null then
    select coalesce(jsonb_object_agg(test_key, jsonb_build_object(
             'score', score, 'valid', valid, 'reason', reason)), '{}')
      into v_done
      from public.gi_results where session_id = v_open.id;
  end if;

  /* Two scored attempts per test per fourteen days. */
  foreach t in array array['pitch_decision','anticipation','tracking','go_no_go','flanker','reaction']
  loop
    select count(*) into v_used from public.gi_results
     where user_id = auth.uid() and test_key = t
       and created_at > now() - interval '14 days';
    v_left := v_left || jsonb_build_object(t, greatest(0, 2 - v_used));
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
           'date', h.recorded_on, 'overall', h.overall) order by h.recorded_on), '[]')
    into v_history
    from public.gi_history h where h.athlete_id = v_athlete;

  return jsonb_build_object(
    'consent', v_state,
    'self_consent_age', private.gi_self_consent_age(v_country),
    'guardian_pending', coalesce(v_pending, false),
    'profile', case when v_profile.athlete_id is null then null else to_jsonb(v_profile) end,
    'open_session', case when v_open.id is null then null else jsonb_build_object(
        'id', v_open.id, 'started_at', v_open.started_at, 'done', coalesce(v_done, '{}'))
      end,
    'attempts_left', v_left,
    'history', v_history
  );
end;
$$;

create or replace function public.gi_start_session(
  p_device_class text default null,
  p_baseline_ms  numeric default null,
  p_fatigue      integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_state   text;
  v_athlete uuid;
  v_id      uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_state := private.gi_consent_state(auth.uid());
  if v_state = 'not_athlete' then
    raise exception 'Only athletes can take these tests'
      using errcode = '42501', hint = 'not_an_athlete';
  elsif v_state <> 'ok' then
    raise exception 'A parent or guardian needs to approve this first'
      using errcode = '42501', hint = 'gi_consent_required';
  end if;

  select id into v_athlete from public.athlete_profiles where user_id = auth.uid();

  /* One open session at a time. An older one is closed as abandoned, not
     deleted — its results still count. */
  update public.gi_sessions set status = 'abandoned'
   where user_id = auth.uid() and status = 'in_progress';

  insert into public.gi_sessions (user_id, athlete_id, device_class, baseline_ms, fatigue)
  values (
    auth.uid(), v_athlete,
    left(coalesce(nullif(btrim(p_device_class), ''), 'unknown'), 60),
    case when p_baseline_ms between 80 and 2000 then p_baseline_ms end,
    case when p_fatigue between 1 and 5 then p_fatigue end
  )
  returning id into v_id;

  return v_id;
end;
$$;

/* Eight scenarios for this session, in random order, without the answer key.
   The ids are remembered on the session, and only those can be scored. */
create or replace function public.gi_scenarios_for_session(p_session uuid, p_count integer default 8)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_s    public.gi_sessions;
  v_ids  uuid[];
  v_out  jsonb;
begin
  select * into v_s from public.gi_sessions where id = p_session;
  if v_s.id is null or v_s.user_id is distinct from auth.uid() then
    raise exception 'Not your session' using errcode = '42501';
  end if;
  if v_s.status <> 'in_progress' or v_s.started_at < now() - interval '24 hours' then
    raise exception 'That session has ended' using errcode = '22023', hint = 'gi_session_closed';
  end if;

  if coalesce(array_length(v_s.scenario_ids, 1), 0) = 0 then
    select array_agg(id) into v_ids from (
      select id from public.gi_scenarios where active
       order by random() limit greatest(6, least(coalesce(p_count, 8), 12))
    ) x;
    update public.gi_sessions set scenario_ids = coalesce(v_ids, '{}') where id = p_session;
  else
    v_ids := v_s.scenario_ids;
  end if;

  /* `title` is an authoring label ("finish", "switch") and names the answer,
     so it stays in the database with the key. */
  select coalesce(jsonb_agg(jsonb_build_object('id', sc.id, 'layout', sc.layout - 'title')
                            order by array_position(v_ids, sc.id)), '[]')
    into v_out
    from public.gi_scenarios sc
   where sc.id = any(v_ids);

  return v_out;
end;
$$;

create or replace function public.gi_submit_result(p_session uuid, p_test text, p_metrics jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_s      public.gi_sessions;
  v_used   integer;
  v_scored jsonb;
begin
  select * into v_s from public.gi_sessions where id = p_session for update;
  if v_s.id is null or v_s.user_id is distinct from auth.uid() then
    raise exception 'Not your session' using errcode = '42501';
  end if;
  if v_s.status <> 'in_progress' or v_s.started_at < now() - interval '24 hours' then
    raise exception 'That session has ended' using errcode = '22023', hint = 'gi_session_closed';
  end if;
  if private.gi_consent_state(auth.uid()) <> 'ok' then
    raise exception 'A parent or guardian needs to approve this first'
      using errcode = '42501', hint = 'gi_consent_required';
  end if;
  if p_metrics is null or jsonb_typeof(p_metrics) <> 'object'
     or length(p_metrics::text) > 20000 then
    raise exception 'Malformed result' using errcode = '22023';
  end if;
  if exists (select 1 from public.gi_results where session_id = p_session and test_key = p_test) then
    raise exception 'Already recorded for this session'
      using errcode = '23505', hint = 'gi_already_done';
  end if;

  select count(*) into v_used from public.gi_results
   where user_id = auth.uid() and test_key = p_test
     and created_at > now() - interval '14 days';
  if v_used >= 2 then
    raise exception 'Two attempts per test every fourteen days'
      using errcode = '22023', hint = 'gi_attempt_limit';
  end if;

  v_scored := private.gi_score_test(p_test, p_metrics, p_session);
  if v_scored->>'reason' = 'unknown_test' then
    raise exception 'Unknown test' using errcode = '22023';
  end if;

  insert into public.gi_results (session_id, user_id, test_key, metrics, score, valid, reason)
  values (
    p_session, auth.uid(), p_test, p_metrics,
    (v_scored->>'score')::numeric,
    (v_scored->>'valid')::boolean,
    v_scored->>'reason'
  );

  return v_scored;
end;
$$;

create or replace function public.gi_finish_session(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_s     public.gi_sessions;
  v_row   public.gi_profiles;
  v_first boolean;
  g       record;
begin
  select * into v_s from public.gi_sessions where id = p_session for update;
  if v_s.id is null or v_s.user_id is distinct from auth.uid() then
    raise exception 'Not your session' using errcode = '42501';
  end if;
  if not exists (select 1 from public.gi_results where session_id = p_session) then
    raise exception 'Play at least one game first' using errcode = '22023';
  end if;

  /* Told once: only the call that actually completes the athlete's first
     session notifies. A retried finish, or one on an old session, does not. */
  v_first := v_s.status = 'in_progress' and not exists (
    select 1 from public.gi_sessions
     where user_id = auth.uid() and status = 'completed' and id <> p_session);

  if v_s.status = 'in_progress' then
    update public.gi_sessions set status = 'completed', completed_at = now()
     where id = p_session;
  end if;

  v_row := private.gi_refresh(v_s.athlete_id);

  /* A minor who consented for themselves (15–17 by default) has a guardian
     who is told, not asked. Only guardians holding an AceAiX account can be
     reached here; the e-mail route is docs/26 §7's open item. */
  if v_first and coalesce(private.is_minor(auth.uid()), false) then
    for g in
      select distinct guardian_user_id from public.guardian_consents
       where minor_user_id = auth.uid() and status = 'granted'
         and guardian_user_id is not null
    loop
      perform private.notify(
        g.guardian_user_id, 'score', 'gi_completed',
        private.display_name(auth.uid()) || ' finished the Game Intelligence games',
        'Their results are private unless they choose to share them.',
        auth.uid(), 'user', auth.uid()::text
      );
    end loop;
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.gi_set_sharing(p_share_with_clubs boolean, p_show_badge boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.gi_profiles
     set share_with_clubs = coalesce(p_share_with_clubs, share_with_clubs),
         /* A badge is a public share; it cannot be on while sharing is off. */
         show_badge = coalesce(p_show_badge, show_badge) and coalesce(p_share_with_clubs, share_with_clubs),
         updated_at = now()
   where user_id = auth.uid();
  if not found then
    raise exception 'Finish the games first' using errcode = 'P0002';
  end if;
end;
$$;

/*
 * What someone else may see of an athlete's Game Intelligence.
 *
 *   nothing  unless the athlete turned sharing on, and the discovery gate
 *            passes (not suspended, no block either way, and a minor only
 *            once a guardian has approved discovery)
 *   coaches, scouts, clubs, federations, admins
 *            the overall, percentile, confidence and the six sub-scores
 *   anyone else
 *            the badge alone, and only if the athlete switched it on
 */
create or replace function public.get_game_intelligence(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_g    public.gi_profiles;
  v_up   public.user_profiles;
  v_me   public.user_profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_g from public.gi_profiles where user_id = p_user;
  if v_g.athlete_id is null or v_g.overall is null then return null; end if;

  if p_user = auth.uid() then
    return to_jsonb(v_g) || jsonb_build_object('view', 'owner');
  end if;

  select * into v_up from public.user_profiles where id = p_user;
  select * into v_me from public.user_profiles where id = auth.uid();

  if not v_g.share_with_clubs
     or coalesce(v_up.is_suspended, false)
     or (coalesce(v_up.is_minor, true) and not coalesce(v_up.is_discoverable, false))
     or exists (
       select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = p_user)
           or (b.blocker_id = p_user and b.blocked_id = auth.uid()))
  then
    return null;
  end if;

  if v_me.role in ('coach', 'scout', 'club', 'federation', 'org_admin', 'admin') then
    return jsonb_build_object(
      'view', 'recruiter',
      'overall', v_g.overall,
      'percentile', v_g.percentile,
      'age_band', v_g.age_band,
      'confidence', v_g.confidence,
      'subscores', v_g.subscores,
      'tests_completed', v_g.tests_completed,
      'last_session_at', v_g.last_session_at
    );
  end if;

  if v_g.show_badge then
    return jsonb_build_object(
      'view', 'badge',
      'overall', v_g.overall,
      'percentile', v_g.percentile,
      'age_band', v_g.age_band
    );
  end if;

  return null;
end;
$$;

-- ------------------------------------------------------------
-- 6. Privileges — explicitly, every function
--
-- PostgreSQL grants EXECUTE to PUBLIC on every new function, and `anon`
-- inherits it. 0907/06's default-privileges change does not cover functions
-- created by another role, so each one is closed here by name.
-- ------------------------------------------------------------
revoke all on function private.gi_self_consent_age(text)          from public, anon, authenticated;
revoke all on function private.gi_consent_state(uuid)             from public, anon, authenticated;
revoke all on function private.gi_clamp01(numeric)                from public, anon, authenticated;
revoke all on function private.gi_weight(text)                    from public, anon, authenticated;
revoke all on function private.gi_score_test(text, jsonb, uuid)   from public, anon, authenticated;
revoke all on function private.gi_refresh(uuid)                   from public, anon, authenticated;

revoke all on function public.gi_my_state()                                from public, anon;
revoke all on function public.gi_start_session(text, numeric, integer)     from public, anon;
revoke all on function public.gi_scenarios_for_session(uuid, integer)      from public, anon;
revoke all on function public.gi_submit_result(uuid, text, jsonb)          from public, anon;
revoke all on function public.gi_finish_session(uuid)                      from public, anon;
revoke all on function public.gi_set_sharing(boolean, boolean)             from public, anon;
revoke all on function public.get_game_intelligence(uuid)                  from public, anon;

grant execute on function public.gi_my_state()                             to authenticated;
grant execute on function public.gi_start_session(text, numeric, integer)  to authenticated;
grant execute on function public.gi_scenarios_for_session(uuid, integer)   to authenticated;
grant execute on function public.gi_submit_result(uuid, text, jsonb)       to authenticated;
grant execute on function public.gi_finish_session(uuid)                   to authenticated;
grant execute on function public.gi_set_sharing(boolean, boolean)          to authenticated;
grant execute on function public.get_game_intelligence(uuid)               to authenticated;

-- ------------------------------------------------------------
-- 7. The starting scenario library
--
-- Twelve situations from the attacking half. Every one has a single best
-- answer a UEFA-licensed coach would give without hesitating; the partial
-- credits are where coaches will disagree, and they are the numbers the panel
-- review (reviewed_by) exists to settle.
-- ------------------------------------------------------------
insert into public.gi_scenarios (slug, layout, answer_key) values
('counter-2v1',
 '{"title":"counter","you":{"x":0.5,"y":0.58,"tx":0.5,"ty":0.46},
   "mates":[{"id":"a","x":0.8,"y":0.52,"tx":0.8,"ty":0.33},{"id":"b","x":0.18,"y":0.78,"tx":0.22,"ty":0.64}],
   "opps":[{"x":0.52,"y":0.34,"tx":0.5,"ty":0.38},{"x":0.3,"y":0.66,"tx":0.3,"ty":0.62}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.5,"ty":0.05}}',
 '{"a":1,"dribble":0.25,"b":0.25}'),

('clear-sight',
 '{"title":"finish","you":{"x":0.45,"y":0.3,"tx":0.47,"ty":0.2},
   "mates":[{"id":"a","x":0.2,"y":0.26,"tx":0.22,"ty":0.22},{"id":"b","x":0.76,"y":0.36,"tx":0.74,"ty":0.33}],
   "opps":[{"x":0.24,"y":0.21,"tx":0.24,"ty":0.2},{"x":0.72,"y":0.33,"tx":0.72,"ty":0.31},{"x":0.44,"y":0.33,"tx":0.46,"ty":0.26}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.52,"ty":0.05}}',
 '{"shoot":1,"dribble":0.25}'),

('pressed-play-safe',
 '{"title":"pressure","you":{"x":0.3,"y":0.86,"tx":0.3,"ty":0.86},
   "mates":[{"id":"a","x":0.55,"y":0.95,"tx":0.6,"ty":0.94},{"id":"b","x":0.35,"y":0.55,"tx":0.35,"ty":0.56}],
   "opps":[{"x":0.3,"y":0.7,"tx":0.3,"ty":0.79},{"x":0.14,"y":0.8,"tx":0.22,"ty":0.84},{"x":0.37,"y":0.59,"tx":0.35,"ty":0.59}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.5,"ty":0.04}}',
 '{"a":1}'),

('through-ball',
 '{"title":"through","you":{"x":0.5,"y":0.62,"tx":0.5,"ty":0.57},
   "mates":[{"id":"a","x":0.6,"y":0.42,"tx":0.55,"ty":0.22},{"id":"b","x":0.18,"y":0.56,"tx":0.18,"ty":0.55}],
   "opps":[{"x":0.4,"y":0.4,"tx":0.42,"ty":0.4},{"x":0.64,"y":0.41,"tx":0.63,"ty":0.39},{"x":0.5,"y":0.5,"tx":0.5,"ty":0.52}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.5,"ty":0.06}}',
 '{"a":1,"b":0.5}'),

('overlap',
 '{"title":"overlap","you":{"x":0.15,"y":0.5,"tx":0.15,"ty":0.48},
   "mates":[{"id":"a","x":0.25,"y":0.66,"tx":0.08,"ty":0.34},{"id":"b","x":0.5,"y":0.56,"tx":0.5,"ty":0.5},{"id":"c","x":0.86,"y":0.5,"tx":0.86,"ty":0.46}],
   "opps":[{"x":0.21,"y":0.41,"tx":0.17,"ty":0.43},{"x":0.5,"y":0.45,"tx":0.5,"ty":0.47},{"x":0.72,"y":0.42,"tx":0.72,"ty":0.42}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.48,"ty":0.04}}',
 '{"a":1,"c":0.5,"dribble":0.25}'),

('switch-play',
 '{"title":"switch","you":{"x":0.2,"y":0.58,"tx":0.2,"ty":0.55},
   "mates":[{"id":"a","x":0.32,"y":0.4,"tx":0.32,"ty":0.4},{"id":"b","x":0.9,"y":0.46,"tx":0.9,"ty":0.37}],
   "opps":[{"x":0.26,"y":0.48,"tx":0.24,"ty":0.49},{"x":0.14,"y":0.44,"tx":0.15,"ty":0.46},{"x":0.36,"y":0.51,"tx":0.34,"ty":0.51},{"x":0.35,"y":0.37,"tx":0.33,"ty":0.38}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.46,"ty":0.04}}',
 '{"b":1,"a":0.25}'),

('space-to-attack',
 '{"title":"carry","you":{"x":0.5,"y":0.78,"tx":0.5,"ty":0.66},
   "mates":[{"id":"a","x":0.2,"y":0.82,"tx":0.22,"ty":0.78},{"id":"b","x":0.8,"y":0.8,"tx":0.78,"ty":0.76}],
   "opps":[{"x":0.5,"y":0.36,"tx":0.5,"ty":0.42},{"x":0.3,"y":0.3,"tx":0.32,"ty":0.33}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.5,"ty":0.05}}',
 '{"dribble":1,"a":0.25,"b":0.25}'),

('cutback',
 '{"title":"cutback","you":{"x":0.78,"y":0.13,"tx":0.72,"ty":0.06},
   "mates":[{"id":"a","x":0.5,"y":0.36,"tx":0.5,"ty":0.21},{"id":"b","x":0.55,"y":0.13,"tx":0.58,"ty":0.08}],
   "opps":[{"x":0.58,"y":0.1,"tx":0.58,"ty":0.07},{"x":0.7,"y":0.12,"tx":0.72,"ty":0.09},{"x":0.35,"y":0.2,"tx":0.4,"ty":0.14}],
   "keeper":{"x":0.56,"y":0.03,"tx":0.64,"ty":0.03}}',
 '{"a":1,"b":0.25}'),

('square-pass',
 '{"title":"square","you":{"x":0.3,"y":0.23,"tx":0.33,"ty":0.2},
   "mates":[{"id":"a","x":0.55,"y":0.26,"tx":0.52,"ty":0.13},{"id":"b","x":0.1,"y":0.45,"tx":0.12,"ty":0.4}],
   "opps":[{"x":0.4,"y":0.26,"tx":0.37,"ty":0.21},{"x":0.72,"y":0.2,"tx":0.7,"ty":0.18}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.42,"ty":0.05}}',
 '{"a":1,"shoot":0.5}'),

('one-two',
 '{"title":"onetwo","you":{"x":0.5,"y":0.56,"tx":0.5,"ty":0.51},
   "mates":[{"id":"a","x":0.4,"y":0.45,"tx":0.42,"ty":0.43},{"id":"b","x":0.85,"y":0.3,"tx":0.85,"ty":0.28}],
   "opps":[{"x":0.5,"y":0.44,"tx":0.5,"ty":0.46},{"x":0.84,"y":0.26,"tx":0.84,"ty":0.25},{"x":0.62,"y":0.34,"tx":0.6,"ty":0.34}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.5,"ty":0.05}}',
 '{"a":1,"b":0.25,"dribble":0.25}'),

('keeper-off-line',
 '{"title":"lob","you":{"x":0.55,"y":0.46,"tx":0.55,"ty":0.4},
   "mates":[{"id":"a","x":0.2,"y":0.46,"tx":0.2,"ty":0.43}],
   "opps":[{"x":0.6,"y":0.52,"tx":0.58,"ty":0.47},{"x":0.4,"y":0.56,"tx":0.44,"ty":0.5},{"x":0.22,"y":0.42,"tx":0.22,"ty":0.4}],
   "keeper":{"x":0.5,"y":0.22,"tx":0.52,"ty":0.19}}',
 '{"shoot":1,"dribble":0.5}'),

('crowded-middle',
 '{"title":"wide","you":{"x":0.5,"y":0.64,"tx":0.5,"ty":0.6},
   "mates":[{"id":"a","x":0.5,"y":0.36,"tx":0.5,"ty":0.36},{"id":"b","x":0.12,"y":0.5,"tx":0.1,"ty":0.4},{"id":"c","x":0.88,"y":0.56,"tx":0.88,"ty":0.54}],
   "opps":[{"x":0.5,"y":0.5,"tx":0.5,"ty":0.52},{"x":0.44,"y":0.47,"tx":0.45,"ty":0.49},{"x":0.57,"y":0.47,"tx":0.56,"ty":0.49},{"x":0.5,"y":0.33,"tx":0.5,"ty":0.34},{"x":0.83,"y":0.52,"tx":0.85,"ty":0.52}],
   "keeper":{"x":0.5,"y":0.04,"tx":0.5,"ty":0.04}}',
 '{"b":1,"c":0.5}')
on conflict (slug) do nothing;

comment on table public.gi_scenarios is
  'Pitch-decision library. RLS on with no policy: the answer key never leaves the database. '
  'Handed out by gi_scenarios_for_session without the key, scored by gi_score_test.';
comment on function public.get_game_intelligence(uuid) is
  'What another user may see of an athlete''s Game Intelligence: nothing unless shared and past '
  'the discovery gate; full summary for recruiters; the badge alone for anyone else, if enabled.';
