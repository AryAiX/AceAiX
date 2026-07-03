-- ============================================================
-- 0013 — In-app account deletion
-- Allows an authenticated user to permanently delete their own account
-- for App Store account deletion compliance.
-- ============================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  requester uuid := auth.uid();
begin
  if requester is null then
    raise exception 'Not authenticated';
  end if;

  -- Public app data cascades from user_profiles; auth-owned data cascades
  -- from auth.users. Both deletes are scoped to the current JWT subject.
  delete from public.user_profiles where id = requester;
  delete from auth.users where id = requester;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
