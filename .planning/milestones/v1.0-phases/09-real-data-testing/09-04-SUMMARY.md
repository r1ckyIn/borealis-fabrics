---
phase: 09-real-data-testing
plan: 04
status: complete
started: "2026-03-27T03:00:00.000Z"
completed: "2026-03-27T03:30:00.000Z"
---

# Plan 09-04 Summary: Fix SalesContractImportStrategy Bugs

## What was built

Fixed 5 cascading bugs in SalesContractImportStrategy that caused 0 successful imports from all 8 real sales contract/customer order files.

## Key changes

### Task 1: Column constants + summary row skipping
- Replaced all fabric variant column constants to match real file layout (col 1=empty, col 2=商品名称, col 3=面料名称, col 10=数量, col 11=单价)
- Replaced all product variant column constants (col 3=品名, col 6=数量, col 7=单价)
- Added summary row (合计) and contract clause row (二、...九、) skipping in both validateFabricRow and validateProductRow
- Updated test helpers to create 15-column worksheets matching real file layout
- Added 4 new test cases for summary row skipping

### Task 2: Customer metadata regex + resolution
- Added '需方' to customer metadata label matching (real files use '需方：' not '买方')
- Fixed regex from broken character class `[买方客户]` to correct alternation `(?:买方|需方|客户)`
- Added post-getExistingKeys() customer ID resolution — after entity maps are loaded, pending customer name is resolved to ID via setCustomerId()
- Added descriptive BadRequestException when customer not found in system

## Deviations

- Removed unused Logger import and field from strategy (was never used, caused TS warning)
- Removed PRODUCT_COL_FACTORY_MODEL and PRODUCT_COL_MATERIAL constants (documented in comments but not imported by the strategy)

## Verification

- 21/21 sales contract import tests pass (including 4 new summary skipping tests)
- 151/151 total import tests pass (6 suites, no regressions)
- Backend build: pass
- Backend lint: 0 errors (2 pre-existing warnings)

## Key files

### key-files.created
- (none — all modifications to existing files)

### key-files.modified
- backend/src/import/strategies/sales-contract-import.strategy.ts
- backend/src/import/strategies/sales-contract-import.strategy.spec.ts
- backend/src/import/import.service.ts

## Self-Check: PASSED
- [x] Column constants match real file layout per 09-GAP-RESEARCH.md
- [x] Summary rows produce { valid: false, skipped: true }
- [x] Customer regex matches '需方：' label
- [x] Customer ID resolved after getExistingKeys()
- [x] All tests pass, build succeeds
