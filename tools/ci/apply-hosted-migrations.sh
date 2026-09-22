#!/usr/bin/env bash
# Apply repository migrations that are not yet recorded on a hosted Supabase
# project, using the Management API rather than a direct Postgres connection.
#
# Required:
#   SUPABASE_ACCESS_TOKEN  personal access token (sbp_...) with access to the ref
#   SUPABASE_PROJECT_REF   target project ref, e.g. qrunflotvjygllgvdcvy
#
# Optional:
#   APPLY_MIGRATIONS=false  skip (the deploy job should not use this)
#
# The Management API is used deliberately: the pooled Postgres host is not
# reachable from every CI runner, and it needs the database password as a
# separate secret. A single access token covers both environments and is what
# the Supabase CLI itself authenticates with.
#
# This does not dump or copy another environment. It applies only the SQL files
# under supabase/migrations whose version is missing from
# supabase_migrations.schema_migrations, oldest first.
set -euo pipefail

if [ "${APPLY_MIGRATIONS:-true}" = "false" ]; then
  echo "APPLY_MIGRATIONS=false; skipping hosted migrations"
  exit 0
fi

missing=()
[ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && missing+=("SUPABASE_ACCESS_TOKEN")
[ -z "${SUPABASE_PROJECT_REF:-}" ] && missing+=("SUPABASE_PROJECT_REF")
if [ "${#missing[@]}" -gt 0 ]; then
  echo "::error::Missing for hosted migrations: ${missing[*]}" >&2
  echo "Add them as GitHub Environment secrets/variables (development and production)." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
API="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Send SQL as a JSON body. Python does the encoding so that dollar-quoted
# bodies, newlines and quotes inside a migration survive intact.
run_sql() {
  local mode="$1" payload="$2"
  if [ "$mode" = "file" ]; then
    python3 -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1]).read()}))' \
      "$payload" > "$work/body.json"
  else
    python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1]}))' \
      "$payload" > "$work/body.json"
  fi

  local code
  code="$(curl -sS -o "$work/resp.json" -w '%{http_code}' -X POST \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary @"$work/body.json" "$API")"

  if [ "$code" != "200" ] && [ "$code" != "201" ]; then
    echo "::error::Management API returned HTTP $code" >&2
    cat "$work/resp.json" >&2
    echo >&2
    return 1
  fi
}

echo "→ checking migration history on ${SUPABASE_PROJECT_REF}"
run_sql sql "select version from supabase_migrations.schema_migrations;"
python3 -c '
import json, sys
rows = json.load(open(sys.argv[1]))
print("\n".join(r["version"] for r in rows))
' "$work/resp.json" | sed '/^$/d' | sort > "$work/applied"

echo "   ${SUPABASE_PROJECT_REF} has $(wc -l < "$work/applied" | tr -d ' ') recorded migration(s)"

pending=0
for f in "$MIGRATIONS"/*.sql; do
  [ -e "$f" ] || continue
  name="$(basename "$f")"
  version="${name%%_*}"

  if grep -Fxq "$version" "$work/applied"; then
    continue
  fi

  pending=$((pending + 1))
  echo "→ applying $name"
  run_sql file "$f"

  # Match the hosted CLI table shape: version + name, other columns null.
  label="${name#"${version}"_}"
  label="${label%.sql}"
  esc_version="${version//\'/\'\'}"
  esc_label="${label//\'/\'\'}"
  run_sql sql "insert into supabase_migrations.schema_migrations (version, name)
    values ('$esc_version', '$esc_label') on conflict do nothing;"
  echo "   ok   $name"
done

if [ "$pending" -eq 0 ]; then
  echo "✓ ${SUPABASE_PROJECT_REF} already has every repository migration"
else
  echo "✓ applied $pending migration(s) to ${SUPABASE_PROJECT_REF}"
fi
