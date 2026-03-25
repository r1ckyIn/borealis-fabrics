---
phase: 07-order-quote-multi-category-extension
plan: 03
subsystem: api, database
tags: [quote, order, conversion, partial-conversion, redis-lock, xor-constraint]

requires:
  - phase: 07-order-quote-multi-category-extension
    provides: QuoteItem table, multi-item CRUD, QuoteStatus.PARTIALLY_CONVERTED, batchConvertToOrder transitional
provides:
  - ConvertQuoteItemsDto with quoteItemIds[] for item-level conversion
  - convertQuoteItems service method with partial conversion logic
  - Quote status transitions: active -> partially_converted -> converted
  - Scheduler expiration for both active and partially_converted quotes
  - POST /quotes/convert-items endpoint replacing batch-convert and single-convert
affects: [08-frontend-multi-category]

tech-stack:
  added: []
  patterns:
    - "Item-level partial conversion: select QuoteItems -> create OrderItems -> track isConverted per item"
    - "Quote status from item state: allConverted ? CONVERTED : PARTIALLY_CONVERTED"
    - "Dual supplier lookup: fabricSupplierMap + productSupplierMap for mixed-category orders"

key-files:
  created: []
  modified:
    - backend/src/quote/dto/convert-quote.dto.ts
    - backend/src/quote/dto/index.ts
    - backend/src/quote/quote.service.ts
    - backend/src/quote/quote.controller.ts
    - backend/src/quote/quote.service.spec.ts
    - backend/src/quote/quote.controller.spec.ts
    - backend/src/fabric/fabric.service.spec.ts

key-decisions:
  - "OrderWithItems local type alias for Order + items relation (strict TS requires explicit typing for included relations)"
  - "Validations run before Redis lock acquisition (fail fast, avoid unnecessary locks)"
  - "Timeline remark: 'Converted from quote item' (distinguishes from direct order creation)"

patterns-established:
  - "Item-level conversion: ConvertQuoteItemsDto with quoteItemIds[] replaces quote-level ConvertQuotesToOrderDto"
  - "Partial conversion status derivation: query all items after marking converted, check every() for final status"

requirements-completed: [MCAT-08]

duration: 10min
completed: 2026-03-25
---

# Phase 07 Plan 03: Quote-to-Order Item-Level Partial Conversion Summary

**Item-level partial quote conversion with ConvertQuoteItemsDto, dual fabric/product supplier auto-fill, and scheduler expiring both active and partially_converted quotes**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-25T06:51:56Z
- **Completed:** 2026-03-25T07:02:38Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Replaced all-or-nothing batchConvertToOrder with item-level convertQuoteItems supporting partial conversion
- Quote status transitions correctly: active -> partially_converted (subset) -> converted (all items)
- Dual supplier auto-fill from cheapest FabricSupplier and ProductSupplier for mixed-category orders
- Scheduler updated to expire both active and partially_converted quotes past validUntil
- 792 backend tests passing (64 quote tests, 104 fabric tests, all others green)

## Task Commits

Each task was committed atomically:

1. **Task 1: ConvertQuoteItemsDto + convertQuoteItems service + scheduler update** - `bc8d7cf` (feat)
2. **Task 2: Full backend verification + fabric spec fix** - `a5899fe` (fix)

## Files Created/Modified
- `backend/src/quote/dto/convert-quote.dto.ts` - ConvertQuoteItemsDto with quoteItemIds[] and optional orderId
- `backend/src/quote/dto/index.ts` - Export ConvertQuoteItemsDto (removed ConvertQuotesToOrderDto)
- `backend/src/quote/quote.service.ts` - convertQuoteItems method, updated markExpiredQuotes, removed batchConvertToOrder/convertToOrder
- `backend/src/quote/quote.controller.ts` - POST convert-items endpoint, removed batch-convert and :id/convert-to-order
- `backend/src/quote/quote.service.spec.ts` - 15 new convertQuoteItems tests, updated markExpiredQuotes test
- `backend/src/quote/quote.controller.spec.ts` - convertQuoteItems controller tests, removed old conversion tests
- `backend/src/fabric/fabric.service.spec.ts` - Fixed quoteItem mock (quote.count -> quoteItem.count from Plan 02 schema change)

## Decisions Made
- Used `OrderWithItems` local type alias (`Order & { items: OrderItem[] }`) for the order variable in convertQuoteItems because strict TypeScript requires explicit typing when accessing included relations from Prisma create/findUniqueOrThrow
- Validations (item existence, same quote, status check, expiration check, already-converted check) all run before Redis lock acquisition to fail fast and avoid unnecessary locks
- Timeline entries use remark 'Converted from quote item' to distinguish from direct order creation timelines

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript strict mode requires explicit typing for Order with items relation**
- **Found during:** Task 1 (build verification)
- **Issue:** `order.items` access in timeline creation failed because `Order` type from `@prisma/client` doesn't include `items` relation. TypeScript strict mode rejects implicit `any`.
- **Fix:** Added `OrderWithItems` type alias (`Order & { items: OrderItem[] }`) and typed the local variable accordingly.
- **Files modified:** `backend/src/quote/quote.service.ts`
- **Verification:** TypeScript build passes with 0 errors
- **Committed in:** `bc8d7cf` (Task 1 commit)

**2. [Rule 3 - Blocking] fabric.service.spec.ts mock missing quoteItem (schema change from Plan 02)**
- **Found during:** Task 2 (full test suite verification)
- **Issue:** `fabric.service.ts` was updated in Plan 02 to use `quoteItem.count` instead of `quote.count`, but the test mock still referenced `quoteMock` mapped to `quote:` in the mock service. 5 tests failed with `TypeError: Cannot read properties of undefined (reading 'count')`.
- **Fix:** Renamed `quoteMock` to `quoteItemMock` and changed `quote: quoteMock` to `quoteItem: quoteItemMock` in the mock Prisma service.
- **Files modified:** `backend/src/fabric/fabric.service.spec.ts`
- **Verification:** All 104 fabric service tests passing
- **Committed in:** `a5899fe` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both auto-fixes necessary for correct compilation and test execution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 07 backend complete: OrderItem and QuoteItem support fabric XOR product, item-level partial conversion, scheduler handles all statuses
- Ready for Phase 08 (Frontend Multi-Category Pages) to build UI for product items and item-level conversion
- 792 backend tests passing, build + lint clean

## Self-Check: PASSED

- All 8 created/modified files verified on disk
- Both task commits verified in git history (bc8d7cf, a5899fe)
- All 12 acceptance criteria verified (DTO, service, controller, exports)
- 792 backend tests passing, build + lint clean

---
*Phase: 07-order-quote-multi-category-extension*
*Completed: 2026-03-25*
