---
phase: 10-uat-bug-fixes
plan: 02
subsystem: api, ui
tags: [prisma, nestjs, react, antd, supplier-filter, import-script]

requires:
  - phase: 09-real-data-testing
    provides: UAT findings (P1 supplier filtering, P1 duplicate customers)
provides:
  - Supplier query API with optional fabricId filter via FabricSupplier relationship
  - OrderItemForm and OrderItemFormModal pass fabricId when searching suppliers
  - Import script prevents duplicate customer creation on re-runs
affects: [orders, suppliers, import]

tech-stack:
  added: []
  patterns:
    - "useCallback for dynamic supplier search with form-derived fabricId"
    - "createCustomerIfNotExists pattern for entities without unique constraints"

key-files:
  created: []
  modified:
    - backend/src/supplier/dto/query-supplier.dto.ts
    - backend/src/supplier/supplier.service.ts
    - frontend/src/types/forms.types.ts
    - frontend/src/components/forms/OrderItemForm.tsx
    - frontend/src/pages/orders/components/OrderItemFormModal.tsx
    - scripts/run-full-import-test.ts

key-decisions:
  - "Dynamic fabricId read from form at search time (not reactive prop)"
  - "Manual duplicate check for customers since no DB unique constraint on companyName"

patterns-established:
  - "Supplier filtering via FabricSupplier join: where.fabricSuppliers = { some: { fabricId } }"
  - "Pre-create dedup: GET search + exact match check before POST"

requirements-completed: []

duration: 5min
completed: 2026-03-27
---

# Phase 10 Plan 02: Supplier Filtering & Duplicate Customer Fix Summary

**Supplier query API supports fabricId filter via FabricSupplier join; import script prevents duplicate customer creation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-27T10:13:52Z
- **Completed:** 2026-03-27T10:19:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Supplier API now accepts optional `fabricId` parameter to filter suppliers by FabricSupplier relationship
- OrderItemForm and OrderItemFormModal pass fabricId when searching suppliers, so dropdown shows relevant suppliers
- Import script checks for existing customers by exact companyName match before creating, preventing duplicates on re-runs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add fabricId filter to supplier query API** - `869d234` (feat)
2. **Task 2: Wire fabricId filter in OrderItemForm supplier search** - `26915b9` (feat)
3. **Task 3: Fix import script duplicate customer creation** - `f69909f` (fix)

## Files Created/Modified
- `backend/src/supplier/dto/query-supplier.dto.ts` - Added optional fabricId parameter with @IsInt/@Type decorators
- `backend/src/supplier/supplier.service.ts` - Added FabricSupplier relationship filter in findAll when fabricId provided
- `frontend/src/types/forms.types.ts` - Added fabricId to QuerySupplierParams interface
- `frontend/src/components/forms/OrderItemForm.tsx` - searchSuppliers now reads fabricId from form and passes to API
- `frontend/src/pages/orders/components/OrderItemFormModal.tsx` - Same fabricId filtering applied for consistency
- `scripts/run-full-import-test.ts` - Added createCustomerIfNotExists() with GET search + exact match dedup

## Decisions Made
- Dynamic fabricId read from form at search time via `form.getFieldValue()` rather than reactive prop -- avoids unnecessary re-renders and complexity
- Manual duplicate check for customers since Customer table has no unique constraint on companyName -- search by keyword then exact string match

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Applied fabricId filter to OrderItemFormModal**
- **Found during:** Task 2 (Wire fabricId filter in OrderItemForm)
- **Issue:** OrderItemFormModal also has a SupplierSelector without fabricId filtering, inconsistent with OrderItemForm
- **Fix:** Moved searchSuppliers into ItemFormFields component as useCallback, reads fabricId from form
- **Files modified:** frontend/src/pages/orders/components/OrderItemFormModal.tsx
- **Verification:** Frontend build + typecheck pass
- **Committed in:** 26915b9 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** Ensures consistent supplier filtering across both order item forms. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- P1 UAT issues (supplier filtering, duplicate customers) resolved
- Ready for P2 UAT fixes or deployment phase

## Self-Check: PASSED

All 7 files verified present. All 3 commit hashes verified in git log.

---
*Phase: 10-uat-bug-fixes*
*Completed: 2026-03-27*
