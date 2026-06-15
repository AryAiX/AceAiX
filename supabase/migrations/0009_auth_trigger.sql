-- ============================================================
-- 0009 — Auth: server-side profile provisioning
-- Creates profile rows on auth.users insert. Role is clamped to
-- self-assignable roles; admin/org_admin are NEVER self-assigned.
-- ============================================================

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
  if v_role is null or v_role in ('admin','org_admin') then
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
