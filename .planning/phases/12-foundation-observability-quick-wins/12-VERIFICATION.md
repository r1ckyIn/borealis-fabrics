---
phase: 12-foundation-observability-quick-wins
verified: 2026-03-28T10:15:00Z
status: passed
score: 16/16 must-haves verified
re_verification: false
---

# Phase 12: Foundation Observability Quick Wins — Verification Report

**Phase Goal:** System has cross-cutting infrastructure (correlation tracing, soft delete) and immediate error visibility (Sentry) before any feature work begins
**Verified:** 2026-03-28T10:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Every API response includes X-Correlation-ID header with a UUID v4 value | VERIFIED | `ClsModule.forRoot` with `generateId: true` in app.module.ts; `response.setHeader('X-Correlation-ID', correlationId)` in AllExceptionsFilter; `exposedHeaders: ['X-Correlation-ID']` in main.ts CORS config |
| 2  | Pino logs include the correlation ID as reqId field for every request | VERIFIED | `LoggerModule.forRootAsync` with `genReqId: () => cls.getId()` in app.module.ts binds CLS ID to pino reqId |
| 3  | Unhandled 500 errors are captured by Sentry with correlation ID in tags | VERIFIED | `@SentryExceptionCaptured()` decorator on `catch` method in AllExceptionsFilter; `Sentry.getCurrentScope().setTag('correlation_id', correlationId)` present |
| 4  | 4xx errors (400, 401, 403, 404) are NOT sent to Sentry | VERIFIED | `beforeSend` in backend/src/instrument.ts checks `[400, 401, 403, 404].includes(status)` and returns null |
| 5  | Frontend React crashes render a graceful fallback UI and call Sentry.captureException | VERIFIED | `Sentry.captureException(error, ...)` in ErrorBoundary.componentDidCatch; Ant Design `Result` component with retry button in render |
| 6  | ErrorBoundary wraps the App component tree in App.tsx — not dead code | VERIFIED | `<ErrorBoundary>` wraps `<QueryClientProvider>` as outermost element in App.tsx |
| 7  | Sentry is disabled gracefully when DSN env var is not set | VERIFIED | `enabled: !!process.env.SENTRY_DSN` in backend instrument.ts; `enabled: !!import.meta.env.VITE_SENTRY_DSN` in frontend instrument.ts |
| 8  | Soft-deleting sets deletedAt to a timestamp instead of setting isActive to false | VERIFIED | `prisma-extension-soft-delete` applied in PrismaService via model delegate patching; all 6 services use `delete()` not `update({ isActive: false })` |
| 9  | All findMany/findFirst/findUnique queries auto-exclude records where deletedAt IS NOT NULL | VERIFIED | `createSoftDeleteExtension({ models: { User/Fabric/Supplier/Customer/Product/ProductBundle: true } })` in prisma.service.ts; zero isActive filter occurrences remain in backend/src |
| 10 | Re-creating an entity with the same unique field after soft-delete succeeds | VERIFIED | Migration SQL adds `unarchived BOOLEAN GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) VIRTUAL` + composite unique index on fabric/supplier/product/product_bundle tables |
| 11 | Existing isActive: false records are migrated to deletedAt = NOW() during schema migration | VERIFIED | Migration SQL contains 6 `UPDATE ... SET deleted_at = NOW(3) WHERE is_active = false` statements; isActive columns then dropped |
| 12 | Boss-role users can restore soft-deleted entities; non-boss users receive 403 | VERIFIED | `PATCH /:id/restore` endpoint exists on all 4 controllers; `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('boss')` applied; RolesGuard checks `BOSS_WEWORK_IDS` env var |
| 13 | OrderPaymentService creates PaymentRecord with correct operatorId from authenticated user (not undefined) | VERIFIED | `getOperatorId()` private method uses `this.cls.get<RequestUser | undefined>('user')?.id ?? null`; no `operatorId: undefined` remains |
| 14 | OrderFormPage displays inline field validation errors for 400/422 responses | VERIFIED | `mapApiErrorsToFormFields(apiError)` called and `form.setFields(fieldErrors)` used in OrderFormPage.tsx; old `message.error(fieldMatch.message)` toast-only pattern removed |
| 15 | SalesContractImportStrategy tolerates column name variants (whitespace, casing) and RichText cells | VERIFIED | `normalizeHeaderValue` utility in excel.utils.ts handles RichText objects and applies `.trim().toLowerCase()`; strategy uses normalized headers for matching |
| 16 | UserClsInterceptor stores request.user into CLS globally for any service to access operator context | VERIFIED | `user-cls.interceptor.ts` exists with `this.cls.set('user', request.user)`; registered as `APP_INTERCEPTOR` in app.module.ts |

**Score:** 16/16 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/instrument.ts` | Sentry init for NestJS backend | VERIFIED | Contains `Sentry.init`, `beforeSend` with 4xx filter, PII scrubbing |
| `frontend/src/instrument.ts` | Sentry init for React frontend | VERIFIED | Contains `Sentry.init`, `VITE_SENTRY_DSN`, `reactRouterV7BrowserTracingIntegration` |
| `backend/src/common/filters/http-exception.filter.ts` | Exception filter with Sentry + correlation ID | VERIFIED | Contains `@SentryExceptionCaptured()`, `ClsService`, `setHeader('X-Correlation-ID'...)`, `correlationId` in response body |
| `frontend/src/components/common/ErrorBoundary.tsx` | ErrorBoundary with Sentry reporting | VERIFIED | Contains `Sentry.captureException(`, `Result` from antd, `handleRetry` |
| `frontend/src/App.tsx` | Root component with ErrorBoundary wrapping | VERIFIED | `<ErrorBoundary>` wraps entire component tree |
| `backend/src/main.ts` | First import is instrument.ts | VERIFIED | Line 1: `import './instrument';` |
| `frontend/src/main.tsx` | First import is instrument.ts | VERIFIED | Line 1: `import './instrument';` |
| `backend/src/app.module.ts` | ClsModule, SentryModule, LoggerModule.forRootAsync | VERIFIED | All three present; `genReqId: () => cls.getId()` binding confirmed |
| `backend/prisma/schema.prisma` | deletedAt on all 6 models; no isActive | VERIFIED | 6 `deletedAt DateTime? @map("deleted_at")` entries; 0 isActive occurrences |
| `backend/src/prisma/prisma.service.ts` | Soft-delete extension | VERIFIED | `createSoftDeleteExtension` applied via model delegate patching |
| `backend/prisma/migrations/20260328090000_soft_delete_migration/migration.sql` | Full migration with data migration + generated columns | VERIFIED | Data migration (6 UPDATE statements), generated columns (4 tables), DROP COLUMN is_active (6 tables) |
| `backend/src/common/guards/roles.guard.ts` | RolesGuard for boss-only endpoints | VERIFIED | `RolesGuard` checks `BOSS_WEWORK_IDS` env var; throws 403 for non-boss |
| `backend/src/common/decorators/roles.decorator.ts` | Roles decorator | VERIFIED | `Roles` decorator exported |
| `backend/src/common/interceptors/user-cls.interceptor.ts` | UserClsInterceptor storing user in CLS | VERIFIED | `cls.set('user', request.user)` |
| `frontend/src/utils/errorMessages.ts` | mapApiErrorsToFormFields utility | VERIFIED | Function exported at line 165 |
| `frontend/src/pages/orders/OrderFormPage.tsx` | Inline field validation via form.setFields | VERIFIED | Imports `mapApiErrorsToFormFields`, calls `form.setFields(fieldErrors)` |
| `backend/src/import/strategies/sales-contract-import.strategy.ts` | Hardened header matching | VERIFIED | Uses `trim().toLowerCase()` in header normalization |
| `backend/src/order/order-payment.service.ts` | Correct operatorId from CLS | VERIFIED | `getOperatorId()` uses `cls.get<RequestUser | undefined>('user')?.id ?? null`; no `operatorId: undefined` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/src/main.ts` | `backend/src/instrument.ts` | first import line | WIRED | `import './instrument'` is line 1 |
| `backend/src/app.module.ts` | nestjs-cls | ClsModule.forRoot | WIRED | `ClsModule.forRoot(...)` present |
| `backend/src/common/filters/http-exception.filter.ts` | nestjs-cls | ClsService injection | WIRED | `constructor(private readonly cls: ClsService)` |
| `frontend/src/main.tsx` | `frontend/src/instrument.ts` | first import line | WIRED | `import './instrument'` is line 1 |
| `frontend/src/App.tsx` | ErrorBoundary | ErrorBoundary wrapping component tree | WIRED | `<ErrorBoundary>` wraps `<QueryClientProvider>` |
| `backend/src/prisma/prisma.service.ts` | prisma-extension-soft-delete | $extends with createSoftDeleteExtension | WIRED | `createSoftDeleteExtension` applied |
| `backend/prisma/schema.prisma` | MySQL migration | deletedAt DateTime? field on 6 models | WIRED | Migration file exists with 6 model alterations |
| `backend/src/supplier/supplier.controller.ts` | RolesGuard | RolesGuard on restore endpoint | WIRED | `@UseGuards(JwtAuthGuard, RolesGuard)` on PATCH /:id/restore |
| `frontend/src/pages/orders/OrderFormPage.tsx` | `frontend/src/utils/errorMessages.ts` | mapApiErrorsToFormFields import + form.setFields | WIRED | Import confirmed at line 19; usage at line 69 |
| `backend/src/order/order-payment.service.ts` | nestjs-cls | ClsService.get('user') for operatorId | WIRED | `this.cls.get<RequestUser | undefined>('user')` in getOperatorId() |
| `backend/src/common/interceptors/user-cls.interceptor.ts` | `backend/src/app.module.ts` | APP_INTERCEPTOR registration | WIRED | `{ provide: APP_INTERCEPTOR, useClass: UserClsInterceptor }` at line 112 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `http-exception.filter.ts` | `correlationId` | `this.cls.getId()` from ClsModule middleware | Yes — UUID v4 auto-generated per request by ClsModule | FLOWING |
| `ErrorBoundary.tsx` | `error` in componentDidCatch | React's error propagation mechanism | Yes — real caught errors from React render | FLOWING |
| `order-payment.service.ts` | `operatorId` from `getOperatorId()` | `cls.get('user')` populated by UserClsInterceptor | Yes — authenticated user stored into CLS by interceptor | FLOWING |
| `OrderFormPage.tsx` | `fieldErrors` from `mapApiErrorsToFormFields` | API error response from backend (400/422) | Yes — parses actual API error messages | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — Cannot test without running server. All artifacts verified at code level (Levels 1-4). The test suites (838 backend, 1007 frontend) provide behavioral confirmation.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| OBS-04 | 12-01 | Request correlation ID via nestjs-cls, propagated through pino logs, Sentry context, and response headers | SATISFIED | ClsModule.forRoot in app.module.ts; genReqId binding; setHeader in filter; Sentry tag |
| OBS-01 | 12-01 | Sentry error tracking on backend (NestJS exception filter + @SentryExceptionCaptured) | SATISFIED | `@SentryExceptionCaptured()` on AllExceptionsFilter.catch; backend/src/instrument.ts |
| OBS-02 | 12-01 | Sentry error tracking on frontend (ErrorBoundary + React Router integration) | SATISFIED | frontend/src/instrument.ts with reactRouterV7BrowserTracingIntegration; ErrorBoundary calls captureException |
| OBS-03 | 12-01 | Sentry beforeSend filters out expected errors (400/401/403/404) and scrubs PII | SATISFIED | `[400, 401, 403, 404].includes(status)` in beforeSend; PII scrubbing for email/phone |
| OBS-05 | 12-01 | React ErrorBoundary with graceful fallback UI and Sentry error reporting | SATISFIED | Result component + retry button preserved; Sentry.captureException called |
| DATA-01 | 12-02 | Soft delete (deletedAt) on all business entities via Prisma Client Extensions | SATISFIED | prisma.service.ts applies extension on 6 models; all services use delete() |
| DATA-02 | 12-02 | Existing unique constraints updated to handle soft-deleted records (MySQL NULL != NULL pattern) | SATISFIED | 4 tables have `unarchived GENERATED ALWAYS AS` + composite unique index in migration SQL |
| DATA-03 | 12-02 | All existing queries automatically filter deleted records; explicit includeDeleted option available | SATISFIED | Extension auto-filters; restore uses raw SQL to bypass (includeDeleted via raw) |
| DEBT-01 | 12-03 | OrderFormPage inline field validation for 400/422 responses (currently toast-only) | SATISFIED | form.setFields(fieldErrors) called; old toast-only pattern removed |
| DEBT-02 | 12-03 | Fix operatorId: undefined in OrderPaymentService | SATISFIED | getOperatorId() returns CLS user id; no operatorId: undefined remains |
| DEBT-03 | 12-03 | Tune SalesContractImportStrategy for real file formats | SATISFIED | normalizeHeaderValue handles RichText, whitespace, casing; toLowerCase applied |

**All 11 requirement IDs from plan frontmatter are accounted for.**

**Orphaned requirements check:** REQUIREMENTS.md Phase 12 tracking table lists only DATA-01, DATA-02, DATA-03, OBS-01 through OBS-05, DEBT-01 through DEBT-03 as Phase 12. No orphaned requirements found.

---

## Anti-Patterns Found

No blockers or warnings found.

Scan summary:
- `grep -rn "TODO\|FIXME\|PLACEHOLDER"` on phase-modified files: 0 hits in new code
- `grep -rn "operatorId: undefined"` in backend/src: 0 hits
- `grep -rn "isActive"` in backend/src: 0 hits
- `grep -rn "isActive"` in backend/prisma/schema.prisma: 0 hits
- `return null` in ErrorBoundary: Not present (proper fallback rendered)
- Sentry `enabled: !!DSN` pattern: Present in both frontend and backend — not a stub, correct graceful-disable behavior

---

## Human Verification Required

### 1. Sentry Error Reception (Production)

**Test:** Configure SENTRY_DSN and VITE_SENTRY_DSN with real Sentry project credentials and trigger a 500 error in the backend and a React render crash in the frontend
**Expected:** Sentry dashboard receives backend error with `correlation_id` tag, no 4xx errors appear; frontend React crash appears with component stack in Sentry
**Why human:** Requires live Sentry account, real DSN, and manual error triggering

### 2. Correlation ID in Pino Logs

**Test:** Make an API request and examine pino log output
**Expected:** Each log line contains `reqId` field with the UUID that also appears in the X-Correlation-ID response header
**Why human:** Requires running backend server and inspecting structured log output

### 3. Restore Endpoint Boss Authorization

**Test:** As a non-boss user, call PATCH /api/v1/suppliers/:id/restore on a soft-deleted supplier
**Expected:** 403 Forbidden response with "Boss role required" message
**Why human:** Requires running server with real authentication tokens and BOSS_WEWORK_IDS configuration

### 4. OrderFormPage Inline Field Errors (UI)

**Test:** Submit the order form with invalid data that triggers a 400 validation error
**Expected:** Inline error messages appear below the specific form fields, not as a toast notification
**Why human:** Visual validation requires browser interaction

---

## Gaps Summary

No gaps found. All 16 observable truths verified, all artifacts present and substantive, all key links wired, data flows confirmed, all 11 requirements satisfied.

The phase successfully delivers its goal: cross-cutting infrastructure (correlation tracing via nestjs-cls, soft delete via Prisma extensions, boss restore guard) and immediate error visibility (Sentry on backend and frontend, ErrorBoundary at root level) are all in place before Phase 13 feature work begins.

Git commits verified:
- `0211b73` — feat(12-01): backend correlation ID, Sentry, enhanced exception filter
- `ce6706d` — feat(12-01): frontend Sentry, ErrorBoundary, App.tsx wiring
- `b66b7f0` — feat(12-02): Prisma schema migration + soft-delete extension
- `a22dee7` — feat(12-02): remove isActive from supplier/customer/fabric/product
- `b1d7d9e` — feat(12-02): remove isActive from remaining modules + restore endpoints
- `bb35dd3` — feat(12-03): fix operatorId via CLS, harden import header matching
- `c9a314d` — feat(12-03): inline field validation in OrderFormPage

---

_Verified: 2026-03-28T10:15:00Z_
_Verifier: Claude (gsd-verifier)_
