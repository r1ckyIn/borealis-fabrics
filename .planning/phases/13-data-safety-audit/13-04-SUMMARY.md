---
phase: 13-data-safety-audit
plan: 04
subsystem: api, frontend
tags: [soft-delete, recovery, admin-ui, includeDeleted, toggle]

requires:
  - phase: 13-data-safety-audit
    plan: 02
    provides: "isAdmin boolean on /auth/me response"
  - phase: 12-observability
    provides: "Soft-delete extension with deletedAt pattern"
provides:
  - "includeDeleted query parameter on all 6 entity list endpoints"
  - "SoftDeleteToggle component for admin-only deleted record visibility"
  - "Deleted row CSS styling (.deleted-row) for visual distinction"
  - "Restore button on 4 soft-deletable entity list pages"
  - "isAdmin field on frontend AuthUser type"
  - "deletedAt field on frontend SoftDeletableEntity type"
affects: [frontend-list-pages, backend-query-dtos]

tech-stack:
  added: []
  patterns: ["Empty object bypass for prisma-extension-soft-delete filter (where.deletedAt={})", "Admin-only UI component via useUser().isAdmin guard"]

key-files:
  created:
    - "frontend/src/components/common/SoftDeleteToggle.tsx"
    - "frontend/src/components/common/__tests__/SoftDeleteToggle.test.tsx"
    - "frontend/src/styles/deleted-row.css"
  modified:
    - "backend/src/supplier/dto/query-supplier.dto.ts"
    - "backend/src/customer/dto/query-customer.dto.ts"
    - "backend/src/fabric/dto/query-fabric.dto.ts"
    - "backend/src/product/dto/query-product.dto.ts"
    - "backend/src/order/dto/query-order.dto.ts"
    - "backend/src/quote/dto/query-quote.dto.ts"
    - "backend/src/supplier/supplier.service.ts"
    - "backend/src/customer/customer.service.ts"
    - "backend/src/fabric/fabric.service.ts"
    - "backend/src/product/product.service.ts"
    - "backend/src/supplier/supplier.service.spec.ts"
    - "frontend/src/pages/suppliers/SupplierListPage.tsx"
    - "frontend/src/pages/customers/CustomerListPage.tsx"
    - "frontend/src/pages/fabrics/FabricListPage.tsx"
    - "frontend/src/pages/products/ProductListPage.tsx"
    - "frontend/src/pages/orders/OrderListPage.tsx"
    - "frontend/src/pages/quotes/QuoteListPage.tsx"
    - "frontend/src/types/api.types.ts"
    - "frontend/src/types/entities.types.ts"
    - "frontend/src/types/forms.types.ts"
    - "frontend/src/test/mocks/mockFactories.ts"

key-decisions:
  - "Bypass soft-delete extension via empty object trick (where.deletedAt={}) instead of raw SQL - leverages extension's truthy-check behavior"
  - "Order and Quote DTOs accept includeDeleted for API consistency but services ignore it (no soft delete on these entities)"
  - "isAdmin field added as required (not optional) on AuthUser type to match backend UserResponseDto"

patterns-established:
  - "SoftDeleteToggle pattern: admin-guarded switch + restore button + deleted-row CSS for any entity list page"
  - "Empty object soft-delete bypass: where.deletedAt = {} as Prisma.DateTimeNullableFilter"

requirements-completed: [DATA-07]

duration: 24min
completed: 2026-03-29
---

# Phase 13 Plan 04: Soft-Delete Recovery UI Summary

**Backend includeDeleted query support for 4 soft-delete entities + frontend SoftDeleteToggle component integrated into all 6 list pages with deleted-row styling and restore capability, admin-only visibility via isAdmin**

## Performance

- **Duration:** 24 min
- **Started:** 2026-03-29T04:44:25Z
- **Completed:** 2026-03-29T05:08:25Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint, pending)
- **Files modified:** 21 modified + 3 created

## Accomplishments

- Added `includeDeleted` optional boolean query parameter to all 6 entity QueryDtos with string-to-boolean Transform decorator
- Modified 4 service `findAll` methods (supplier, customer, fabric, product) to bypass soft-delete extension filter when `includeDeleted=true` using empty object trick
- Created reusable `SoftDeleteToggle` component that renders only when `user.isAdmin` is true
- Created `deleted-row.css` with red-tinted background and hover styling for soft-deleted rows
- Integrated toggle + restore button + row styling into all 6 entity list pages
- Added `isAdmin: boolean` to frontend `AuthUser` type and `deletedAt?: string | null` to `SoftDeletableEntity`
- Added `includeDeleted` to all 6 frontend query param types
- 5 new SoftDeleteToggle component tests
- 4 new backend includeDeleted behavior tests in supplier.service.spec.ts
- Fixed isAdmin in 6 existing frontend test mock objects

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend includeDeleted support for all 6 entities** - `dafd7e7` (feat)
2. **Task 2: SoftDeleteToggle component + integration into all 6 list pages** - `69561bc` (feat)
3. **Task 3: Visual verification** - PENDING (checkpoint:human-verify)

## Files Created/Modified

### Created
- `frontend/src/components/common/SoftDeleteToggle.tsx` - Admin-only toggle switch component
- `frontend/src/components/common/__tests__/SoftDeleteToggle.test.tsx` - 5 unit tests
- `frontend/src/styles/deleted-row.css` - Red-tinted row styling for deleted records

### Backend Modified
- 6 QueryDto files - Added `includeDeleted?: boolean` with `@Transform` decorator
- 4 service files (supplier, customer, fabric, product) - Added `where.deletedAt = {}` bypass when `includeDeleted=true`
- `supplier.service.spec.ts` - 4 new includeDeleted behavior tests

### Frontend Modified
- 6 list page files - SoftDeleteToggle integration, restore button, rowClassName
- `types/api.types.ts` - Added `isAdmin: boolean` to AuthUser
- `types/entities.types.ts` - Added `deletedAt?: string | null` to SoftDeletableEntity
- `types/forms.types.ts` - Added `includeDeleted?: boolean` to all 6 query param types
- 6 test files - Added `isAdmin: false` to mock AuthUser objects

## Decisions Made

1. **Empty object bypass for soft-delete extension**: Instead of raw SQL, used `where.deletedAt = {} as Prisma.DateTimeNullableFilter` which is truthy (prevents extension override) but matches all records in Prisma. Clean, maintainable, no raw SQL.
2. **Order/Quote toggle for API consistency**: These entities don't have soft delete, but the toggle and DTO field exist for uniform API surface. The toggle has no visual effect on these pages.
3. **isAdmin as required field**: Made `isAdmin` non-optional on `AuthUser` to match backend `UserResponseDto`. Updated all existing test mocks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added isAdmin to frontend AuthUser type**
- **Found during:** Task 2 (frontend integration)
- **Issue:** Plan 02 added `isAdmin` to backend `UserResponseDto` but frontend `AuthUser` type was not updated. SoftDeleteToggle requires `user.isAdmin`.
- **Fix:** Added `isAdmin: boolean` to `AuthUser` interface in `api.types.ts`
- **Files modified:** `frontend/src/types/api.types.ts`
- **Committed in:** 69561bc (Task 2 commit)

**2. [Rule 3 - Blocking] Added deletedAt to SoftDeletableEntity type**
- **Found during:** Task 2 (frontend integration)
- **Issue:** `SoftDeletableEntity` had `isActive` but not `deletedAt`. Frontend needs `deletedAt` to detect deleted rows and show restore button.
- **Fix:** Added `deletedAt?: string | null` to `SoftDeletableEntity` in `entities.types.ts`
- **Files modified:** `frontend/src/types/entities.types.ts`
- **Committed in:** 69561bc (Task 2 commit)

**3. [Rule 3 - Blocking] Fixed isAdmin in 6 existing test mock AuthUser objects**
- **Found during:** Task 2 (frontend build)
- **Issue:** Adding `isAdmin: boolean` as required on `AuthUser` broke 6 existing test files that constructed AuthUser without isAdmin.
- **Fix:** Added `isAdmin: false` to mock objects in Header.test.tsx, LoginPage.test.tsx, OAuthCallback.test.tsx, ProtectedRoute.test.tsx, authStore.test.ts, and mockFactories.ts
- **Files modified:** 6 test files
- **Committed in:** 69561bc (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All necessary for type safety. No scope creep.

## Known Stubs

None - all data sources wired to real API calls. SoftDeleteToggle reads from authStore, restore calls actual backend PATCH endpoints.

## Pending: Task 3 (Human Verification)

Task 3 is a `checkpoint:human-verify` task requiring visual verification of:
1. Toggle visibility for admin vs non-admin users
2. Deleted row red-tinted styling
3. Restore button functionality
4. List refresh after restore

This task will be completed when the user performs visual verification.

---
## Self-Check: PASSED

- SoftDeleteToggle.tsx: FOUND
- SoftDeleteToggle.test.tsx: FOUND
- deleted-row.css: FOUND
- Commit dafd7e7 (Task 1): FOUND
- Commit 69561bc (Task 2): FOUND
- Backend build: PASS
- Backend tests: PASS (841/841, 34 suites)
- Backend lint: PASS (0 errors)
- Frontend build: PASS
- Frontend tests: PASS (1012/1012, 79 files)
- Frontend typecheck: PASS
- Frontend lint: PASS

---
*Phase: 13-data-safety-audit*
*Completed: 2026-03-29 (Tasks 1-2; Task 3 pending human verification)*
