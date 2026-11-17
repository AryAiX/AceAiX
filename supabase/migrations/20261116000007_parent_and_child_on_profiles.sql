-- ============================================================
-- A parent and their child on each other's profiles (QA-206)
--
-- A linked parent can choose to be shown on their child's
-- profile, so a club, coach, scout or sponsor can message the
-- parent instead of the child. The child is then also shown on
-- the parent's profile. This is off by default, and only the
-- linked parent can switch it on.
--
-- NEEDS TOORAJ'S OK because it shows a parent-child link on profiles.
-- ============================================================

alter table public.guardian_consents
  add column if not exists show_on_profile boolean not null default false;

grant select (show_on_profile) on public.guardian_consents to authenticated;

/* Who may see that this parent and this child belong together.
   The two of them always may. A coach, club, scout or sponsor may
   when nobody in the trio is suspended, the child is discoverable,
   and neither side of the pair is blocked. */
create or replace function private.can_see_family(
  p_viewer   uuid,
  p_minor    uuid,
  p_guardian uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_viewer is not null
    and p_minor is not null
    and p_guardian is not null
    and (
      p_viewer = p_minor
      or p_viewer = p_guardian
      or (
        exists (
          select 1 from public.user_profiles v
          where v.id = p_viewer
            and v.role::text in ('coach', 'club', 'scout', 'sponsor')
            and not coalesce(v.is_suspended, false)
        )
        and exists (
          select 1 from public.user_profiles m
          where m.id = p_minor
            and not coalesce(m.is_suspended, false)
            and coalesce(m.is_discoverable, false)
        )
        and exists (
          select 1 from public.user_profiles g
          where g.id = p_guardian
            and not coalesce(g.is_suspended, false)
        )
        and not private.users_are_blocked(p_viewer, p_minor)
        and not private.users_are_blocked(p_viewer, p_guardian)
      )
    );
$$;

revoke all on function private.can_see_family(uuid, uuid, uuid) from public, anon, authenticated;

/* Parents who have chosen to appear on this child's profile. */
create or replace function public.guardian_contacts_of(p_user uuid)
returns table (
  guardian_user_id uuid,
  full_name        text,
  avatar_url       text,
  relationship     text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct on (g.guardian_user_id)
    g.guardian_user_id,
    up.full_name::text,
    up.avatar_url::text,
    g.relationship
  from public.guardian_consents g
  join public.user_profiles up on up.id = g.guardian_user_id
  where auth.uid() is not null
    and g.minor_user_id = p_user
    and g.status = 'granted'
    and g.guardian_user_id is not null
    and g.show_on_profile
    and private.can_see_family(auth.uid(), g.minor_user_id, g.guardian_user_id)
  order by g.guardian_user_id, g.granted_at desc nulls last;
$$;

/* Children who appear on this parent's profile. */
create or replace function public.children_on_profile(p_guardian uuid)
returns table (
  minor_user_id uuid,
  full_name     text,
  avatar_url    text,
  relationship  text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct on (g.minor_user_id)
    g.minor_user_id,
    up.full_name::text,
    up.avatar_url::text,
    g.relationship
  from public.guardian_consents g
  join public.user_profiles up on up.id = g.minor_user_id
  where auth.uid() is not null
    and g.guardian_user_id = p_guardian
    and g.status = 'granted'
    and g.show_on_profile
    and private.can_see_family(auth.uid(), g.minor_user_id, g.guardian_user_id)
  order by g.minor_user_id, g.granted_at desc nulls last;
$$;

/* The linked parent turns the profile link on or off. */
create or replace function public.set_guardian_on_profile(p_minor uuid, p_show boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  update public.guardian_consents
  set show_on_profile = coalesce(p_show, false)
  where minor_user_id = p_minor
    and guardian_user_id = auth.uid()
    and status = 'granted';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Not permitted' using errcode = '42501', hint = 'not_linked_guardian';
  end if;

  return coalesce(p_show, false);
end;
$$;

revoke all on function public.guardian_contacts_of(uuid) from public, anon;
revoke all on function public.children_on_profile(uuid) from public, anon;
revoke all on function public.set_guardian_on_profile(uuid, boolean) from public, anon;

grant execute on function public.guardian_contacts_of(uuid) to authenticated;
grant execute on function public.children_on_profile(uuid) to authenticated;
grant execute on function public.set_guardian_on_profile(uuid, boolean) to authenticated;
