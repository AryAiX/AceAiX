#!/usr/bin/env bash
# Full database check: apply every migration to a throwaway database, then run
# the functional suite against it.
#
#   ./supabase/tests/run-all.sh
#
# Starts a disposable PostgreSQL 16 cluster if one is not already listening on
# $PGHOST/$PGPORT. Requires postgresql-16 and postgresql-16-pgvector.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
export PATH="$PGBIN:$PATH"
export PGHOST="${PGHOST:-/var/lib/pgtest/run}"
export PGPORT="${PGPORT:-5433}"
export PGUSER="${PGUSER:-postgres}"
DB="${1:-aceaix_test}"

if ! pg_isready -q 2>/dev/null; then
  echo "→ starting a disposable PostgreSQL cluster"
  DATA=/var/lib/pgtest/data
  rm -rf /var/lib/pgtest
  mkdir -p "$DATA" "$PGHOST"
  chown -R postgres:postgres /var/lib/pgtest
  su postgres -c "PATH=$PGBIN:\$PATH initdb -D $DATA -A trust -U postgres" >/dev/null
  su postgres -c "PATH=$PGBIN:\$PATH pg_ctl -D $DATA -o '-k $PGHOST -p $PGPORT -c listen_addresses=' -l /var/lib/pgtest/pg.log start" >/dev/null
  sleep 2
fi

"$ROOT/supabase/tests/run-migrations.sh" "$DB"

echo "→ running functional tests"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$ROOT/supabase/tests/functional.sql" 2>&1 \
  | sed -e 's/^psql:[^ ]* //' -e 's/^NOTICE:  //'
