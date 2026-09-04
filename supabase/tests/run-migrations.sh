#!/usr/bin/env bash
# Apply every migration, in order, to a throwaway PostgreSQL database.
#
#   ./supabase/tests/run-migrations.sh
#
# Requires a running PostgreSQL 16 with pgvector. Set PGHOST/PGPORT/PGUSER to
# point at it; the defaults match the local harness started by CI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"

export PGHOST="${PGHOST:-/var/lib/pgtest/run}"
export PGPORT="${PGPORT:-5433}"
export PGUSER="${PGUSER:-postgres}"
DB="${1:-aceaix_test}"

echo "→ recreating database $DB"
psql -q -d postgres -c "drop database if exists $DB;" >/dev/null
psql -q -d postgres -c "create database $DB;" >/dev/null

echo "→ applying Supabase shim"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/tests/_shim.sql" >/dev/null

echo "→ applying migrations"
fail=0
for f in $(ls "$MIGRATIONS"/*.sql | sort); do
  name="$(basename "$f")"
  if out=$(psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f" 2>&1); then
    printf '   ok   %s\n' "$name"
  else
    printf '   FAIL %s\n' "$name"
    echo "$out" | sed 's/^/        /'
    fail=1
    break
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "✗ migration run failed"
  exit 1
fi

echo "✓ all migrations applied to $DB"
