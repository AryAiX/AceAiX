#!/usr/bin/env bash
# Cloud Agent environment start phase (runs on every boot).
#
# Reconciles per-boot runtime state: kernel bridge settings needed for
# container-to-container networking in the nested VM, the Docker daemon, the
# local Supabase stack (which applies migrations + the service_role grant seed),
# and the idempotent demo data seed. Long-running dev servers live in the
# `terminals` config, not here. This script must be idempotent and must return.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Well-known Supabase local demo keys (identical for every local instance; not secret).
LOCAL_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

echo "==> Disabling bridge netfilter (container-to-container connectivity in nested VM)"
sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 net.bridge.bridge-nf-call-ip6tables=0 >/dev/null 2>&1 || true

echo "==> Ensuring Docker daemon is running"
if ! docker info >/dev/null 2>&1; then
  sudo nohup dockerd >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 1; done
fi
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon failed to start"; tail -n 40 /tmp/dockerd.log 2>/dev/null || true; exit 1; }

echo "==> Starting local Supabase stack (applies migrations + service_role grants)"
# `supabase start` blocks until the stack is healthy; it is a no-op if already up.
if ! supabase status >/dev/null 2>&1; then
  supabase start
fi

echo "==> Seeding demo data (idempotent)"
SB_URL="http://127.0.0.1:54321" SB_SVC="${LOCAL_SERVICE_ROLE_KEY}" \
  node web/scripts/seed.mjs || echo "WARN: demo seed did not complete cleanly"

echo "==> start.sh complete. Web dev server (5179) and Expo web (8081) run as terminals."
