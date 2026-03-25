# Phase 6: Import Strategy Refactor - Research

**Researched:** 2026-03-25
**Domain:** NestJS import system extensibility, ExcelJS template generation, dry-run validation pattern
**Confidence:** HIGH

## Summary

Phase 6 extends the existing import system with a new ProductImportStrategy, adds dry-run validation to all import types, and ensures per-row error reporting. The codebase already has a well-defined `ImportStrategy` interface, two reference implementations (FabricImportStrategy, SupplierImportStrategy), and an `ImportService` that auto-detects strategy from Excel headers. The work is a natural extension of established patterns with minimal architectural risk.

The primary challenge is the ProductImportStrategy's composite behavior: it must create both Product records and ProductSupplier associations in a single import pass, requiring a transactional `createBatch` that spans two tables. The dry-run feature is a service-level concern that wraps the existing `importData` pipeline without touching individual strategies.

**Primary recommendation:** Implement a single `ProductImportStrategy` class handling all subcategories (IRON_FRAME, MOTOR, MATTRESS, ACCESSORY) via a `subCategory` column, add a `dryRun` boolean parameter to `ImportService.importData()`, and register the new strategy with direct DI injection following the existing pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Unified template for all product subcategories (IRON_FRAME, MOTOR, MATTRESS, ACCESSORY) with a `subCategory` column
- Each specification/variant is a separate row (e.g., "A4318HK-0--5 double-seat" and "A4318HK-0--5 single-seat" are distinct product records)
- Template includes supplier name + purchase price columns, auto-creates ProductSupplier association on import
- Template includes default selling price column mapped to Product.defaultPrice
- Template columns: subCategory*, modelNumber*, name*, specification, defaultPrice, supplierName*, purchasePrice*, notes
- Unique key: `modelNumber + name` combination
- `modelNumber` is required for all products
- Duplicate found: report as failure (not skip, not update)
- Dry-run at ImportService level -- all import strategies gain dry-run automatically
- Dry-run executes full validation pipeline without DB writes
- API parameter: `?dryRun=true` query parameter on existing import endpoints
- Phase 6 imports: Product basic info + ProductSupplier association only
- NOT included: CustomerPricing import, ProductBundle import

### Claude's Discretion
- Single ProductImportStrategy vs per-subcategory strategies (implementation detail)
- Excel template generation approach (ExcelJS formatting, column widths, validation dropdowns)
- Dry-run implementation pattern (transaction rollback vs separate validation path)
- Error message formatting and i18n
- Product code auto-generation integration with existing numbering service

### Deferred Ideas (OUT OF SCOPE)
- CustomerPricing bulk import (per-customer price sheets like ASH/LFH/JZD) -- future phase
- ProductBundle import -- future phase
- Complex Excel parsing with merged cells and multi-row headers -- Phase 9 (OCR)
- Real data migration from existing price list Excel -- Phase 10
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MCAT-05 | Product import templates for each new category | Single unified template with subCategory column per CONTEXT decision; ProductImportStrategy.getColumns() + generateTemplate() pattern from existing strategies |
| MCAT-06 | ProductImportStrategy integrated into ImportService | New strategy follows ImportStrategy interface, registered in ImportModule providers, auto-detected by matchesHeaders() |
| DATA-08 | Import result shows per-row failure details (row number + reason) | Already partially supported by ImportResultDto + ImportFailureDto; ProductImportStrategy.validateRow() returns per-row failures; duplicate detection uses modelNumber+name composite key |
| DATA-09 | Import dry-run mode validates without writing to DB | Add dryRun parameter to ImportService.importData(); skip createBatch() when dryRun=true; add ?dryRun=true query param to controller endpoints |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ExcelJS | 4.4.0 | Excel file reading/writing/template generation | Already in project, handles .xlsx format natively |
| @nestjs/common | ^11.0.1 | Framework decorators, DI, HTTP exceptions | Project framework |
| Prisma | ^6.19.2 | Database access for Product/ProductSupplier tables | Project ORM |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-validator | (existing) | DTO validation for query params | dryRun query parameter validation |
| class-transformer | (existing) | DTO transformation | Transform dryRun string to boolean |

**No new packages required.** All dependencies already exist in the project.

## Architecture Patterns

### Recommended Project Structure
```
backend/src/import/
  strategies/
    import-strategy.interface.ts   # (existing) ImportStrategy contract
    fabric-import.strategy.ts      # (existing) Reference implementation
    supplier-import.strategy.ts    # (existing) Reference implementation
    product-import.strategy.ts     # NEW: ProductImportStrategy
  dto/
    import-result.dto.ts           # (existing) ImportResultDto + ImportFailureDto
  utils/
    excel.utils.ts                 # (existing) getCellValue, parseNumber
  import.module.ts                 # MODIFIED: register ProductImportStrategy
  import.service.ts                # MODIFIED: add dryRun support, product template
  import.controller.ts             # MODIFIED: add product template endpoint, dryRun param
  import.service.spec.ts           # MODIFIED: add product import + dry-run tests
```

### Pattern 1: ImportStrategy Interface (Existing Pattern -- follow exactly)
**What:** Each entity type implements `ImportStrategy` with 6 methods: `getColumns()`, `getInstructions()`, `matchesHeaders()`, `getExistingKeys()`, `validateRow()`, `transformRow()`, `createBatch()`.
**When to use:** For every new import type.
**Key insight:** Strategy auto-detection from Excel headers means the controller/service need no `if/switch` for entity types.
```typescript
// Source: backend/src/import/strategies/import-strategy.interface.ts
export interface ImportStrategy {
  getColumns(): ColumnDefinition[];
  getInstructions(): InstructionRow[];
  matchesHeaders(headers: string[]): boolean;
  getExistingKeys(): Promise<Set<string>>;
  validateRow(row, rowNumber, batchKeys, existingKeys): RowValidationResult;
  transformRow(row): Record<string, unknown>;
  createBatch(entities: Record<string, unknown>[]): Promise<number>;
}
```

### Pattern 2: Composite Key for Duplicate Detection
**What:** Product uniqueness is `modelNumber + name` (not a single field like fabric's `fabricCode` or supplier's `companyName`).
**When to use:** When the import strategy needs multi-field uniqueness.
**Implementation note:** `getExistingKeys()` returns `Set<string>` where each key is `${modelNumber}::${name}`. The `batchKeys` parameter in `validateRow()` uses the same composite key format. The `getCellValue(row, colIndex)` approach maps: column 2 = modelNumber, column 3 = name.

### Pattern 3: Transactional createBatch with Two Tables
**What:** ProductImportStrategy.createBatch() must create Product records AND ProductSupplier associations.
**When to use:** When an import row maps to multiple related DB entities.
**Implementation approach:**
```typescript
// Wrap in Prisma $transaction for atomicity
async createBatch(entities: Record<string, unknown>[]): Promise<number> {
  return this.prisma.$transaction(async (tx) => {
    let created = 0;
    for (const entity of entities) {
      const { supplierName, purchasePrice, ...productData } = entity;
      // 1. Auto-generate productCode via CodeGeneratorService
      const productCode = await this.codeGenerator.generateCode(prefix);
      // 2. Create Product
      const product = await tx.product.create({ data: { productCode, ...productData } });
      // 3. Look up Supplier by companyName
      const supplier = await tx.supplier.findFirst({ where: { companyName: supplierName } });
      // 4. Create ProductSupplier if supplier found
      if (supplier) {
        await tx.productSupplier.create({ data: { productId: product.id, supplierId: supplier.id, purchasePrice } });
      }
      created++;
    }
    return created;
  });
}
```

### Pattern 4: Dry-Run at Service Level (Recommended: Skip createBatch)
**What:** Add `dryRun?: boolean` parameter to `ImportService.importData()`. When true, skip the `createBatch()` call entirely.
**Why this over transaction rollback:** Simpler, no side effects (no transaction to create/rollback), no risk of DB locks during validation, works with all strategies without modification.
**Implementation:**
```typescript
// In ImportService.importData():
if (entitiesToCreate.length > 0 && !dryRun) {
  await strategy.createBatch(entitiesToCreate);
}
// Return same ImportResultDto structure regardless of dryRun
```

### Pattern 5: DI Registration (Existing Pattern)
**What:** Import strategies injected directly as concrete classes, not via token array.
**Source:** STATE.md decision -- "Direct DI injection for strategies (concrete class, not token-based). Simpler for 2-strategy setup, sufficient until more strategies added."
**For 3 strategies:** Still direct injection. Add `ProductImportStrategy` to ImportModule providers and ImportService constructor.
```typescript
// import.module.ts
providers: [ImportService, FabricImportStrategy, SupplierImportStrategy, ProductImportStrategy],

// import.service.ts constructor
constructor(
  private readonly fabricStrategy: FabricImportStrategy,
  private readonly supplierStrategy: SupplierImportStrategy,
  private readonly productStrategy: ProductImportStrategy,
) {}
```

### Anti-Patterns to Avoid
- **Per-subcategory strategies:** User decided on a unified template with subCategory column. Do NOT create IronFrameImportStrategy, MotorImportStrategy, etc. One `ProductImportStrategy` handles all subcategories.
- **Modifying existing strategies for dry-run:** Dry-run is a service-level concern. Do NOT add a `dryRun` parameter to the `ImportStrategy` interface or individual strategies.
- **Using transaction rollback for dry-run:** The "rollback after validation" approach is fragile (auto-increment counters still advance, potential lock contention). Skip `createBatch()` instead.
- **Updating duplicates on import:** User decision is clear: duplicates are **failures**, not skips or updates. Report with row number + modelNumber + name + reason.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel parsing | Custom XLSX parser | ExcelJS (already in project) | Handles cell types, formulas, rich text, merged cells |
| Product code generation | Manual sequence counter | CodeGeneratorService (existing) | Redis INCR + DB fallback, race-condition safe |
| Composite key formatting | Ad-hoc string concat | Standardized `${modelNumber}::${name}` separator | Must be consistent between getExistingKeys() and validateRow() |
| Excel template styling | Raw cell manipulation | Existing generateTemplate() pattern in ImportService | Header styling, column widths, instructions sheet already solved |

**Key insight:** The existing import system is well-designed. Phase 6 is about extending it, not redesigning it.

## Common Pitfalls

### Pitfall 1: Supplier Lookup by Name in createBatch
**What goes wrong:** Template uses `supplierName` (text) but ProductSupplier FK requires `supplierId` (integer). If the supplier name doesn't match any existing supplier, the import silently loses the supplier association.
**Why it happens:** User enters supplier name in Excel, but DB uses integer FK.
**How to avoid:** In `validateRow()`, check that the supplier name exists in a pre-fetched supplier name-to-id map. Report as failure if supplier not found. Pre-load the supplier map alongside `getExistingKeys()`.
**Warning signs:** ProductSupplier records not being created despite supplierName column being filled.

### Pitfall 2: Product Code Generation in Batch Import
**What goes wrong:** `CodeGeneratorService.generateCode()` is async and uses Redis INCR. Calling it N times in a loop within a transaction could be slow or hit race conditions.
**Why it happens:** Each product needs a unique auto-generated code, but bulk imports may create many products at once.
**How to avoid:** Call `generateCode()` inside the transaction loop (serialized, not parallel). This is acceptable for import batch sizes (typically <100 rows). For larger batches, consider pre-generating codes.
**Warning signs:** Duplicate productCode errors during batch import.

### Pitfall 3: Column Index Mismatch Between Columns Definition and validateRow/transformRow
**What goes wrong:** `getCellValue(row, N)` uses 1-based column index. If the column order in `getColumns()` doesn't match the hardcoded indices in `validateRow()` and `transformRow()`, wrong data gets read.
**Why it happens:** Adding/removing columns shifts indices but forgetting to update hardcoded numbers.
**How to avoid:** Define column indices as named constants (e.g., `const COL_SUB_CATEGORY = 1; const COL_MODEL_NUMBER = 2;`). Or create a column-name-to-index map.
**Warning signs:** Tests pass with mock data but real Excel files parse incorrectly.

### Pitfall 4: Composite Key Separator Collision
**What goes wrong:** If modelNumber or name contains the separator string (e.g., `::`) the composite key becomes ambiguous.
**Why it happens:** Using a simple string separator for composite keys.
**How to avoid:** Use a separator unlikely to appear in real data (`\x00` or `||`). Alternatively, use a Map with JSON.stringify([modelNumber, name]) as key.
**Warning signs:** False duplicate detection or missed duplicates.

### Pitfall 5: SubCategory Validation in Import
**What goes wrong:** User enters an invalid subCategory value in Excel (e.g., "iron_frame" instead of "IRON_FRAME").
**Why it happens:** Excel template doesn't enforce enum values; user types freeform text.
**How to avoid:** Validate subCategory against `ProductSubCategory` enum values in `validateRow()`. Return clear error message listing valid values. Consider case-insensitive matching.
**Warning signs:** Prisma insert succeeds with invalid subCategory string (since it's a String column, not a DB enum), but application logic breaks later when mapping to CodePrefix.

### Pitfall 6: Category Derivation from SubCategory
**What goes wrong:** The `category` field must be set alongside `subCategory`, but the template only has `subCategory`.
**Why it happens:** Current schema has both `category` and `subCategory` on Product. All current subcategories map to `IRON_FRAME_MOTOR` category.
**How to avoid:** Auto-derive `category` from `subCategory` in `transformRow()`. Create a mapping: `{ IRON_FRAME: 'IRON_FRAME_MOTOR', MOTOR: 'IRON_FRAME_MOTOR', MATTRESS: 'IRON_FRAME_MOTOR', ACCESSORY: 'IRON_FRAME_MOTOR' }`.
**Warning signs:** Products created without category, or wrong category assignment.

### Pitfall 7: Existing Fabric Strategy "Skip" vs Product Strategy "Failure" for Duplicates
**What goes wrong:** The existing FabricImportStrategy and SupplierImportStrategy treat DB duplicates as "skipped" (`{ valid: false, skipped: true }`). But the user decision for products is "report as failure."
**Why it happens:** Different business rules for different entity types.
**How to avoid:** In ProductImportStrategy.validateRow(), when duplicate found (key exists in existingKeys or batchKeys), return `{ valid: false, failure: { rowNumber, identifier, reason: 'duplicate exists' } }` -- NOT `{ valid: false, skipped: true }`.
**Warning signs:** Duplicate products showing in skippedCount instead of failureCount.

## Code Examples

### ProductImportStrategy Column Definitions
```typescript
// Based on CONTEXT decision: subCategory*, modelNumber*, name*, specification, defaultPrice, supplierName*, purchasePrice*, notes
const PRODUCT_COLUMNS: ColumnDefinition[] = [
  { header: 'subCategory*', key: 'subCategory', width: 18 },
  { header: 'modelNumber*', key: 'modelNumber', width: 22 },
  { header: 'name*', key: 'name', width: 25 },
  { header: 'specification', key: 'specification', width: 30 },
  { header: 'defaultPrice', key: 'defaultPrice', width: 15 },
  { header: 'supplierName*', key: 'supplierName', width: 30 },
  { header: 'purchasePrice*', key: 'purchasePrice', width: 18 },
  { header: 'notes', key: 'notes', width: 35 },
];
```

### matchesHeaders for Product Strategy
```typescript
matchesHeaders(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase());
  return lower.includes('subcategory*') && lower.includes('modelnumber*') && lower.includes('name*');
}
```

### Dry-Run Controller Parameter
```typescript
// In ImportController, add @Query decorator to existing endpoints:
@Post('products')
async importProducts(
  @UploadedFile(...) file: Express.Multer.File,
  @Query('dryRun', new DefaultValuePipe(false), ParseBoolPipe) dryRun: boolean,
): Promise<ImportResultDto> {
  return this.importService.importProducts(file, dryRun);
}

// Also add dryRun to existing fabric and supplier endpoints for DATA-09
```

### Dry-Run in ImportService
```typescript
private async importData(
  file: Express.Multer.File,
  dryRun = false,
): Promise<ImportResultDto> {
  // ... existing validation and row processing ...

  // Only write to DB if not a dry run
  if (entitiesToCreate.length > 0 && !dryRun) {
    await strategy.createBatch(entitiesToCreate);
  }

  return {
    successCount: entitiesToCreate.length,
    skippedCount,
    failureCount: failures.length,
    failures,
  };
}
```

### Product Template Example Data
```typescript
async generateProductTemplate(): Promise<Buffer> {
  return this.generateTemplate(this.productStrategy, 'Products', {
    subCategory: 'IRON_FRAME',
    modelNumber: 'A4318HK-0--5',
    name: 'Single seat',
    specification: '180x80cm',
    defaultPrice: 1200,
    supplierName: 'Example Supplier Co.',
    purchasePrice: 800,
    notes: 'Best seller model',
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct class injection for strategies | Same (still appropriate for 3 strategies) | Phase 3 decision | No change needed; consider token-based injection at 5+ strategies |
| Strategy detection from headers only | Same | Phase 3 | ProductImportStrategy adds a 3rd detection option |
| No dry-run support | Add dryRun parameter to importData() | Phase 6 (this phase) | All strategies gain dry-run without modification |
| DB duplicate = "skip" | Product duplicates = "failure" | Phase 6 user decision | New behavior specific to product import |

## Open Questions

1. **SubCategory-to-Category mapping for future categories**
   - What we know: Currently all subcategories (IRON_FRAME, MOTOR, MATTRESS, ACCESSORY) map to a single category (IRON_FRAME_MOTOR).
   - What's unclear: If new categories are added later, the mapping in ProductImportStrategy must be updated.
   - Recommendation: Create a shared `SUBCATEGORY_TO_CATEGORY` map in enums file. Use it in both ProductService.create() and ProductImportStrategy.transformRow().

2. **Supplier not found during product import**
   - What we know: Template requires supplierName. Supplier must already exist in DB.
   - What's unclear: Should a missing supplier fail the entire row, or create the product without the supplier association?
   - Recommendation: Fail the row. The user decision says `supplierName*` is required (marked with asterisk). Missing supplier = validation failure with clear message "Supplier 'X' not found in system."

3. **ImportModule dependency on ProductModule/CommonModule**
   - What we know: ProductImportStrategy needs CodeGeneratorService (from CommonModule, which is @Global) and PrismaService.
   - What's unclear: Whether ImportModule needs to explicitly import anything new.
   - Recommendation: No new module imports needed. CommonModule is @Global, PrismaModule is already imported.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest + ts-jest |
| Config file | backend/package.json (jest key) |
| Quick run command | `cd backend && pnpm test -- --testPathPattern=import` |
| Full suite command | `cd backend && pnpm build && pnpm test && pnpm lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCAT-05 | Product template has correct columns, instructions sheet, example data | unit | `cd backend && pnpm test -- --testPathPattern=import.service.spec` | Needs new tests in existing file |
| MCAT-06 | ProductImportStrategy validates rows, detects from headers, creates Product+ProductSupplier | unit | `cd backend && pnpm test -- --testPathPattern=product-import.strategy.spec` | Wave 0 |
| MCAT-06 | ImportService detects product strategy from headers and processes file | unit | `cd backend && pnpm test -- --testPathPattern=import.service.spec` | Needs new tests in existing file |
| DATA-08 | Per-row failure details with row number + reason | unit | `cd backend && pnpm test -- --testPathPattern=product-import.strategy.spec` | Wave 0 |
| DATA-09 | Dry-run mode validates without DB writes | unit | `cd backend && pnpm test -- --testPathPattern=import.service.spec` | Needs new tests in existing file |
| DATA-09 | Dry-run on existing fabric/supplier endpoints | unit | `cd backend && pnpm test -- --testPathPattern=import.service.spec` | Needs new tests in existing file |

### Sampling Rate
- **Per task commit:** `cd backend && pnpm test -- --testPathPattern=import`
- **Per wave merge:** `cd backend && pnpm build && pnpm test && pnpm lint`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/import/strategies/product-import.strategy.spec.ts` -- covers MCAT-06, DATA-08 (strategy-level tests)
- [ ] New test cases in `backend/src/import/import.service.spec.ts` -- covers MCAT-05, MCAT-06, DATA-09 (service-level tests)
- [ ] ProductImportStrategy needs `CodeGeneratorService` and `PrismaService` mocks in test setup

## Sources

### Primary (HIGH confidence)
- `backend/src/import/strategies/import-strategy.interface.ts` -- ImportStrategy contract (7 methods)
- `backend/src/import/strategies/fabric-import.strategy.ts` -- Reference strategy implementation
- `backend/src/import/strategies/supplier-import.strategy.ts` -- Reference strategy implementation
- `backend/src/import/import.service.ts` -- ImportService orchestration with detectStrategy, importData, generateTemplate
- `backend/src/import/import.controller.ts` -- Controller pattern for template download and file upload
- `backend/src/import/dto/import-result.dto.ts` -- ImportResultDto with per-row failures
- `backend/src/import/import.module.ts` -- Module registration pattern
- `backend/src/product/product.service.ts` -- ProductService with CodeGeneratorService integration
- `backend/src/product/dto/create-product.dto.ts` -- Product DTO validation pattern
- `backend/src/system/enums/index.ts` -- ProductCategory, ProductSubCategory enums
- `backend/src/common/services/code-generator.service.ts` -- Code generation with Redis+DB fallback
- `backend/prisma/schema.prisma` -- Product, ProductSupplier, Supplier data models
- `.planning/phases/06-import-strategy-refactor/06-CONTEXT.md` -- User decisions and locked constraints

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` -- Key decision: "Direct DI injection for strategies (concrete class, not token-based)"
- `.planning/STATE.md` -- Key decision: "Strategy auto-detected from Excel column headers, not user-specified"

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing patterns well-documented in codebase
- Architecture: HIGH -- direct extension of existing ImportStrategy pattern with 2 reference implementations
- Pitfalls: HIGH -- identified from direct code analysis of existing strategies and Product data model
- Dry-run: HIGH -- simple conditional skip of createBatch(), no architectural ambiguity

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable codebase, no dependency changes expected)
