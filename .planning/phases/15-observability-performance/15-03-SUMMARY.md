---
phase: 15-observability-performance
plan: 03
subsystem: ui, testing
tags: [sentry, web-vitals, k6, structured-logging, observability]

requires:
  - phase: 12-sentry-audit-export
    provides: Sentry SDK integration (frontend + backend)
provides:
  - Structured logger utility replacing all console.error calls
  - Web Vitals (LCP, INP, CLS) reporting to Sentry
  - k6 load test scripts for auth, fabric CRUD, and order list
affects: [16-docker-containerization, 17-ci-cd-deploy, 18-production-deployment]

tech-stack:
  added: [web-vitals]
  patterns: [structured-logging-via-logger-utility, sentry-web-vitals-reporting]

key-files:
  created:
    - frontend/src/utils/logger.ts
    - frontend/src/utils/__tests__/logger.test.ts
    - tests/load/auth.k6.js
    - tests/load/fabric-crud.k6.js
    - tests/load/order-list.k6.js
    - tests/load/README.md
  modified:
    - frontend/src/instrument.ts
    - frontend/src/api/client.ts
    - frontend/src/store/enumStore.ts
    - frontend/src/components/common/ErrorBoundary.tsx
    - frontend/src/hooks/useFabricDetail.ts
    - frontend/src/hooks/useCustomerDetail.ts
    - frontend/src/hooks/useOrderItemsSection.ts

key-decisions:
  - "Used Sentry.setMeasurement for Web Vitals instead of Sentry.metrics.distribution (not available in Sentry SDK v10)"
  - "Logger evaluates isProduction and hasSentry at module load time for performance"

patterns-established:
  - "Structured logging: import { logger } from '@/utils/logger' — all error reporting goes through logger, never console.error"
  - "Web Vitals: onCLS/onINP/onLCP callbacks in instrument.ts report to Sentry via setMeasurement"

requirements-completed: [OBS-10, PERF-03, PERF-04]

duration: 14min
completed: 2026-04-01
---

# Phase 15 Plan 03: Frontend Logging + Web Vitals + Load Tests Summary

**Structured logger replacing 44 console.error calls across 25 files, Web Vitals reporting via web-vitals + Sentry, and k6 load test scripts for 3 API endpoints**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-01T11:06:32Z
- **Completed:** 2026-04-01T11:21:00Z
- **Tasks:** 2
- **Files modified:** 30

## Accomplishments
- Created logger.ts utility with Sentry.captureException (production) / console.error (development) routing
- Replaced all 44 console.error calls across 25 non-test frontend source files with structured logger
- Added Web Vitals (LCP, INP, CLS) reporting to Sentry via web-vitals package callbacks
- Created 3 k6 load test scripts (auth, fabric CRUD, order list) with documented baseline thresholds
- All 1039 frontend tests pass, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Structured logger + replace console.error + Web Vitals** - `c76ee74` (feat) - 30 files, TDD with 8 tests
2. **Task 2: k6 load test scripts** - `07b0f30` (feat) - 4 files created

## Files Created/Modified
- `frontend/src/utils/logger.ts` - Structured logging utility with Sentry/console routing
- `frontend/src/utils/__tests__/logger.test.ts` - 8 unit tests for logger utility
- `frontend/src/instrument.ts` - Web Vitals (onCLS, onINP, onLCP) reporting to Sentry
- `frontend/src/api/client.ts` - Replaced console.error with logger.error
- `frontend/src/store/enumStore.ts` - Replaced console.error with logger.error
- `frontend/src/components/common/ErrorBoundary.tsx` - Replaced console.error with logger.error
- `frontend/src/hooks/useFabricDetail.ts` - 7 console.error -> logger.error replacements
- `frontend/src/hooks/useOrderItemsSection.ts` - 6 console.error -> logger.error replacements
- `frontend/src/hooks/useCustomerDetail.ts` - 3 console.error -> logger.error replacements
- 16 additional page/component files with console.error -> logger.error replacements
- `tests/load/auth.k6.js` - Load test for dev-login endpoint (p95 < 500ms)
- `tests/load/fabric-crud.k6.js` - Load test for fabric list + detail (p95 < 500ms)
- `tests/load/order-list.k6.js` - Load test for order list + filtered (p95 < 1000ms)
- `tests/load/README.md` - Installation, usage, and baseline threshold documentation

## Decisions Made
- Used `Sentry.setMeasurement` for Web Vitals reporting instead of `Sentry.metrics.distribution` which is not available in @sentry/react v10
- Logger evaluates `isProduction` and `hasSentry` at module load time (not per-call) for minimal runtime overhead
- k6 scripts use `/auth/dev-login` for authentication, with note to update for production

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sentry.metrics.distribution API not available in v10**
- **Found during:** Task 1 (Web Vitals integration)
- **Issue:** Plan specified `Sentry.metrics.distribution` for Web Vitals, but this API does not exist in @sentry/react v10
- **Fix:** Used `Sentry.setMeasurement` which is available and serves the same purpose
- **Files modified:** frontend/src/instrument.ts
- **Verification:** Build passes, typecheck passes
- **Committed in:** c76ee74

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor API substitution, same functionality achieved. No scope creep.

## Issues Encountered
None beyond the Sentry API deviation noted above.

## User Setup Required
None - no external service configuration required. k6 load tests require `brew install k6` when ready to run (documented in README).

## Next Phase Readiness
- Frontend observability complete: structured logging, Web Vitals, Sentry integration
- k6 scripts ready for load testing when backend is running
- Ready for Phase 16 (Docker containerization) and Phase 18 (production deployment)

---
*Phase: 15-observability-performance*
*Completed: 2026-04-01*
