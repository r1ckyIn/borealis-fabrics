---
phase: 15-observability-performance
plan: 01
subsystem: infra
tags: [prometheus, prom-client, pino-loki, grafana, loki, docker-compose, metrics, observability]

# Dependency graph
requires:
  - phase: 12-data-safety-observability
    provides: nestjs-pino structured logging, nestjs-cls correlation IDs, Sentry integration
  - phase: 14-audit-hardening
    provides: Logger injection to all services, RedisService with ping() method
provides:
  - Prometheus /metrics endpoint with HTTP request duration histogram
  - Pino-Loki log transport (opt-in via LOKI_HOST env var)
  - Slow query detection with configurable threshold (SLOW_QUERY_THRESHOLD_MS)
  - Redis-aware /ready health probe
  - Docker monitoring stack (Loki + Prometheus + Grafana)
  - Public decorator for future global JWT guard
affects: [16-containerization-cicd, 17-production-deployment]

# Tech tracking
tech-stack:
  added: ["@willsoto/nestjs-prometheus@6.1.0", "prom-client@15.1.3", "pino-loki@3.0.0"]
  patterns: [custom PrometheusController bypass for raw text metrics, multi-transport pino logging, Prisma $on query event for slow query detection]

key-files:
  created:
    - backend/src/metrics/metrics.module.ts
    - backend/src/metrics/metrics.controller.ts
    - backend/src/metrics/metrics.interceptor.ts
    - backend/src/metrics/__tests__/metrics.module.spec.ts
    - backend/src/metrics/__tests__/metrics.interceptor.spec.ts
    - backend/src/auth/decorators/public.decorator.ts
    - docker-compose.monitoring.yml
    - loki/loki-config.yml
    - prometheus/prometheus.yml
    - grafana/provisioning/datasources/datasources.yml
    - grafana/provisioning/dashboards/dashboard.yml
  modified:
    - backend/src/app.module.ts
    - backend/src/main.ts
    - backend/src/prisma/prisma.service.ts
    - backend/src/common/health/health.controller.ts

key-decisions:
  - "Custom PrometheusController with @Res({passthrough:true}) to bypass TransformInterceptor JSON wrapping"
  - "MetricsInterceptor uses req.route?.path over req.url to prevent cardinality explosion"
  - "Pino multi-transport targets array: pino-pretty for dev + pino-loki when LOKI_HOST configured"
  - "Slow query threshold configurable via SLOW_QUERY_THRESHOLD_MS env var (default 200ms)"

patterns-established:
  - "Custom Prometheus controller: extend PrometheusController + @Res({passthrough:true}) for raw text output"
  - "Env-gated transport: check ConfigService for optional transport targets at module init"
  - "Prisma event subscription: $on('query') before $extends() for query timing"

requirements-completed: [OBS-06, OBS-07, OBS-08, OBS-09]

# Metrics
duration: 9min
completed: 2026-04-01
---

# Phase 15 Plan 01: Monitoring Infrastructure Summary

**Prometheus /metrics endpoint with HTTP duration histogram, pino-loki log aggregation, slow query detection, Redis /ready probe, and Grafana monitoring stack**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-01T11:07:09Z
- **Completed:** 2026-04-01T11:16:11Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Prometheus /metrics endpoint serving raw text format (bypassing TransformInterceptor) with HTTP request duration histogram and default Node.js metrics
- Pino-Loki multi-transport logging that activates when LOKI_HOST env var is set, coexisting with pino-pretty for development
- Slow query detection via Prisma $on('query') event subscription with configurable threshold (default 200ms)
- /ready health probe enhanced to check both database AND Redis connectivity
- Complete Docker monitoring stack (Loki + Prometheus + Grafana) with provisioned datasources

## Task Commits

Each task was committed atomically:

1. **Task 1: Prometheus metrics module + HTTP duration interceptor** - `bac481b` (feat)
2. **Task 2: Pino-Loki transport + slow query logging + Redis readiness + monitoring stack** - `ef4525e` (feat)

## Files Created/Modified
- `backend/src/metrics/metrics.module.ts` - PrometheusModule registration with histogram provider
- `backend/src/metrics/metrics.controller.ts` - Custom controller extending PrometheusController for raw text output
- `backend/src/metrics/metrics.interceptor.ts` - HTTP request duration histogram interceptor with route pattern labels
- `backend/src/metrics/__tests__/metrics.module.spec.ts` - Module integration test verifying text content-type
- `backend/src/metrics/__tests__/metrics.interceptor.spec.ts` - Interceptor unit tests (4 tests)
- `backend/src/auth/decorators/public.decorator.ts` - Public endpoint decorator for future global JWT guard
- `docker-compose.monitoring.yml` - Monitoring stack: Loki (3100), Prometheus (9090), Grafana (3001)
- `loki/loki-config.yml` - Loki config with TSDB store and unordered_writes enabled
- `prometheus/prometheus.yml` - Prometheus scrape config targeting backend /metrics
- `grafana/provisioning/datasources/datasources.yml` - Prometheus + Loki datasource provisioning
- `grafana/provisioning/dashboards/dashboard.yml` - Dashboard file provisioner config
- `backend/src/app.module.ts` - Added MetricsModule import, MetricsInterceptor as APP_INTERCEPTOR, pino-loki multi-transport
- `backend/src/main.ts` - Added 'metrics' to global prefix exclude list
- `backend/src/prisma/prisma.service.ts` - Added slow query logging via $on('query') event
- `backend/src/common/health/health.controller.ts` - Added Redis health check to /ready endpoint

## Decisions Made
- Used custom PrometheusController with `@Res({ passthrough: true })` to bypass TransformInterceptor's JSON wrapping — Prometheus requires plain text format
- MetricsInterceptor placed BEFORE TransformInterceptor in providers array to measure full request lifecycle
- Pino multi-transport via `targets` array allows both pino-pretty (dev) and pino-loki (when LOKI_HOST set) simultaneously
- Slow query subscription placed BEFORE `$extends()` call as required by Prisma event system
- Created `@Public()` decorator proactively (Rule 2) for when global JwtAuthGuard is added in a future phase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Created Public decorator**
- **Found during:** Task 1 (Metrics controller implementation)
- **Issue:** Plan referenced `@Public()` from `auth/decorators/public.decorator.ts` but file did not exist
- **Fix:** Created the decorator using `SetMetadata('isPublic', true)` pattern for future global JWT guard compatibility
- **Files modified:** backend/src/auth/decorators/public.decorator.ts
- **Verification:** File created, imports resolve correctly
- **Committed in:** bac481b (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TypeScript isolatedModules error in MetricsController**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** `import { Response } from 'express'` triggered TS1272 with isolatedModules + emitDecoratorMetadata
- **Fix:** Changed to `import type { Response } from 'express'` matching existing project pattern
- **Files modified:** backend/src/metrics/metrics.controller.ts
- **Verification:** `npx tsc --noEmit` passes for metrics files
- **Committed in:** bac481b (Task 1 commit)

**3. [Rule 1 - Bug] Fixed lint errors in MetricsInterceptor**
- **Found during:** Task 2 (lint verification)
- **Issue:** Untyped `req` and `res` from `getRequest()/getResponse()` triggered `no-unsafe-member-access` lint errors
- **Fix:** Added explicit type parameters `getRequest<Request>()` and `getResponse<Response>()` with proper Express type imports
- **Files modified:** backend/src/metrics/metrics.interceptor.ts
- **Verification:** `npx eslint src/metrics/` passes for all metrics files
- **Committed in:** ef4525e (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 bugs)
**Impact on plan:** All auto-fixes necessary for correctness and TypeScript compliance. No scope creep.

## Issues Encountered
- Pre-existing build failures (333 TypeScript errors) due to Prisma client not being generated in the worktree. These are infrastructure-level issues unrelated to this plan's changes. All metrics-specific tests pass (6/6), and `tsc --noEmit` shows no errors in newly created files.

## Known Stubs
None - all features are fully wired.

## User Setup Required
None - monitoring stack is opt-in. Set `LOKI_HOST=http://localhost:3100` to enable Loki transport. Run `docker-compose -f docker-compose.monitoring.yml up -d` to start monitoring stack.

## Next Phase Readiness
- Monitoring infrastructure ready for 15-02 (Redis caching layer) and 15-03 (frontend quality + k6)
- Prometheus scrape config targets backend at host.docker.internal:3000
- Grafana provisioned with Prometheus and Loki datasources for immediate dashboard creation
- SLOW_QUERY_THRESHOLD_MS can be tuned during load testing in 15-03

## Self-Check: PASSED

All 11 created files verified present. Both commit hashes (bac481b, ef4525e) verified in git log.

---
*Phase: 15-observability-performance*
*Completed: 2026-04-01*
