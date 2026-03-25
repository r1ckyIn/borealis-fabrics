---
phase: 07-order-quote-multi-category-extension
plan: 01
subsystem: database, api
tags: [prisma, class-validator, order, quote, xor-constraint, migration]

requires:
  - phase: 05-multi-category-schema-product-crud
    provides: Product model, ProductSupplier association, ProductSubCategory enum
provides:
  - OrderItem with nullable fabricId + productId (XOR constraint at DB + app level)
  - QuoteItem table with multi-item support for Quote model
  - IsXorWith reusable class-validator decorator
  - IsIntegerWhenFieldPresent reusable class-validator decorator
  - getUnitForProduct utility for unit derivation from subCategory
  - PRODUCT_SELECT and product relation in order includes
  - validateProductExists validator
  - Product-aware validateOrderItemReferences
affects: [07-02-quote-restructure, 07-03-quote-conversion, 08-frontend-multi-category]

tech-stack:
  added: []
  patterns:
    - "XOR constraint: DB CHECK + IsXorWith decorator + service-level guard (triple defense)"
    - "Conditional integer validation: IsIntegerWhenFieldPresent custom decorator"
    - "Product supplier auto-fill: cheapest ProductSupplier pattern (mirrors FabricSupplier)"
    - "Unit derivation: centralized UNIT_BY_SUB_CATEGORY mapping utility"

key-files:
  created:
    - backend/src/common/validators/xor-field.validator.ts
    - backend/src/common/validators/integer-quantity.validator.ts
    - backend/src/common/utils/product-units.ts
    - backend/prisma/migrations/20260325061811_extend_order_quote_multi_category/migration.sql
  modified:
    - backend/prisma/schema.prisma
    - backend/src/order/dto/add-order-item.dto.ts
    - backend/src/order/dto/update-order-item.dto.ts
    - backend/src/order/order-item.service.ts
    - backend/src/order/order.validators.ts
    - backend/src/order/order.includes.ts
    - backend/src/order/order.service.ts
    - backend/src/order/order-item.service.spec.ts

key-decisions:
  - "NoAction FK referential action for fabricId/productId to allow MySQL CHECK constraints (RESTRICT/CASCADE conflict with CHECK)"
  - "IsIntegerWhenFieldPresent custom decorator instead of @ValidateIf on quantity field (avoids class-validator AND-logic issue with multiple @ValidateIf)"
  - "Single Prisma migration with data migration SQL for existing quotes to QuoteItem table"

patterns-established:
  - "IsXorWith decorator: reusable XOR constraint validator for any two fields"
  - "IsIntegerWhenFieldPresent decorator: conditional integer validation when trigger field present"
  - "Product auto-fill: cheapest ProductSupplier lookup, null when no supplier exists"

requirements-completed: [MCAT-07]

duration: 16min
completed: 2026-03-25
---

# Phase 07 Plan 01: OrderItem Multi-Category Extension Summary

**OrderItem extended with fabricId XOR productId, QuoteItem table created, XOR enforced at DB CHECK + DTO + service levels, product supplier auto-fill from cheapest ProductSupplier**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-25T06:12:45Z
- **Completed:** 2026-03-25T06:29:07Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Prisma schema migration: OrderItem gets nullable fabricId + productId with CHECK constraint, QuoteItem table created, Quote becomes header-only
- Existing quote data migrated to QuoteItem table via SQL INSERT in migration
- Reusable IsXorWith and IsIntegerWhenFieldPresent class-validator decorators
- Product-aware addOrderItem with XOR validation, supplier auto-fill, and unit derivation
- All 119 order module tests passing (28 in order-item.service alone, 4 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema migration** - `2a0ab17` (feat)
2. **Task 2: Shared utilities + OrderItem DTOs** - `5850078` (feat)
3. **Task 3: OrderItem service + validators + includes** - `32f15e7` (feat)

## Files Created/Modified
- `backend/prisma/schema.prisma` - OrderItem: fabricId nullable, add productId/unit/quoteItemId; Quote: header-only; QuoteItem: new table
- `backend/prisma/migrations/.../migration.sql` - Schema migration with data migration and CHECK constraints
- `backend/src/common/validators/xor-field.validator.ts` - Reusable IsXorWith decorator
- `backend/src/common/validators/integer-quantity.validator.ts` - IsIntegerWhenFieldPresent decorator for product integer quantities
- `backend/src/common/utils/product-units.ts` - FABRIC_UNIT, UNIT_BY_SUB_CATEGORY, getUnitForProduct
- `backend/src/order/dto/add-order-item.dto.ts` - fabricId optional, add productId with XOR, unit field, integer quantity validation
- `backend/src/order/dto/update-order-item.dto.ts` - add productId, unit fields, integer quantity validation
- `backend/src/order/order-item.service.ts` - XOR validation, product supplier auto-fill, unit derivation
- `backend/src/order/order.validators.ts` - validateProductExists, updated validateOrderItemReferences
- `backend/src/order/order.includes.ts` - PRODUCT_SELECT, product relation in all includes
- `backend/src/order/order.service.ts` - Handle productId in create, validate product IDs
- `backend/src/order/order-item.service.spec.ts` - 4 new tests for product-aware behavior

## Decisions Made
- Used `NoAction` FK referential action (not `Restrict` or `SetNull`) for fabricId/productId on OrderItem and QuoteItem to avoid MySQL 8.0 CHECK constraint conflict with FK referential actions
- Created `IsIntegerWhenFieldPresent` custom decorator instead of using multiple `@ValidateIf` on the quantity field, because class-validator evaluates multiple `@ValidateIf` on the same property with AND logic, which breaks conditional validation groups
- Single Prisma migration with inline data migration SQL to move existing quote data to QuoteItem table before dropping columns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MySQL CHECK constraint + FK referential action conflict**
- **Found during:** Task 1 (Prisma migration)
- **Issue:** MySQL 8.0 rejects CHECK constraints on columns that are part of FK constraints with `SET NULL` or `CASCADE` referential actions. The original FK on `order_items.fabric_id` used default `SET NULL` action.
- **Fix:** Changed FK referential actions to `NoAction` for fabricId and productId on both OrderItem and QuoteItem. This is semantically correct (prevent deletion of referenced entities) and compatible with CHECK constraints.
- **Files modified:** `backend/prisma/schema.prisma`, migration SQL
- **Verification:** Migration applied successfully on shadow DB and dev DB
- **Committed in:** `2a0ab17` (Task 1 commit)

**2. [Rule 3 - Blocking] class-validator @ValidateIf AND-logic prevents dual validation groups**
- **Found during:** Task 2 (DTO validation)
- **Issue:** Plan specified using two `@ValidateIf` decorators on the quantity field to gate integer vs decimal validation. However, class-validator evaluates multiple `@ValidateIf` on the same property with AND logic, meaning both conditions must be true -- which never happens for XOR fields.
- **Fix:** Created `IsIntegerWhenFieldPresent` custom decorator that internally checks the trigger field presence before enforcing integer validation. Applied to quantity field alongside existing `@IsNumber` decorators.
- **Files modified:** `backend/src/common/validators/integer-quantity.validator.ts`, `backend/src/order/dto/add-order-item.dto.ts`, `backend/src/order/dto/update-order-item.dto.ts`
- **Verification:** TypeScript compiles, tests pass
- **Committed in:** `5850078` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both auto-fixes necessary for correct functionality. No scope creep. The custom decorator approach is cleaner than the plan's dual-@ValidateIf proposal.

## Issues Encountered
- Expected TypeScript compilation errors in `quote.service.ts`, `quote.service.spec.ts`, `fabric.service.ts` due to Quote schema restructure (fabricId/quantity/unitPrice removed from Quote). These are in Plan 07-02 scope and do not affect the order module.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- OrderItem model and service fully support product items alongside fabric items
- QuoteItem table exists and has CHECK constraint, ready for Plan 07-02 (Quote service restructure)
- Quote.service.ts and related files have expected compilation errors that Plan 07-02 will resolve
- Shared validators (IsXorWith, IsIntegerWhenFieldPresent) and utility (getUnitForProduct) ready for reuse

## Self-Check: PASSED

- All 5 created files verified on disk
- All 3 task commits verified in git history (2a0ab17, 5850078, 32f15e7)
- 119 order module tests passing
- Prisma schema valid

---
*Phase: 07-order-quote-multi-category-extension*
*Completed: 2026-03-25*
