-- ============================================================
-- Tapping a club account opens its club page (QA-183)
--
-- Tapping a club or academy account anywhere in the app opens
-- the plain person profile. The app cannot tell which page
-- the account owns, because organization_members is private
-- to the people on that page.
--
-- club_page_of returns only the page id. Club pages are
-- already public, so the id reveals nothing new. It returns
-- a page only for an account whose role is club, so nothing
-- about people is revealed. A coach who owns a page, and a
-- club account with no page, both come back empty.
-- ============================================================

create or replace function public.club_page_of(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.organization_id
  from public.organization_members m
  join public.user_profiles u on u.id = m.user_id
  where m.user_id = p_user
    and m.member_role = 'owner'
    and m.status = 'active'
    and u.role = 'club'
    and auth.uid() is not null
  order by m.created_at
  limit 1;
$$;

revoke all on function public.club_page_of(uuid) from public, anon;
grant execute on function public.club_page_of(uuid) to authenticated;
