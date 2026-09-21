-- ============================================================
-- Local development harness — NOT a migration, never run in production.
--
-- Adds the two things a bare PostgreSQL + PostgREST pair needs in order to
-- stand in for the hosted Supabase API:
--
--   1. a login role PostgREST can connect as, which may switch into anon /
--      authenticated / service_role;
--   2. password sign-in and sign-up entry points, since GoTrue is not running.
--
-- The functions live in a `dev` schema that is not exposed through PostgREST;
-- only the local auth server calls them, over a direct connection.
-- ============================================================

create schema if not exists dev;

-- ------------------------------------------------------------
-- PostgREST's connection role
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit password 'postgres';
  else
    alter role authenticator login password 'postgres';
  end if;
end $$;

grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- Password sign-in
--
-- Mirrors what GoTrue does: compare the presented password against the bcrypt
-- hash in auth.users, and return the claims the API server will sign.
-- ------------------------------------------------------------
create or replace function dev.sign_in(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare u record;
begin
  select id, email, encrypted_password, raw_user_meta_data
    into u
  from auth.users
  where lower(email) = lower(trim(p_email));

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid login credentials');
  end if;

  if u.encrypted_password is null
     or u.encrypted_password <> crypt(p_password, u.encrypted_password) then
    return jsonb_build_object('ok', false, 'error', 'Invalid login credentials');
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', u.id,
    'email', u.email,
    'user_metadata', coalesce(u.raw_user_meta_data, '{}'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------
-- Sign-up
--
-- Inserting into auth.users fires private.handle_new_user(), so the profile,
-- private row, preference row and role-specific profile all appear exactly as
-- they would on the hosted project.
-- ------------------------------------------------------------
create or replace function dev.sign_up(p_email text, p_password text, p_metadata jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_id uuid;
begin
  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    return jsonb_build_object('ok', false, 'error', 'User already registered');
  end if;
  if length(coalesce(p_password, '')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Password should be at least 8 characters');
  end if;

  insert into auth.users (email, encrypted_password, raw_user_meta_data)
  values (lower(trim(p_email)), crypt(p_password, gen_salt('bf')), coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'email', lower(trim(p_email)),
    'user_metadata', coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function dev.set_password(p_user uuid, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  update auth.users
  set encrypted_password = crypt(p_password, gen_salt('bf'))
  where id = p_user;
  return jsonb_build_object('ok', found);
end;
$$;

create or replace function dev.get_user(p_user uuid)
returns jsonb
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  select jsonb_build_object(
    'id', id, 'email', email,
    'user_metadata', coalesce(raw_user_meta_data, '{}'::jsonb),
    'created_at', created_at)
  from auth.users where id = p_user;
$$;

revoke all on schema dev from anon, authenticated;
