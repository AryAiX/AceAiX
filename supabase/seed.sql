-- Local development seed helper.
--
-- Hosted Supabase projects grant the `service_role` full access to the `public`
-- schema as part of platform provisioning. The migrations in this repo therefore
-- only grant privileges to `anon`/`authenticated` explicitly and rely on that
-- baseline for `service_role`. A local `supabase start`/`db reset` does not apply
-- that baseline, so the admin/seed tooling (web/scripts/seed.mjs) hits
-- "permission denied for table ..." errors.
--
-- Re-grant the production-equivalent privileges so local dev matches hosted
-- behaviour. This runs after migrations on every `supabase db reset`.

grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
