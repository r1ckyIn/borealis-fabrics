---
phase: 09-real-data-testing
plan: 01
subsystem: import
tags: [exceljs, data-prep, richtext, import-strategy, scripts]

# Dependency graph
requires:
  - phase: 06-import-strategy-refactor
    provides: ImportStrategy interface, FabricImportStrategy, ProductImportStrategy
provides:
  - Data preparation scripts for converting real Excel files to template format
  - RichText-safe detectStrategy in ImportService
  - scripts/tsconfig.json for standalone ts-node execution
affects: [09-real-data-testing]

# Tech tracking
tech-stack:
  added: [ts-node (scripts), exceljs (scripts)]
  patterns: [RichText header extraction in detectStrategy, standalone data-prep scripts]

key-files:
  created:
    - scripts/prepare-fabric-pricelist.ts
    - scripts/prepare-product-pricelist.ts
    - scripts/tsconfig.json
    - scripts/.gitignore
    - scripts/package.json
  modified:
    - backend/src/import/import.service.ts
    - backend/src/import/import.service.spec.ts
    - backend/src/import/import-edge-cases.spec.ts

key-decisions:
  - "RichText header extraction via richText.map(rt => rt.text).join('') in detectStrategy"
  - "Supplier abbreviation mapping as hardcoded constants in scripts (not DB lookup)"
  - "13 non-supplier sheets skipped in fabric script (exhibitions, samples, categories)"
  - "Product subCategory inferred from name keywords (IRON_FRAME, MOTOR, MATTRESS, ACCESSORY)"
  - "Dedup by modelNumber + name + supplier composite key for products"
  - "Scripts use own node_modules (exceljs + ts-node) independent of backend"

patterns-established:
  - "Data preparation script pattern: read real file -> getCellText helper -> write template-format xlsx"
  - "RichText-safe header extraction in all ImportService detection paths"

requirements-completed: [DATA-04, DATA-05]

# Metrics
duration: 12min
completed: 2026-03-27
---

# Phase 09 Plan 01: Data Preparation Scripts Summary

**Two conversion scripts (fabric 182 rows, product 172 rows) that transform real company Excel files into import template format, plus RichText-safe detectStrategy fix**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-27T02:13:29Z
- **Completed:** 2026-03-27T02:26:05Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Fixed detectStrategy to handle RichText-formatted header cells from real business Excel files
- Created fabric preparation script that processes all 27 sheets of 面料价格明细2025.8.15.xlsx, extracting 182 fabrics from 14 supplier sheets
- Created product preparation script that processes all 8 sheets of 铁架电机价格2025.xlsx, extracting 172 unique products with correct subCategory classification
- Both scripts handle RichText cells, formula cells, weight/width parsing, and merged cell patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix detectStrategy RichText handling + create scripts/tsconfig.json** - `5a9bd1d` (fix)
2. **Task 2: Create fabric price list preparation script** - `f751e02` (feat)
3. **Task 3: Create product price list preparation script** - `f8079c9` (feat)

## Files Created/Modified
- `backend/src/import/import.service.ts` - Added RichText handling in detectStrategy header extraction
- `backend/src/import/import.service.spec.ts` - Added RichText header detection test + new strategy providers
- `backend/src/import/import-edge-cases.spec.ts` - Added new strategy providers to test module
- `scripts/tsconfig.json` - TypeScript config for standalone scripts (ES2020, commonjs, node types)
- `scripts/prepare-fabric-pricelist.ts` - Converts 面料价格明细 (27 sheets) to template format (343 lines)
- `scripts/prepare-product-pricelist.ts` - Converts 铁架电机价格 (8 sheets) to template format (562 lines)
- `scripts/package.json` - Dependencies for scripts (exceljs, ts-node, typescript)
- `scripts/.gitignore` - Ignores node_modules, dist, output xlsx files

## Decisions Made
- Used hardcoded supplier abbreviation mapping in scripts (not DB lookup) since this is a one-time conversion
- Skipped 13 non-supplier sheets in fabric script (exhibitions, samples, category reference sheets)
- Inferred subCategory from product name keywords rather than requiring manual classification
- Used composite dedup key (modelNumber + name + supplier) for products to allow same product from different suppliers
- Scripts have independent node_modules to avoid coupling with backend build

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added new strategy providers to test modules**
- **Found during:** Task 3 (verifying overall import tests)
- **Issue:** import.service.ts was modified externally to include PurchaseOrderImportStrategy and SalesContractImportStrategy, breaking existing test modules that didn't provide these
- **Fix:** Added PurchaseOrderImportStrategy, SalesContractImportStrategy imports and providers to import.service.spec.ts and import-edge-cases.spec.ts, plus customer/order/orderItem mocks
- **Files modified:** backend/src/import/import.service.spec.ts, backend/src/import/import-edge-cases.spec.ts
- **Verification:** All 147 import tests pass across 6 suites
- **Committed in:** f8079c9 (Task 3 commit)

**2. [Rule 3 - Blocking] Pre-existing strategy files accidentally committed in Task 2**
- **Found during:** Task 2 commit
- **Issue:** Pre-existing untracked files (purchase-order-import.strategy.ts/spec.ts, sales-contract-import.strategy.ts/spec.ts) were included in the Task 2 commit alongside scripts files
- **Fix:** No rollback needed; these files are required by the modified import.service.ts and belong to the phase
- **Impact:** Files committed earlier than planned but correct and needed

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Auto-fixes resolved test infrastructure compatibility. No scope creep.

## Issues Encountered
- Jest 30 uses `--testPathPatterns` (plural) not `--testPathPattern` (singular) -- adjusted test commands accordingly
- scripts/tsconfig.json needed `"types": ["node"]` for Node.js global type definitions

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Template-format xlsx files ready in scripts/output/ for import testing
- detectStrategy handles RichText headers, enabling real converted files to be imported
- Plan 02 (purchase order import strategy) and Plan 03 (manual entry + stability testing) can proceed

## Self-Check: PASSED

All 8 files verified present. All 3 task commits verified (5a9bd1d, f751e02, f8079c9).

---
*Phase: 09-real-data-testing*
*Completed: 2026-03-27*
