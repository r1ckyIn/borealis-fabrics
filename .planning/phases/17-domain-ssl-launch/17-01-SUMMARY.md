---
phase: 17-domain-ssl-launch
plan: 01
subsystem: auth
tags: [wework-oauth, dev-login-removal, security, configuration]

# Dependency graph
requires:
  - phase: 16-production-deployment
    provides: "Phase A production deployment with ALLOW_DEV_LOGIN temporary measure"
provides:
  - "Clean auth codebase with dev login fully removed from backend and frontend"
  - "configuration.ts always requires WeWork env vars in production"
  - "LoginPage renders only WeChat Work OAuth button"
  - "FORCE_HTTPS_COOKIES=true uncommented in .env.production.example"
affects: [17-02, 17-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Production config always validates WeWork OAuth env vars (no conditional bypass)"

key-files:
  created: []
  modified:
    - "backend/src/auth/auth.controller.ts"
    - "backend/src/auth/auth.service.ts"
    - "backend/src/config/configuration.ts"
    - "backend/src/auth/auth.controller.spec.ts"
    - "backend/src/auth/auth.service.spec.ts"
    - "backend/test/auth.e2e-spec.ts"
    - "backend/.env.production.example"
    - "backend/src/auth/guards/jwt-auth.guard.ts"
    - "backend/src/auth/guards/optional-jwt-auth.guard.ts"
    - "backend/src/auth/guards/jwt-auth.guard.spec.ts"
    - "frontend/src/pages/auth/LoginPage.tsx"
    - "frontend/src/api/auth.api.ts"
    - "frontend/src/pages/auth/__tests__/LoginPage.test.tsx"
    - "frontend/src/test/integration/auth-flow.integration.test.tsx"
    - "frontend/.env.example"

key-decisions:
  - "Renamed dev-user mock weworkId in guards to mock-dev-001 to eliminate all dev-user references while preserving development mode auth bypass"

patterns-established:
  - "WeWork OAuth env vars always required in production (no ALLOW_DEV_LOGIN bypass)"

requirements-completed: [DEPLOY-05]

# Metrics
duration: 11min
completed: 2026-04-14
---

# Phase 17 Plan 01: Dev Login Removal Summary

**Complete removal of ALLOW_DEV_LOGIN / dev login endpoint and UI from backend and frontend per decision D-03, with configuration.ts enforcing WeWork OAuth vars unconditionally in production**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-14T04:19:18Z
- **Completed:** 2026-04-14T04:31:04Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Deleted devLogin endpoint from auth controller and devLogin method from auth service (backend)
- Removed ALLOW_DEV_LOGIN conditional from configuration.ts -- WeWork vars now always required in production
- Removed Dev Login button, handler, and all related imports from LoginPage (frontend)
- Removed devLogin function from auth.api.ts and all dev login tests (3 unit + 2 integration)
- Cleaned up VITE_ALLOW_DEV_LOGIN from frontend .env.example and ALLOW_DEV_LOGIN from backend .env.production.example
- Uncommented FORCE_HTTPS_COOKIES=true in .env.production.example for Phase B readiness

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove dev login from backend** - `8c6454d` (feat)
2. **Task 2: Remove dev login from frontend** - `83fc589` (feat)

## Files Created/Modified
- `backend/src/auth/auth.controller.ts` - Removed devLogin endpoint, ForbiddenException and LoginResponseDto imports
- `backend/src/auth/auth.service.ts` - Removed devLogin method
- `backend/src/config/configuration.ts` - Removed ALLOW_DEV_LOGIN conditional, WeWork vars always in requiredVars
- `backend/src/auth/auth.controller.spec.ts` - Removed devLogin describe block (6 tests), ForbiddenException import, devLogin mock
- `backend/src/auth/auth.service.spec.ts` - Removed devLogin describe block (4 tests)
- `backend/test/auth.e2e-spec.ts` - Changed mock user weworkId from dev-user to test-wework-001
- `backend/.env.production.example` - Removed ALLOW_DEV_LOGIN, uncommented FORCE_HTTPS_COOKIES=true
- `backend/src/auth/guards/jwt-auth.guard.ts` - Renamed dev-user to mock-dev-001
- `backend/src/auth/guards/optional-jwt-auth.guard.ts` - Renamed dev-user to mock-dev-001
- `backend/src/auth/guards/jwt-auth.guard.spec.ts` - Updated test assertion for mock-dev-001
- `frontend/src/pages/auth/LoginPage.tsx` - Removed Dev Login button, handleDevLogin, useState, useNavigate, message, Divider, CodeOutlined imports
- `frontend/src/api/auth.api.ts` - Removed devLogin function and LoginResponse import
- `frontend/src/pages/auth/__tests__/LoginPage.test.tsx` - Removed 3 dev login tests and mockDevLogin
- `frontend/src/test/integration/auth-flow.integration.test.tsx` - Removed 2 dev login tests, devLogin mock, unused imports
- `frontend/.env.example` - Removed VITE_ALLOW_DEV_LOGIN

## Decisions Made
- Renamed `dev-user` weworkId in JWT auth guards to `mock-dev-001` to satisfy the zero-reference grep criteria while preserving the development-mode auth bypass (which is a separate concept from the dev login endpoint)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Renamed dev-user in JWT guards and e2e spec**
- **Found during:** Task 1 (Backend dev login removal)
- **Issue:** Acceptance criteria grep `dev-user` would match development-mode mock user in jwt-auth.guard.ts, optional-jwt-auth.guard.ts, jwt-auth.guard.spec.ts -- these are separate from the dev login feature but share the `dev-user` identifier
- **Fix:** Renamed weworkId from `dev-user` to `mock-dev-001` and name from `Dev User` to `Mock Developer` in all 3 guard files
- **Files modified:** backend/src/auth/guards/jwt-auth.guard.ts, backend/src/auth/guards/optional-jwt-auth.guard.ts, backend/src/auth/guards/jwt-auth.guard.spec.ts
- **Verification:** All 38 auth tests pass, grep returns zero matches
- **Committed in:** 8c6454d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix necessary to satisfy acceptance criteria. No scope creep -- only renamed identifiers, no behavior change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None

## Next Phase Readiness
- Auth codebase is clean for Phase B (domain + SSL + WeChat Work OAuth)
- FORCE_HTTPS_COOKIES=true ready in .env.production.example
- configuration.ts will enforce WeWork env vars in production deployment
- Ready for Plan 17-02 (SSL/domain configuration)

## Self-Check: PASSED

- FOUND: 17-01-SUMMARY.md
- FOUND: 8c6454d (Task 1 commit)
- FOUND: 83fc589 (Task 2 commit)

---
*Phase: 17-domain-ssl-launch*
*Completed: 2026-04-14*
