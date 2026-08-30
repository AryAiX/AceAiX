#!/usr/bin/env bash
# Cloud Agent environment install phase.
#
# Durable, idempotent setup that runs after the repo is checked out. Installs
# system tooling (Docker + fuse-overlayfs + Supabase CLI), configures the Docker
# daemon for nested VMs, installs JS dependencies for both apps, writes local
# .env files, and pre-pulls the Supabase container images so the first boot is
# fast. Per-boot services are started in start.sh, not here.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Well-known Supabase local demo keys (identical for every local instance; not secret).
LOCAL_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

echo "==> Installing system packages (docker.io, fuse-overlayfs)"
if ! command -v docker >/dev/null 2>&1 || ! command -v fuse-overlayfs >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold \
    docker.io fuse-overlayfs
fi

echo "==> Configuring Docker daemon (classic engine + fuse-overlayfs for nested VMs)"
sudo mkdir -p /etc/docker
printf '%s\n' '{ "features": { "containerd-snapshotter": false }, "storage-driver": "fuse-overlayfs" }' \
  | sudo tee /etc/docker/daemon.json >/dev/null

echo "==> Installing Supabase CLI"
if ! command -v supabase >/dev/null 2>&1; then
  VER="$(curl -fsSL https://api.github.com/repos/supabase/cli/releases/latest \
    | grep -oP '"tag_name":\s*"\K[^"]+' | sed 's/^v//')"
  curl -fsSL -o /tmp/supabase.deb \
    "https://github.com/supabase/cli/releases/download/v${VER}/supabase_${VER}_linux_amd64.deb"
  sudo dpkg -i /tmp/supabase.deb
fi

echo "==> Installing web dependencies"
( cd web && npm install --no-audit --no-fund )

echo "==> Installing mobile dependencies"
( cd mobile && npm install --no-audit --no-fund )

echo "==> Installing Playwright browser (chromium) for web e2e"
( cd web && npx --yes playwright install --with-deps chromium ) || \
  echo "WARN: playwright browser install failed (e2e tests may need it later)"

echo "==> Writing local .env files"
if [ ! -f web/.env ]; then
  cat > web/.env <<EOF
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=${LOCAL_ANON_KEY}
EOF
fi
if [ ! -f mobile/.env ]; then
  cat > mobile/.env <<EOF
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=${LOCAL_ANON_KEY}
EOF
fi

echo "==> Pre-pulling Supabase container images (best-effort, speeds up first boot)"
if command -v dockerd >/dev/null 2>&1; then
  if ! docker info >/dev/null 2>&1; then
    sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 net.bridge.bridge-nf-call-ip6tables=0 >/dev/null 2>&1 || true
    sudo nohup dockerd >/tmp/dockerd-install.log 2>&1 &
    for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
  fi
  if docker info >/dev/null 2>&1; then
    ( supabase start && supabase stop ) >/tmp/supabase-prepull.log 2>&1 \
      || echo "WARN: supabase image pre-pull did not complete; images will pull on first boot"
  fi
fi

echo "==> install.sh complete"
