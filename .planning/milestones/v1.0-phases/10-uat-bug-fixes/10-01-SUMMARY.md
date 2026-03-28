---
phase: 10-uat-bug-fixes
plan: 01
subsystem: ui, api
tags: [antd, order-status, quote-form, formatQuantity, modal]

# Dependency graph
requires:
  - phase: 09-real-data-testing
    provides: UAT bug findings (09-05-SUMMARY.md)
  - phase: 08-frontend-multi-category-pages
    provides: OrderItemTable, QuoteForm, ConfirmModal components
provides:
  - Fixed direct order creation default status (PENDING instead of INQUIRY)
  - Auto-fill unitPrice from defaultPrice in QuoteForm
  - Fixed unit duplication in quantity display
  - Fixed NaN purchase price display
  - Centered ConfirmModal dialog
affects: [order-workflow, quote-creation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Null guard pattern for optional price fields in table renderers"
    - "formatQuantity(qty, unit) single-call pattern (no manual unit append)"

key-files:
  created: []
  modified:
    - backend/src/order/order.service.ts
    - backend/src/order/order.service.spec.ts
    - frontend/src/components/forms/QuoteForm.tsx
    - frontend/src/pages/orders/components/OrderItemTable.tsx
    - frontend/src/components/common/ConfirmModal.tsx

key-decisions:
  - "Direct order creation uses PENDING status (not INQUIRY or ORDERED) — PENDING means 'awaiting supplier placement' which is correct for freshly created orders"
  - "Order delete check expanded to allow both INQUIRY and PENDING statuses"

patterns-established:
  - "Null guard before AmountDisplay: record.field != null ? <AmountDisplay /> : '-'"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 10 Plan 01: UAT Bug Fixes Summary

**5 surgical fixes for P0/P2 UAT bugs: order default status, price auto-fill, unit dedup, NaN guard, modal centering**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-27T10:13:34Z
- **Completed:** 2026-03-27T10:21:06Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments
- Direct order creation now uses PENDING status instead of INQUIRY, with delete check updated accordingly
- QuoteForm auto-fills unitPrice from product's defaultPrice on selection (matching OrderItemForm pattern)
- OrderItemTable quantity column no longer duplicates unit display ("500.00 米" not "500.00 米 米")
- Purchase price column shows "-" instead of "NaN" when value is null/undefined
- ConfirmModal dialog centered on screen via Ant Design centered prop

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix order default status from INQUIRY to PENDING** - `adf7dbf` (fix)
2. **Task 2: Auto-fill unitPrice when selecting fabric/product in QuoteForm** - `a3be907` (fix)
3. **Task 3: Fix unit duplication + NaN purchase price in OrderItemTable** - `3fd09ad` (fix)
4. **Task 4: Center the quote-to-order conversion dialog** - `c0ec583` (fix)

## Files Created/Modified
- `backend/src/order/order.service.ts` - Changed default order/item status from INQUIRY to PENDING, expanded delete check
- `backend/src/order/order.service.spec.ts` - Updated 5 test expectations for new PENDING default and expanded delete conditions
- `frontend/src/components/forms/QuoteForm.tsx` - Added unitPrice auto-fill from defaultPrice on product selection
- `frontend/src/pages/orders/components/OrderItemTable.tsx` - Fixed formatQuantity call, added null guard for purchasePrice
- `frontend/src/components/common/ConfirmModal.tsx` - Added centered prop to Modal

## Decisions Made
- Used PENDING instead of ORDERED for direct order creation default — PENDING ('待下单') is semantically correct for a newly created order that hasn't been placed with suppliers yet. The plan referenced "CONFIRMED" which doesn't exist in the enum; ORDERED ('已下单') would be premature.
- Expanded the order delete check to allow both INQUIRY and PENDING statuses, ensuring newly created direct orders remain deletable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated order delete check for new default status**
- **Found during:** Task 1 (Fix order default status)
- **Issue:** The `remove()` method only allowed deleting orders with INQUIRY status. Changing default to PENDING would make newly created direct orders undeletable.
- **Fix:** Expanded the atomic delete condition to accept both INQUIRY and PENDING statuses
- **Files modified:** backend/src/order/order.service.ts, backend/src/order/order.service.spec.ts
- **Verification:** All 63 order.service.spec tests pass
- **Committed in:** adf7dbf (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for correctness — without it, direct orders would be undeletable. No scope creep.

## Issues Encountered
- Plan referenced "CONFIRMED" status which doesn't exist in the OrderItemStatus enum. Mapped to PENDING based on business logic analysis (ORDERED would be premature for newly created orders).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 UAT P0/P2 bugs fixed and verified
- Backend build + order tests pass (63/63)
- Frontend build + typecheck pass
- Ready for Plan 02 (supplier filtering, data cleanup, address layout)

---
*Phase: 10-uat-bug-fixes*
*Completed: 2026-03-27*
