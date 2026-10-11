#!/usr/bin/env bash
# ==============================================================================
# WEBCLI - Account & System Management CLI
# Cloud Development Environment & Terminal
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f "$SCRIPT_DIR/dist/server/src/cli.js" ]; then
  exec node "$SCRIPT_DIR/dist/server/src/cli.js" "$@"
else
  if [ ! -d "node_modules" ]; then
    echo "[WEBCLI] Installing dependencies first..."
    npm install
  fi
  exec npx tsx "$SCRIPT_DIR/server/src/cli.ts" "$@"
fi
