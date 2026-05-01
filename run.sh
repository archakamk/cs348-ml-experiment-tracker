#!/usr/bin/env bash
# Start both the Flask backend and Vite frontend dev servers.
# Usage: bash run.sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Starting Flask backend on http://localhost:5001 ..."
cd "$ROOT_DIR/backend"
source "$ROOT_DIR/venv/bin/activate"
flask run --port 5001 &
BACKEND_PID=$!

echo "==> Starting Vite frontend on http://localhost:5173 ..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM

echo ""
echo "  Backend  → http://localhost:5001"
echo "  Frontend → http://localhost:5173"
echo "  Press Ctrl+C to stop both."
echo ""

wait
