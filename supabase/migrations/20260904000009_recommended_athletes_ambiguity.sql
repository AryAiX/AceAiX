-- ============================================================
-- 0904/09 — recommended_athletes: qualify the preference lookup
--
--   column reference "user_id" is ambiguous   (SQLSTATE 42702)
--
-- The function returns a column named `user_id`, so inside its body an
-- unqualified `where user_id = auth.uid()` could mean either the output
-- column or the table's. PostgreSQL refuses to guess, and the recruiter's
-- "Matched for you" row failed on every load.
-- ============================================================

create or replace function public.recommended_athletes(p_limit integer default 12)
returns table (
  athlete_id uuid, user_id uuid, full_name text, avatar_url text,
  sport text, "position" text, level text, club text, country text,
  age integer, is_verified boolean, is_minor boolean,
  talent_score integer, tier text, match_percent integer, reasons jsonb,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare p record;
begin
  select mp.* into p
  from public.match_preferences mp
  where mp.user_id = auth.uid();

  return query
  select d.athlete_id, d.user_id, d.full_name, d.avatar_url, d.sport, d."position",
         d.level, d.club, d.country, d.age, d.is_verified, d.is_minor,
         d.talent_score, d.tier, d.match_percent, d.reasons, d.total_count
  from public.discover_athletes(
    null,
    case when p.sports is not null and cardinality(p.sports) > 0 then p.sports[1] end,
    p.positions, p.levels, p.countries,
    p.age_min, p.age_max, p.min_score,
    coalesce(p.open_to_offers_only, true),
    'match',
    coalesce(p_limit, 12),
    0
  ) d;
end;
$$;

revoke all on function public.recommended_athletes(integer) from public, anon;
grant execute on function public.recommended_athletes(integer) to authenticated;
