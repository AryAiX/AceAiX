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
-- ------------------------------------------------------------
-- What could NOT simply be revoked, and why
--
-- Nine of these helpers are named inside RLS policy expressions:
--
--   is_admin  owns_athlete  owns_watchlist  owns_ai_session
--   owns_medical_partner  has_medical_consent  in_conversation
--   is_org_member  is_verified_partner
--
-- A policy expression runs as the *querying* user, not as the table owner, so
-- revoking EXECUTE on those does not lock an attacker out — it locks every
-- legitimate reader out. `select * from applications` starts answering
-- "permission denied for function is_admin", which is exactly what happened on
-- the first attempt at this migration: saved opportunities, my applications and
-- the score history all began returning 403 to their own owner.
--
-- So the rule is not "nothing in private is callable". It is:
--
--   * the read-only predicates that RLS depends on stay callable. Every one is
--     STABLE, SECURITY DEFINER, and answers a question about `auth.uid()` — it
--     tells the caller something about themselves, which they already know.
--     Four of them sit in policies with no role restriction, so a signed-out
--     visitor reading `opportunities` evaluates them too and needs them as
--     well; for `anon` they all answer false, because `auth.uid()` is null.
--
--   * everything else — every helper that writes, notifies, awards, recomputes
--     or promotes — is not callable by a client at all.
--
-- Two functions had to change shape first, both of them calling `private.*`
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
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

/* And the next helper somebody adds, without having to remember this file. */
alter default privileges in schema private
  revoke execute on functions from public;

-- ------------------------------------------------------------
-- The exceptions: the predicates RLS asks the caller to evaluate
--
-- Listed one per line rather than looped, so that adding a tenth is a visible
-- decision in a diff and not a side effect of a pattern match.
-- ------------------------------------------------------------
grant usage on schema private to authenticated, anon;

grant execute on function private.is_admin()                   to authenticated, anon;
grant execute on function private.owns_athlete(uuid)           to authenticated, anon;
grant execute on function private.owns_medical_partner(uuid)   to authenticated, anon;
grant execute on function private.has_medical_consent(uuid)    to authenticated, anon;

/* These five appear only in policies restricted to signed-in roles. */
grant execute on function private.owns_watchlist(uuid)         to authenticated;
grant execute on function private.owns_ai_session(uuid)        to authenticated;
grant execute on function private.in_conversation(uuid)        to authenticated;
grant execute on function private.is_org_member(uuid, text[])  to authenticated;
grant execute on function private.is_verified_partner()        to authenticated;

/*
 * `service_role` keeps everything: server-side jobs and the edge functions run
 * as it, and some of them do need to call the mutators directly.
 */
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;
