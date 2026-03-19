---
phase: 01-frontend-bug-fixes
plan: 02
subsystem: ui, api
tags: [error-handling, search, empty-state, loading, react, typescript, nestjs, prisma]

requires:
  - phase: 01-frontend-bug-fixes
    provides: "Error code mapping utility (errorMessages.ts) with getErrorMessage() and getDeleteErrorMessage()"
provides:
  - "Fixed Supplier module: correct search, error handling, empty state, loading state, inline field validation"
  - "Fixed Customer module: identical pattern to Supplier, establishing reusable fix template"
  - "Backend keyword search for Supplier and Customer DTOs (fuzzy search across companyName/contactName/phone)"
  - "parseFieldError utility for mapping backend validation messages to form field names"
affects: [01-03-PLAN, 01-04-PLAN]

tech-stack:
  added: []
  patterns:
    - "Delete error handling: getDeleteErrorMessage(error as ApiError, entityName) pattern for all delete handlers"
    - "Form submit error handling: parseFieldError for 400/422 inline validation, getErrorMessage for toast fallback"
    - "Empty state: Table locale={{ emptyText: <Empty description='...'><Button>新建XX</Button></Empty> }}"
    - "Backend keyword search: OR condition across companyName/contactName/phone with contains matching"

key-files:
  created: []
  modified:
    - "frontend/src/pages/suppliers/SupplierListPage.tsx"
    - "frontend/src/pages/suppliers/SupplierFormPage.tsx"
    - "frontend/src/pages/customers/CustomerListPage.tsx"
    - "frontend/src/pages/customers/CustomerFormPage.tsx"
    - "frontend/src/utils/errorMessages.ts"
    - "backend/src/supplier/dto/query-supplier.dto.ts"
    - "backend/src/supplier/supplier.service.ts"
    - "backend/src/customer/dto/query-customer.dto.ts"
    - "backend/src/customer/customer.service.ts"

key-decisions:
  - "Use Form.useForm() in page component and pass form prop to form component for setFields access"
  - "parseFieldError checks message prefix against known field names -- simple but effective for NestJS ValidationPipe"
  - "Backend keyword search uses Prisma OR conditions (not LIKE concat) for better readability and maintainability"

patterns-established:
  - "Delete handler pattern: getDeleteErrorMessage(error as ApiError, entityName) -- reuse in Plans 03-04"
  - "Form error handler pattern: parseFieldError for 400/422 inline, getErrorMessage for toast fallback -- reuse in Plans 03-04"
  - "Empty state pattern: Table locale with Empty + action Button -- reuse in Plans 03-04"
  - "Backend keyword DTO pattern: add keyword field + OR conditions in service -- reuse for fabric in Plan 03"

requirements-completed: [BUGF-01, BUGF-02, BUGF-03, BUGF-04, BUGF-05, BUGF-06]

duration: 39min
completed: 2026-03-19
---

# Phase 1 Plan 02: Supplier & Customer Module Bug Fixes Summary

**Fixed Supplier and Customer modules with backend keyword search, ApiError-based delete/form error handling, empty states with action buttons, and inline field validation for 400/422 responses**

## Performance

- **Duration:** 39 min
- **Started:** 2026-03-18T23:35:33Z
- **Completed:** 2026-03-19T00:14:55Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Fixed BUG-002 and BUG-003: Added `keyword` field to backend QuerySupplierDto and QueryCustomerDto with OR-based fuzzy search across companyName, contactName, phone
- Fixed BUG-005 and BUG-006: Replaced all `error.response?.status` patterns with `getDeleteErrorMessage(error as ApiError, entityName)` in both list pages
- Fixed BUG-012 (supplier/customer): Form submit errors now use `getErrorMessage()` for Chinese toast messages and `parseFieldError()` for inline field validation via `form.setFields()` on 400/422 responses
- Fixed BUG-013 (supplier/customer): Added Ant Design Empty component with action button to both list page tables
- Added `parseFieldError` utility function to errorMessages.ts for parsing NestJS validation messages into field-level errors
- Added 10 new tests (5 per module): empty state text, empty state navigation, delete 409 error, delete 500 error, form error handling path

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Supplier Module** - `6e264c4` (fix)
2. **Task 2: Fix Customer Module** - `ccec4f8` (fix)

## Files Created/Modified

- `backend/src/supplier/dto/query-supplier.dto.ts` - Added keyword field for unified search
- `backend/src/supplier/supplier.service.ts` - Added OR-based keyword search in findAll
- `backend/src/customer/dto/query-customer.dto.ts` - Added keyword field for unified search
- `backend/src/customer/customer.service.ts` - Added OR-based keyword search in findAll
- `frontend/src/utils/errorMessages.ts` - Added parseFieldError utility and FIELD_NAME_MAP
- `frontend/src/pages/suppliers/SupplierListPage.tsx` - Fixed delete error handling, added empty state
- `frontend/src/pages/suppliers/SupplierFormPage.tsx` - Fixed submit error handling with inline validation
- `frontend/src/pages/customers/CustomerListPage.tsx` - Fixed delete error handling, added empty state
- `frontend/src/pages/customers/CustomerFormPage.tsx` - Fixed submit error handling with inline validation
- `frontend/src/pages/suppliers/__tests__/SupplierListPage.test.tsx` - Added 5 new tests
- `frontend/src/pages/suppliers/__tests__/SupplierFormPage.test.tsx` - Added error handling test
- `frontend/src/pages/customers/__tests__/CustomerListPage.test.tsx` - Added 5 new tests
- `frontend/src/pages/customers/__tests__/CustomerFormPage.test.tsx` - Added error handling test

## Decisions Made

- Used `Form.useForm()` at page level and passed form instance to form component via `form` prop, enabling `setFields()` calls from the page's error handler
- `parseFieldError` uses simple prefix matching against a known field name map -- sufficient for NestJS class-validator messages like "companyName should not be empty"
- Backend keyword search implemented with Prisma `OR` conditions rather than complex LIKE concatenation, for better readability
- Cast `fieldMatch.field as keyof CreateSupplierData` to satisfy strict TypeScript generic constraints on `form.setFields()`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing FabricFormPage type error**
- **Found during:** Task 1 (frontend build)
- **Issue:** `FabricFormPage.tsx` had a pre-existing uncommitted change with `form.setFields()` using plain `string` for field name, causing TypeScript error
- **Fix:** Added `as keyof CreateFabricData` cast to the field name, matching the same pattern used for Supplier/Customer
- **Files modified:** `frontend/src/pages/fabrics/FabricFormPage.tsx`
- **Verification:** `pnpm build` passes
- **Committed in:** `6e264c4` (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed pre-existing FabricFormPage test unused variable**
- **Found during:** Task 1 (frontend build)
- **Issue:** `FabricFormPage.test.tsx` had an unused `antdMessage` variable declaration causing TypeScript error
- **Fix:** Removed the unused variable declaration
- **Files modified:** `frontend/src/pages/fabrics/__tests__/FabricFormPage.test.tsx`
- **Verification:** `pnpm build` passes
- **Committed in:** `6e264c4` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary to unblock the frontend build. Pre-existing issues from uncommitted branch changes, not caused by this plan's work.

## Issues Encountered

- Linter/formatter reverted file changes multiple times during Task 1, requiring full file rewrites via Write tool instead of Edit tool
- Pre-existing test failures in unrelated modules (order-status, payment-flow integration tests) -- these are not caused by this plan's changes and are out of scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Supplier and Customer module fix patterns fully established and tested
- Plans 03 (Fabric + Quote) and 04 (Order + Logistics + Import) can directly replicate these patterns
- `parseFieldError` utility available for all modules to use
- `getDeleteErrorMessage` and `getErrorMessage` imports established as the standard pattern

## Self-Check: PASSED

All files verified:
- SupplierListPage.tsx: FOUND
- SupplierFormPage.tsx: FOUND
- CustomerListPage.tsx: FOUND
- CustomerFormPage.tsx: FOUND
- errorMessages.ts: FOUND
- query-supplier.dto.ts: FOUND
- query-customer.dto.ts: FOUND
- 01-02-SUMMARY.md: FOUND

All commits verified:
- 6e264c4 (Task 1): FOUND
- ccec4f8 (Task 2): FOUND

---
*Phase: 01-frontend-bug-fixes*
*Completed: 2026-03-19*
