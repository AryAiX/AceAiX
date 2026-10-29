-- ============================================================
-- profile_cards — who is allowed to be shown as a person
--
-- A personal opportunity names its poster. The client already has
-- created_by_id; this is the one read that turns a batch of those ids
-- into name, avatar, verified and role without bypassing blocks,
-- suspensions or hidden minors.
--
-- jsonb, not RETURNS TABLE, so a later field is another key in the
-- object and does not require DROP FUNCTION.
--
-- No profile_views insert. Opening a list must not count as a visit.
-- ============================================================

create or replace function public.profile_cards(p_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer uuid := auth.uid();
  v_admin  boolean;
  v_cards  jsonb;
begin
  if v_viewer is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_admin := private.is_admin();

  -- First 50 distinct ids, in the order they were asked for. The rest
  -- are ignored. Visibility is applied after that cut.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', u.id,
      'full_name', u.full_name::text,
      'avatar_url', u.avatar_url::text,
      'is_verified', u.is_verified,
      'role', u.role::text
    )
    order by picked.ord
  ), '[]'::jsonb)
  into v_cards
  from (
    select id, min(ord) as ord
    from unnest(coalesce(p_ids, '{}'::uuid[])) with ordinality as t(id, ord)
    where id is not null
    group by id
    order by min(ord)
    limit 50
  ) picked
  join public.user_profiles u on u.id = picked.id
  where u.id = v_viewer
     or (
       not private.users_are_blocked(v_viewer, u.id)
       and (
         private.viewer_can_see_author(u.id)
         or (v_admin and coalesce(u.is_suspended, false))
       )
     );

  return v_cards;
end;
$$;

revoke all on function public.profile_cards(uuid[]) from public, anon;
grant execute on function public.profile_cards(uuid[]) to authenticated;
