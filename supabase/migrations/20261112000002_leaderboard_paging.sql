-- ============================================================
-- Leaderboard pages past the first hundred (QA-172)
--
-- The Leaderboard screen asks talent_leaderboard for 50
-- athletes. That function stops at 100 and has no offset, so
-- anyone ranked lower never appears. On production, 109 may
-- be on the board and only 50 show.
--
-- talent_leaderboard_page returns one page of that same board.
-- Rank is numbered over the whole filtered board, and only
-- then are the offset and limit applied, so a page keeps the
-- real rank and two pages never repeat or skip anyone. The
-- offset is at least 0. The limit is between 1 and 100.
-- The short Discover preview keeps calling talent_leaderboard,
-- which this migration does not change.
--
-- talent_leaderboard_waiting returns how many scored athletes
-- are minors, not discoverable, open to offers and not
-- suspended. It returns only that number, never a name, and
-- it takes no sport or country filter. A caller who is not
-- signed in gets 0.
--
-- Nothing new becomes visible. The page uses the leaderboard's
-- rules. The waiting function returns only a number. The block
-- check calls private.users_are_blocked.
-- ============================================================

create or replace function public.talent_leaderboard_page(
  p_sport   text default null,
  p_country text default null,
  p_offset  integer default 0,
  p_limit   integer default 50
)
returns table (
  athlete_id uuid,
  user_id    uuid,
  full_name  text,
  avatar_url text,
  sport      text,
  "position" text,
  country    text,
  overall    integer,
  tier       text,
  rank       bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    ranked.athlete_id,
    ranked.user_id,
    ranked.full_name,
    ranked.avatar_url,
    ranked.sport,
    ranked."position",
    ranked.country,
    ranked.overall,
    ranked.tier,
    ranked.board_rank
  from (
    select
      ap.id as athlete_id,
      ap.user_id,
      up.full_name::text as full_name,
      up.avatar_url::text as avatar_url,
      ap.sport::text as sport,
      coalesce(ap.position_primary, ap.position)::text as "position",
      up.country::text as country,
      ts.overall,
      ts.tier,
      -- This is the global rank. Callers see it as rank.
      row_number() over (
        order by ts.overall desc, ts.updated_at asc, ap.id
      ) as board_rank
    from public.talent_scores ts
    join public.athlete_profiles ap on ap.id = ts.athlete_id
    join public.user_profiles   up on up.id = ap.user_id
    where auth.uid() is not null
      and (p_sport   is null or ap.sport   ilike p_sport)
      and (p_country is null or up.country ilike p_country)
      and coalesce(ap.is_open_to_offers, true)
      and not coalesce(up.is_suspended, false)
      -- A minor appears only once a guardian has approved discovery.
      and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
      and not private.users_are_blocked(auth.uid(), ap.user_id)
  ) ranked
  order by ranked.board_rank
  offset greatest(coalesce(p_offset, 0), 0)
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.talent_leaderboard_page(text, text, integer, integer) from public, anon;
grant execute on function public.talent_leaderboard_page(text, text, integer, integer) to authenticated;

create or replace function public.talent_leaderboard_waiting()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null then 0
    else (
      select count(*)::integer
      from public.talent_scores ts
      join public.athlete_profiles ap on ap.id = ts.athlete_id
      join public.user_profiles up on up.id = ap.user_id
      where coalesce(up.is_minor, false)
        and not coalesce(up.is_discoverable, false)
        and coalesce(ap.is_open_to_offers, true)
        and not coalesce(up.is_suspended, false)
    )
  end;
$$;

revoke all on function public.talent_leaderboard_waiting() from public, anon;
grant execute on function public.talent_leaderboard_waiting() to authenticated;
