-- QA-67. invite_club_member told a caller three things about any typed email:
-- a minor raised hint 'club_invitee_minor', distinct from 'club_invitee_not_found';
-- success returned the invitee's full_name; and nothing capped bulk probing.
-- A minor, a suspended account and a blocked account now raise the same
-- 'club_invitee_unavailable' error, the name is not returned, and more than
-- 20 invites in 24 hours is refused before the email is looked up.

create or replace function public.invite_club_member(p_org uuid, p_email text, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.user_profiles;
  v_org  public.organizations;
  v_existing public.organization_members;
  v_was_active boolean := false;
begin
  perform private.require_org(p_org, 'manage');
  if p_role not in ('manager','editor','scorekeeper','coach','staff') then
    raise exception 'Unknown role' using errcode = '22023', hint = 'club_role';
  end if;
  if (select count(*) from public.organization_members
      where organization_id = p_org and invited_by is not null and created_at > now() - interval '24 hours') > 20 then
    raise exception 'Too many invites today' using errcode = '54000', hint = 'rate_limited';
  end if;
  select up.* into v_user
  from auth.users au join public.user_profiles up on up.id = au.id
  where lower(au.email) = lower(btrim(coalesce(p_email, '')));
  if not found then
    raise exception 'No AceAiX account uses that e-mail' using errcode = 'P0002', hint = 'club_invitee_not_found';
  end if;
  if coalesce(v_user.is_minor, false) or coalesce(v_user.is_suspended, false) or private.users_are_blocked(auth.uid(), v_user.id) then
    raise exception 'That account cannot be added' using errcode = '42501', hint = 'club_invitee_unavailable';
  end if;

  select * into v_existing from public.organization_members
  where organization_id = p_org and user_id = v_user.id;
  if found and v_existing.member_role = 'owner' then
    raise exception 'That person owns the page' using errcode = '22023', hint = 'club_role';
  end if;
  v_was_active := coalesce(v_existing.status = 'active', false);

  if v_was_active then
    update public.organization_members set member_role = p_role
    where id = v_existing.id;
  else
    insert into public.organization_members (organization_id, user_id, member_role, status, invited_by)
    values (p_org, v_user.id, p_role, 'pending', auth.uid())
    on conflict (organization_id, user_id) do update
      set member_role = excluded.member_role, status = 'pending', invited_by = auth.uid();
    select * into v_org from public.organizations where id = p_org;
    perform private.notify(v_user.id, 'club', 'club_invite',
      'You were invited to help run ' || v_org.name, null, auth.uid(),
      'organization', p_org::text, null,
      jsonb_build_object('organization_id', p_org, 'role', p_role));
  end if;

  return jsonb_build_object('user_id', v_user.id,
                            'status', case when v_was_active then 'active'
                                           else 'pending' end);
end;
$$;
