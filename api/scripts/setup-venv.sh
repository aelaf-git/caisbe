#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON="$VENV_DIR/bin/python3"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but was not found."
  exit 1
fi

echo "Creating virtual environment at $VENV_DIR"
python3 -m venv "$VENV_DIR"
"$PYTHON" -m ensurepip --upgrade
"$PYTHON" -m pip install --upgrade pip wheel
"$PYTHON" -m pip install -r "$ROOT_DIR/requirements.txt"

echo
echo "Virtual environment is ready."
echo "Activate it with: source .venv/bin/activate"
echo "Or run commands directly with: .venv/bin/python3 manage.py runserver"
