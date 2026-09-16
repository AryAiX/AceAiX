#!/usr/bin/env bash
# Prove that a database built from the archived V1 migration history can take
# every V2-only migration filename. Shared names keep the archived SQL.
# New names are applied in the same global filename order so files such as
# 20260825000000 slot in before later V1 objects that depend on them.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASELINE_REF="${BASELINE_REF:-v1-main-archive-2026-09-13}"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
export PATH="$PGBIN:$PATH"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
export LANG="${LANG:-en_US.UTF-8}"
RUNTIME_DIR="${RUNTIME_DIR:-${ACEAIX_PG_RUNTIME:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/aceaix-pgtest}}"
export RUNTIME_DIR
export PGHOST="${PGHOST:-$RUNTIME_DIR/run}"
export PGPORT="${PGPORT:-5433}"
export PGUSER="${PGUSER:-postgres}"
DB="${1:-aceaix_upgrade_test}"
ARCHIVE="$RUNTIME_DIR/v1-baseline"

git -C "$ROOT" rev-parse --verify "$BASELINE_REF^{commit}" >/dev/null

if ! pg_isready -q 2>/dev/null; then
  echo "→ starting a disposable PostgreSQL cluster"
  rm -rf "$RUNTIME_DIR/data"
  mkdir -p "$RUNTIME_DIR/data" "$PGHOST"
  rm -f "$PGHOST/.s.PGSQL.$PGPORT" "$PGHOST/.s.PGSQL.$PGPORT.lock"
  initdb -D "$RUNTIME_DIR/data" -A trust -U postgres >/dev/null
  pg_ctl -D "$RUNTIME_DIR/data" \
    -o "-k $PGHOST -p $PGPORT -c listen_addresses=" \
    -l "$RUNTIME_DIR/pg.log" start >/dev/null
  sleep 2
fi

psql -q -d postgres -c "drop database if exists $DB with (force);" >/dev/null
psql -q -d postgres -c "create database $DB;" >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/tests/_shim.sql" >/dev/null

rm -rf "$ARCHIVE"
mkdir -p "$ARCHIVE"
git -C "$ROOT" archive "$BASELINE_REF" supabase/migrations | tar -x -C "$ARCHIVE"

# Replay in global filename order. V2 added files whose timestamps sit *inside*
# the V1 sequence (notably 20260825000000). Applying every archived V1 file
# first, then the newcomers, reorders history and breaks objects that a later
# V1 file expects those newcomers to have created. Shared names keep the
# archived SQL so production's already-applied files are not rewritten.
echo "→ applying archived V1 plus V2-only files in filename order"
applied=0
while IFS= read -r name; do
  archived="$ARCHIVE/supabase/migrations/$name"
  if [[ -e "$archived" ]]; then
    source_file="$archived"
  else
    source_file="$ROOT/supabase/migrations/$name"
    applied=$((applied + 1))
    printf '   apply %s\n' "$name"
  fi
  psql -q -v ON_ERROR_STOP=1 --single-transaction -d "$DB" -f "$source_file" >/dev/null
done < <(
  { printf '%s\n' "$ARCHIVE"/supabase/migrations/*.sql
    printf '%s\n' "$ROOT"/supabase/migrations/*.sql
  } | xargs -n1 basename | sort -u
)

echo "✓ archived V1 upgraded with $applied V2 migration(s)"
