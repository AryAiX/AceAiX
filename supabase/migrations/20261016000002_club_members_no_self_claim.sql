-- QA-63. Any authenticated user could become owner of any club in two
-- steps: om_insert let them insert a pending row for themselves as owner
-- with invited_by = self, and respond_club_invite then activated any
-- pending row whose invited_by was not null, keeping member_role = 'owner'.

revoke insert, update, delete on public.organization_members
  from authenticated;

drop policy if exists om_insert on public.organization_members;
create policy om_insert on public.organization_members
  for insert to authenticated
  with check (
    private.is_admin()
    or private.is_org_member(organization_id, array['owner','manager'])
  );

create or replace function public.respond_club_invite(p_org uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_row public.organization_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_row
  from public.organization_members m
  where m.organization_id = p_org
    and m.user_id = auth.uid()
    and m.status = 'pending'
    and m.invited_by is not null
    and m.invited_by <> auth.uid()
    and m.member_role <> 'owner'
    and exists (
      select 1
      from public.organization_members inviter
      where inviter.organization_id = m.organization_id
        and inviter.user_id = m.invited_by
        and inviter.status = 'active'
        and inviter.member_role in ('owner','manager')
    );
  if not found then
    raise exception 'No invitation' using errcode = 'P0002', hint = 'club_invite_missing';
  end if;
  if coalesce(p_accept, false) then
    update public.organization_members set status = 'active' where id = v_row.id;
    perform private.club_notify_managers(p_org, 'club_invite_accepted',
      'Your invitation was accepted', null, 'organization', p_org::text, '{}'::jsonb);
  else
    delete from public.organization_members where id = v_row.id;
  end if;
end;
$$;
