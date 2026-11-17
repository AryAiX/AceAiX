-- ============================================================
-- Browse parents who chose to be contacted (QA-208)
--
-- People search can browse athletes and coaches with an empty
-- box. Parents had to be typed by name. This adds a browse list
-- of parents, and only a parent who turned on "Show me on my
-- child's profile" (QA-206) is in it.
--
-- A guardian is listed only when they have at least one granted
-- link with show_on_profile on, so the list is not a directory
-- of every family. Typing a name still finds any parent through
-- search_people (QA-205). Only a parent, coach, club, scout or
-- sponsor gets rows. Suspended accounts are left out, and a
-- block either way is left out. The columns match search_people.
--
-- NEEDS TOORAJ'S OK because it lists parent accounts to some roles.
-- ============================================================

create or replace function public.browse_parents(
  p_limit  integer default 40,
  p_offset integer default 0
)
returns table (
  id              uuid,
  role            text,
  full_name       text,
  avatar_url      text,
  bio             text,
  city            text,
  country         text,
  is_verified     boolean,
  is_minor        boolean,
  followers_count integer,
  sport           text,
  "position"      text,
  talent_score    integer,
  tier            text,
  is_following    boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    up.id,
    up.role::text,
    up.full_name::text,
    up.avatar_url::text,
    up.bio,
    up.city::text,
    up.country::text,
    up.is_verified,
    up.is_minor,
    up.followers_count,
    null::text,
    null::text,
    0,
    'rising'::text,
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = up.id
    )
  from public.user_profiles up
  where auth.uid() is not null
    and exists (
      select 1 from public.user_profiles me
      where me.id = auth.uid()
        and me.role::text in ('guardian', 'coach', 'club', 'scout', 'sponsor')
        and not coalesce(me.is_suspended, false)
    )
    and up.role::text = 'guardian'
    and up.id <> auth.uid()
    and not coalesce(up.is_suspended, false)
    and exists (
      select 1 from public.guardian_consents gc
      where gc.guardian_user_id = up.id
        and gc.status = 'granted'
        and gc.show_on_profile
    )
    and not private.users_are_blocked(auth.uid(), up.id)
  order by up.is_verified desc, up.full_name asc nulls last, up.id
  limit greatest(1, least(coalesce(p_limit, 40), 50))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.browse_parents(integer, integer) from public, anon;
grant execute on function public.browse_parents(integer, integer) to authenticated;
