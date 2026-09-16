#!/usr/bin/env bash
# Bring up a complete local AceAiX backend: PostgreSQL + every migration +
# demo data + PostgREST + the local auth/storage server.
#
#   ./tools/local-supabase/start.sh
#
# Prints the URL and anon key to put in mobile/.env.
#
# Requirements: postgresql-16, postgresql-16-pgvector, and a `postgrest`
# binary on PATH (or at $POSTGREST).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
POSTGREST="${POSTGREST:-postgrest}"
export PATH="$PGBIN:$PATH"

export PGHOST="${PGHOST:-/var/lib/pgtest/run}"
export PGPORT="${PGPORT:-5433}"
export PGUSER="${PGUSER:-postgres}"
DB="${DB:-aceaix_local}"
API_PORT="${API_PORT:-8790}"
PGRST_PORT="${PGRST_PORT:-3010}"
JWT_SECRET="${JWT_SECRET:-aceaix-local-development-jwt-secret-not-for-production}"

RUNTIME="${RUNTIME:-/var/lib/pgtest}"

# The cluster lives under /var/lib and belongs to the postgres user, so setting
# it up needs root. In a container the invoking user often IS root and sudo may
# not exist; on a laptop or a CI runner it is the other way round. Same reasoning
# as supabase/tests/run-all.sh, and for the same reason: assuming one of them
# works everywhere it was tried and fails where it was not.
if [ "$(id -u)" -eq 0 ]; then
  as_root()     { "$@"; }
  as_postgres() { su postgres -c "$1"; }
elif command -v sudo >/dev/null 2>&1; then
  as_root()     { sudo "$@"; }
  as_postgres() { sudo -u postgres bash -c "$1"; }
else
  echo "start.sh needs to create $RUNTIME and run initdb as the postgres user," >&2
  echo "which requires root. Re-run as root, or install sudo." >&2
  exit 1
fi

# Two owners under one directory, and both matter:
#   $RUNTIME/data and the socket directory belong to the postgres user, because
#   that is who initdb and the server run as;
#   $RUNTIME itself belongs to whoever ran this, because the PostgREST config
#   and the logs are written by them, not by postgres.
# Handing the whole tree to postgres — which is what this used to do — makes
# the second impossible, and it surfaces as "Permission denied" on a config
# file several steps later, nowhere near the chown that caused it.
as_root mkdir -p "$RUNTIME"
as_root chown "$(id -u):$(id -g)" "$RUNTIME"
as_root chmod 755 "$RUNTIME"

# ---- database ----------------------------------------------------------------
if ! pg_isready -q 2>/dev/null; then
  echo "→ starting PostgreSQL"
  as_root rm -rf "$RUNTIME/data"
  as_root mkdir -p "$RUNTIME/data" "$PGHOST"
  as_root chown -R postgres:postgres "$RUNTIME/data" "$PGHOST"
  # The caller is not postgres, so the socket directory has to be traversable
  # by them or nothing can connect to it.
  as_root chmod 755 "$PGHOST"
  # pg_ctl writes this log as postgres, into a directory the caller owns, so
  # the file has to exist with the right owner before the server starts. The
  # alternative — putting the log inside data/ — hides it somewhere nobody
  # looks when the server fails to come up, which is exactly when it is read.
  as_root touch "$RUNTIME/pg.log"
  as_root chown postgres:postgres "$RUNTIME/pg.log"
  as_postgres "PATH=$PGBIN:\$PATH initdb -D $RUNTIME/data -A trust -U postgres" >/dev/null
  as_postgres "PATH=$PGBIN:\$PATH pg_ctl -D $RUNTIME/data -o '-k $PGHOST -p $PGPORT -c listen_addresses= -c wal_level=logical' -l $RUNTIME/pg.log start" >/dev/null
  sleep 2
fi

"$ROOT/supabase/tests/run-migrations.sh" "$DB"

echo "→ applying the development harness"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$ROOT/tools/local-supabase/harness.sql" >/dev/null

echo "→ seeding demo data"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$ROOT/supabase/seeds/demo.sql" | tail -n 12

# ---- PostgREST ---------------------------------------------------------------
cat > "$RUNTIME/postgrest.conf" <<EOF
db-uri = "postgres://authenticator:postgres@localhost/${DB}?host=${PGHOST}&port=${PGPORT}"
db-schemas = "public"
db-anon-role = "anon"
db-pool = 10
jwt-secret = "${JWT_SECRET}"
jwt-role-claim-key = ".role"
server-host = "127.0.0.1"
server-port = ${PGRST_PORT}
EOF

pkill -f "postgrest $RUNTIME/postgrest.conf" 2>/dev/null || true
"$POSTGREST" "$RUNTIME/postgrest.conf" > "$RUNTIME/postgrest.log" 2>&1 &
echo "→ PostgREST on :${PGRST_PORT}"

# ---- API server --------------------------------------------------------------
pkill -f "local-supabase/server.mjs" 2>/dev/null || true
PORT="$API_PORT" \
PGRST_URL="http://127.0.0.1:${PGRST_PORT}" \
JWT_SECRET="$JWT_SECRET" \
PGDATABASE="$DB" PGHOST="$PGHOST" PGPORT="$PGPORT" PGUSER="$PGUSER" PSQL="$PGBIN/psql" \
  node "$ROOT/tools/local-supabase/server.mjs" > "$RUNTIME/api.log" 2>&1 &

# Wait for BOTH, not just the API.
#
# /health on the API answers `ok` without touching PostgREST — it is a liveness
# check on one Node process. PostgREST takes noticeably longer, because on boot
# it reads the whole schema to build its cache, and this schema is 72 tables.
#
# So waiting only on /health returns while PostgREST is still starting, and
# whatever runs next gets a 502. On a laptop the gap closes before anybody
# types the next command; in CI the next step begins immediately, which is why
# `test:contract` failed there and passed everywhere else.
ready=""
for _ in $(seq 1 60); do
  sleep 0.5
  curl -fsS "http://localhost:${API_PORT}/health" >/dev/null 2>&1 || continue
  # Through the API, so this proves the path the client actually uses.
  curl -fsS "http://localhost:${API_PORT}/rest/v1/" >/dev/null 2>&1 || continue
  ready=yes; break
done
if [ -z "$ready" ]; then
  echo "The stack did not come up within 30s." >&2
  echo "  api:       $RUNTIME/api.log" >&2
  echo "  postgrest: $RUNTIME/postgrest.log" >&2
  tail -20 "$RUNTIME/postgrest.log" >&2 2>/dev/null || true
  exit 1
fi

ANON=$(curl -fsS "http://localhost:${API_PORT}/health" | sed 's/.*"anonKey":"\([^"]*\)".*/\1/')

cat <<EOF

  Local AceAiX backend is up.

    EXPO_PUBLIC_SUPABASE_URL=http://localhost:${API_PORT}
    EXPO_PUBLIC_SUPABASE_ANON_KEY=${ANON}

  Every demo account uses the password  AceAiX-Demo-2026
  One per role, so every role can be signed into rather than reasoned about:

    athlete, 19, full profile   layla.demo@aceaix.com     (the review account)
    athlete, 17, consented      omar.demo@aceaix.com
    athlete, 15, consented      yusuf.demo@aceaix.com
    athlete, 14, NO consent     mina.demo@aceaix.com      (hidden from discovery)
    athlete, 22                 sara.demo@aceaix.com
    athlete, 24                 daniel.demo@aceaix.com
    coach, verified             marco.demo@aceaix.com     (the recruiter view)
    coach, unverified           hana.demo@aceaix.com
    club, verified              academy.demo@aceaix.com
    guardian                    parent.demo@aceaix.com    (Mina's request is here)
    scout, verified             nadia.demo@aceaix.com
    federation                  federation.demo@aceaix.com
    medical partner             amin.demo@aceaix.com

  The three minors cannot reach Play — meetups are eighteen-plus, and the
  database is what says so, not the tab bar.

  Logs: $RUNTIME/postgrest.log  ·  $RUNTIME/api.log
EOF
