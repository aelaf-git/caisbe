#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="$ROOT_DIR/.venv/bin/python3"

if [[ ! -x "$PYTHON" ]]; then
  echo "Virtual environment not found. Run: ./scripts/setup-venv.sh"
  exit 1
fi

cd "$ROOT_DIR"
exec "$PYTHON" manage.py runserver "$@"
