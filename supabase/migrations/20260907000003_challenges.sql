-- ============================================================
-- 0907/03 — Weekly skill challenges
--
-- The gap this closes: an athlete with no club and no contacts has no way to
-- produce evidence. They can upload a clip, but nobody asked for it, so nobody
-- watches it. A challenge inverts that — a coach asks a specific question
-- ("thirty seconds of keep-ups, one take, feet only"), and every answer is
-- comparable, watchable, and worth a scout's minute.
--
-- It is also the honest way to make a teenager come back on Tuesday. Not a
-- countdown, not a streak they will lose: a thing to do that produces footage
-- they keep.
--
-- Three design rules:
--
--   * An entry IS a media item. It goes into `athlete_media` like any other
--     clip, so the Talent Score sees it through the media pillar it already
--     has. No new pillar, no new weight, nobody's score moves because we
--     shipped a feature.
--
--   * Claimed and verified are different columns. Anyone can say they did
--     forty; only the coach who set the challenge can turn that into a number
--     a scout should trust, and the leaderboard shows which is which.
--
--   * Entering is publishing. A minor who has not been made discoverable
--     cannot enter — the same gate that keeps them out of search keeps them
--     off a leaderboard, and the error says how to change that.
-- ============================================================

create table if not exists public.challenges (
  id              uuid primary key default gen_random_uuid(),
  created_by      uuid not null references public.user_profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,

  sport           text not null,
  title           text not null check (length(btrim(title)) between 4 and 90),
  brief           text not null check (length(btrim(brief)) between 10 and 1200),
  rules           text check (rules is null or length(rules) <= 1200),

  /* A measured challenge ("keep-ups", "seconds") ranks itself. Leave the
     label null for a judged one, where the coach simply orders the entries. */
  metric_label    text check (metric_label is null or length(btrim(metric_label)) between 2 and 40),
  metric_unit     text check (metric_unit  is null or length(btrim(metric_unit))  between 1 and 12),
  metric_better   text not null default 'higher' check (metric_better in ('higher','lower')),

  age_min         integer check (age_min is null or age_min between 13 and 60),
  age_max         integer check (age_max is null or age_max between 13 and 60),

  opens_at        timestamptz not null default now(),
  closes_at       timestamptz not null,
  status          text not null default 'open' check (status in ('open','judging','closed')),

  entry_count     integer not null default 0,
  created_at      timestamptz not null default now(),

  constraint challenge_window check (closes_at > opens_at),
  constraint challenge_age_range check (age_min is null or age_max is null or age_max >= age_min)
);
alter table public.challenges enable row level security;

create index if not exists idx_challenges_open
  on public.challenges (status, closes_at desc) where status <> 'closed';
create index if not exists idx_challenges_sport on public.challenges (sport, closes_at desc);

create table if not exists public.challenge_entries (
  id             uuid primary key default gen_random_uuid(),
  challenge_id   uuid not null references public.challenges(id) on delete cascade,
  athlete_id     uuid not null references public.athlete_profiles(id) on delete cascade,
  media_id       uuid not null references public.athlete_media(id) on delete cascade,

  claimed_value  numeric(10,2),
  note           text check (note is null or length(note) <= 400),

  verified_value numeric(10,2),
  verified_by    uuid references public.user_profiles(id) on delete set null,
  verified_at    timestamptz,
  status         text not null default 'submitted'
                   check (status in ('submitted','verified','rejected')),
  judge_note     text check (judge_note is null or length(judge_note) <= 400),

  created_at     timestamptz not null default now(),
  unique (challenge_id, athlete_id)
);
alter table public.challenge_entries enable row level security;

create index if not exists idx_entries_challenge
  on public.challenge_entries (challenge_id, status, verified_value desc nulls last);
create index if not exists idx_entries_athlete on public.challenge_entries (athlete_id, created_at desc);

-- ------------------------------------------------------------
-- Reading
--
-- Challenges are public to signed-in users — that is the point of them. The
-- entries table is read through the leaderboard function below, which applies
-- the discovery gate; the policy here covers an athlete looking at their own.
-- ------------------------------------------------------------
drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges
  for select to authenticated using (true);

drop policy if exists entries_read_own on public.challenge_entries;
create policy entries_read_own on public.challenge_entries
  for select to authenticated
  using (
    exists (select 1 from public.athlete_profiles a
            where a.id = challenge_entries.athlete_id and a.user_id = auth.uid())
    or exists (select 1 from public.challenges c
               where c.id = challenge_entries.challenge_id and c.created_by = auth.uid())
  );

revoke insert, update, delete on public.challenges       from authenticated, anon;
revoke insert, update, delete on public.challenge_entries from authenticated, anon;

-- ------------------------------------------------------------
-- Counters
-- ------------------------------------------------------------
create or replace function private.sync_challenge_entry_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.challenges set entry_count = entry_count + 1 where id = new.challenge_id;
  elsif tg_op = 'DELETE' then
    update public.challenges set entry_count = greatest(0, entry_count - 1) where id = old.challenge_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_challenge_entry_count on public.challenge_entries;
create trigger trg_challenge_entry_count
  after insert or delete on public.challenge_entries
  for each row execute function private.sync_challenge_entry_count();

-- ------------------------------------------------------------
-- Who may set one
-- ------------------------------------------------------------
create or replace function private.may_set_challenges(p_org uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.role in ('coach','club','scout')
      and coalesce(up.is_verified, false)
      and coalesce(up.is_suspended, false) = false
  )
  and (p_org is null or private.is_org_member(p_org, array['owner','admin','staff']));
$$;

create or replace function public.create_challenge(
  p_sport         text,
  p_title         text,
  p_brief         text,
  p_closes_at     timestamptz,
  p_rules         text default null,
  p_metric_label  text default null,
  p_metric_unit   text default null,
  p_metric_better text default 'higher',
  p_age_min       integer default null,
  p_age_max       integer default null,
  p_organization  uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not private.may_set_challenges(p_organization) then
    raise exception 'Only verified coaches and clubs can set a challenge.'
      using hint = 'not_allowed';
  end if;
  if p_closes_at <= now() then
    raise exception 'A challenge has to close in the future.' using hint = 'closes_at_past';
  end if;
  if p_closes_at > now() + interval '90 days' then
    raise exception 'Ninety days is the longest a challenge can run.' using hint = 'closes_at_far';
  end if;

  insert into public.challenges (
    created_by, organization_id, sport, title, brief, rules,
    metric_label, metric_unit, metric_better, age_min, age_max, closes_at
  ) values (
    auth.uid(), p_organization, p_sport, btrim(p_title), btrim(p_brief),
    nullif(btrim(coalesce(p_rules, '')), ''),
    nullif(btrim(coalesce(p_metric_label, '')), ''),
    nullif(btrim(coalesce(p_metric_unit, '')), ''),
    coalesce(p_metric_better, 'higher'),
    p_age_min, p_age_max, p_closes_at
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- The list
--
-- Everything a card needs, including whether the caller is already in it, so
-- the screen makes one call.
-- ------------------------------------------------------------
create or replace function public.open_challenges(
  p_sport  text default null,
  p_limit  integer default 20,
  p_offset integer default 0
)
returns table (
  id            uuid,
  title         text,
  brief         text,
  sport         text,
  metric_label  text,
  metric_unit   text,
  metric_better text,
  closes_at     timestamptz,
  status        text,
  entry_count   integer,
  age_min       integer,
  age_max       integer,
  setter_id     uuid,
  setter_name   text,
  setter_avatar text,
  setter_verified boolean,
  org_id        uuid,
  org_name      text,
  my_entry_id   uuid,
  my_entry_status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id, c.title, c.brief, c.sport,
    c.metric_label, c.metric_unit, c.metric_better,
    c.closes_at, c.status, c.entry_count, c.age_min, c.age_max,
    c.created_by, su.full_name, su.avatar_url, coalesce(su.is_verified, false),
    c.organization_id, o.name,
    e.id, e.status
  from public.challenges c
  join public.user_profiles su on su.id = c.created_by
  left join public.organizations o on o.id = c.organization_id
  left join public.athlete_profiles me on me.user_id = auth.uid()
  left join public.challenge_entries e
         on e.challenge_id = c.id and e.athlete_id = me.id
  where (p_sport is null or c.sport = p_sport)
    and c.status <> 'closed'
    and c.closes_at > now() - interval '7 days'
    and coalesce(su.is_suspended, false) = false
  order by (e.id is null) desc, c.closes_at
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- ------------------------------------------------------------
-- Entering
-- ------------------------------------------------------------
create or replace function public.enter_challenge(
  p_challenge_id  uuid,
  p_media_id      uuid,
  p_claimed_value numeric default null,
  p_note          text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c        record;
  up       record;
  v_athlete uuid;
  v_age    integer;
  v_id     uuid;
begin
  select * into c from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'That challenge is gone.' using hint = 'not_found';
  end if;
  if c.status <> 'open' or c.closes_at <= now() then
    raise exception 'This challenge has closed.' using hint = 'challenge_closed';
  end if;

  select * into up from public.user_profiles where id = auth.uid();
  if not found or up.role <> 'athlete' then
    raise exception 'Only athletes can enter a challenge.' using hint = 'not_allowed';
  end if;
  if coalesce(up.is_suspended, false) then
    raise exception 'Your account is suspended.' using hint = 'suspended';
  end if;

  /* Entering puts a clip and a name on a public leaderboard. For a minor that
     is the same exposure as being discoverable, so it takes the same consent. */
  if coalesce(up.is_minor, false) and not coalesce(up.is_discoverable, false) then
    raise exception 'Ask your parent or guardian to turn on discovery before entering.'
      using hint = 'guardian_consent_required';
  end if;

  select id, date_part('year', age(birth_date))::int
    into v_athlete, v_age
  from public.athlete_profiles where user_id = auth.uid();

  if v_athlete is null then
    raise exception 'Finish your athlete profile first.' using hint = 'profile_incomplete';
  end if;
  if c.age_min is not null and coalesce(v_age, 0) < c.age_min then
    raise exception 'This challenge is for older age groups.' using hint = 'age_out_of_range';
  end if;
  if c.age_max is not null and coalesce(v_age, 200) > c.age_max then
    raise exception 'This challenge is for younger age groups.' using hint = 'age_out_of_range';
  end if;

  if not exists (
    select 1 from public.athlete_media m
    where m.id = p_media_id and m.athlete_id = v_athlete
      and m.is_public
      and m.media_type in ('video','highlight_reel')
  ) then
    raise exception 'Pick one of your own public clips.' using hint = 'media_not_found';
  end if;

  insert into public.challenge_entries (challenge_id, athlete_id, media_id, claimed_value, note)
  values (p_challenge_id, v_athlete, p_media_id, p_claimed_value,
          nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (challenge_id, athlete_id) do update
    set media_id      = excluded.media_id,
        claimed_value = excluded.claimed_value,
        note          = excluded.note,
        status        = 'submitted',
        verified_value = null,
        verified_by   = null,
        verified_at   = null,
        judge_note    = null
  returning id into v_id;

  perform private.notify(
    c.created_by, 'social', 'challenge_entry',
    up.full_name || ' entered ' || c.title,
    coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'A new clip is waiting for you.'),
    auth.uid(), 'challenge', c.id::text, 'challenge:' || c.id::text
  );

  return v_id;
end;
$$;

create or replace function public.withdraw_challenge_entry(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.challenge_entries e
  using public.athlete_profiles a
  where e.challenge_id = p_challenge_id
    and e.athlete_id = a.id
    and a.user_id = auth.uid();
end;
$$;

-- ------------------------------------------------------------
-- Judging
-- ------------------------------------------------------------
create or replace function public.judge_challenge_entry(
  p_entry_id uuid,
  p_accept   boolean,
  p_value    numeric default null,
  p_note     text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  e     record;
  c     record;
  v_user uuid;
begin
  select * into e from public.challenge_entries where id = p_entry_id;
  if not found then
    raise exception 'That entry is gone.' using hint = 'not_found';
  end if;

  select * into c from public.challenges where id = e.challenge_id;
  if c.created_by <> auth.uid()
     and not (c.organization_id is not null
              and private.is_org_member(c.organization_id, array['owner','admin','staff'])) then
    raise exception 'Only the coach who set this challenge can judge it.' using hint = 'not_allowed';
  end if;

  update public.challenge_entries
  set status         = case when p_accept then 'verified' else 'rejected' end,
      verified_value = case when p_accept then coalesce(p_value, claimed_value) else null end,
      verified_by    = auth.uid(),
      verified_at    = now(),
      judge_note     = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_entry_id;

  select a.user_id into v_user from public.athlete_profiles a where a.id = e.athlete_id;

  perform private.notify(
    v_user, 'social',
    case when p_accept then 'challenge_verified' else 'challenge_rejected' end,
    case when p_accept then 'Your ' || c.title || ' entry is confirmed'
         else 'Your ' || c.title || ' entry needs another go' end,
    coalesce(nullif(btrim(coalesce(p_note, '')), ''),
      case when p_accept then 'A coach watched it and confirmed the result.'
           else 'Read the brief again and send a new clip.' end),
    auth.uid(), 'challenge', c.id::text, 'challenge:' || c.id::text
  );
end;
$$;

-- ------------------------------------------------------------
-- The leaderboard
--
-- Verified results first, then claimed ones, because a scout reading this has
-- to be able to tell them apart at a glance. Minors show an age band, never a
-- year — the same rule as discovery.
-- ------------------------------------------------------------
create or replace function public.challenge_leaderboard(
  p_challenge_id uuid,
  p_limit        integer default 25,
  p_offset       integer default 0
)
returns table (
  entry_id       uuid,
  rank           integer,
  athlete_id     uuid,
  user_id        uuid,
  full_name      text,
  avatar_url     text,
  age            integer,
  age_band       text,
  sport          text,
  "position"     text,
  talent_score   integer,
  tier           text,
  media_id       uuid,
  media_url      text,
  thumbnail_url  text,
  claimed_value  numeric,
  verified_value numeric,
  status         text,
  note           text,
  created_at     timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with c as (select * from public.challenges where id = p_challenge_id),
  rows as (
    select
      e.id as entry_id, e.athlete_id, up.id as user_id, up.full_name, up.avatar_url,
      case when coalesce(up.is_minor, false) then null
           else date_part('year', age(ap.birth_date))::int end as age,
      up.age_band, ap.sport, coalesce(ap.position_primary, ap.position) as "position",
      ts.overall as talent_score, ts.tier,
      e.media_id, m.storage_url as media_url, m.thumbnail_url,
      e.claimed_value, e.verified_value, e.status, e.note, e.created_at,
      coalesce(e.verified_value, e.claimed_value) as sort_value
    from public.challenge_entries e
    join c on c.id = e.challenge_id
    join public.athlete_profiles ap on ap.id = e.athlete_id
    join public.user_profiles up on up.id = ap.user_id
    left join public.talent_scores ts on ts.athlete_id = ap.id
    left join public.athlete_media m on m.id = e.media_id
    where e.status <> 'rejected'
      and coalesce(up.is_suspended, false) = false
      /* Entering required discovery to be on, but a guardian can revoke it
         afterwards — and when they do, the leaderboard has to forget the
         child too, not just search. */
      and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
           or (b.blocker_id = up.id and b.blocked_id = auth.uid())
      )
  )
  select
    r.entry_id,
    row_number() over (
      order by
        (r.status = 'verified') desc,
        case when (select metric_better from c) = 'lower' then r.sort_value end asc nulls last,
        case when (select metric_better from c) <> 'lower' then r.sort_value end desc nulls last,
        r.created_at
    )::int as rank,
    r.athlete_id, r.user_id, r.full_name, r.avatar_url, r.age, r.age_band,
    r.sport, r."position", r.talent_score, r.tier,
    r.media_id, r.media_url, r.thumbnail_url,
    r.claimed_value, r.verified_value, r.status, r.note, r.created_at
  from rows r
  order by rank
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function
  public.create_challenge(text, text, text, timestamptz, text, text, text, text, integer, integer, uuid),
  public.open_challenges(text, integer, integer),
  public.enter_challenge(uuid, uuid, numeric, text),
  public.withdraw_challenge_entry(uuid),
  public.judge_challenge_entry(uuid, boolean, numeric, text),
  public.challenge_leaderboard(uuid, integer, integer)
to authenticated;

-- ------------------------------------------------------------
-- The athlete's own clips, for the entry picker
--
-- Reading `athlete_media` straight from the client would need the caller to
-- know their own athlete_profiles id, and any filter they forgot would return
-- other people's public clips. One function, scoped to the caller.
-- ------------------------------------------------------------
create or replace function public.my_clips()
returns table (
  id            uuid,
  title         text,
  media_type    text,
  storage_url   text,
  thumbnail_url text,
  is_public     boolean,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id, m.title::text, m.media_type::text, m.storage_url::text,
         m.thumbnail_url::text, m.is_public, m.created_at
  from public.athlete_media m
  join public.athlete_profiles a on a.id = m.athlete_id
  where a.user_id = auth.uid()
    and m.media_type in ('video','highlight_reel')
  order by m.created_at desc
  limit 50;
$$;

grant execute on function public.my_clips() to authenticated;
