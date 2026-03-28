---
phase: 07-order-quote-multi-category-extension
plan: 02
subsystem: api, database
tags: [quote, multi-item, dto, class-validator, xor-constraint, crud]

requires:
  - phase: 07-order-quote-multi-category-extension
    provides: QuoteItem table, IsXorWith decorator, IsIntegerWhenFieldPresent decorator, getUnitForProduct utility
provides:
  - Multi-item CreateQuoteDto with CreateQuoteItemDto children
  - QuoteService with multi-item CRUD (create, findAll, findOne, update, addItem, updateItem, removeItem)
  - QuoteController with item management endpoints (POST/PATCH/DELETE :id/items/:itemId)
  - QuoteStatus.PARTIALLY_CONVERTED enum value
  - UpdateQuoteItemDto with productId context for integer validation
  - recalculateQuoteTotal private method
  - Keyword search filter for quote list
affects: [07-03-quote-conversion, 08-frontend-multi-category]

tech-stack:
  added: []
  patterns:
    - "Header + items DTO pattern: CreateQuoteDto with nested CreateQuoteItemDto[] using @ValidateNested + @Type"
    - "Item management endpoints: POST :id/items, PATCH :id/items/:itemId, DELETE :id/items/:itemId"
    - "recalculateQuoteTotal: centralized total recalculation from item subtotals"
    - "UpdateQuoteItemDto includes productId context for DTO-level integer validation"

key-files:
  created:
    - backend/src/quote/dto/update-quote-item.dto.ts
  modified:
    - backend/src/quote/dto/create-quote.dto.ts
    - backend/src/quote/dto/update-quote.dto.ts
    - backend/src/quote/dto/query-quote.dto.ts
    - backend/src/quote/dto/index.ts
    - backend/src/quote/quote.service.ts
    - backend/src/quote/quote.controller.ts
    - backend/src/quote/quote.service.spec.ts
    - backend/src/quote/quote.controller.spec.ts
    - backend/src/system/enums/index.ts
    - backend/src/fabric/fabric.service.ts

key-decisions:
  - "IsIntegerWhenFieldPresent reused for quote item quantity validation (same pattern as OrderItem, not @ValidateIf dual approach)"
  - "UpdateQuoteItemDto includes productId as context field so DTO-level integer validation fires for non-fabric items"
  - "Update only allows validUntil + notes (item management via dedicated endpoints)"
  - "PARTIALLY_CONVERTED added to allowed statuses for update and delete operations"

patterns-established:
  - "Header + items nested DTO: @IsArray @ArrayMinSize(1) @ValidateNested({each: true}) @Type(() => ItemDto)"
  - "Item CRUD endpoints: POST :id/items, PATCH :id/items/:itemId, DELETE :id/items/:itemId"
  - "recalculateQuoteTotal pattern: aggregate subtotals after any item mutation"

requirements-completed: [MCAT-08]

duration: 14min
completed: 2026-03-25
---

# Phase 07 Plan 02: Quote Multi-Item Restructure Summary

**Quote DTOs rewritten for multi-item model with header+items pattern, QuoteService CRUD fully supports QuoteItem management, 56 quote tests passing**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-25T06:33:31Z
- **Completed:** 2026-03-25T06:47:50Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Quote DTOs restructured: CreateQuoteDto now accepts items[] array with CreateQuoteItemDto children (fabricId XOR productId per item)
- QuoteService fully rewritten for multi-item CRUD with create (transaction), addItem, updateItem, removeItem, recalculateQuoteTotal
- QuoteController extended with 3 new item management endpoints (POST/PATCH/DELETE)
- QuoteStatus enum extended with PARTIALLY_CONVERTED, system enums updated with Chinese label
- batchConvertToOrder updated to read items from quote.items relation (multi-item aware)
- 56 quote tests passing across 3 suites

## Task Commits

Each task was committed atomically:

1. **Task 1: Quote DTOs rewrite + QuoteStatus enum extension** - `feabd0a` (feat)
2. **Task 2: QuoteService rewrite + QuoteController update** - `3b49218` (feat)

## Files Created/Modified
- `backend/src/quote/dto/create-quote.dto.ts` - CreateQuoteItemDto + CreateQuoteDto with items[] array, QuoteStatus with PARTIALLY_CONVERTED
- `backend/src/quote/dto/update-quote.dto.ts` - Simplified to validUntil + notes only
- `backend/src/quote/dto/update-quote-item.dto.ts` - New DTO for item updates with productId context for integer validation
- `backend/src/quote/dto/query-quote.dto.ts` - Removed fabricId filter, added keyword search
- `backend/src/quote/dto/index.ts` - Updated exports with CreateQuoteItemDto, UpdateQuoteItemDto
- `backend/src/quote/quote.service.ts` - Full rewrite: multi-item create, addItem, updateItem, removeItem, recalculateQuoteTotal
- `backend/src/quote/quote.controller.ts` - 3 new item endpoints, updated Swagger docs
- `backend/src/quote/quote.service.spec.ts` - Rewritten for multi-item model, 33 tests
- `backend/src/quote/quote.controller.spec.ts` - Rewritten with item endpoint tests, 11 tests
- `backend/src/system/enums/index.ts` - Added partially_converted Chinese label
- `backend/src/fabric/fabric.service.ts` - Fixed quote count query (Quote.fabricId moved to QuoteItem)

## Decisions Made
- Used `IsIntegerWhenFieldPresent` decorator (established in Plan 01) instead of plan's `@ValidateIf` + `@IsInt` dual approach for quantity validation on non-fabric items. This avoids the class-validator AND-logic issue with multiple `@ValidateIf` on same property.
- `UpdateQuoteItemDto` includes `productId` as a context field so DTO-level integer validation fires for non-fabric product quantity updates (per user locked decision).
- Quote update now only allows `validUntil` and `notes` changes. Item management uses dedicated endpoints.
- `PARTIALLY_CONVERTED` added to allowed statuses for both `update` and `remove` operations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] fabric.service.ts quote count query broken by schema change**
- **Found during:** Task 1 (TypeScript check after DTO rewrite)
- **Issue:** `fabric.service.ts` line 256 queries `this.prisma.quote.count({ where: { fabricId: id } })` but Quote no longer has `fabricId` (moved to QuoteItem in Plan 01 migration)
- **Fix:** Changed to `this.prisma.quoteItem.count({ where: { fabricId: id } })` to query the correct table
- **Files modified:** `backend/src/fabric/fabric.service.ts`
- **Verification:** TypeScript compiles, build passes
- **Committed in:** `feabd0a` (Task 1 commit)

**2. [Rule 1 - Bug] IsIntegerWhenFieldPresent used instead of plan's dual @ValidateIf approach**
- **Found during:** Task 1 (DTO implementation)
- **Issue:** Plan specified `@ValidateIf((o) => !!o.productId) @IsInt()` for integer enforcement on non-fabric items, but Plan 01 Summary documented that class-validator evaluates multiple `@ValidateIf` on same property with AND logic, breaking conditional validation
- **Fix:** Used `IsIntegerWhenFieldPresent('productId')` decorator (established in Plan 01) instead
- **Files modified:** `backend/src/quote/dto/create-quote.dto.ts`, `backend/src/quote/dto/update-quote-item.dto.ts`
- **Verification:** TypeScript compiles, tests pass
- **Committed in:** `feabd0a` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness. Using IsIntegerWhenFieldPresent is consistent with Plan 01's established pattern. No scope creep.

## Issues Encountered
- git stash reverted working files during pre-existing lint check — required re-applying all Task 2 changes. No data loss, all changes recreated identically.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Quote module fully supports multi-item model (create, list, detail, update header, add/update/remove items)
- batchConvertToOrder is transitionally updated to read from quote.items, but Plan 03 will fully rewrite it for item-level conversion
- QuoteStatus.PARTIALLY_CONVERTED exists but no logic sets it yet (Plan 03 scope)
- 56 quote tests passing, build clean

## Self-Check: PASSED

- All 11 modified/created files verified on disk
- Both task commits verified in git history (feabd0a, 3b49218)
- 56 quote tests passing across 3 suites
- Backend build clean (0 errors)

---
*Phase: 07-order-quote-multi-category-extension*
*Completed: 2026-03-25*
