#!/bin/bash
# Borealis Fabrics -- Production Deployment Script
# Usage: ./deploy/deploy.sh [--skip-build] [--skip-migrate]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Parse flags
SKIP_BUILD=false
SKIP_MIGRATE=false
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

echo "=== Borealis Fabrics Deploy ==="
echo "Project dir: $PROJECT_DIR"
echo "Skip build:  $SKIP_BUILD"
echo "Skip migrate: $SKIP_MIGRATE"
echo ""

# 1. Pull latest code
echo "--- Step 1: Pull latest code ---"
git pull origin main
echo ""

# 2. Build frontend
if [ "$SKIP_BUILD" = false ]; then
  echo "--- Step 2: Build frontend ---"
  cd frontend
  pnpm install --frozen-lockfile
  pnpm build
  cd "$PROJECT_DIR"
  echo ""

  # 3. Build Docker images
  echo "--- Step 3: Build Docker images ---"
  docker compose -f docker-compose.prod.yml build --no-cache
  echo ""
fi

# 4. Stop old containers
echo "--- Step 4: Stop old containers ---"
docker compose -f docker-compose.prod.yml down
echo ""

# 5. Start new containers
echo "--- Step 5: Start new containers ---"
docker compose -f docker-compose.prod.yml up -d
echo ""

# 6. Run Prisma migrations
if [ "$SKIP_MIGRATE" = false ]; then
  echo "--- Step 6: Run database migrations ---"
  echo "Waiting for NestJS container to be ready..."
  sleep 5
  docker compose -f docker-compose.prod.yml exec nestjs npx prisma migrate deploy
  echo ""
fi

# 7. Health check
echo "--- Step 7: Health check ---"
sleep 5
MAX_RETRIES=10
RETRY=0
until curl -sf http://localhost/health > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "ERROR: Health check failed after $MAX_RETRIES retries"
    echo "Check logs: docker compose -f docker-compose.prod.yml logs nestjs"
    exit 1
  fi
  echo "Waiting for health check... ($RETRY/$MAX_RETRIES)"
  sleep 3
done

echo ""
echo "=== Deploy Complete ==="
echo "Health: $(curl -s http://localhost/health)"
echo ""
echo "Service status:"
docker compose -f docker-compose.prod.yml ps
