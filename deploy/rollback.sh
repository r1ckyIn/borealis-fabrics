#!/bin/bash
# Borealis Fabrics -- Rollback to Previous Deployment
# Usage: ./deploy/rollback.sh [git-commit-sha]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

COMMIT=${1:-""}

echo "=== Borealis Fabrics Rollback ==="

if [ -z "$COMMIT" ]; then
  echo "No commit SHA provided. Rolling back to previous commit."
  COMMIT=$(git log --oneline -2 | tail -1 | awk '{print $1}')
fi

echo "Rolling back to: $COMMIT"
echo ""

# 1. Checkout specific commit
echo "--- Step 1: Checkout commit ---"
git checkout "$COMMIT"
echo ""

# 2. Rebuild frontend
echo "--- Step 2: Rebuild frontend ---"
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd "$PROJECT_DIR"
echo ""

# 3. Rebuild and restart containers
echo "--- Step 3: Rebuild Docker images ---"
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
echo ""

# 4. Health check
echo "--- Step 4: Health check ---"
sleep 10
if curl -sf http://localhost/health > /dev/null 2>&1; then
  echo "Rollback successful!"
  echo "Health: $(curl -s http://localhost/health)"
  echo ""
  echo "Service status:"
  docker compose -f docker-compose.prod.yml ps
else
  echo "WARNING: Health check failed after rollback."
  echo "Check logs:"
  docker compose -f docker-compose.prod.yml logs --tail=50 nestjs
fi
echo ""
echo "NOTE: You are now in detached HEAD state at $COMMIT."
echo "To return to latest: git checkout main"
