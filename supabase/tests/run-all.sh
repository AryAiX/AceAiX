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
# Homebrew/macOS Postgres 16 refuses to start if the process is multithreaded
# during startup; a UTF-8 locale keeps libc from pulling in extra threads.
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
export LANG="${LANG:-en_US.UTF-8}"
RUNTIME_DIR="${RUNTIME_DIR:-${ACEAIX_PG_RUNTIME:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/aceaix-pgtest}}"
export RUNTIME_DIR
RUNTIME="$RUNTIME_DIR"
export PGHOST="${PGHOST:-$RUNTIME/run}"
export PGPORT="${PGPORT:-5433}"
export PGUSER="${PGUSER:-postgres}"
DB="${1:-aceaix_test}"

if ! pg_isready -q 2>/dev/null; then
  echo "→ starting a disposable PostgreSQL cluster"
  DATA="$RUNTIME/data"
  rm -rf "$DATA"
  mkdir -p "$DATA" "$PGHOST"
  rm -f "$PGHOST/.s.PGSQL.$PGPORT" "$PGHOST/.s.PGSQL.$PGPORT.lock"
  initdb -D "$DATA" -A trust -U postgres >/dev/null
  pg_ctl -D "$DATA" -o "-k $PGHOST -p $PGPORT -c listen_addresses=" -l "$RUNTIME/pg.log" start >/dev/null
  sleep 2
fi

"$ROOT/supabase/tests/run-migrations.sh" "$DB"

echo "→ running functional tests"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$ROOT/supabase/tests/functional.sql" 2>&1 \
  | sed -e 's/^psql:[^ ]* //' -e 's/^NOTICE:  //'
