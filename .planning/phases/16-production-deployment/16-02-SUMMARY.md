---
phase: 16-production-deployment
plan: 02
subsystem: infrastructure
tags: [docker, auth, production, deployment]
dependency_graph:
  requires: [backend/Dockerfile, nginx/nginx.conf, Phase 15 containerization]
  provides: [docker-compose.prod.yml, Phase A auth bypass, complete env template]
  affects: [auth/auth.controller.ts, config/configuration.ts, deployment workflow]
tech_stack:
  added: [docker-compose production orchestration]
  patterns: [env-var-driven auth bypass, FORCE_HTTPS_COOKIES for cookie security]
key_files:
  created:
    - docker-compose.prod.yml
  modified:
    - backend/src/auth/auth.controller.ts
    - backend/src/auth/auth.controller.spec.ts
    - backend/src/config/configuration.ts
    - backend/.env.production.example
decisions:
  - "ALLOW_DEV_LOGIN env var for Phase A dev login bypass (easy to remove for Phase B)"
  - "FORCE_HTTPS_COOKIES env var decouples cookie security from NODE_ENV (supports HTTP-only Phase A)"
  - "WEWORK vars conditional on ALLOW_DEV_LOGIN in config validation (avoids startup crash without OAuth)"
  - "Memory budget: NestJS 768M + Redis 192M + Nginx 64M = 1024M (fits 4GB server)"
  - "MySQL excluded from compose (CDB is external service)"
metrics:
  duration: 6min
  completed: 2026-04-04
  tasks: 2
  files: 5
---

# Phase 16 Plan 02: Production Docker Compose + Phase A Auth Summary

Production compose orchestration with ALLOW_DEV_LOGIN bypass, FORCE_HTTPS_COOKIES env-driven cookie security, and complete env template for Phase A deployment (HTTP + IP, no domain/SSL)

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Phase A authentication fixes | 662dde1, b71a009 | TDD: devLogin ALLOW_DEV_LOGIN bypass, getCookieOptions FORCE_HTTPS_COOKIES, config validation conditional WEWORK vars |
| 2 | docker-compose.prod.yml + env template | 0755c4c | Production compose (NestJS+Redis+Nginx), complete .env.production.example with all vars |

## Implementation Details

### Task 1: Phase A Authentication Fixes (TDD)

**Problem:** Three blockers for Phase A (HTTP + IP) deployment:
1. `devLogin` only works when NODE_ENV=development -- blocks production login without WeChat Work
2. `getCookieOptions` sets `secure: true` in production -- browsers reject cookies over HTTP
3. Config validation requires WEWORK_* vars -- container crashes on startup without OAuth config

**Solution:**
- `ALLOW_DEV_LOGIN=true` env var bypasses NODE_ENV check in devLogin method
- `FORCE_HTTPS_COOKIES=true` env var controls cookie secure flag (defaults to false)
- Config validation skips WEWORK_* vars when `ALLOW_DEV_LOGIN=true`

**Tests:** 17 tests total (14 existing updated + 3 new), all passing. TDD RED-GREEN cycle followed.

### Task 2: docker-compose.prod.yml + Env Template

**docker-compose.prod.yml:**
- NestJS: builds from `./backend/Dockerfile`, 768M memory, health check on `/health`, 30s start period
- Redis: `redis:7-alpine`, 128mb maxmemory with allkeys-lru, 192M container limit, persistent volume
- Nginx: `nginx:1.27-alpine`, port 80 only (no 443), mounts `frontend/dist` + nginx config, 64M limit
- No MySQL (external CDB), no monitoring (separate `docker-compose.monitoring.yml`)

**Memory budget:** 768 + 192 + 64 = 1024M for business stack, leaving ~3GB for OS + monitoring on 4GB server

**.env.production.example additions:**
- `STORAGE_MODE`, `UPLOAD_DIR`, `BASE_URL` -- storage configuration
- `LOKI_HOST`, `SENTRY_DSN`, `SLOW_QUERY_THRESHOLD_MS` -- monitoring
- `BOSS_WEWORK_IDS` -- admin role
- `ALLOW_DEV_LOGIN=true` -- Phase A dev login
- `FORCE_HTTPS_COOKIES` (commented out) -- Phase B HTTPS cookies
- `GRAFANA_ADMIN_PASSWORD` -- monitoring dashboard

## Verification Results

| Check | Status |
|-------|--------|
| Backend build | PASS |
| Backend tests (923/923) | PASS |
| Backend lint (0 errors) | PASS |
| TypeScript strict (tsc --noEmit) | PASS |
| docker-compose.prod.yml structure | PASS (17/17 acceptance checks) |
| .env.production.example completeness | PASS (9/9 acceptance checks) |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all functionality is fully wired.
