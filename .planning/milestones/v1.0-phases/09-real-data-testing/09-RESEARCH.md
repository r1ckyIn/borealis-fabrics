# Phase 9: Real Data Testing - Research

**Researched:** 2026-03-26
**Domain:** Excel import strategy development + end-to-end system validation with real company documents
**Confidence:** HIGH

## Summary

This phase validates the Borealis Fabrics system end-to-end using real company documents from `/Users/qinyuan/Desktop/铂润测试资料/`. The work divides into three tracks: (1) building new import strategies for document types not yet supported (purchase orders, sales contracts, customer orders), (2) converting the real 面料价格明细 and 铁架电机价格 price lists into formats the existing fabric/product import strategies can consume, and (3) manual entry testing + page stability verification after bulk import.

The core technical challenge is that the real Excel files are NOT in the system's import template format. The price lists use rich text headers (Chinese), supplier-grouped sheets, merged cells, and formula-based prices. The purchase orders and sales contracts are formatted business documents with metadata rows (company header, address, contact info) before the actual data table. New import strategies must handle these non-standard layouts, or alternatively, the data must be pre-processed into the existing template format.

Given the CONTEXT.md decision for two-stage import (base entities first, then orders), and that real documents have wildly different layouts per document type, the most practical approach is: (a) for price lists, pre-process into template format using a conversion script rather than building fragile per-supplier parsers, (b) for purchase orders / sales contracts / customer orders, build dedicated import strategies that understand the specific document layouts.

**Primary recommendation:** Build 3 new import strategies (PurchaseOrderImportStrategy, SalesContractImportStrategy, CustomerOrderImportStrategy) following the existing ImportStrategy interface pattern, plus a data preparation step for the non-standard price list Excel files.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All 13 xlsx files in 铂润测试资料 must be tested -- no skipping
- Files include: 面料价格明细, 铁架电机价格, 3x 海宁优途采购单, 2x 购销合同, 6x 客户订单(77947/77955/77962 series fabric+iron frame)
- Manual entry test should be as thorough as possible -- multiple scenarios including pure fabric orders, mixed orders (fabric + iron frame), quote-to-order conversion
- Purchase order import (采购单): Parse 海宁优途-采购单 format -> create both products/prices AND purchase orders (Order records with OrderItems)
- Sales contract import (购销合同): Parse 购销合同 format -> create both contract metadata AND sales orders
- Customer order import (客户订单): Parse 77947/77955/77962 series xlsx -> create orders with associated items
- Two-stage import workflow: first import base data (suppliers/customers/products), then import orders that reference them
- If referenced entity doesn't exist during order import -> report error and skip that row
- User must import base data before importing orders
- Data completeness: imported records count and field values must match source Excel -- no data loss, no garbled text
- Functional usability: imported data must display, search, and edit correctly in frontend pages
- Page stability (DATA-07): Claude runs automated checks first (traverse all frontend routes, check for 500/404/console errors), then user does manual sampling verification

### Claude's Discretion
- Test database setup and data retention after testing

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-03 | Manual entry test: create supplier, customer, fabric, quote, order with real data | Manual walkthrough using existing CRUD endpoints with real business data from test files |
| DATA-04 | Excel import test: import real fabric price list (面料价格明细2025.8.15.xlsx) | Requires data preparation (multi-sheet, rich text headers, supplier-grouped layout) -> existing FabricImportStrategy |
| DATA-05 | Excel import test: import real iron frame/motor price list (铁架电机价格2025.xlsx) | Requires data preparation (multi-sheet, multi-row headers, formula prices) -> existing ProductImportStrategy |
| DATA-06 | Excel import test: import real purchase order (海宁优途-采购单) | New PurchaseOrderImportStrategy needed; non-standard layout with metadata rows |
| DATA-07 | System stability: all pages load correctly after bulk data import | Automated route traversal + API smoke test + frontend page load verification |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ExcelJS | 4.4.0 | Excel file parsing/generation | Already used by all import strategies |
| Prisma | (project version) | Database ORM | All entity CRUD already implemented |
| NestJS | (project version) | Backend framework | All modules already implemented |

### Supporting (no new dependencies needed)
This phase requires NO new library installations. All tools are already available:
- ExcelJS for Excel parsing (handles rich text, formulas, merged cells)
- Existing ImportStrategy interface and ImportService orchestration
- Existing CRUD endpoints for all entity types
- Existing frontend import page with tab-based upload UI

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure (new files only)
```
backend/src/import/
├── strategies/
│   ├── purchase-order-import.strategy.ts     # NEW: 采购单 import
│   ├── sales-contract-import.strategy.ts     # NEW: 购销合同 import
│   ├── customer-order-import.strategy.ts     # NEW: 客户订单 import
│   └── (existing strategies unchanged)
├── import.service.ts                         # UPDATE: register new strategies
├── import.controller.ts                      # UPDATE: new endpoints
└── import.module.ts                          # UPDATE: register providers

frontend/src/
├── api/import.api.ts                         # UPDATE: new API functions
└── pages/import/ImportPage.tsx               # UPDATE: new tabs

scripts/
└── prepare-real-data.ts                      # NEW: one-time data prep script
```

### Pattern 1: ImportStrategy Interface (existing)
**What:** Each document type implements `ImportStrategy` with `matchesHeaders()`, `validateRow()`, `transformRow()`, `createBatch()`.
**When to use:** For all new import types.
**Key insight:** The existing interface assumes a flat tabular layout with row 1 as headers. Real purchase orders / sales contracts / customer orders have non-standard layouts (metadata rows, merged cells, data starting at row 4-10). The new strategies need custom parsing that extracts metadata first, then iterates data rows.

### Pattern 2: Non-Standard Excel Parsing
**What:** Real business documents have header metadata (company name, contact info, contract number) above the actual data table. Data rows start at varying positions.
**When to use:** For 采购单, 购销合同, and 客户订单 files.
**Approach:**
- Scan for the "header row" by looking for known column markers (e.g., "订单\nPO#", "品名", "面料名称")
- Extract metadata from rows above the header (supplier name, contract number, date)
- Parse data rows below the header using column index mapping
- Handle RichText cell values using existing `getCellValue()` utility (already handles `richText` → plain text)

### Pattern 3: Two-Stage Import (user decision)
**What:** Base entities (suppliers, customers, products/fabrics) must exist before order import can reference them.
**When to use:** Always for order-type imports.
**Implementation:** Order strategies look up referenced entities by name/code during validation. Missing references are reported as row-level failures (not skips). Frontend import page should clearly document the required import order.

### Anti-Patterns to Avoid
- **Building per-supplier Excel parsers:** The 面料价格明细 has 27 sheets with slightly different layouts per supplier. Do NOT build 27 parsers. Instead, extract data into the standard template format via a one-time script.
- **Importing directly from non-xlsx files:** The .xls files in the test folder (送货单) are old Excel format. ExcelJS only reliably handles .xlsx. These delivery notes are NOT in the 13 xlsx scope anyway.
- **Modifying existing strategies:** FabricImportStrategy and ProductImportStrategy work fine with their template format. Don't change them to parse non-standard layouts.

## Real Excel File Analysis

### Critical Finding: Document Structure Analysis

**面料价格明细2025.8.15.xlsx (21MB, 27 sheets)**
- Each sheet = one supplier (BY, HF, ML, KM, XH, YD, YN, YQ, AMR, XBY, DAVIS, etc.)
- Row 1: Headers with RichText formatting: 分类 | 面料名称 | 克重/门幅 | 颜色 | 成份 | 起订量 | 采购价 | 卖价 | 备注
- Column mapping: col1=category (Fab-A/B/C/E/G), col2=name, col3=weight+width (combined!), col4=color (may be RichText), col5=composition, col6=MOQ, col7=purchasePrice, col8=salePrice, col9=notes
- **Challenge:** Weight/width are combined in a single cell as "260G/142CM". Must be parsed apart.
- **Challenge:** Color field often contains RichText with series codes like "F189C系列"
- **Challenge:** MOQ field is sometimes RichText like "1000米" or plain text or null
- Data rows: ~10-18 per sheet, total ~200-300 fabrics across all sheets
- **Sheet names ARE supplier abbreviations** -- must be mapped to full supplier names

**铁架电机价格2025.xlsx (7.5MB, 8 sheets)**
- Sheet 1 "铁架电机2023.7.31": Main price list, 161 rows, complex multi-row header (rows 1-4), data from row 5
  - Columns: 型号 | 产品名称 | 规格尺寸 | 采购价(多列:老组装/新组装/新散件/2024.10采购价) | 销售价(多列)
  - Formula cells for price calculation
- Sheet 2 "床垫": Mattress prices, 6 rows, simpler layout
- Sheet 3 "电动零重力": Electric zero-gravity mechanisms, grouped products with SUM formulas
- Sheet 4 "电动带摇带转": Electric swing/rotate mechanisms, 64 rows
- Sheets 5-7: Per-supplier price lists (ASH/LFH/JZD) with slightly different column layouts but same general structure
- **Challenge:** Merged header rows (rows 1-4 in main sheet)
- **Challenge:** Formula cells for price calculations (ExcelJS returns `{formula, result}` -- `result` is the computed value)
- **Challenge:** Some products span multiple rows (铁架 + 电机 + 手控器 = one set)

**海宁优途-采购单 (3 files)**
- Layout: Row 1=company header, Row 2=recipient, Row 3=intro text, Row 4=column headers, Row 5+=data
- Columns: 订单PO# | 名称 | 规格型号 | 单位 | 数量 | 单价 | 交货日期 | 备注
- Mix of fabric and iron frame items in same PO
- **Challenge:** Some cells are RichText, some have embedded newlines
- 2025.11.26: 22 rows, mixed fabric+iron frame items
- 2026.03.06: 40 rows, larger order
- 2026.3.13: 9 rows, small order (iron frame legs only)

**购销合同 (2 files) -- sales contracts**
- Complex layout: metadata (supplier, customer, contract#, date, contact) in rows 1-8
- Column headers at row 9 with RichText
- 面料 variant: 面料名称 | 涂层 | 系列 | 色号 | 颜色中文 | 颜色英文 | 单位 | 数量 | 单价 | 金额 | 交货日期 | PI.# | 生产单号
- 铁架 variant: 品名 | 规格 | 单位 | 数量 | 单价 | 金额 | 交货日期 | PI.# | 生产单号 | 型号 | 备注
- Data rows: 4-6 items per contract
- **Challenge:** Very different column layout between fabric and iron frame contracts

**客户订单 77947/77955/77962 (6 files)**
- Same layout as 购销合同 (they ARE contracts/purchase orders for specific customer orders)
- Each order number has a 面料 file and a 铁架 file
- Same parsing challenges as 购销合同
- **Important:** These files follow the EXACT same template as 购销合同 -- they can share the same parser

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RichText extraction | Custom text parser | Existing `getCellValue()` | Already handles richText.map(rt => rt.text).join('') |
| Formula result extraction | Formula evaluator | ExcelJS `result` field | Formulas pre-computed in Excel, result stored in file |
| Weight/width parsing | Complex regex | Simple split on "/" | "260G/142CM" consistently formatted |
| File upload/validation | Custom multipart parser | Existing ExcelFileValidator + ParseFilePipe | Already handles size, type, magic bytes |
| Template download | File generation from scratch | Existing `generateTemplate()` pattern | Just pass strategy columns |

## Common Pitfalls

### Pitfall 1: RichText in Headers
**What goes wrong:** Headers in real files are RichText objects, not plain strings. `matchesHeaders()` receives `[object Object]` instead of string.
**Why it happens:** Real business Excel files use formatting (bold, font size) in headers.
**How to avoid:** The existing `detectStrategy()` in ImportService reads headers using `cell.value`. When value is RichText, it's an object with `.richText` array. Must extract text from RichText before matching. The existing `getCellValue()` util already handles this -- but `detectStrategy()` currently does its own header extraction without using `getCellValue()`.
**Warning signs:** "Unable to detect import type from column headers" error when importing real files.

### Pitfall 2: Merged Cells in Real Files
**What goes wrong:** The 铁架电机价格 main sheet has merged cells in rows 1-4. ExcelJS reports merged cell values only in the top-left cell; other cells in the merge range return null.
**Why it happens:** Business documents use cell merging for visual grouping.
**How to avoid:** New strategies should skip to the data start row and not rely on row 1 being the header. Use a scanner to find the actual data header row.

### Pitfall 3: Missing Unit Prices in Purchase Orders
**What goes wrong:** Several cells in the 采购单 files have null/empty 单价 (unit price) column.
**Why it happens:** Purchase orders from suppliers may omit unit prices (to be filled in later).
**How to avoid:** Make unit price optional in purchase order import. Use 0 or null as default. Document this in import results.

### Pitfall 4: Two-Stage Import Order Violation
**What goes wrong:** User imports purchase orders before importing suppliers/products. All rows fail with "Supplier not found" errors.
**Why it happens:** Order import references entities by name/code that must already exist.
**How to avoid:** Frontend import page must clearly document the required order. Backend returns descriptive error messages. Consider adding a pre-flight check that warns if zero suppliers/products exist.

### Pitfall 5: Sheet Name as Supplier Identifier (面料价格明细)
**What goes wrong:** The 面料价格明细 file uses 2-3 letter abbreviations as sheet names (BY, HF, ML...) which don't match full supplier company names in the system.
**Why it happens:** Internal shorthand in the company's existing Excel workflow.
**How to avoid:** Data preparation step must include a mapping from sheet abbreviations to full supplier names. This mapping must be confirmed with the user or inferred from other documents.

### Pitfall 6: ExcelJS .xls (BIFF format) Not Supported
**What goes wrong:** Several files in the test folder are .xls format (送货单, 铂润送货单). ExcelJS cannot read them.
**Why it happens:** ExcelJS only supports .xlsx (OOXML) format.
**How to avoid:** These are delivery notes, not in the 13 xlsx scope. Ignore them. The ExcelFileValidator already rejects non-.xlsx files.

## Code Examples

### Existing ImportStrategy Registration Pattern
```typescript
// Source: backend/src/import/import.service.ts
// All strategies injected via constructor DI
constructor(
  private readonly fabricStrategy: FabricImportStrategy,
  private readonly supplierStrategy: SupplierImportStrategy,
  private readonly productStrategy: ProductImportStrategy,
) {}

// Strategy auto-detected from headers
private detectStrategy(worksheet: ExcelJS.Worksheet): ImportStrategy {
  // ... reads row 1 headers, matches against each strategy
}
```

### RichText-Safe Header Detection
```typescript
// Source: backend/src/import/utils/excel.utils.ts
// getCellValue() already handles RichText:
// if ('richText' in value) return value.richText.map(rt => rt.text).join('');
```

### Non-Standard Layout Parsing Pattern (for new strategies)
```typescript
// Pattern for parsing documents with metadata + data table
function findDataStartRow(worksheet: ExcelJS.Worksheet, markers: string[]): number {
  for (let r = 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const headerText = getCellValue(row, 1).toLowerCase();
    if (markers.some(m => headerText.includes(m))) return r;
  }
  throw new BadRequestException('Cannot find data header row');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Template-only import | Real document parsing | Phase 9 | System can consume actual business documents |
| Single import endpoint per entity | Strategy auto-detection from headers | Phase 6 | Simplified API, but needs extension for new types |
| Flat header row 1 assumption | Variable header row detection | Phase 9 (new) | Required for real documents |

## Open Questions

1. **Sheet name to supplier name mapping (面料价格明细)**
   - What we know: Sheet names are abbreviations (BY, HF, ML, KM, XH, YD, YN, YQ, AMR, XBY, DAVIS)
   - What's unclear: The exact full supplier company names for each abbreviation
   - Recommendation: During data preparation, create the mapping interactively with the user. Some can be inferred (e.g., DAVIS = Davis). The preparation script should output unmapped sheets for user confirmation.

2. **How to handle grouped products in 铁架电机价格**
   - What we know: Some products span multiple rows (铁架 + 电机 + 手控器 + 电源 = one "set")
   - What's unclear: Should these be imported as individual products or as a product bundle?
   - Recommendation: Import as individual products. The system already has a Product model with modelNumber. Each component gets its own product record. The "set" concept is captured in the order (multiple items per order).

3. **Purchase order import: create orders or just products?**
   - What we know: CONTEXT.md says "create both products/prices AND purchase orders"
   - What's unclear: The current Order model requires a customerId. Purchase orders (采购单) are TO suppliers, not FROM customers.
   - Recommendation: Purchase orders in this business context are outgoing orders to suppliers. The system's Order model is customer-facing. Import 采购单 items as product/price data ONLY. Order creation from 购销合同 and 客户订单 makes more sense since those have customer (Miraggo HomeLiving) context.

4. **Test database management**
   - What we know: Claude's discretion on test DB setup
   - Recommendation: Use the existing development database. Run `prisma migrate reset` before testing to start clean. Document the data state after each import step. No separate test database infrastructure needed for a validation phase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Backend: Jest 29, Frontend: Vitest |
| Config file | backend: jest config in package.json, frontend: vitest.config.ts |
| Quick run command | `cd backend && pnpm test -- --testPathPattern=import` |
| Full suite command | `cd backend && pnpm test && cd ../frontend && pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-03 | Manual entry of complete business chain | manual-only | N/A (user-driven CRUD walkthrough) | N/A |
| DATA-04 | Fabric price list import | integration | `cd backend && pnpm test -- --testPathPattern=import` | Partially (import.e2e-spec.ts exists) |
| DATA-05 | Iron frame/motor price list import | integration | `cd backend && pnpm test -- --testPathPattern=import` | Partially |
| DATA-06 | Purchase order import | unit + integration | `cd backend && pnpm test -- --testPathPattern=purchase-order` | No - Wave 0 |
| DATA-07 | Page stability after bulk import | smoke | Script-based route traversal | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && pnpm build && pnpm test -- --testPathPattern=import`
- **Per wave merge:** `cd backend && pnpm build && pnpm test && pnpm lint && cd ../frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck`
- **Phase gate:** Full suite green + manual user verification of imported data in UI

### Wave 0 Gaps
- [ ] `backend/src/import/strategies/purchase-order-import.strategy.spec.ts` -- covers DATA-06 validation logic
- [ ] `backend/src/import/strategies/sales-contract-import.strategy.spec.ts` -- covers contract parsing
- [ ] `backend/src/import/strategies/customer-order-import.strategy.spec.ts` -- covers customer order parsing
- [ ] Smoke test script for page stability (DATA-07) -- automated route traversal

## Sources

### Primary (HIGH confidence)
- Direct inspection of all 13 xlsx files using ExcelJS from backend/node_modules
- Existing codebase: import strategies, import service, import controller, Prisma schema
- CONTEXT.md decisions from discuss phase

### Secondary (MEDIUM confidence)
- ExcelJS documentation on RichText, formula, merged cell handling (verified via actual file parsing)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all patterns established
- Architecture: HIGH -- extending existing ImportStrategy pattern, all code inspected
- Pitfalls: HIGH -- all identified from actual file inspection, not theoretical
- Real data structure: HIGH -- every file inspected programmatically with ExcelJS

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable -- real data files don't change, codebase patterns established)
