---
phase: 09-real-data-testing
plan: 02
subsystem: import
tags: [exceljs, import-strategy, purchase-order, sales-contract, nestjs, react, ant-design]

# Dependency graph
requires:
  - phase: 06-import-strategy-refactor
    provides: ImportStrategy interface, strategy pattern, excel.utils
  - phase: 05-multi-category-schema-product-crud
    provides: Product model with category/subCategory, CodeGeneratorService prefixes
provides:
  - PurchaseOrderImportStrategy creating products+pricing AND Order+OrderItem from 采购单
  - SalesContractImportStrategy handling both 购销合同 and 客户订单 (8 files, same layout)
  - POST /import/purchase-orders and POST /import/sales-contracts endpoints
  - importNonStandardData() orchestration for non-standard Excel layouts
  - Frontend 4-tab import page (fabric, supplier, purchase order, sales contract)
affects: [09-real-data-testing, frontend-import]

# Tech tracking
tech-stack:
  added: []
  patterns: [non-standard-excel-import, self-customer-pattern, variant-detection]

key-files:
  created:
    - backend/src/import/strategies/purchase-order-import.strategy.ts
    - backend/src/import/strategies/purchase-order-import.strategy.spec.ts
    - backend/src/import/strategies/sales-contract-import.strategy.ts
    - backend/src/import/strategies/sales-contract-import.strategy.spec.ts
  modified:
    - backend/src/import/import.module.ts
    - backend/src/import/import.service.ts
    - backend/src/import/import.controller.ts
    - frontend/src/api/import.api.ts
    - frontend/src/pages/import/ImportPage.tsx
    - frontend/src/components/business/ImportResultModal.tsx

key-decisions:
  - "Self-customer pattern: purchase orders use a 铂润面料 customer record since Order requires customerId"
  - "Single SalesContractImportStrategy handles both 购销合同 and 客户订单 (same template layout)"
  - "Non-template tabs hide download button, show direct upload instructions instead"
  - "Prerequisite notice alert shown for order-type imports"

patterns-established:
  - "importNonStandardData(): headerRowNumber parameter for non-standard Excel layouts"
  - "setVariant()/setCustomerId() on strategy for per-file configuration"
  - "TEMPLATE_TABS array for conditional rendering of template vs direct upload UI"

requirements-completed: [DATA-06]

# Metrics
duration: 18min
completed: 2026-03-27
---

# Phase 09 Plan 02: Purchase Order & Sales Contract Import Summary

**Two dedicated import strategies for non-standard Excel layouts (采购单 creating products+orders, 购销合同/客户订单 creating orders referencing existing entities), with backend endpoints and 4-tab frontend import page**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-27T02:13:28Z
- **Completed:** 2026-03-27T02:31:28Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- PurchaseOrderImportStrategy: parses 海宁优途-采购单 format (row 4 headers, row 5+ data), creates Product+ProductSupplier pricing AND Order+OrderItem records atomically
- SalesContractImportStrategy: handles BOTH 购销合同 (2 files) AND 客户订单 (6 files) -- total 8 files sharing the same layout template, with fabric and product column variants
- Backend endpoints: POST /import/purchase-orders and POST /import/sales-contracts with identical file validation and dryRun support
- Frontend ImportPage extended from 2 tabs to 4 tabs with context-appropriate instructions per import type
- 37 new unit tests covering validation, transformation, entity lookups, and batch creation

## Task Commits

Each task was committed atomically:

1. **Task 1: PurchaseOrderImportStrategy + SalesContractImportStrategy with tests** - `f751e02` (feat -- committed by prior executor, verified by this plan)
2. **Task 2: Register strategies in ImportModule/Service/Controller + frontend tabs** - `abed0d1` (feat)

## Files Created/Modified

- `backend/src/import/strategies/purchase-order-import.strategy.ts` - Parses 采购单 format, creates products+prices+orders
- `backend/src/import/strategies/purchase-order-import.strategy.spec.ts` - 20 unit tests for PO import
- `backend/src/import/strategies/sales-contract-import.strategy.ts` - Parses 购销合同/客户订单, fabric and product variants
- `backend/src/import/strategies/sales-contract-import.strategy.spec.ts` - 17 unit tests for sales contract import
- `backend/src/import/import.module.ts` - Registered both new strategies as providers
- `backend/src/import/import.service.ts` - Added importNonStandardData(), importPurchaseOrders(), importSalesContracts()
- `backend/src/import/import.controller.ts` - Added POST purchase-orders and POST sales-contracts endpoints
- `frontend/src/api/import.api.ts` - Added importPurchaseOrders() and importSalesContracts() API functions
- `frontend/src/pages/import/ImportPage.tsx` - Extended to 4-tab layout with conditional instructions
- `frontend/src/components/business/ImportResultModal.tsx` - Extended importType to include purchaseOrder and salesContract

## Decisions Made

- **Self-customer pattern**: Purchase orders use a "铂润面料" Customer record for customerId since Order model requires a customer reference, but POs are TO suppliers not FROM customers
- **Single strategy for 8 files**: SalesContractImportStrategy handles both 购销合同 (2 files) and 客户订单 (6 files) since they use the exact same layout template per RESEARCH.md analysis
- **Variant detection**: Strategy uses setVariant() method called by ImportService after scanning the header row for '面料名称' vs '品名'
- **No template download for non-standard imports**: Purchase order and sales contract tabs show "direct upload" instructions since these import original business documents, not template-formatted files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended ImportResultModal importType union**
- **Found during:** Task 2 (frontend build)
- **Issue:** ImportResultModal.tsx typed importType as `'fabric' | 'supplier'`, new tabs passed `'purchaseOrder' | 'salesContract'` causing TS error
- **Fix:** Extended the type union and added Chinese labels for the new types
- **Files modified:** frontend/src/components/business/ImportResultModal.tsx
- **Verification:** Frontend builds and typecheck passes
- **Committed in:** abed0d1 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor type extension required for downstream component compatibility. No scope creep.

## Issues Encountered

- Task 1 strategies and tests were already committed by the prior 09-01 plan executor (commit f751e02), so Task 1 was verified rather than re-created
- Jest 30+ uses `--testPathPatterns` (plural) not `--testPathPattern` (singular), adjusted verification commands accordingly

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Import endpoints ready for real data testing in Plan 03
- Two-stage import workflow established: import base data (fabrics, suppliers, products) first, then import orders (purchase orders, sales contracts)
- All 147 import tests passing (6 suites)

## Self-Check: PASSED

All 11 expected files verified present. All commits (f751e02, abed0d1) verified in git log.

---
*Phase: 09-real-data-testing*
*Completed: 2026-03-27*
