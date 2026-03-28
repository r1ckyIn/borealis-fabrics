# Phase 12: Foundation & Observability Quick Wins - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

System has cross-cutting infrastructure (correlation tracing, soft delete) and immediate error visibility (Sentry) before any feature work begins. Also closes 3 tech debt items from v1.0.

Requirements: OBS-04, DATA-01, DATA-02, DATA-03, OBS-01, OBS-02, OBS-03, OBS-05, DEBT-01, DEBT-02, DEBT-03

</domain>

<decisions>
## Implementation Decisions

### Correlation ID (OBS-04)
- **D-01:** Use `nestjs-cls` for request-scoped correlation ID storage. Generate UUID v4 per request via middleware.
- **D-02:** Propagate correlation ID through: pino log context (automatic via cls), Sentry scope tags, `X-Correlation-ID` response header.
- **D-03:** AllExceptionsFilter already exists — enhance it to include correlation ID in error responses.

### Soft Delete (DATA-01, DATA-02, DATA-03)
- **D-04:** Implement via Prisma Client Extensions with `deletedAt` timestamp column (not boolean). All 6 entities with `isActive` (User, Fabric, Supplier, Customer, Product, ProductBundle) are pure soft-delete semantics — migrate all to `deletedAt`.
- **D-05:** Prisma Client Extensions auto-filter: all `findMany`/`findFirst`/`findUnique` queries automatically exclude `deletedAt IS NOT NULL`; explicit `includeDeleted: true` option available for admin queries.
- **D-06:** Unique constraints updated for soft-deleted records using MySQL `NULL != NULL` pattern (partial unique index or generated column approach).
- **D-07:** Backend restore API (`PATCH /:id/restore`) added for each entity — sets `deletedAt = null`. Requires boss role.
- **D-08:** Frontend recovery UI (list page "show deleted" filter, boss-only) is **deferred to Phase 13** — Phase 12 has no UI hint except DEBT-01.

### Sentry (OBS-01, OBS-02, OBS-03)
- **D-09:** Backend: `@sentry/nestjs` with global exception filter integration. Sentry captures unhandled 500 errors with correlation ID in Sentry scope.
- **D-10:** `beforeSend` filter: exclude 400, 401, 403, 404 status codes. Scrub PII (email, phone) from error context.
- **D-11:** Frontend: `@sentry/react` with React Router integration. ErrorBoundary enhanced with `Sentry.ErrorBoundary` wrapper.

### ErrorBoundary (OBS-05)
- **D-12:** Existing `ErrorBoundary.tsx` enhanced: add Sentry error reporting in `componentDidCatch`, keep existing graceful fallback UI (Ant Design Result component with retry button).

### Tech Debt — OrderFormPage Validation (DEBT-01)
- **D-13:** All backend class-validator field errors mapped to inline Ant Design Form field errors via `form.setFields()`. No more toast-only for 400/422 — every field error shows next to the corresponding form field.
- **D-14:** Pattern: create a reusable `mapApiErrorsToFormFields()` utility that parses backend validation error response and returns `FieldData[]` for `form.setFields()`.

### Tech Debt — operatorId Fix (DEBT-02)
- **D-15:** Fix `operatorId: undefined` in `OrderPaymentService` (lines 47, 130). Extract operator ID from request auth context (JWT user). Requires passing auth user through service method or using nestjs-cls to access request user.

### Tech Debt — SalesContractImportStrategy (DEBT-03)
- **D-16:** Enhance resilience: flexible header matching (tolerate column name variants, RichText cleanup), auto-detect metadata row positions. No structural changes — real-file tuning deferred until user tests with actual files.

### Claude's Discretion
- Specific Sentry DSN configuration and environment setup
- Prisma migration naming and sequencing
- nestjs-cls vs manual AsyncLocalStorage implementation detail
- Error scrubbing rules (which PII fields to strip)
- Import strategy header matching tolerance thresholds

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & API
- `docs/ARCHITECTURE.md` — Full system architecture, API specs, business rules
- `docs/SECURITY.md` — Authentication, CSP, rate limiting, input validation

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — v1.1 requirements (DATA-01..03, OBS-01..05, DEBT-01..03)
- `.planning/ROADMAP.md` — Phase 12 success criteria and plan breakdown

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — Naming, error handling, logging patterns
- `.planning/codebase/CONCERNS.md` — Known tech debt and fragile areas
- `.planning/codebase/STACK.md` — Full dependency list and versions

### Key Implementation Files
- `backend/src/common/filters/http-exception.filter.ts` — AllExceptionsFilter (enhance for Sentry + correlation ID)
- `frontend/src/components/common/ErrorBoundary.tsx` — Existing ErrorBoundary (enhance for Sentry)
- `backend/prisma/schema.prisma` — 6 models with isActive to migrate
- `backend/src/order/order-payment.service.ts` — operatorId: undefined (lines 47, 130)
- `backend/src/import/strategies/sales-contract-import.strategy.ts` — Import strategy to harden
- `frontend/src/pages/orders/OrderFormPage.tsx` — Toast-only error handling to fix

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ErrorBoundary.tsx` — Class component with Ant Design Result fallback, `onError` callback prop — extend with Sentry
- `AllExceptionsFilter` — Global NestJS exception filter with standardized error response format `{ code, message, errors?, path, timestamp }`
- `nestjs-pino` — Already integrated for structured logging, natural fit for correlation ID propagation
- `getErrorMessage()` / `getDeleteErrorMessage()` — Frontend error message utilities
- `parseFieldError()` — Already exists in OrderFormPage for basic field error parsing

### Established Patterns
- Error handling: NestJS built-in exceptions (NotFoundException, ConflictException, BadRequestException)
- Logging: `nestjs-pino` with pino-http, pino-pretty in dev
- Auth: JWT HttpOnly cookies, JwtAuthGuard, request.user available
- State management: Zustand (client), TanStack Query (server)
- Soft delete current: `isActive: false` in delete methods, `where: { isActive: true }` in queries

### Integration Points
- `AppModule` providers array — add ClsModule, SentryModule
- `main.ts` bootstrap — Sentry.init() before app creation
- `frontend/src/main.tsx` — Sentry.init() for React
- Prisma Client Extensions — extend in PrismaService constructor or module setup
- Migration: new `deletedAt` column + data migration from `isActive=false` → `deletedAt=NOW()`

</code_context>

<specifics>
## Specific Ideas

- isActive audit: All 6 entities confirmed as pure soft-delete (no business toggle). Clean migration path.
- Recovery: Boss role can restore deleted records. Backend API in Phase 12, frontend UI deferred to Phase 13.
- OrderForm validation: All fields get inline errors, not just critical ones. Reusable utility pattern.
- SalesContractImportStrategy: Harden header matching resilience; actual file format tuning waits for real-world testing.

</specifics>

<deferred>
## Deferred Ideas

- **Frontend soft-delete recovery UI** — List page "show deleted" filter visible only to boss role. Deferred to Phase 13 (Data Safety & Audit) which has UI hint.
- **SalesContractImportStrategy real-file tuning** — Requires actual sales contract Excel files for testing. Strategy hardened for resilience in Phase 12, specific format fixes when user tests with real files.

</deferred>

---

*Phase: 12-foundation-observability-quick-wins*
*Context gathered: 2026-03-28*
