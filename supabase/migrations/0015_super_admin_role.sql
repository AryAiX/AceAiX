-- ============================================================
-- 0015 — Super admin role and guarded admin promotion
-- ============================================================

alter type public.user_role add value if not exists 'super_admin';

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role::text in ('admin', 'super_admin')
  );
$$;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role::text = 'super_admin'
  );
$$;

create or replace function private.prevent_non_super_admin_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role and not private.is_super_admin() then
    raise exception 'Only super admins can change user roles' using errcode = '42501';
  end if;

  if old.role::text = 'super_admin' and new.role is distinct from old.role then
    raise exception 'Super admin accounts are protected' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_profiles_role_guard on public.user_profiles;
create trigger trg_user_profiles_role_guard
  before update of role on public.user_profiles
  for each row execute function private.prevent_non_super_admin_role_change();

create or replace function public.promote_user_to_admin(target_user_id uuid)
returns public.user_profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.user_profiles;
begin
  if not private.is_super_admin() then
    raise exception 'Only super admins can promote users' using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Cannot promote your own account' using errcode = '42501';
  end if;

  update public.user_profiles
     set role = 'admin'::public.user_role,
         is_verified = true,
         updated_at = now()
   where id = target_user_id
     and role::text <> 'super_admin'
   returning * into v_row;

  if v_row.id is null then
    raise exception 'User not found or protected' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, new_value)
  values (
    auth.uid(),
    'user.promote_admin',
    'user_profiles',
    target_user_id,
    jsonb_build_object('role', v_row.role, 'is_verified', v_row.is_verified)
  );

  return v_row;
end;
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role      public.user_role;
  v_full_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');

  begin
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    v_role := 'athlete';
  end;

  -- Never allow privilege escalation via signup metadata.
  if v_role is null or v_role::text in ('admin','super_admin','org_admin') then
    v_role := 'athlete';
  end if;

  insert into public.user_profiles (id, role, full_name)
  values (new.id, v_role, nullif(v_full_name, ''))
  on conflict (id) do nothing;

  insert into public.user_private (user_id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (user_id) do nothing;

  if v_role = 'athlete' then
    insert into public.athlete_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
