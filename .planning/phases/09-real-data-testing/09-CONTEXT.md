# Phase 9: Real Data Testing - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

End-to-end validation of the system using real company documents from `/Users/qinyuan/Desktop/铂润测试资料/`. Covers manual data entry of a complete business chain, Excel import of ALL 13 xlsx files (not just core types), and system stability verification after bulk data import. Includes building new import templates for purchase orders (采购单) and sales contracts (购销合同/客户订单).

</domain>

<decisions>
## Implementation Decisions

### Test document scope
- All 13 xlsx files in 铂润测试资料 must be tested — no skipping
- Files include: 面料价格明细, 铁架电机价格, 3x 海宁优途采购单, 2x 购销合同, 6x 客户订单(77947/77955/77962 系列面料+铁架)
- Manual entry test should be as thorough as possible — multiple scenarios including pure fabric orders, mixed orders (fabric + iron frame), quote-to-order conversion

### New import templates needed
- **Purchase order import (采购单):** Parse 海宁优途-采购单 format → create both products/prices AND purchase orders (Order records with OrderItems)
- **Sales contract import (购销合同):** Parse 购销合同 format → create both contract metadata AND sales orders
- **Customer order import (客户订单):** Parse 77947/77955/77962 series xlsx → create orders with associated items
- Two-stage import workflow: first import base data (suppliers/customers/products), then import orders that reference them

### Import association handling
- Two-stage import: base entities first (supplier/customer/product), then orders
- If referenced entity doesn't exist during order import → report error and skip that row
- User must import base data before importing orders

### Test environment and data management
- Claude's Discretion: choose best practice for test database setup and data retention after testing

### Acceptance criteria
- Data completeness: imported records count and field values must match source Excel — no data loss, no garbled text
- Functional usability: imported data must display, search, and edit correctly in frontend pages
- Page stability (DATA-07): Claude runs automated checks first (traverse all frontend routes, check for 500/404/console errors), then user does manual sampling verification

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Import system
- `backend/src/import/strategies/fabric-import.strategy.ts` — Existing fabric import pattern to follow
- `backend/src/import/strategies/product-import.strategy.ts` — Existing product import pattern
- `backend/src/import/strategies/supplier-import.strategy.ts` — Existing supplier import pattern
- `backend/src/import/strategies/import-strategy.interface.ts` — Import strategy interface contract

### Test data
- `/Users/qinyuan/Desktop/铂润测试资料/` — All 13 xlsx files + PDF documents (real company data)
- `docs/reference/backend-types-reference.md` — Backend API, enum, entity type reference

### Architecture
- `docs/ARCHITECTURE.md` — System architecture and module dependencies
- `.planning/REQUIREMENTS.md` — DATA-03 through DATA-07 requirement details

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Import module with strategy pattern: `backend/src/import/` — add new strategies following existing interface
- Fabric/Product/Supplier import strategies as reference implementations
- Import controller with dry-run mode and per-row error reporting (DATA-08, DATA-09 already complete)

### Established Patterns
- Import strategies implement `ImportStrategy` interface with `validate()` and `execute()` methods
- Excel parsing uses ExcelJS library (already a backend dependency)
- Dry-run mode validates without writing to DB
- Per-row failure details (row number + reason) in import results

### Integration Points
- New import strategies register in ImportModule
- Frontend import page already supports strategy selection
- Order creation connects to OrderModule (existing CRUD)

</code_context>

<specifics>
## Specific Ideas

- Two-stage import is critical: base data (suppliers, customers, products) must exist before order import can reference them
- All 13 xlsx files tested means edge cases in different document formats will be caught
- Page stability check combines automated route traversal + manual user sampling

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-real-data-testing*
*Context gathered: 2026-03-26*
