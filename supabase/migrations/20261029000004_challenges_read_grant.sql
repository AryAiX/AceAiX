-- Challenges are meant to be readable by signed-in users (challenges_read).
-- Hosted projects grant SELECT to authenticated by default; a database built
-- from migrations does not, so the client's direct read failed the contract
-- check. RLS is unchanged. Writes stay revoked.
grant select on public.challenges to authenticated;
