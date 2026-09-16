-- ============================================================
-- 0907/07 — A coach has no Talent Score, and that is not an error
--
-- `refresh_my_talent_score` raised when the caller had no athlete profile.
-- PostgREST turned that into a 500, so a coach or a guardian opening the score
-- screen — reachable by a deep link, and by the preview tour — produced a
-- server error in the logs for behaving normally.
--
-- The client type has always been `Promise<FullTalentScore | null>` and every
-- caller handles the null. Not having a score is a fact about the account, not
-- a failure, so it now answers with one.
--
-- The unauthenticated guard stays a raise: that one really is a caller error.
--
-- The return type and everything else about the function are unchanged.
-- ============================================================

create or replace function public.refresh_my_talent_score()
returns public.talent_scores
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_athlete uuid;
  v_row public.talent_scores;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select id into v_athlete from public.athlete_profiles where user_id = auth.uid();
  if v_athlete is null then
    /* A coach, a club or a guardian. `v_row` is unassigned, so this returns
       null, which is what the client has always been typed to expect. */
    return v_row;
  end if;

  perform private.refresh_talent_score(v_athlete);
  select * into v_row from public.talent_scores where athlete_id = v_athlete;
  return v_row;
end;
$$;

revoke all on function public.refresh_my_talent_score() from public, anon;
grant execute on function public.refresh_my_talent_score() to authenticated;
