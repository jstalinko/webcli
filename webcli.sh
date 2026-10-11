#!/usr/bin/env bash
# ==============================================================================
# WEBCLI - Account & System Management CLI
# Cloud Development Environment & Terminal
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ]; then
  echo "[WEBCLI] Installing dependencies first..."
  npm install
fi

exec npx tsx "$SCRIPT_DIR/server/src/cli.ts" "$@"
