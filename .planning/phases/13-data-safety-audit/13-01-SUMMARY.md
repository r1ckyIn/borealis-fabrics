---
phase: 13-data-safety-audit
plan: 01
subsystem: backend-audit
tags: [audit-logging, rbac, prisma, interceptor, decorator]
dependency_graph:
  requires: []
  provides: [AuditLog-model, AuditService, AuditInterceptor, Audited-decorator, RolesGuard-devIds]
  affects: [supplier-controller, customer-controller, fabric-controller, product-controller, order-controller, quote-controller]
tech_stack:
  added: [audit-interceptor-pattern]
  patterns: [fire-and-forget-audit, cls-based-user-context, field-level-diff, raw-query-soft-delete-bypass]
key_files:
  created:
    - backend/src/audit/audit.module.ts
    - backend/src/audit/audit.service.ts
    - backend/src/audit/audit.controller.ts
    - backend/src/audit/audit.interceptor.ts
    - backend/src/audit/decorators/audited.decorator.ts
    - backend/src/audit/utils/diff.ts
    - backend/src/audit/dto/query-audit-log.dto.ts
    - backend/src/audit/dto/index.ts
    - backend/src/audit/audit.service.spec.ts
    - backend/src/audit/audit.controller.spec.ts
    - backend/src/audit/audit.interceptor.spec.ts
    - backend/src/audit/utils/diff.spec.ts
    - backend/src/common/guards/roles.guard.spec.ts
  modified:
    - backend/prisma/schema.prisma
    - backend/src/common/guards/roles.guard.ts
    - backend/src/prisma/prisma.service.ts
    - backend/src/app.module.ts
    - backend/src/supplier/supplier.controller.ts
    - backend/src/customer/customer.controller.ts
    - backend/src/fabric/fabric.controller.ts
    - backend/src/product/product.controller.ts
    - backend/src/order/order.controller.ts
    - backend/src/quote/quote.controller.ts
decisions:
  - "Fire-and-forget audit writes: wrapped in void IIFE with try/catch to never block main request"
  - "Raw SQL for before-state fetch: bypasses soft-delete extension to capture entity state before deletion"
  - "Unified admin check: both boss and developer roles treated as admin via isAdminUser() method"
  - "eslint-disable for expect.objectContaining in tests: Jest asymmetric matchers inherently return any"
metrics:
  duration: 15min
  completed: 2026-03-29
  tasks: 3
  files_created: 13
  files_modified: 10
  tests_added: 46
---

# Phase 13 Plan 01: Audit Logging Backend Infrastructure Summary

Audit interceptor with @Audited decorator capturing field-level diffs on all 22 CUD endpoints across 6 entity controllers, with fire-and-forget writes via CLS-based user context and correlation ID.

## What Was Built

### AuditLog Prisma Model
- Added `AuditLog` model to `schema.prisma` with fields: userId, userName, action, entityType, entityId, changes (JSON), ip, correlationId
- Indexes on (entityType, createdAt), (userId, createdAt), (action, createdAt), (createdAt) for efficient querying
- Mapped to `audit_logs` table

### @Audited() Decorator
- Metadata decorator with `AuditMetadata` interface: entityType, action (create/update/delete/restore), optional idParam
- Used by `AuditInterceptor` via Reflector to determine which methods to audit

### Changes Diff Utility
- `buildChangesDiff()` computes field-level changes between entity states
- Create: returns all non-null fields; Update: returns `{ field: { old, new } }` for changed fields only
- Delete: returns all non-null fields from before-state; Restore: returns deletedAt change
- Excludes system fields (id, createdAt, updatedAt, deletedAt)
- Deep equality via JSON.stringify for complex values (arrays, objects)

### AuditService
- `createLog()`: fire-and-forget write with try/catch (errors logged, never thrown)
- `findAll()`: paginated query with filters (entityType, action, userId, date range, keyword search)
- `findOne()`: single entry lookup with NotFoundException
- `fetchEntityById()`: raw SQL query to bypass soft-delete extension for before-state capture

### AuditController
- `GET /api/v1/audit-logs`: paginated, filterable list
- `GET /api/v1/audit-logs/:id`: single entry by ID
- Both endpoints guarded by `@Roles('boss', 'developer')` with JwtAuthGuard + RolesGuard

### AuditInterceptor
- Registered globally as APP_INTERCEPTOR after UserClsInterceptor
- Pre-handler: fetches before-state for update/delete/restore via `fetchEntityById`
- Post-handler: computes diff, writes audit log with CLS user context and correlation ID
- Fire-and-forget: async write in `void IIFE` so failures never block main request

### RolesGuard Extension
- Added `DEV_WEWORK_IDS` env var support alongside existing `BOSS_WEWORK_IDS`
- Unified admin check: both boss and developer weworkIds treated as admin
- Added `isAdminUser(weworkId: string): boolean` public method for AuthService (Plan 02)

### @Audited Applied to Controllers
- Supplier: create, update, delete, restore (4 methods)
- Customer: create, update, delete, restore (4 methods)
- Fabric: create, update, delete, restore (4 methods)
- Product: create, update, delete, restore (4 methods)
- Order: create, update, delete (3 methods)
- Quote: create, update, delete (3 methods)
- Total: 22 CUD methods decorated

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 8cfac99 | AuditLog model, @Audited decorator, diff utility, RolesGuard extension, DTOs |
| 2 | db0649a | AuditService, AuditController, AuditModule |
| 3 | 7026222 | AuditInterceptor, register globally, @Audited on all 6 controllers |

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| diff.spec.ts | 12 | PASS |
| roles.guard.spec.ts | 10 | PASS |
| audit.service.spec.ts | 13 | PASS |
| audit.controller.spec.ts | 4 | PASS |
| audit.interceptor.spec.ts | 7 | PASS |
| **Total** | **46** | **PASS** |

Build: PASS | Lint (audit files): PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Parallel agent's export module causing build failure**
- **Found during:** Task 2 verification
- **Issue:** A parallel agent added `ExportModule` to AppModule imports and created `src/export/` files with a lint error, causing build to fail
- **Fix:** Verified the parallel agent resolved its own lint error; proceeded with build passing. Added AuditModule import alongside the existing ExportModule import
- **Files affected:** backend/src/app.module.ts

**2. [Rule 1 - Bug] ESLint async tap callback violation**
- **Found during:** Task 3 lint
- **Issue:** `@typescript-eslint/no-misused-promises` flagged async function in rxjs `tap()` operator
- **Fix:** Wrapped async logic in `void (async () => { ... })()` IIFE pattern to satisfy linter while maintaining fire-and-forget behavior
- **Files modified:** backend/src/audit/audit.interceptor.ts

**3. [Rule 1 - Bug] ESLint no-unsafe-assignment in test assertions**
- **Found during:** Task 3 lint
- **Issue:** `expect.objectContaining` returns `any` type, triggering `no-unsafe-assignment`
- **Fix:** Added scoped `eslint-disable` block around affected assertions in audit.service.spec.ts
- **Files modified:** backend/src/audit/audit.service.spec.ts

## Known Stubs

None - all data paths are fully wired. The audit system captures live operation data from the interceptor pipeline.

## Self-Check: PASSED

All 13 created files verified present. All 3 commit hashes verified in git history.
