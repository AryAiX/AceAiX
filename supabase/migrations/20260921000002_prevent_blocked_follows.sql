-- A block ends the social relationship in both directions. The toggle_follow
-- RPC already enforces this, but clients can also insert into follows through
-- PostgREST, so the table policy must enforce the same invariant.

create or replace function private.users_are_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;

revoke all on function private.users_are_blocked(uuid, uuid) from public, anon;
grant execute on function private.users_are_blocked(uuid, uuid) to authenticated;

-- Reassert the source-review media predicate grant as well. The hosted project
-- currently has the function and policy but has drifted to a state where even
-- owners and admins receive "permission denied for function" while deleting a
-- media row through PostgREST.
grant usage on schema private to authenticated;
grant execute on function private.viewer_can_see_public_media(uuid)
  to authenticated, service_role;

drop policy if exists fol_insert on public.follows;
create policy fol_insert
on public.follows for insert
to authenticated
with check (
  follower_id = auth.uid()
  and following_id <> auth.uid()
  and not private.users_are_blocked(follower_id, following_id)
);
