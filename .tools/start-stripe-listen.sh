#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# Load secret key from gitignored env without echoing it
set -a
# shellcheck disable=SC1091
source <(grep -E '^STRIPE_SECRET_KEY=' api/.env | sed 's/^STRIPE_SECRET_KEY=/STRIPE_API_KEY=/')
set +a
: "${STRIPE_API_KEY:?STRIPE_SECRET_KEY missing in api/.env}"

LOG=/tmp/stripe-listen.log
PIDFILE=/tmp/stripe-listen.pid
if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "stripe listen already running pid=$(cat "$PIDFILE")"
  exit 0
fi

rm -f "$LOG"
nohup npx --yes @stripe/cli listen \
  --forward-to http://localhost:8000/api/webhooks/stripe \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed \
  >"$LOG" 2>&1 &
echo $! >"$PIDFILE"
echo "started pid=$(cat "$PIDFILE")"

for _ in $(seq 1 30); do
  if grep -q 'Ready!' "$LOG" 2>/dev/null; then
    break
  fi
  sleep 1
done

if ! grep -q 'Ready!' "$LOG" 2>/dev/null; then
  echo "stripe listen failed to become ready"
  tail -40 "$LOG" || true
  exit 1
fi

WHSEC="$(grep -oE 'whsec_[A-Za-z0-9]+' "$LOG" | head -1)"
if [[ -z "$WHSEC" ]]; then
  echo "could not parse webhook signing secret"
  exit 1
fi

python3 - "$WHSEC" <<'PY'
from pathlib import Path
import sys
whsec = sys.argv[1]
path = Path("api/.env")
out = []
seen = False
for line in path.read_text().splitlines():
    if line.startswith("STRIPE_WEBHOOK_SECRET="):
        out.append(f"STRIPE_WEBHOOK_SECRET={whsec}")
        seen = True
    else:
        out.append(line)
if not seen:
    out.append(f"STRIPE_WEBHOOK_SECRET={whsec}")
path.write_text("\n".join(out).rstrip() + "\n")
print("wrote STRIPE_WEBHOOK_SECRET")
PY

echo "stripe listen ready (forwarding to /api/webhooks/stripe)"
