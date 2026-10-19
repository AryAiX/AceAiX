-- QA-71. public.club_matches was readable signed-out: GRANT SELECT to anon,
-- plus club_matches_read with USING (true) for anon and authenticated. The
-- table sits in supabase_realtime with no column list, so an UPDATE delivered
-- the whole row — notes (up to 1000 characters the club writes) and created_by
-- (a user id) — to any signed-out subscriber on the anon key. No client
-- selects the table, and the match RPCs are granted to authenticated only.
--
-- This does not fix the signed-in case. An authenticated user can still read
-- notes and created_by from the table and over realtime. Limiting the
-- published columns, or making notes club-only, is a separate decision.

revoke select on public.club_matches from anon;

drop policy if exists club_matches_read on public.club_matches;
create policy club_matches_read on public.club_matches
  for select to authenticated using (true);
