-- ============================================================
-- 0904/11 — Streaks and achievements
--
-- The Talent Score answers "where do I stand?". It moves slowly, because the
-- things that move it — a verified match record, a coach's endorsement — take
-- weeks. That is correct, and it is also why a 14-year-old would open the app
-- once and not come back.
--
-- This migration adds the fast loop underneath the slow one: something to
-- notice today. A streak for turning up, and a set of achievements that mark
-- the real milestones on the way to being scouted.
--
-- Two rules shaped the design:
--
--   * Nothing here can be farmed. Every achievement is checked against the
--     same rows the Talent Score reads, so the only way to earn one is to do
--     the thing. A streak counts days the person actually opened the app, not
--     actions they performed, so it never pushes a child to post more.
--
--   * Nothing here punishes. A broken streak resets quietly and the longest
--     streak is kept; there are no lost points, no decay, and no notification
--     telling a teenager they are falling behind.
-- ============================================================

-- ------------------------------------------------------------
-- Days someone was here
-- ------------------------------------------------------------
create table if not exists public.activity_days (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);
alter table public.activity_days enable row level security;

create table if not exists public.user_streaks (
  user_id        uuid primary key references public.user_profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  total_days     integer not null default 0,
  last_active_on date,
  updated_at     timestamptz not null default now()
);
alter table public.user_streaks enable row level security;

-- ------------------------------------------------------------
-- Achievements
--
-- The catalogue lives in the client so its wording can be translated; the
-- database stores only which keys a person has earned, and when. `seen`
-- drives the one-time celebration — an achievement is celebrated once, then
-- it is simply part of the wall.
-- ------------------------------------------------------------
create table if not exists public.user_achievements (
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked_at     timestamptz not null default now(),
  seen            boolean not null default false,
  primary key (user_id, achievement_key)
);
alter table public.user_achievements enable row level security;
create index if not exists idx_user_achievements_unseen
  on public.user_achievements(user_id) where not seen;

-- ------------------------------------------------------------
-- Awarding
-- ------------------------------------------------------------
create or replace function private.award(p_user uuid, p_key text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_new boolean := false;
begin
  insert into public.user_achievements (user_id, achievement_key)
  values (p_user, p_key)
  on conflict (user_id, achievement_key) do nothing;
  get diagnostics v_new = row_count;
  return v_new;
end;
$$;

/**
 * Re-derive every achievement for one person from the rows that prove it.
 *
 * Deliberately idempotent and stateless: it can run as often as we like, and
 * it can never award something the underlying data does not support. If an
 * achievement's condition is later found to be wrong, fixing the condition
 * and re-running is the whole repair.
 */
create or replace function private.check_achievements(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ap            record;
  ts            record;
  st            record;
  v_posts       integer;
  v_clips       integer;
  v_matches     integer;
  v_endorse     integer;
  v_followers   integer;
  v_apps        integer;
  v_awarded     integer := 0;
begin
  select * into ap from public.athlete_profiles where user_id = p_user;
  select * into ts from public.talent_scores where athlete_id = ap.id;
  select * into st from public.user_streaks where user_id = p_user;

  select count(*) into v_posts from public.posts where author_id = p_user;
  select count(*) into v_apps  from public.applications where athlete_id = p_user;
  select count(*) into v_followers from public.follows where following_id = p_user;

  select count(*) into v_clips
  from public.athlete_media
  where athlete_id = ap.id and is_public and media_type in ('video', 'highlight_reel');

  select count(*) into v_matches from public.match_records where athlete_id = ap.id;
  select count(*) into v_endorse from public.endorsements where athlete_id = ap.id;

  -- Getting started
  if v_posts   >= 1 and private.award(p_user, 'first_post')     then v_awarded := v_awarded + 1; end if;
  if v_clips   >= 1 and private.award(p_user, 'first_clip')     then v_awarded := v_awarded + 1; end if;
  if v_clips   >= 3 and private.award(p_user, 'three_clips')    then v_awarded := v_awarded + 1; end if;
  if v_matches >= 1 and private.award(p_user, 'first_match')    then v_awarded := v_awarded + 1; end if;
  if v_matches >= 10 and private.award(p_user, 'ten_matches')   then v_awarded := v_awarded + 1; end if;
  if v_apps    >= 1 and private.award(p_user, 'first_application') then v_awarded := v_awarded + 1; end if;

  -- Being seen
  if v_followers >= 1  and private.award(p_user, 'first_follower') then v_awarded := v_awarded + 1; end if;
  if v_followers >= 10 and private.award(p_user, 'ten_followers')  then v_awarded := v_awarded + 1; end if;
  if v_followers >= 50 and private.award(p_user, 'fifty_followers') then v_awarded := v_awarded + 1; end if;
  if v_endorse   >= 1  and private.award(p_user, 'first_endorsement') then v_awarded := v_awarded + 1; end if;

  if exists (select 1 from public.user_profiles where id = p_user and is_verified)
     and private.award(p_user, 'verified') then v_awarded := v_awarded + 1; end if;

  -- The score itself
  if ts.athlete_id is not null then
    if ts.profile_score >= 100 and private.award(p_user, 'profile_complete') then v_awarded := v_awarded + 1; end if;
    if ts.overall >= 40 and private.award(p_user, 'tier_bronze') then v_awarded := v_awarded + 1; end if;
    if ts.overall >= 55 and private.award(p_user, 'tier_silver') then v_awarded := v_awarded + 1; end if;
    if ts.overall >= 70 and private.award(p_user, 'tier_gold')   then v_awarded := v_awarded + 1; end if;
    if ts.overall >= 85 and private.award(p_user, 'tier_elite')  then v_awarded := v_awarded + 1; end if;
  end if;

  -- Turning up
  if st.user_id is not null then
    if st.longest_streak >= 3  and private.award(p_user, 'streak_3')  then v_awarded := v_awarded + 1; end if;
    if st.longest_streak >= 7  and private.award(p_user, 'streak_7')  then v_awarded := v_awarded + 1; end if;
    if st.longest_streak >= 30 and private.award(p_user, 'streak_30') then v_awarded := v_awarded + 1; end if;
  end if;

  return v_awarded;
end;
$$;

-- ------------------------------------------------------------
-- record_activity — called once when the app comes to the foreground
-- ------------------------------------------------------------
create or replace function public.record_activity()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user     uuid := auth.uid();
  v_today    date := current_date;
  v_previous date;
  v_current  integer;
  v_longest  integer;
  v_total    integer;
  v_first    boolean := false;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.activity_days (user_id, day)
  values (v_user, v_today)
  on conflict do nothing;
  get diagnostics v_first = row_count;

  select last_active_on, current_streak, longest_streak, total_days
    into v_previous, v_current, v_longest, v_total
  from public.user_streaks where user_id = v_user;

  if v_previous is null then
    v_current := 1;
    v_longest := 1;
    v_total   := 1;
  elsif v_previous = v_today then
    -- Already counted today; nothing changes.
    null;
  elsif v_previous = v_today - 1 then
    v_current := coalesce(v_current, 0) + 1;
    v_longest := greatest(coalesce(v_longest, 0), v_current);
    v_total   := coalesce(v_total, 0) + 1;
  else
    /* The run ended. It resets to 1 — today still counts — and the longest
       run is kept, because that is the number worth remembering. */
    v_current := 1;
    v_total   := coalesce(v_total, 0) + 1;
  end if;

  insert into public.user_streaks (user_id, current_streak, longest_streak, total_days, last_active_on, updated_at)
  values (v_user, v_current, greatest(v_longest, v_current), v_total, v_today, now())
  on conflict (user_id) do update set
    current_streak = excluded.current_streak,
    longest_streak = greatest(public.user_streaks.longest_streak, excluded.current_streak),
    total_days     = excluded.total_days,
    last_active_on = excluded.last_active_on,
    updated_at     = now();

  update public.user_profiles set last_active_at = now() where id = v_user;

  perform private.check_achievements(v_user);

  return jsonb_build_object(
    'current_streak', v_current,
    'longest_streak', greatest(v_longest, v_current),
    'total_days', v_total,
    'first_visit_today', v_first
  );
end;
$$;

revoke all on function public.record_activity() from public, anon;
grant execute on function public.record_activity() to authenticated;

-- ------------------------------------------------------------
-- my_progress — everything the celebration layer needs, in one call
-- ------------------------------------------------------------
create or replace function public.my_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user     uuid := auth.uid();
  ap         record;
  ts         record;
  st         record;
  v_next     integer;
  v_tier     text;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into ap from public.athlete_profiles where user_id = v_user;
  select * into ts from public.talent_scores where athlete_id = ap.id;
  select * into st from public.user_streaks where user_id = v_user;

  /* Points to the next tier — the single most motivating number we can show,
     because unlike the score itself it has an obvious finish line. */
  if ts.athlete_id is not null then
    v_next := case
      when ts.overall < 40 then 40
      when ts.overall < 55 then 55
      when ts.overall < 70 then 70
      when ts.overall < 85 then 85
      else null
    end;
    v_tier := case
      when ts.overall < 40 then 'bronze'
      when ts.overall < 55 then 'silver'
      when ts.overall < 70 then 'gold'
      when ts.overall < 85 then 'elite'
      else null
    end;
  end if;

  return jsonb_build_object(
    'streak', jsonb_build_object(
      'current', coalesce(st.current_streak, 0),
      'longest', coalesce(st.longest_streak, 0),
      'total_days', coalesce(st.total_days, 0),
      'last_active_on', st.last_active_on,
      'active_today', st.last_active_on = current_date
    ),
    'score', case when ts.athlete_id is null then null else jsonb_build_object(
      'overall', ts.overall,
      'tier', ts.tier,
      'previous_overall', ts.previous_overall,
      'next_tier', v_tier,
      'next_tier_at', v_next,
      'points_to_next', case when v_next is null then null else v_next - ts.overall end
    ) end,
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', a.achievement_key,
        'unlocked_at', a.unlocked_at,
        'seen', a.seen
      ) order by a.unlocked_at desc)
      from public.user_achievements a where a.user_id = v_user
    ), '[]'::jsonb),
    'unseen', coalesce((
      select jsonb_agg(a.achievement_key order by a.unlocked_at asc)
      from public.user_achievements a where a.user_id = v_user and not a.seen
    ), '[]'::jsonb),
    'last_7_days', coalesce((
      select jsonb_agg(d.day order by d.day)
      from public.activity_days d
      where d.user_id = v_user and d.day > current_date - 7
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.my_progress() from public, anon;
grant execute on function public.my_progress() to authenticated;

create or replace function public.mark_achievements_seen(p_keys text[] default null)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  update public.user_achievements
  set seen = true
  where user_id = auth.uid()
    and not seen
    and (p_keys is null or achievement_key = any(p_keys));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_achievements_seen(text[]) from public, anon;
grant execute on function public.mark_achievements_seen(text[]) to authenticated;

-- ------------------------------------------------------------
-- Keep achievements in step with the things that earn them
-- ------------------------------------------------------------
/* One function for several tables, so the column it reads is looked up by
   name rather than by field access — `new.author_id` would raise on a table
   that has no such column. */
create or replace function private.trg_check_achievements_by_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row  jsonb := to_jsonb(coalesce(new, old));
  v_user uuid;
begin
  v_user := coalesce(
    v_row ->> 'author_id',
    v_row ->> 'following_id',
    v_row ->> 'athlete_id'
  )::uuid;

  if v_user is not null then perform private.check_achievements(v_user); end if;
  return coalesce(new, old);
end;
$$;

create or replace function private.trg_check_achievements_by_athlete()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid;
begin
  select user_id into v_user from public.athlete_profiles
  where id = coalesce(new.athlete_id, old.athlete_id);
  if v_user is not null then perform private.check_achievements(v_user); end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_posts_achievements on public.posts;
create trigger trg_posts_achievements
  after insert on public.posts
  for each row execute function private.trg_check_achievements_by_user();

drop trigger if exists trg_follows_achievements on public.follows;
create trigger trg_follows_achievements
  after insert on public.follows
  for each row execute function private.trg_check_achievements_by_user();

drop trigger if exists trg_media_achievements on public.athlete_media;
create trigger trg_media_achievements
  after insert on public.athlete_media
  for each row execute function private.trg_check_achievements_by_athlete();

drop trigger if exists trg_matches_achievements on public.match_records;
create trigger trg_matches_achievements
  after insert on public.match_records
  for each row execute function private.trg_check_achievements_by_athlete();

drop trigger if exists trg_endorsements_achievements on public.endorsements;
create trigger trg_endorsements_achievements
  after insert on public.endorsements
  for each row execute function private.trg_check_achievements_by_athlete();

/* A new tier is the moment worth celebrating most, so it is checked the
   instant the score lands rather than on the next app open. */
create or replace function private.trg_check_achievements_by_score()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid;
begin
  select user_id into v_user from public.athlete_profiles where id = new.athlete_id;
  if v_user is not null then perform private.check_achievements(v_user); end if;
  return new;
end;
$$;

drop trigger if exists trg_scores_achievements on public.talent_scores;
create trigger trg_scores_achievements
  after insert or update of overall on public.talent_scores
  for each row execute function private.trg_check_achievements_by_score();

-- ------------------------------------------------------------
-- RLS — read your own, write nothing
-- ------------------------------------------------------------
drop policy if exists streaks_select on public.user_streaks;
create policy streaks_select on public.user_streaks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists activity_select on public.activity_days;
create policy activity_select on public.activity_days
  for select to authenticated using (user_id = auth.uid());

drop policy if exists achievements_select on public.user_achievements;
create policy achievements_select on public.user_achievements
  for select to authenticated using (user_id = auth.uid());

-- Everything here is earned, never claimed.
revoke insert, update, delete on public.user_streaks     from authenticated, anon;
revoke insert, update, delete on public.activity_days    from authenticated, anon;
revoke insert, update, delete on public.user_achievements from authenticated, anon;
grant select on public.user_streaks, public.activity_days, public.user_achievements
  to authenticated;

-- ------------------------------------------------------------
-- Backfill for accounts that already exist
-- ------------------------------------------------------------
do $$
declare r record;
begin
  for r in select id from public.user_profiles loop
    perform private.check_achievements(r.id);
  end loop;
end;
$$;

-- Anything earned before this migration existed is not a surprise worth
-- celebrating, so it starts out already seen.
update public.user_achievements set seen = true where not seen;
