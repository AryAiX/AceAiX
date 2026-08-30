-- The profile update RPC introduced split-name writes before the corresponding
-- columns were represented in the reproducible migration chain.
alter table public.user_profiles
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text;
