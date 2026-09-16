-- Lets the sign-up form check whether an email is already registered before
-- submitting, without exposing anything beyond a boolean. Supabase Auth
-- itself deliberately returns a fake success for a duplicate signup when
-- email confirmations are on, to prevent account enumeration — this
-- function reintroduces a narrow, explicit version of that check because
-- the product decision here is to prioritize clear signup feedback over
-- hiding registered emails.

create or replace function public.check_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(btrim(p_email))
  );
$$;

revoke all on function public.check_email_exists(text) from public;
grant execute on function public.check_email_exists(text) to anon, authenticated;