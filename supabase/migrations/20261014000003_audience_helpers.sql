-- ============================================================
-- Audience (role = guest) never sees anyone under 18
--
-- Discoverability, self, admin, and guardian consent still decide
-- visibility for every other role. A guest is refused even when the
-- minor is discoverable. Anyone without a known adult age band is hidden from Audience
-- for this rule only.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Is the caller an Audience account?
-- ------------------------------------------------------------
create or replace function private.viewer_is_audience()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role::text = 'guest'
  );
$$;

revoke all on function private.viewer_is_audience() from public, anon;
grant execute on function private.viewer_is_audience() to authenticated, service_role;

-- True unless a known adult. Reads age_band without the caller's RLS. A policy that selected
-- user_profiles as the viewer would treat a suspended adult (row
-- hidden) as unknown, and would hide that adult's comments from a guest.
create or replace function private.profile_is_minor(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select coalesce(age_band::text, '') not in ('18_24', '25_plus')
      from public.user_profiles
      where id = p_user
    ),
    true
  );
$$;

revoke all on function private.profile_is_minor(uuid) from public, anon;
grant execute on function private.profile_is_minor(uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- 2. Central helpers. Every other condition is unchanged.
-- ------------------------------------------------------------
create or replace function private.viewer_can_see_public_media(p_athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.athlete_profiles ap
    join public.user_profiles up on up.id = ap.user_id
    where ap.id = p_athlete
      and not coalesce(up.is_suspended, false)
      and not (private.viewer_is_audience() and coalesce(up.age_band::text, '') not in ('18_24', '25_plus') and ap.user_id <> auth.uid())
      and (
        not coalesce(up.is_minor, false)
        or private.has_guardian_consent(up.id, 'media')
        or ap.user_id = auth.uid()
        or private.is_admin()
        or exists (
          select 1 from public.guardian_consents g
          where g.minor_user_id = up.id
            and g.guardian_user_id = auth.uid()
            and g.status = 'granted'
        )
      )
  );
$$;

create or replace function private.viewer_can_see_author(p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_profiles u
    where u.id = p_author
      and not coalesce(u.is_suspended, false)
      and not (private.viewer_is_audience() and coalesce(u.age_band::text, '') not in ('18_24', '25_plus') and p_author <> auth.uid())
      and (
        not coalesce(u.is_minor, false)
        or coalesce(u.is_discoverable, false)
        or p_author = auth.uid()
        or private.is_admin()
        or exists (
          select 1 from public.guardian_consents g
          where g.minor_user_id = u.id
            and g.guardian_user_id = auth.uid()
            and g.status = 'granted'
        )
      )
  );
$$;
