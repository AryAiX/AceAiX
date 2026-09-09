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

RUNTIME=/var/lib/pgtest
mkdir -p "$RUNTIME"

# ---- database ----------------------------------------------------------------
if ! pg_isready -q 2>/dev/null; then
  echo "→ starting PostgreSQL"
  rm -rf "$RUNTIME/data"
  mkdir -p "$RUNTIME/data" "$PGHOST"
  chown -R postgres:postgres "$RUNTIME"
  su postgres -c "PATH=$PGBIN:\$PATH initdb -D $RUNTIME/data -A trust -U postgres" >/dev/null
  su postgres -c "PATH=$PGBIN:\$PATH pg_ctl -D $RUNTIME/data -o '-k $PGHOST -p $PGPORT -c listen_addresses= -c wal_level=logical' -l $RUNTIME/pg.log start" >/dev/null
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

for _ in $(seq 1 30); do
  sleep 0.5
  if curl -fsS "http://localhost:${API_PORT}/health" >/dev/null 2>&1; then break; fi
done

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
