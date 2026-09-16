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
PGDIR="${PGDIR:-/var/lib/pgtest}"
export PGHOST="${PGHOST:-$PGDIR/run}"
export PGPORT="${PGPORT:-5433}"
export PGUSER="${PGUSER:-postgres}"
DB="${1:-aceaix_test}"

# Starting the cluster needs root: it creates a directory under /var/lib,
# hands it to the postgres user, and runs initdb as that user.
#
# Who "root" is depends on where this runs. In a container the invoking user
# often IS root and sudo may not be installed. On a laptop or a CI runner it is
# not root but can sudo. The script used to assume the first, which is why it
# passed everywhere it was tried and failed on CI with nothing but two lines of
# "Permission denied" — no hint that privilege was the missing piece.
if [ "$(id -u)" -eq 0 ]; then
  as_root()     { "$@"; }
  as_postgres() { su postgres -c "$1"; }
elif command -v sudo >/dev/null 2>&1; then
  as_root()     { sudo "$@"; }
  as_postgres() { sudo -u postgres bash -c "$1"; }
else
  echo "run-all.sh needs to create $PGDIR and run initdb as the postgres user," >&2
  echo "which requires root. Re-run as root, or install sudo." >&2
  exit 1
fi

if ! pg_isready -q 2>/dev/null; then
  echo "→ starting a disposable PostgreSQL cluster"
  DATA="$PGDIR/data"
  as_root rm -rf "$PGDIR"
  as_root mkdir -p "$DATA" "$PGHOST"
  # postgres owns the data and the socket; the caller owns the directory around
  # them, because logs and config written later belong to the caller. Handing
  # the whole tree to postgres is what broke `start.sh` when it ran next.
  as_root chown -R postgres:postgres "$PGDIR/data" "$PGHOST"
  as_root chown "$(id -u):$(id -g)" "$PGDIR"
  as_root chmod 755 "$PGDIR" "$PGHOST"
  # pg_ctl writes this log as postgres, into a directory the caller owns, so
  # the file has to exist with the right owner before the server starts. The
  # alternative — putting the log inside data/ — hides it somewhere nobody
  # looks when the server fails to come up, which is exactly when it is read.
  as_root touch "$PGDIR/pg.log"
  as_root chown postgres:postgres "$PGDIR/pg.log"
  as_postgres "PATH=$PGBIN:\$PATH initdb -D $DATA -A trust -U postgres" >/dev/null
  as_postgres "PATH=$PGBIN:\$PATH pg_ctl -D $DATA -o '-k $PGHOST -p $PGPORT -c listen_addresses=' -l $PGDIR/pg.log start" >/dev/null
  sleep 2
fi

"$ROOT/supabase/tests/run-migrations.sh" "$DB"

echo "→ running functional tests"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$ROOT/supabase/tests/functional.sql" 2>&1 \
  | sed -e 's/^psql:[^ ]* //' -e 's/^NOTICE:  //'
