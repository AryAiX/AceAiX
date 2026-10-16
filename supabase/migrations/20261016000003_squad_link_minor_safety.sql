-- QA-64. save_squad_member let any club with content permission link any
-- user, including a minor at an unverified club. With no display name it
-- copied the profile's full name onto the roster, and the link notification
-- title was built from the club's own name, with no rate limit.

create or replace function public.save_squad_member(p_squad uuid, p_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_squad public.club_squads;
  v_id    uuid;
  v_kind  text := coalesce(p ->> 'kind', 'player');
  v_user  uuid := nullif(p ->> 'user_id', '')::uuid;
  v_name  text := private.club_text(p, 'display_name', 80);
  v_prev  public.club_squad_members;
  v_link  text := 'none';
  v_org_name text;
begin
  select * into v_squad from public.club_squads where id = p_squad;
  if not found then raise exception 'Squad not found' using errcode = 'P0002'; end if;
  perform private.require_org(v_squad.organization_id, 'content');
  if v_kind not in ('player','staff') then
    raise exception 'Unknown kind' using errcode = '22023';
  end if;
  if v_kind = 'staff' and coalesce(p ->> 'staff_role', 'other') not in
     ('head_coach','assistant_coach','goalkeeper_coach','fitness_coach','physio','analyst','team_manager','other') then
    raise exception 'Unknown staff role' using errcode = '22023';
  end if;

  if v_user is not null then
    if not exists (select 1 from public.user_profiles where id = v_user and not coalesce(is_suspended, false))
       or private.users_are_blocked(auth.uid(), v_user) then
      raise exception 'That profile cannot be linked' using errcode = '42501', hint = 'club_link_unavailable';
    end if;
    if exists (
         select 1 from public.user_profiles
         where id = v_user and coalesce(is_minor, false)
       )
       and (
         not exists (
           select 1 from public.organizations
           where id = v_squad.organization_id and is_verified
         )
         or not private.user_publicly_visible(v_user)
       ) then
      raise exception 'That profile cannot be linked' using errcode = '42501', hint = 'club_link_unavailable';
    end if;
    if v_name is null then
      select private.short_person_name(full_name) into v_name from public.user_profiles where id = v_user;
    end if;
  end if;
  if v_name is null or length(v_name) < 2 then
    raise exception 'Name the person' using errcode = '22023', hint = 'club_member_name';
  end if;

  if v_user is not null
     and (
       p_id is null
       or exists (
         select 1 from public.club_squad_members m
         where m.id = p_id and m.squad_id = p_squad and m.user_id is distinct from v_user
       )
     )
     and (select count(*) from public.club_squad_members
          where organization_id = v_squad.organization_id
            and user_id is not null
            and created_at > now() - interval '24 hours') > 10 then
    raise exception 'Too many link requests today' using errcode = '54000', hint = 'rate_limited';
  end if;

  if p_id is not null then
    select * into v_prev from public.club_squad_members where id = p_id and squad_id = p_squad;
    if not found then raise exception 'Member not found' using errcode = 'P0002'; end if;
    v_link := case when v_user is null then 'none'
                   when v_user = v_prev.user_id then v_prev.link_status
                   else 'invited' end;
    update public.club_squad_members set
      kind = v_kind, display_name = v_name, user_id = v_user, link_status = v_link,
      shirt_number = nullif(p ->> 'shirt_number', '')::integer,
      position = private.club_text(p, 'position', 40),
      staff_role = case when v_kind = 'staff' then coalesce(p ->> 'staff_role', 'other') end,
      sort = coalesce(nullif(p ->> 'sort', '')::integer, sort)
    where id = p_id
    returning id into v_id;
  else
    v_link := case when v_user is null then 'none' else 'invited' end;
    insert into public.club_squad_members (squad_id, organization_id, kind, display_name, user_id, link_status,
      shirt_number, position, staff_role, sort)
    values (p_squad, v_squad.organization_id, v_kind, v_name, v_user, v_link,
      nullif(p ->> 'shirt_number', '')::integer, private.club_text(p, 'position', 40),
      case when v_kind = 'staff' then coalesce(p ->> 'staff_role', 'other') end,
      coalesce(nullif(p ->> 'sort', '')::integer, 0))
    returning id into v_id;
  end if;

  if v_link = 'invited' and (p_id is null or v_prev.user_id is distinct from v_user) then
    select name into v_org_name from public.organizations where id = v_squad.organization_id;
    perform private.notify(v_user, 'club', 'club_squad_link',
      v_org_name || ' added you to its ' || v_squad.category || ' ' || v_squad.sport || ' squad',
      null, auth.uid(), 'organization', v_squad.organization_id::text, null,
      jsonb_build_object('organization_id', v_squad.organization_id, 'squad_member_id', v_id));
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'That person is already in this squad' using errcode = '23505', hint = 'club_member_exists';
end;
$$;
