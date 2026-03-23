# Phase 3: Backend Service Decomposition - Research

**Researched:** 2026-03-23
**Domain:** NestJS service decomposition, Strategy pattern via DI, TypeScript strict typing for tests, security edge-case testing
**Confidence:** HIGH

## Summary

Phase 3 is a pure refactoring and test hardening phase with zero behavior changes. The work decomposes into five distinct requirement areas: (1) OrderService decomposition from a 1121-line monolith into 3 focused sub-services, (2) ImportService refactoring using the Strategy pattern via NestJS dependency injection, (3) elimination of 11 `as any` casts across 4 backend test files with typed mock builders, (4) path traversal edge-case tests for the file upload system, and (5) malformed Excel import tests using programmatically generated fixtures.

The codebase already establishes strong patterns for all of these: the StorageProvider DI pattern in FileModule provides a direct template for ImportStrategy injection, the existing test structure uses AAA pattern with NestJS TestingModule consistently, and the file service already has sanitization logic that the edge-case tests will validate. ExcelJS v4.4.0 provides the API needed for programmatic test fixture generation.

**Primary recommendation:** Execute in dependency order -- mock builders first (shared infrastructure), then service decompositions (refactoring), then edge-case tests (additive).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- OrderService decomposed into OrderService + OrderItemService + OrderPaymentService with specific method assignments
- Transaction coordination: parent service pattern -- OrderItemService returns results, OrderService calls updateAggregateStatus/updateTotalAmount. Sub-services don't know about each other
- Timeline methods stay with OrderItemService
- OrderController delegates to appropriate sub-service; controller public API unchanged
- ImportService refactored with Strategy pattern: ImportStrategy interface with validate/transform/getTemplate methods
- FabricImportStrategy and SupplierImportStrategy implementations
- Strategy selection: auto-detect from Excel column headers (not user-specified parameter)
- Error aggregation: collect per-row errors, return summary with row numbers and failure reasons
- Replace all 11 `as any` casts in backend test files with typed alternatives
- Create shared mock builder utilities in `backend/test/helpers/`
- Enable `@typescript-eslint/no-explicit-any` as warning on test files
- Path traversal tests: URL-encoded, double encoding, unicode normalization, null byte, Windows-style paths
- Tests target FileService and FileController (both unit and E2E level)
- Malformed Excel tests: merged cells, blank rows, encoding edge cases, missing columns, numeric precision, extra columns
- Use ExcelJS to programmatically generate test fixtures (not static files)
- Each edge case has explicit expected behavior (skip row, report error, handle gracefully)

### Claude's Discretion
- Exact method signatures and return types for sub-services
- Mock builder utility API design and naming
- ExcelJS test fixture generation approach
- ESLint rule severity level for `no-explicit-any` on test files
- Whether to use abstract base class or utility functions for shared import validation
- Path traversal test implementation details (unit vs E2E split)
- Transaction isolation level for decomposed services

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | OrderService decomposed into OrderService + OrderItemService + OrderPaymentService | Service decomposition pattern, NestJS module provider registration, transaction coordination pattern, shared includes/validators |
| QUAL-02 | ImportService refactored with Strategy pattern (FabricImportStrategy, SupplierImportStrategy) | NestJS DI multi-provider pattern (existing StorageProvider as template), ImportStrategy interface design, header-based auto-detection |
| QUAL-06 | Backend test `any` types eliminated with typed mock builders (11 instances in 4 files) | Typed mock patterns for Express.Request, Buffer, enum values, sortBy fields; mock builder utility design |
| TEST-04 | Path traversal edge case tests (URL-encoded, unicode normalization, double-encoding) | Existing sanitizeFilename + validateFilename functions, attack vectors, unit + E2E test split |
| TEST-05 | Import service tests with malformed Excel (merged cells, blank rows, encoding) | ExcelJS v4.4.0 API for programmatic fixture generation, getCellValue edge cases, expected behaviors |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/common | ^11.0.1 | NestJS framework | Project backend framework |
| @nestjs/testing | ^11.0.1 | TestingModule for unit tests | NestJS official test toolkit |
| @prisma/client | ^6.19.2 | Database ORM | Type-safe DB queries |
| exceljs | ^4.4.0 | Excel file reading/writing | Excel import/export + test fixture generation |
| jest | ^30.0.0 | Test runner (backend) | NestJS official test runner |
| ts-jest | ^29.2.5 | TypeScript test transform | Jest TypeScript integration |
| typescript | ^5.7.3 | TypeScript compiler | Strict mode enabled |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript-eslint | (in eslint.config.mjs) | ESLint TypeScript rules | Enforcing `no-explicit-any` on test files |
| supertest | (in devDependencies) | HTTP testing | E2E path traversal tests |

### No Additional Packages Needed
This phase requires zero new dependencies. All work uses existing libraries.

## Architecture Patterns

### Pattern 1: OrderService Decomposition (Parent-Child Services)

**What:** Split OrderService (1121 lines, 22+ methods) into 3 focused services sharing validators, includes, and enums.

**When to use:** Service exceeds 500 lines with clear domain boundaries.

**Method Assignment (from CONTEXT.md decisions):**

```
OrderService (core CRUD):
  - create()               [L89-200]   - needs CodeGeneratorService
  - findAll()              [L210-279]
  - findOne()              [L281-299]
  - update()               [L301-384]
  - remove()               [L338-384]
  - updateAggregateStatus() [L391-404]
  - updateTotalAmount()    [L410-420]

OrderItemService (item operations):
  - getOrderItems()        [L429-440]
  - addOrderItem()         [L446-521]
  - updateOrderItem()      [L522-589]
  - removeOrderItem()      [L590-656]
  - updateItemStatus()     [L658-700]
  - cancelOrderItem()      [L702-740]
  - restoreOrderItem()     [L742-790]
  - getOrderTimeline()     [L792-822]
  - getItemTimeline()      [L807-822]

OrderPaymentService (payment operations):
  - updateCustomerPayment() [L831-846]
  - getSupplierPayments()   [L851-860]
  - updateSupplierPayment() [L866-897]
```

**Private helper ownership:**

```
OrderService:
  (none -- helpers move with their callers)

OrderItemService:
  - buildOrderItemUpdateData()   [L906-944]
  - createTimelineEntry()        [L999-1017]
  - upsertSupplierPayment()      [L1019-1070]
  - recalculateOrderTotals()     [L1072-1102]
  - updateAggregateStatusInTx()  [L1104-1121]

OrderPaymentService:
  - buildCustomerPaymentUpdateData() [L945-971]
  - buildSupplierPaymentUpdateData() [L972-997]
```

**Module registration pattern:**

```typescript
// order.module.ts
@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [OrderController],
  providers: [OrderService, OrderItemService, OrderPaymentService],
  exports: [OrderService],
})
export class OrderModule {}
```

**Controller delegation pattern:**

```typescript
// order.controller.ts -- inject all three services
constructor(
  private readonly orderService: OrderService,
  private readonly orderItemService: OrderItemService,
  private readonly orderPaymentService: OrderPaymentService,
) {}

// Route to appropriate service
getOrderItems(@Param('id', ParseIntPipe) id: number) {
  return this.orderItemService.getOrderItems(id);
}
```

**Transaction coordination (parent service pattern):**

```typescript
// OrderItemService: performs item operation, returns result
// Does NOT call updateAggregateStatus or updateTotalAmount
async addOrderItem(orderId: number, dto: AddOrderItemDto): Promise<OrderItem> {
  return this.prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.create({...});
    await this.createTimelineEntry(tx, item.id, ...);
    // Recalculate within same transaction
    await this.recalculateOrderTotals(tx, orderId);
    await this.updateAggregateStatusInTx(tx, orderId);
    return item;
  });
}
```

**Key insight:** The private helpers `recalculateOrderTotals` and `updateAggregateStatusInTx` (transaction-aware versions) move to OrderItemService because they are called within item operation transactions. The public `updateAggregateStatus` and `updateTotalAmount` on OrderService remain for external callers (e.g., QuoteService.convertToOrder).

### Pattern 2: ImportService Strategy Pattern via NestJS DI

**What:** Refactor ImportService (607 lines) from monolithic if/else to strategy pattern.

**Template from existing codebase:** FileModule's StorageProvider pattern.

```typescript
// import/strategies/import-strategy.interface.ts
export const IMPORT_STRATEGIES = 'IMPORT_STRATEGIES';

export interface ImportStrategy {
  /** Column definitions for template generation */
  getTemplate(): ColumnDefinition[];

  /** Validate a single row, return failures */
  validate(row: ParsedRow, existingKeys: Set<string>): ImportFailureDto | null;

  /** Transform validated row to entity create data */
  transform(row: ParsedRow): Record<string, unknown>;

  /** Check if this strategy matches the Excel headers */
  matchesHeaders(headers: string[]): boolean;

  /** Get existing entity keys for duplicate detection */
  getExistingKeys(prisma: PrismaService): Promise<Set<string>>;

  /** Create entities in batch */
  createBatch(prisma: PrismaService, entities: Record<string, unknown>[]): Promise<void>;
}
```

**NestJS multi-provider injection (recommended approach):**

```typescript
// import.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [ImportController],
  providers: [
    ImportService,
    FabricImportStrategy,
    SupplierImportStrategy,
  ],
  exports: [ImportService],
})
export class ImportModule {}

// import.service.ts -- inject strategies individually
constructor(
  private readonly prisma: PrismaService,
  private readonly fabricStrategy: FabricImportStrategy,
  private readonly supplierStrategy: SupplierImportStrategy,
) {}

// Auto-detect strategy from headers
private detectStrategy(worksheet: ExcelJS.Worksheet): ImportStrategy {
  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell((cell) => headers.push(String(cell.value || '')));

  if (this.fabricStrategy.matchesHeaders(headers)) return this.fabricStrategy;
  if (this.supplierStrategy.matchesHeaders(headers)) return this.supplierStrategy;
  throw new BadRequestException('Unable to detect import type from headers');
}
```

**Why direct injection over multi-token:** The project has exactly 2 strategies (soon 3 with MCAT-06). Direct injection is simpler, testable, and more explicit than array injection. The auto-detect method iterates over known strategies.

### Pattern 3: Typed Mock Builders

**What:** Replace `as any` casts with properly typed mock utilities.

**Location:** `backend/test/helpers/mock-builders.ts` (new directory and file).

**11 instances across 4 files:**

| File | Count | Cast | Typed Fix |
|------|-------|------|-----------|
| `auth.controller.spec.ts` | 5 | `req as any` | `mockAuthRequest()` returning `AuthenticatedRequest` |
| `fabric.service.spec.ts` | 4 | `sortBy as any` | Use `FabricSupplierSortField` enum values directly |
| `order.service.spec.ts` | 1 | `'partial' as any` | Use `CustomerPayStatus.PARTIAL` |
| `import.service.spec.ts` | 1 | `buffer as any` | Typed `loadWorkbook()` wrapper with `ArrayBuffer` cast |

**Mock builder examples:**

```typescript
// backend/test/helpers/mock-builders.ts
import type { Request } from 'express';

interface MockRequestUser {
  id: number;
  weworkId: string;
  name: string;
}

// Typed request mock matching AuthenticatedRequest interface
export function mockAuthRequest(userId = 1): Request & { user: MockRequestUser } {
  return {
    user: { id: userId, weworkId: 'test-user-id', name: 'Test User' },
    headers: { authorization: 'Bearer test-token' },
  } as Request & { user: MockRequestUser };
}

// Buffer wrapper for ExcelJS (ArrayBufferLike compatibility)
export async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}
```

### Anti-Patterns to Avoid

- **Circular dependency between sub-services:** OrderItemService and OrderPaymentService must NOT import each other. If they need shared logic, extract to validators/utils.
- **Leaking transaction context:** Sub-services should handle their own transactions. The parent service pattern means OrderItemService wraps its own `$transaction`, recalculates totals inside, not via callback to parent.
- **Partial strategy implementation:** Don't create a strategy interface that only FabricImportStrategy fully implements. Both strategies must implement all methods.
- **Over-mocking in edge-case tests:** Path traversal and malformed Excel tests should test the actual sanitization/parsing logic, not mock it away.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel file creation for tests | Manual binary construction | ExcelJS `Workbook` API | ExcelJS can create valid XLSX files with merged cells, encoding, etc. programmatically |
| URL decoding for path traversal | Custom decoder | Node.js `decodeURIComponent` + existing `sanitizeFilename` | Standard library handles all encoding variants |
| Mock type definitions | Manual interface copies | TypeScript `Partial<T>` + `jest.Mocked<T>` | Stays in sync with source types |
| Strategy pattern boilerplate | Custom DI container | NestJS built-in DI | Already proven in StorageProvider pattern |

**Key insight:** ExcelJS is already installed and used in production code. Using it to generate test fixtures ensures fixtures match real-world Excel format perfectly.

## Common Pitfalls

### Pitfall 1: Breaking QuoteService.convertToOrder() During Decomposition
**What goes wrong:** QuoteService imports and calls `OrderService.create()`. If method signatures change or OrderService's module exports change, the quote-to-order flow breaks silently.
**Why it happens:** OrderService is exported from OrderModule and used by QuoteModule.
**How to avoid:** Keep `OrderService.create()` signature identical. Keep `OrderService` in module exports. Run full test suite after decomposition (608 backend tests).
**Warning signs:** QuoteService tests fail, E2E order tests fail.

### Pitfall 2: Transaction Context Leaking Across Services
**What goes wrong:** Sub-service methods called from within a transaction in the parent, but sub-service creates its own transaction -- nested transactions may not behave as expected.
**Why it happens:** OrderItemService.addOrderItem uses `this.prisma.$transaction()` internally. If someone wraps it in another transaction externally, Prisma doesn't support true nested transactions.
**How to avoid:** Each sub-service method is a complete unit-of-work. The parent service pattern means sub-services handle their own transactions independently. If OrderItemService needs aggregate recalculation, it does it inside its own transaction (using private `recalculateOrderTotals` and `updateAggregateStatusInTx`).
**Warning signs:** Prisma transaction errors, inconsistent state between order and items.

### Pitfall 3: ESLint `no-explicit-any` Breaking Build
**What goes wrong:** Enabling `no-explicit-any` globally on test files surfaces more than the known 11 instances -- the eslint-disable-next-line comments and other patterns may also need updating.
**Why it happens:** Current config has `'@typescript-eslint/no-explicit-any': 'off'` globally. Enabling it even as "warn" on test files may reveal additional usage.
**How to avoid:** Use ESLint override block scoped to `*.spec.ts` files. Set to "warn" (not "error") initially. Fix known 11 instances first, then audit for additional warnings.
**Warning signs:** `pnpm lint` produces new warnings after config change.

### Pitfall 4: ExcelJS Buffer Type Mismatch (Node.js 22+)
**What goes wrong:** ExcelJS types declare `load(buffer: Buffer)` but `@types/node >= 22` changed Buffer to `Buffer<ArrayBufferLike>`, causing type incompatibility.
**Why it happens:** ExcelJS hasn't updated its type definitions for the new parameterized Buffer type.
**How to avoid:** Use `buffer as unknown as ArrayBuffer` cast in the shared `loadWorkbook` helper. This is already the pattern in the existing `import.service.spec.ts` wrapper.
**Warning signs:** TypeScript compile errors on `workbook.xlsx.load()` calls.

### Pitfall 5: Path Traversal Tests Pass on Raw Strings but Fail on URL-Decoded
**What goes wrong:** `sanitizeFilename` removes `..` but doesn't URL-decode first. An attacker sends `%2e%2e%2f` which bypasses the `..` check.
**Why it happens:** The current `sanitizeFilename` function in `file.service.ts` operates on the raw string. The `validateFilename` in `file.controller.ts` checks for `..`, `/`, `\\` but also on raw string -- it doesn't decode URL encoding first.
**How to avoid:** Tests should verify both layers (controller validation + service sanitization). Tests should confirm that URL-encoded traversal attempts are rejected. If tests reveal the current code doesn't decode first, that's a finding that must be fixed.
**Warning signs:** Test passing with `../` but failing with `%2e%2e/`.

### Pitfall 6: Merged Cell Values in ExcelJS
**What goes wrong:** ExcelJS merged cells return the value only from the master cell; slave cells return `null`.
**Why it happens:** ExcelJS `row.getCell(colNumber).value` returns `null` for non-master cells in a merge range.
**How to avoid:** Tests should verify that the import service handles this gracefully (reports error or skips row, doesn't crash). The existing `getCellValue` already handles null/undefined, so merged cells in data rows should result in missing-field failures.
**Warning signs:** Test fixture with merged cells causes unhandled exception.

## Code Examples

### OrderService Decomposition: Module Registration

```typescript
// backend/src/order/order.module.ts
import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderItemService } from './order-item.service';
import { OrderPaymentService } from './order-payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [OrderController],
  providers: [OrderService, OrderItemService, OrderPaymentService],
  exports: [OrderService],
})
export class OrderModule {}
```

### ImportStrategy Interface

```typescript
// backend/src/import/strategies/import-strategy.interface.ts
import { ImportFailureDto } from '../dto';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ExcelJS } from 'exceljs';

export interface ColumnDefinition {
  header: string;
  key: string;
  width: number;
}

export interface ParsedRow {
  rowNumber: number;
  values: Map<string, string>;
}

export interface ImportStrategy {
  /** Column definitions for template generation */
  getColumns(): ColumnDefinition[];

  /** Get instructions for the template sheet */
  getInstructions(): Array<{ field: string; required: string; description: string }>;

  /** Check if strategy matches Excel headers */
  matchesHeaders(headers: string[]): boolean;

  /** Fetch existing entity keys for skip-on-duplicate logic */
  getExistingKeys(): Promise<Set<string>>;

  /** Validate a single row */
  validateRow(
    row: ExcelJS.Row,
    rowNumber: number,
    batchKeys: Set<string>,
    existingKeys: Set<string>,
  ): { valid: boolean; failure?: ImportFailureDto; skipped?: boolean };

  /** Transform validated row data to entity creation input */
  transformRow(row: ExcelJS.Row): Record<string, unknown>;

  /** Bulk create entities */
  createBatch(entities: Record<string, unknown>[]): Promise<void>;
}
```

### Typed Mock Builder for Auth Request

```typescript
// backend/test/helpers/mock-builders.ts
import type { Request } from 'express';

interface MockUser {
  id: number;
  weworkId: string;
  name: string;
}

interface AuthenticatedMockRequest extends Partial<Request> {
  user: MockUser;
  headers: Record<string, string>;
}

export function createMockAuthRequest(
  userId = 1,
  options?: { authorization?: string },
): AuthenticatedMockRequest {
  return {
    user: {
      id: userId,
      weworkId: 'test-user-id',
      name: 'Test User',
    },
    headers: {
      authorization: options?.authorization ?? 'Bearer test-token',
    },
  };
}
```

### ExcelJS Programmatic Test Fixture

```typescript
// In test file: create Excel with merged cells
async function createMergedCellsExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Sheet1');

  // Add headers
  ws.columns = [
    { header: 'fabricCode*', key: 'fabricCode' },
    { header: 'name*', key: 'name' },
  ];

  // Add normal row
  ws.addRow({ fabricCode: 'FB-0001', name: 'Normal Fabric' });

  // Add merged row (merge cells A3:B3)
  ws.addRow({ fabricCode: 'FB-0002', name: 'Merged' });
  ws.mergeCells('A3:B3');

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `as any` casts in tests | Typed mock builders | TypeScript 5.x strict mode maturity | Compile-time safety in tests |
| Monolithic service class | Focused sub-services with DI | NestJS established pattern | Testability, maintainability |
| If/else branching for types | Strategy pattern via DI | GoF pattern, NestJS native | Extensibility for MCAT-06 |
| Static test fixture files | Programmatic ExcelJS generation | ExcelJS 4.x API stability | Precise control over edge cases |

**Deprecated/outdated:**
- `ts-jest@29.x` with `jest@30.x`: Potential version mismatch. Current setup works but ts-jest 30.x may be needed for full compatibility. Monitor for test runner issues.

## Open Questions

1. **Path Traversal: Does the current code URL-decode before validation?**
   - What we know: `sanitizeFilename` in `file.service.ts` removes `..` from raw string. `validateFilename` in `file.controller.ts` also checks raw string.
   - What's unclear: Whether Multer/Express already URL-decodes `file.originalname` before it reaches the controller. If Express decodes the multipart form data, `%2e%2e` becomes `..` and existing validation catches it.
   - Recommendation: Write the tests first -- if URL-encoded sequences bypass validation, fix the code. This is the TDD approach: tests define expected behavior, code is adjusted if needed.

2. **OrderItemService transaction helper placement**
   - What we know: `recalculateOrderTotals` and `updateAggregateStatusInTx` are private helpers used inside item operation transactions.
   - What's unclear: Whether these should be standalone utility functions or methods on OrderItemService.
   - Recommendation: Keep as private methods on OrderItemService. They use `this.prisma` or accept `tx` as parameter and are only called within OrderItemService transactions. Public `updateAggregateStatus` and `updateTotalAmount` stay on OrderService for external callers.

3. **ImportService: shared utility vs base class for getCellValue/parseNumber**
   - What we know: Both strategies need `getCellValue`, `parseNumber`, `isValidEmail`, `styleHeaderRow`, `addInstructionsSheet`.
   - What's unclear: Whether to use abstract base class or extract to utility module.
   - Recommendation: Extract `getCellValue`, `parseNumber`, `isValidEmail` to `import/utils/excel.utils.ts` (pure functions, no class state). Keep `styleHeaderRow` and `addInstructionsSheet` on ImportService (orchestrator handles template assembly).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.0.0 (backend) |
| Config file | `backend/package.json` (embedded jest config) |
| Quick run command | `cd backend && pnpm test -- --testPathPattern <pattern>` |
| Full suite command | `cd backend && pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | OrderService decomposed into 3 services | unit | `cd backend && pnpm test -- --testPathPattern "order-(item\|payment)\.service\.spec"` | Wave 0 (split from existing) |
| QUAL-01 | OrderService core CRUD still works | unit | `cd backend && pnpm test -- --testPathPattern "order\.service\.spec"` | Exists (refactor) |
| QUAL-01 | OrderController delegates correctly | unit + e2e | `cd backend && pnpm test:e2e -- --testPathPattern "order"` | Exists (verify) |
| QUAL-02 | FabricImportStrategy works | unit | `cd backend && pnpm test -- --testPathPattern "fabric-import\.strategy\.spec"` | Wave 0 |
| QUAL-02 | SupplierImportStrategy works | unit | `cd backend && pnpm test -- --testPathPattern "supplier-import\.strategy\.spec"` | Wave 0 |
| QUAL-02 | ImportService orchestration with strategy detection | unit | `cd backend && pnpm test -- --testPathPattern "import\.service\.spec"` | Exists (refactor) |
| QUAL-06 | Zero `as any` in backend test files | lint | `cd backend && pnpm lint 2>&1 \| grep no-explicit-any` | N/A (lint rule) |
| TEST-04 | Path traversal attacks rejected | unit + e2e | `cd backend && pnpm test -- --testPathPattern "file\.service\.spec"` | Wave 0 (new tests in existing file) |
| TEST-05 | Malformed Excel handled gracefully | unit | `cd backend && pnpm test -- --testPathPattern "import.*edge-case\|import\.service\.spec"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && pnpm test -- --testPathPattern "<module>"` (targeted)
- **Per wave merge:** `cd backend && pnpm test && pnpm test:e2e`
- **Phase gate:** Full suite green (`cd backend && pnpm build && pnpm test && pnpm lint`) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/test/helpers/mock-builders.ts` -- shared typed mock utilities (mockAuthRequest, loadWorkbook)
- [ ] `backend/src/order/order-item.service.spec.ts` -- tests split from order.service.spec.ts
- [ ] `backend/src/order/order-payment.service.spec.ts` -- tests split from order.service.spec.ts
- [ ] `backend/src/import/strategies/fabric-import.strategy.spec.ts` -- new strategy tests
- [ ] `backend/src/import/strategies/supplier-import.strategy.spec.ts` -- new strategy tests
- [ ] Path traversal edge-case tests in `file.service.spec.ts` or separate file
- [ ] Malformed Excel tests (additive to import.service.spec.ts or separate file)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `backend/src/order/order.service.ts` (1121 lines, 22+ methods, method boundaries identified)
- Codebase analysis: `backend/src/import/import.service.ts` (607 lines, 2 import methods with identical structure)
- Codebase analysis: `backend/src/file/file.service.ts` + `file.controller.ts` (sanitization + validation functions)
- Codebase analysis: `backend/src/file/file.module.ts` (StorageProvider DI pattern -- template for Strategy)
- Codebase analysis: `backend/eslint.config.mjs` (current `no-explicit-any: off`)
- Codebase analysis: All 11 `as any` occurrences identified and categorized across 4 spec files
- Codebase analysis: `backend/src/order/order.validators.ts` (shared validators, 240 lines)
- Codebase analysis: `backend/src/order/order.includes.ts` (shared Prisma includes)
- Codebase analysis: `backend/src/order/enums/order-status.enum.ts` (CustomerPayStatus enum)
- Package versions verified from `backend/package.json`

### Secondary (MEDIUM confidence)
- NestJS DI pattern for multi-provider strategies (well-documented NestJS feature, confirmed by existing StorageProvider pattern in codebase)
- ExcelJS merged cells behavior (documented in ExcelJS README, standard OOXML behavior)

### Tertiary (LOW confidence)
- Express/Multer URL-decoding behavior for `file.originalname` (needs test verification -- tests will reveal actual behavior)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed, versions verified from package.json
- Architecture: HIGH -- decomposition targets, method assignments, and DI patterns all verified from actual source code
- Pitfalls: HIGH -- identified from actual code analysis (e.g., QuoteService dependency, Buffer type issue, existing sanitization gaps)
- Test patterns: HIGH -- existing test structure thoroughly analyzed across 4 spec files

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable -- all internal refactoring, no external dependency concerns)
