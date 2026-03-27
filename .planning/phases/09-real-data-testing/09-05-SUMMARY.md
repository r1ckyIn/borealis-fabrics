---
phase: 09-real-data-testing
plan: 05
status: complete
started: "2026-03-27T08:00:00.000Z"
completed: "2026-03-27T10:40:00.000Z"
---

# Plan 09-05 Summary: Verification & UAT Results

## Automated Verification (Task 1)

Re-ran full import test (`run-full-import-test.ts`) against 13 real Excel files:

| Category | Files | Success | Skipped | Failed |
|----------|-------|---------|---------|--------|
| Suppliers | 1 | 0 | 17 (exist) | 0 |
| Fabrics | 2 | 0 | 171 (exist) | 0 |
| Products | 2 | 0 | 0 | 172 (dup) |
| Purchase Orders | 4 | 0 | 50 (exist) | 1 |
| Sales Contracts | 4 | 0 | 52 | 40 |
| Customer Orders | 4 | 0 | 24 | 28 |

**Plan 04 fixes confirmed working:**
- Column constants correct: errors now say "Fabric 'LEATHERGEL' not found" (reads correct column, not crash)
- Summary row skipping: 52+24=76 non-data rows correctly skipped (合计, contract clauses)
- Customer regex: '需方：Miraggo HomeLiving' successfully matched (no customer resolution error)
- Success = 0 because ALL fabric/product names in sales contracts don't match DB names (Bug 5, accepted)

## Manual UAT Results (Task 2 — Human Checkpoint)

**Core business chain: PASS** — Supplier→Customer→Fabric→Quote→Order flow completes end-to-end.

**Page stability (DATA-07): PASS** — All list pages load without errors.

### Issues Found (8 total, 4 high priority)

| # | Issue | Severity | Type | Page |
|---|-------|----------|------|------|
| 1 | Shipping address section layout too sparse, needs redesign | Low | UI improvement | Customer detail |
| 2 | Selecting fabric/product does not auto-fill defaultPrice | **High** | Feature gap | Quote create |
| 3 | Quote-to-order dialog should be centered Modal, not slide-out | Medium | UI improvement | Quote detail |
| 4 | Order item quantity shows unit twice: "500.00 米 米" | **High** | Display bug | Order detail |
| 5 | Duplicate customer records from import script re-runs (Miraggo HomeLiving ×3) | Medium | Data issue | Customer search |
| 6 | Supplier dropdown not filtered by fabric association — shows all suppliers | **High** | Feature gap | Order create |
| 7 | Iron frame purchase price shows ¥NaN; fabric/product type filter inconvenient | **High** | Display bug + UI | Order create |
| 8 | Direct order creation defaults to "询价中" status, should be "已下单" | **High** | Business logic bug | Order list |

### Root cause analysis

- **Issue 2**: Quote item form `onFabricSelect` / `onProductSelect` callback does not set the price field from `defaultPrice` / `salePrice`
- **Issue 4**: Unit label rendered both inline in quantity column AND as a separate suffix — double rendering
- **Issue 5**: Import script `run-full-import-test.ts` creates customer records every run without checking for existing ones
- **Issue 6**: Backend `GET /suppliers` API not filtered by fabric relationship; frontend shows all suppliers
- **Issue 7**: Iron frame product has no `purchasePrice` field or it's null, causing NaN when rendered
- **Issue 8**: Backend `createOrder` sets default status to `INQUIRY` instead of `CONFIRMED` / `ORDERED`

## Deviations

- "success > 0" acceptance criterion not met due to entity name mismatch (Bug 5, accepted per orchestrator)
- 8 UAT issues documented as future work items (not in Plan 04/05 scope)

## Self-Check: PASSED (with findings)
- [x] Plan 04 column/regex/customer fixes verified via re-import
- [x] Summary row skipping confirmed (76 rows skipped)
- [x] Core business chain manually tested end-to-end
- [x] Page stability verified (all pages load)
- [x] 8 issues documented with severity and root cause
