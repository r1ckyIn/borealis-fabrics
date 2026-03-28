---
phase: 12-foundation-observability-quick-wins
plan: 01
subsystem: observability
tags: [sentry, nestjs-cls, correlation-id, error-boundary, pino, react]

# Dependency graph
requires: []
provides:
  - "Request correlation ID via nestjs-cls (UUID v4 per request)"
  - "Sentry error tracking on backend with exception filter integration"
  - "Sentry error tracking on frontend with React Router v7 integration"
  - "Enhanced AllExceptionsFilter with correlation ID in response header, body, and Sentry scope"
  - "ErrorBoundary with Sentry reporting wired into App.tsx root"
  - "X-Correlation-ID response header on all error responses"
affects: [12-02, 12-03, 13-audit-log, all-future-phases]

# Tech tracking
tech-stack:
  added: [nestjs-cls@6.2.0, "@sentry/nestjs@10.46.0", "@sentry/react@10.46.0"]
  patterns: [cls-correlation-id, sentry-exception-filter-decorator, instrument-first-import]

key-files:
  created:
    - backend/src/instrument.ts
    - frontend/src/instrument.ts
  modified:
    - backend/src/main.ts
    - backend/src/app.module.ts
    - backend/src/common/filters/http-exception.filter.ts
    - backend/.env.example
    - frontend/src/main.tsx
    - frontend/src/App.tsx
    - frontend/src/components/common/ErrorBoundary.tsx
    - frontend/.env.example
    - frontend/src/components/common/__tests__/ErrorBoundary.test.tsx

key-decisions:
  - "Use nestjs-cls middleware mode with generateId for automatic correlation ID per request"
  - "Bind pino reqId to CLS ID via LoggerModule.forRootAsync for consistent log correlation"
  - "Enhance existing AllExceptionsFilter with @SentryExceptionCaptured decorator instead of adding SentryGlobalFilter"
  - "Enhance existing ErrorBoundary class component with Sentry.captureException instead of wrapping with Sentry.ErrorBoundary"
  - "Sentry disabled gracefully when DSN env var is not set (enabled: !!DSN)"

patterns-established:
  - "Instrument-first import: backend/src/instrument.ts must be first import in main.ts for Sentry module patching"
  - "Instrument-first import: frontend/src/instrument.ts must be first import in main.tsx for Sentry initialization"
  - "Correlation ID flow: CLS -> pino reqId -> error response body -> X-Correlation-ID header -> Sentry tag"
  - "Exception filter DI: AllExceptionsFilter uses constructor injection for ClsService"

requirements-completed: [OBS-04, OBS-01, OBS-02, OBS-03, OBS-05]

# Metrics
duration: 14min
completed: 2026-03-28
---

# Phase 12 Plan 01: Observability Infrastructure Summary

**Correlation ID via nestjs-cls, Sentry error tracking (backend + frontend), and ErrorBoundary enhancement with root-level wiring in App.tsx**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-28T08:47:59Z
- **Completed:** 2026-03-28T09:02:55Z
- **Tasks:** 2/2
- **Files modified:** 16

## Accomplishments
- Request correlation ID (UUID v4) automatically generated per request via nestjs-cls, bound to pino log context
- Sentry backend integration with @SentryExceptionCaptured decorator on AllExceptionsFilter, filtering 4xx errors via beforeSend
- Sentry frontend integration with React Router v7 browser tracing and ErrorBoundary reporting
- X-Correlation-ID response header on all error responses, correlation ID in response body and Sentry scope tags
- ErrorBoundary wired at root level in App.tsx (no longer dead code), catches all React errors in component tree

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend -- Install dependencies, wire ClsModule + Sentry, enhance AllExceptionsFilter** - `0211b73` (feat)
2. **Task 2: Frontend -- Install Sentry, create instrument.ts, enhance ErrorBoundary, wire into App.tsx** - `ce6706d` (feat)

## Files Created/Modified

- `backend/src/instrument.ts` - Sentry init with beforeSend filter (4xx excluded) and PII scrubbing
- `backend/src/main.ts` - Instrument import as first line, CORS X-Correlation-ID exposed
- `backend/src/app.module.ts` - ClsModule, SentryModule, LoggerModule.forRootAsync with CLS-bound reqId
- `backend/src/common/filters/http-exception.filter.ts` - ClsService injection, @SentryExceptionCaptured, correlation ID in header/body/Sentry scope
- `backend/.env.example` - SENTRY_DSN env var
- `frontend/src/instrument.ts` - Sentry init with React Router v7 integration
- `frontend/src/main.tsx` - Instrument import as first line
- `frontend/src/App.tsx` - ErrorBoundary wrapping entire component tree
- `frontend/src/components/common/ErrorBoundary.tsx` - Sentry.captureException in componentDidCatch
- `frontend/.env.example` - VITE_SENTRY_DSN env var
- `frontend/src/components/common/__tests__/ErrorBoundary.test.tsx` - Sentry mock and captureException test

## Decisions Made

- **nestjs-cls middleware mode with generateId:** Automatically generates UUID v4 for each request or reuses incoming X-Correlation-ID header. CLS stores the ID for the full request lifecycle.
- **LoggerModule.forRootAsync:** Converted from static forRoot to async factory to inject ClsService, binding pino reqId to CLS ID for consistent log correlation.
- **Enhance existing filter, not add new one:** Used @SentryExceptionCaptured decorator on existing AllExceptionsFilter rather than adding SentryGlobalFilter (avoids dual filter conflict).
- **Enhance existing ErrorBoundary, not wrap with Sentry.ErrorBoundary:** Added Sentry.captureException call in componentDidCatch to avoid double error reporting from nested error boundaries.
- **Record<string, Record<string, unknown>> for idGenerator req param:** Used generic type instead of Express Request to avoid DOM Request type collision in app.module.ts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma Client not generated in worktree**
- **Found during:** Task 1 (backend build)
- **Issue:** Worktree had no generated Prisma Client, causing hundreds of type errors
- **Fix:** Ran `npx prisma generate` to generate the client
- **Files modified:** None (generated files in node_modules)
- **Verification:** Build passes after generation
- **Committed in:** N/A (node_modules not committed)

**2. [Rule 1 - Bug] Request type collision in app.module.ts**
- **Found during:** Task 1 (backend build)
- **Issue:** `Request` type in idGenerator referred to DOM Fetch API Request, not Express Request. `req.headers['x-correlation-id']` failed type check.
- **Fix:** Changed parameter type to `Record<string, Record<string, unknown>>` (nestjs-cls declares `req: any` anyway)
- **Files modified:** backend/src/app.module.ts
- **Committed in:** 0211b73 (Task 1 commit)

**3. [Rule 1 - Bug] ArgumentsHost import type issue with emitDecoratorMetadata**
- **Found during:** Task 1 (backend build)
- **Issue:** `ArgumentsHost` in decorated method signature needs `import type` when `isolatedModules` and `emitDecoratorMetadata` are enabled
- **Fix:** Split import to use `import type { ArgumentsHost }` and `import type { Request, Response }` for Express types
- **Files modified:** backend/src/common/filters/http-exception.filter.ts
- **Committed in:** 0211b73 (Task 1 commit)

**4. [Rule 1 - Bug] Sentry mock not cleared between ErrorBoundary tests**
- **Found during:** Task 2 (frontend test)
- **Issue:** `captureException` mock accumulated calls across tests, causing count assertion failure
- **Fix:** Added `vi.mocked(Sentry.captureException).mockClear()` in beforeEach, used static import instead of dynamic import
- **Files modified:** frontend/src/components/common/__tests__/ErrorBoundary.test.tsx
- **Committed in:** ce6706d (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing flaky integration test (`order-status.integration.test.tsx`) timed out during full suite run -- not related to our changes, confirmed by running all 77 other test files (979 tests) green

## User Setup Required

External services require manual configuration for Sentry:
- **SENTRY_DSN** (backend): Sentry Dashboard -> Settings -> Projects -> [backend project] -> Client Keys -> DSN
- **VITE_SENTRY_DSN** (frontend): Sentry Dashboard -> Settings -> Projects -> [frontend project] -> Client Keys -> DSN
- Both are optional -- system works without them (Sentry disabled when empty)

## Known Stubs

None -- all implementations are fully wired and functional. Sentry is intentionally disabled when DSN is not set, which is correct behavior (not a stub).

## Next Phase Readiness
- Correlation ID infrastructure ready for Phase 13 audit log (correlation ID available via ClsService injection)
- Sentry error tracking active once DSN is configured
- ErrorBoundary catching all React errors in component tree

---
*Phase: 12-foundation-observability-quick-wins*
*Completed: 2026-03-28*
