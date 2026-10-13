-- ------------------------------------------------------------
-- Sign-up never grants a privileged role
-- ------------------------------------------------------------
-- The trigger used to deny-list privileged roles, and super_admin (added in
-- 0015) was never on the list, so sign-up metadata of {"role":"super_admin"}
-- produced a super admin. A deny-list over an enum that grows is wrong by
-- construction; this is an allow-list of the roles a person may choose.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role      public.user_role;
  v_full_name text;
  v_first     text;
  v_last      text;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_first     := nullif(new.raw_user_meta_data ->> 'first_name', '');
  v_last      := nullif(new.raw_user_meta_data ->> 'last_name', '');

  if v_full_name = '' and (v_first is not null or v_last is not null) then
    v_full_name := trim(coalesce(v_first, '') || ' ' || coalesce(v_last, ''));
  end if;

  begin
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    v_role := 'athlete';
  end;

  -- Roles are never escalated through signup metadata: anything that is not a
  -- role a person may choose for themselves becomes an athlete.
  if v_role is null
     or v_role::text not in ('athlete', 'coach', 'club', 'scout', 'guardian', 'guest') then
    v_role := 'athlete';
  end if;

  insert into public.user_profiles (id, role, full_name, first_name, last_name)
  values (new.id, v_role, nullif(v_full_name, ''), v_first, v_last)
  on conflict (id) do nothing;

  insert into public.user_private (user_id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if v_role = 'athlete' then
    insert into public.athlete_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role = 'coach' then
    insert into public.coach_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  elsif v_role in ('scout','club') then
    insert into public.scout_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
    insert into public.match_preferences (user_id)
    values (new.id) on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
