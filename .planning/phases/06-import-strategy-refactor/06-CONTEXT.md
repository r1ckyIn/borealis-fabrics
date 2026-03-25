# Phase 6: Import Strategy Refactor - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Extensible import system supporting new product category templates, dry-run mode for all import types, and per-row error reporting. Covers ProductImportStrategy creation, template download endpoints, and ImportService-level dry-run support. Frontend UI for product import belongs to Phase 8. OCR/complex Excel parsing belongs to Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Import Template Structure
- Unified template for all product subcategories (IRON_FRAME, MOTOR, MATTRESS, ACCESSORY)
- Template includes a `subCategory` column to distinguish product types
- Each specification/variant is a separate row (e.g., "A4318HK-0--5 单人位" and "A4318HK-0--5 双人位" are two distinct product records)
- Template includes supplier name + purchase price columns → auto-creates ProductSupplier association on import
- Template includes a default selling price column → maps to Product.defaultPrice
- Template columns: subCategory*, modelNumber*, name*, specification, defaultPrice, supplierName*, purchasePrice*, notes

### Duplicate Detection
- Unique key: `modelNumber + name` combination (e.g., "A4318HK-0--5" + "单人位")
- `modelNumber` is **required** for all products including accessories (use supplier-provided code or custom identifier)
- When duplicate found: **report as failure** in the failure list (not skip, not update)
- Failure message includes row number + modelNumber + name + reason "duplicate exists"

### Dry-Run Mode
- Implemented at ImportService level — all import strategies (fabric, supplier, product) gain dry-run capability automatically
- Dry-run executes full validation pipeline (header matching, row validation, duplicate checking) without DB writes
- Returns same ImportResultDto structure: successCount, failureCount, skippedCount + per-row failure details
- API parameter: `?dryRun=true` query parameter on existing import endpoints
- Frontend flow (Phase 8): upload file → auto dry-run → show preview → user confirms → real import

### Import Scope
- Phase 6 imports: Product basic info + ProductSupplier association (supplier name + purchase price)
- NOT included: CustomerPricing import (future phase), ProductBundle import (future phase)
- Dry-run support added to ALL existing import types (fabric, supplier) in this phase

### Claude's Discretion
- Single ProductImportStrategy vs per-subcategory strategies (implementation detail)
- Excel template generation approach (ExcelJS formatting, column widths, validation dropdowns)
- Dry-run implementation pattern (transaction rollback vs separate validation path)
- Error message formatting and i18n
- Product code auto-generation integration with existing numbering service

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Import System
- `.planning/ROADMAP.md` — Phase 6 requirements (MCAT-05, MCAT-06, DATA-08, DATA-09)
- `.planning/REQUIREMENTS.md` — Full requirement definitions for MCAT and DATA series

### Existing Import Implementation
- `backend/src/import/strategies/import-strategy.interface.ts` — ImportStrategy interface contract
- `backend/src/import/strategies/fabric-import.strategy.ts` — Reference implementation (FabricImportStrategy)
- `backend/src/import/strategies/supplier-import.strategy.ts` — Reference implementation (SupplierImportStrategy)
- `backend/src/import/import.service.ts` — ImportService orchestration (strategy detection, batch processing)
- `backend/src/import/import.controller.ts` — Import endpoints and template download pattern
- `backend/src/import/dto/import-result.dto.ts` — ImportResultDto with per-row failure support

### Product Data Model
- `backend/prisma/schema.prisma` — Product, ProductSupplier, CustomerPricing models
- `backend/src/product/` — Product CRUD module (Phase 5)

### Coding Standards
- `.claude/rules/00-project/coding-standards.md` — DTO naming, validation patterns
- `.claude/rules/00-project/tech-decisions.md` — Business number format (BF-YYMM-NNNN), conflict handling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ImportStrategy` interface: getEntityName(), getColumns(), matchesHeaders(), validateRow(), transformRow(), createBatch() — new strategy follows this exact contract
- `ImportService.importFromExcel()`: auto-detects strategy from headers, handles batch processing, returns ImportResultDto — dry-run logic plugs in here
- `ImportResultDto` + `ImportFailureDto`: already supports per-row failures with rowNumber + identifier + reason — DATA-08 partially satisfied
- `ImportController`: template download pattern (`/import/template/:type`) and file upload pattern (`/import/upload`) — extend for product type
- Product number generation service: auto-generates TJ/DJ/CD/PJ/BD-YYMM-NNNN codes based on subCategory

### Established Patterns
- Strategy auto-detection from Excel column headers (matchesHeaders method)
- Batch creation via Prisma transactions (createBatch method)
- DI registration: strategies injected as array via custom provider token
- Template generation with ExcelJS (header row + sample data + column formatting)

### Integration Points
- `ImportModule` providers array — register new ProductImportStrategy
- `ImportController` — add product template download endpoint
- `ImportService.importFromExcel()` — add dryRun parameter, wrap createBatch in conditional
- `ProductService` — may need findByModelAndName() method for duplicate checking

</code_context>

<specifics>
## Specific Ideas

- Real data shows iron frame price list has complex multi-row headers with merged cells and per-customer price sheets (ASH/LFH/JZD) — Phase 6 template is the **standardized clean format**, complex real data parsing is Phase 9 (OCR)
- Same model number appears with different seat types (单人位/双人位/三人位) at different prices — each is a separate product record
- Accessories like power cables and remote controls may not have traditional model numbers — require supplier-provided codes as modelNumber

</specifics>

<deferred>
## Deferred Ideas

- CustomerPricing bulk import (per-customer price sheets like ASH/LFH/JZD) — future phase
- ProductBundle import — future phase
- Complex Excel parsing with merged cells and multi-row headers — Phase 9 (OCR)
- Real data migration from existing price list Excel — Phase 10

</deferred>

---

*Phase: 06-import-strategy-refactor*
*Context gathered: 2026-03-25*
