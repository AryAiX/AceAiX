-- ============================================================
-- Who can find a parent account (QA-205)
--
-- search_people returned parent (guardian) accounts to every
-- signed-in user, children included. A guardian account is now
-- returned only when the person searching is a parent, coach,
-- club, scout or sponsor. Athletes (adult or minor) and every
-- other role no longer get parent accounts.
--
-- Blocks, suspended accounts and the minor discovery rule are
-- unchanged. This only removes rows from some callers' results
-- and shows nobody anything new.
--
-- NEEDS TOORAJ'S OK because it changes who can find parent accounts.
-- ============================================================

create or replace function public.search_people(
  p_query text,
  p_role  text default null,          -- athlete | coach | club | scout | null
  p_limit integer default 20
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
    ap.sport::text,
    coalesce(ap.position_primary, ap.position)::text,
    coalesce(ts.overall, 0),
    coalesce(ts.tier, 'rising')::text,
    exists (select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = up.id)
  from public.user_profiles up
  left join public.athlete_profiles ap on ap.user_id = up.id
  left join public.talent_scores ts on ts.athlete_id = ap.id
  where auth.uid() is not null
    and coalesce(trim(p_query), '') <> ''
    and up.full_name ilike '%' || trim(p_query) || '%'
    and up.id <> auth.uid()
    and not coalesce(up.is_suspended, false)
    and (p_role is null or up.role::text = p_role)
    and (not coalesce(up.is_minor, false) or coalesce(up.is_discoverable, false))
    -- A parent account is found only by a parent, coach, club, scout or sponsor (QA-205).
    and (
      up.role::text <> 'guardian'
      or exists (
        select 1 from public.user_profiles me
        where me.id = auth.uid()
          and me.role::text in ('guardian', 'coach', 'club', 'scout', 'sponsor')
      )
    )
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = up.id)
         or (b.blocker_id = up.id and b.blocked_id = auth.uid())
    )
  order by up.is_verified desc, coalesce(ts.overall, 0) desc, up.full_name asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
