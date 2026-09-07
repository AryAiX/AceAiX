-- ============================================================
-- 0907/06 — Close the private schema
--
-- `0001_init_extensions_enums.sql` creates the schema with the comment
-- "NOT exposed via Data API" and then, on the next line, grants USAGE on it to
-- `anon` and `authenticated`. PostgreSQL also grants EXECUTE on every new
-- function to PUBLIC by default, so sixty-two of the sixty-nine helpers in
-- there — `private.notify`, `private.award`, `private.refresh_talent_score`
-- among them — were callable by any signed-in account.
--
-- Nothing exploited it, because PostgREST is configured with
-- `db-schemas = "public"` and will not route to another schema. But that is one
-- line of server configuration standing between a teenager's account and a
-- function that forges notifications or awards achievements, and configuration
-- is not where this rule belongs. The grant is the bug; the whitelist was only
-- hiding it.
--
-- Two functions had to change shape first, both of them called `private.*`
-- with the caller's own privileges rather than the definer's:
--
--   * `public.promote_user_to_admin` — already refuses anyone who is not a
--     super admin, and already refuses self-promotion. Running as definer
--     changes nothing about who may call it, only whose privileges resolve
--     `private.is_super_admin`.
--
--   * `private.sync_post_counters` — the one counter trigger that was not
--     already SECURITY DEFINER, unlike every one of its siblings.
-- ============================================================

alter function public.promote_user_to_admin(uuid) security definer;
alter function public.promote_user_to_admin(uuid) set search_path = public, pg_temp;

alter function private.sync_post_counters() security definer;

-- ------------------------------------------------------------
-- The lock
-- ------------------------------------------------------------
revoke usage on schema private from anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

/* And the next helper somebody adds, without having to remember this file. */
alter default privileges in schema private
  revoke execute on functions from public;

/*
 * `service_role` keeps its access: server-side jobs and the edge functions run
 * as it, and some of them do need to call these directly.
 */
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;
