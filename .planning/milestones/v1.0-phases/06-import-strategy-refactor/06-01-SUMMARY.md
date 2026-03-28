---
phase: 06-import-strategy-refactor
plan: 01
subsystem: api
tags: [import, exceljs, prisma, strategy-pattern, product]

# Dependency graph
requires:
  - phase: 05-multi-category-schema-product-crud
    provides: Product model, ProductSupplier model, CodeGeneratorService with product prefixes
provides:
  - ProductImportStrategy class implementing ImportStrategy interface
  - Updated ImportStrategy interface with getRowKey() method
  - Backward-compatible getRowKey() on FabricImportStrategy and SupplierImportStrategy
  - ImportService uses strategy.getRowKey() for composite batch key dedup
affects: [06-02, 07, 08]

# Tech tracking
tech-stack:
  added: []
  patterns: [composite-key-dedup, strategy-supplier-preload, failure-not-skip-for-products]

key-files:
  created:
    - backend/src/import/strategies/product-import.strategy.ts
    - backend/src/import/strategies/product-import.strategy.spec.ts
  modified:
    - backend/src/import/strategies/import-strategy.interface.ts
    - backend/src/import/strategies/fabric-import.strategy.ts
    - backend/src/import/strategies/supplier-import.strategy.ts
    - backend/src/import/import.service.ts
    - backend/src/import/import.service.spec.ts

key-decisions:
  - "Composite key separator :: for modelNumber+name dedup"
  - "DB duplicates reported as failures (not skips) per user decision"
  - "Supplier map pre-loaded as side effect of getExistingKeys() lifecycle"

patterns-established:
  - "Composite key dedup: strategies with multi-field uniqueness use getRowKey() with :: separator"
  - "Supplier preload pattern: load supplier name-to-id map in getExistingKeys() for validateRow() to reference"
  - "Underscore-prefixed passthrough fields: _supplierName, _purchasePrice passed through transformRow to createBatch"

requirements-completed: [MCAT-06, DATA-08]

# Metrics
duration: 8min
completed: 2026-03-25
---

# Phase 06 Plan 01: ProductImportStrategy Summary

**ProductImportStrategy with composite modelNumber::name dedup, subCategory validation, supplier lookup, and transactional Product+ProductSupplier batch creation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-25T03:17:18Z
- **Completed:** 2026-03-25T03:25:28Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended ImportStrategy interface with getRowKey() for composite batch key support
- Created ProductImportStrategy with 8-column template (subCategory, modelNumber, name, specification, defaultPrice, supplierName, purchasePrice, notes)
- Implemented composite key dedup (modelNumber::name) with DB duplicates as failures (not skips)
- Added subCategory-to-Category auto-derivation and subCategory-to-CodePrefix mapping
- Pre-loaded supplier name-to-id map for row-level supplier validation
- Transactional createBatch with Product + ProductSupplier atomic creation
- 24 new unit tests + 2 getRowKey tests, all 88 import tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getRowKey to ImportStrategy interface + update existing strategies** - `17d1c1b` (feat)
   - TDD RED: tests failing (getRowKey not a function)
   - TDD GREEN: interface extended, strategies implement getRowKey, ImportService uses strategy.getRowKey()
2. **Task 2: Create ProductImportStrategy with full unit tests** - `8da7d8f` (feat)
   - TDD RED: `70d6aab` (test) - 24 failing tests (module not found)
   - TDD GREEN: `8da7d8f` (feat) - strategy implementation, all 24 tests pass

## Files Created/Modified
- `backend/src/import/strategies/import-strategy.interface.ts` - Added getRowKey() to ImportStrategy interface
- `backend/src/import/strategies/fabric-import.strategy.ts` - Implemented getRowKey returning fabricCode
- `backend/src/import/strategies/supplier-import.strategy.ts` - Implemented getRowKey returning companyName
- `backend/src/import/import.service.ts` - Replaced getCellValue(row, 1) with strategy.getRowKey(row)
- `backend/src/import/import.service.spec.ts` - Added 2 getRowKey tests, fixed async lint issues
- `backend/src/import/strategies/product-import.strategy.ts` - New ProductImportStrategy class
- `backend/src/import/strategies/product-import.strategy.spec.ts` - 24 unit tests for ProductImportStrategy

## Decisions Made
- Composite key separator `::` chosen for modelNumber+name (avoids collision with common characters)
- DB duplicates return failure (not skip) per user decision from 06-CONTEXT.md
- Supplier map pre-loaded as side effect of getExistingKeys() to follow existing lifecycle (getExistingKeys called once before validateRow calls)
- Underscore-prefixed fields (_supplierName, _purchasePrice) used to pass supplier data through transformRow to createBatch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed lint errors in import.service.spec.ts**
- **Found during:** Task 1
- **Issue:** Two getRowKey test functions declared as `async` but contained no `await` expressions, causing eslint @typescript-eslint/require-await error
- **Fix:** Removed `async` keyword from the two test functions
- **Files modified:** backend/src/import/import.service.spec.ts
- **Verification:** `pnpm lint` passes with 0 errors
- **Committed in:** 8da7d8f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor lint fix. No scope creep.

## Issues Encountered
- Jest 30+ requires `--testPathPatterns` (not `--testPathPattern`) -- used correct flag per project CLAUDE.md guidance

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ProductImportStrategy ready to be registered in ImportModule (Plan 02)
- Template download endpoint and dry-run support to be added in Plan 02
- All existing import functionality backward-compatible

## Self-Check: PASSED

All 7 key files verified present. All 3 task commits verified in git log.

---
*Phase: 06-import-strategy-refactor*
*Completed: 2026-03-25*
