-- Verified external performance records are written only by authenticated
-- Edge Functions using the service role. Athletes may still create and edit
-- self-reported records and delete any of their own imported records.

drop policy if exists perf_write on public.performance_records;
drop policy if exists perf_insert_self_reported on public.performance_records;
drop policy if exists perf_update_self_reported on public.performance_records;
drop policy if exists perf_delete_owner on public.performance_records;

create policy perf_insert_self_reported
on public.performance_records
for insert
to authenticated
with check (
  athlete_id = auth.uid()
  and source in ('self', 'self_reported')
);

create policy perf_update_self_reported
on public.performance_records
for update
to authenticated
using (
  athlete_id = auth.uid()
  and source in ('self', 'self_reported')
)
with check (
  athlete_id = auth.uid()
  and source in ('self', 'self_reported')
);

create policy perf_delete_owner
on public.performance_records
for delete
to authenticated
using (athlete_id = auth.uid());

-- Provider mirrors are never written directly by a public client.
drop policy if exists chess_stats_write on public.chess_stats;
drop policy if exists football_stats_write on public.football_stats;

create or replace function public.commit_external_performance_sync(
  p_athlete_id uuid,
  p_sport text,
  p_period text,
  p_stats jsonb,
  p_source text,
  p_synced_at timestamptz
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if lower(p_sport) not in ('chess', 'football') then
    raise exception 'unsupported external performance sport';
  end if;
  if p_source not in ('chesscom', 'lichess', 'chesscom,lichess', 'lichess,chesscom', 'api_football') then
    raise exception 'unsupported external performance source';
  end if;

  -- Remove a casing variant for the same period before inserting the
  -- canonical lowercase sport key.
  delete from public.performance_records
  where athlete_id = p_athlete_id
    and lower(sport) = lower(p_sport)
    and season_or_period is not distinct from p_period;

  insert into public.performance_records (
    athlete_id, sport, season_or_period, stats, source, last_synced_at
  ) values (
    p_athlete_id, lower(p_sport), p_period, p_stats, p_source, p_synced_at
  );

  if lower(p_sport) = 'chess' then
    insert into public.chess_stats (athlete_id, stats, source, last_synced_at)
    values (p_athlete_id, p_stats, p_source, p_synced_at)
    on conflict (athlete_id) do update
      set stats = excluded.stats,
          source = excluded.source,
          last_synced_at = excluded.last_synced_at;
  else
    insert into public.football_stats (athlete_id, stats, source, last_synced_at)
    values (p_athlete_id, p_stats || jsonb_build_object('season', p_period), p_source, p_synced_at)
    on conflict (athlete_id) do update
      set stats = excluded.stats,
          source = excluded.source,
          last_synced_at = excluded.last_synced_at;
  end if;
end;
$$;

revoke all on function public.commit_external_performance_sync(uuid, text, text, jsonb, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.commit_external_performance_sync(uuid, text, text, jsonb, text, timestamptz)
to service_role;
