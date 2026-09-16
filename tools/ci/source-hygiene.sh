#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "→ checking patch whitespace"
if [[ -n "${GITHUB_BASE_REF:-}" ]]; then
  git diff --check "origin/${GITHUB_BASE_REF}...HEAD"
elif [[ -n "${GITHUB_ACTIONS:-}" ]] && git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  git diff --check HEAD^ HEAD
else
  git diff --check
fi

echo "→ checking tracked sources and generated artifacts"
python3 <<'PY'
import pathlib
import re
import subprocess
import sys

root = pathlib.Path.cwd()
tracked = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
tracked = [name for name in tracked if name]
errors = []

binary_suffixes = {
    ".gif", ".ico", ".jpeg", ".jpg", ".mp4", ".otf", ".pdf", ".png", ".ttf",
    ".webp", ".woff", ".woff2",
}
generated_suffixes = {".aab", ".apk", ".ipa"}
secret_patterns = [
    (re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"), "private key"),
    (re.compile(rb"\bghp_[A-Za-z0-9]{30,}\b"), "GitHub token"),
    (re.compile(rb"\bgithub_pat_[A-Za-z0-9_]{40,}\b"), "GitHub token"),
    (re.compile(rb"\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b"), "JWT"),
]

for name in tracked:
    path = pathlib.Path(name)
    if not (root / path).exists():
        continue
    lower = name.lower()
    if path.suffix.lower() in generated_suffixes:
        errors.append(f"{name}: generated mobile build is tracked")
    if lower.endswith("/recordings.json"):
        errors.append(f"{name}: generated recording is tracked")
    if any(part in {"dist", "test-results", "playwright-report"} for part in path.parts):
        errors.append(f"{name}: generated output directory is tracked")
    if path.name == ".env" or (path.name.startswith(".env.") and path.name != ".env.example"):
        errors.append(f"{name}: environment file is tracked")

    data = (root / path).read_bytes()
    if b"\0" in data and path.suffix.lower() not in binary_suffixes:
        errors.append(f"{name}: unexpected NUL byte")
    if path.suffix.lower() in binary_suffixes:
        continue
    # Cursor's local bootstrap scripts contain fixed, explicitly synthetic
    # `iss=supabase-demo` fixture JWTs; they cannot authenticate to a project.
    if name in {".cursor/install.sh", ".cursor/start.sh"}:
        continue
    for pattern, label in secret_patterns:
        if pattern.search(data):
            errors.append(f"{name}: possible {label}")

if errors:
    print("\n".join(f"✗ {error}" for error in errors), file=sys.stderr)
    sys.exit(1)
print(f"✓ {len(tracked)} tracked paths checked")
PY

# A workflow that references an out-of-scope context is rejected whole by
# GitHub, so no job runs and no check is reported. CI cannot catch that itself;
# the run never starts. This check only has teeth before the push.
echo "→ checking workflow context scope"
python3 <<'PY'
import pathlib
import re
import sys

# Contexts that only exist once a step is running, so they cannot appear in
# any job-level key.
STEP_ONLY = ("runner", "steps", "env", "job")
JOB_LEVEL_KEYS = ("env", "runs-on", "concurrency", "services", "container", "timeout-minutes")

errors = []
for path in sorted(pathlib.Path(".github/workflows").glob("*.y*ml")):
    lines = path.read_text().splitlines()
    in_job_key = False
    for number, line in enumerate(lines, start=1):
        indent = len(line) - len(line.lstrip())
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        # Job-level keys sit at four spaces; steps sit deeper under `steps:`.
        if indent == 4:
            key = stripped.split(":", 1)[0]
            in_job_key = key in JOB_LEVEL_KEYS
        elif indent <= 2:
            in_job_key = False
        if not in_job_key:
            continue
        for context in re.findall(r"\$\{\{\s*([a-z]+)\.", line):
            if context in STEP_ONLY:
                errors.append(
                    f"{path}:{number}: job-level key uses the '{context}' context, "
                    "which GitHub rejects at parse time"
                )

if errors:
    print("\n".join(f"✗ {error}" for error in errors), file=sys.stderr)
    sys.exit(1)
print("✓ workflow contexts are in scope")
PY
