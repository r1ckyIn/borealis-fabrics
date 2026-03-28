# Phase 7: Order/Quote Multi-Category Extension - Research

**Researched:** 2026-03-25
**Domain:** Prisma schema migration, NestJS DTO conditional validation, quote model restructuring
**Confidence:** HIGH

## Summary

Phase 7 extends the existing Order and Quote modules to support non-fabric products (iron frame, motor, mattress, accessory) alongside fabric items. This involves three major changes: (1) making OrderItem.fabricId nullable and adding productId with a XOR constraint, (2) restructuring Quote from a single-item model to a multi-item model (Quote + QuoteItem), and (3) refactoring the quote-to-order conversion to support partial item-level selection.

The codebase is well-structured for this extension. OrderItemService, order.validators.ts, and order.includes.ts are cleanly separated and can be extended incrementally. The QuoteService requires the most significant restructuring since it currently stores fabricId, quantity, unitPrice, totalPrice directly on the Quote model. All existing patterns (transaction-based operations, supplier auto-fill from cheapest FabricSupplier, status transitions, code generation) have direct analogs for the new product-aware behavior.

**Primary recommendation:** Execute in 3 plans: (1) Prisma schema migration + OrderItem extension, (2) Quote model restructure to multi-item, (3) Quote-to-order partial conversion refactor. Each plan is independently testable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- OrderItem gets nullable `productId` FK; `fabricId` becomes nullable; XOR constraint (exactly one of fabricId or productId)
- Validation at application layer (DTO + service) AND DB check constraint
- Add `unit` field to OrderItem and QuoteItem (meter/set/piece/sheet derived from product category)
- Non-fabric products require integer quantities; fabric allows Decimal(10,2)
- Quote restructured to Quote + QuoteItem (similar to Order + OrderItem pattern)
- QuoteItem has same fabricId XOR productId constraint as OrderItem
- New QuoteStatus: `partially_converted` with per-item `isConverted` boolean
- Partial conversion: user selects specific QuoteItems to convert
- Non-fabric products auto-fill cheapest supplier from ProductSupplier
- Quantity upper limit: 1,000,000; unit price upper limit: 100,000
- Non-fabric quantity must be integer (validated at DTO level when productId present)

### Claude's Discretion
- Prisma schema migration strategy (add columns, create QuoteItem table)
- XOR constraint implementation details (DB check constraint syntax, DTO validator pattern)
- Quote-to-order conversion refactor approach
- Service-level unit derivation logic
- Test strategy for XOR validation, partial conversion, mixed product orders
- Order includes/query adaptation for product relations
- Backward compatibility approach for existing quote data migration

### Deferred Ideas (OUT OF SCOPE)
- Frontend UI for multi-category orders/quotes (Phase 8)
- Product bundle integration with orders
- CustomerPricing auto-fill in quotes
- Quote template/PDF generation
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MCAT-07 | OrderItem extended with productId FK (nullable, exactly-one guard with fabricId) | Schema migration pattern, XOR constraint at DB + DTO level, order.validators.ts extension, includes adaptation |
| MCAT-08 | Quote extended to support non-fabric products | Quote model restructure to Quote+QuoteItem, multi-item conversion, partially_converted status, QuoteItem XOR constraint |
</phase_requirements>

## Standard Stack

### Core (already installed, no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.19.2 | Schema migration, ORM | Already in project |
| class-validator | ^0.14.3 | DTO validation with decorators | Already in project |
| @nestjs/core | ^11.0.1 | Framework | Already in project |
| @nestjs/schedule | existing | Quote expiration scheduler | Already in project |

### No New Dependencies Required

This phase is purely a schema + service logic extension. All required tools are already in the project.

## Architecture Patterns

### Recommended Migration Strategy

The schema changes should be done in a single Prisma migration with custom SQL for the CHECK constraint. Steps:

1. Update `schema.prisma` (make fabricId nullable on OrderItem, add productId, add unit, create QuoteItem table, update Quote model)
2. Run `prisma migrate dev --create-only --name extend_order_quote_multi_category`
3. Edit the generated migration SQL to add CHECK constraints
4. Run `prisma migrate dev` to apply

### Pattern 1: XOR Constraint (DB Level)

MySQL 8.0 supports CHECK constraints. The XOR can be enforced at the database level.

**Migration SQL (appended to auto-generated migration):**
```sql
-- XOR constraint: exactly one of fabric_id or product_id must be set
ALTER TABLE `order_items` ADD CONSTRAINT `chk_order_item_product_xor`
  CHECK (
    (fabric_id IS NOT NULL AND product_id IS NULL) OR
    (fabric_id IS NULL AND product_id IS NOT NULL)
  );

ALTER TABLE `quote_items` ADD CONSTRAINT `chk_quote_item_product_xor`
  CHECK (
    (fabric_id IS NOT NULL AND product_id IS NULL) OR
    (fabric_id IS NULL AND product_id IS NOT NULL)
  );
```

**Confidence:** HIGH - MySQL 8.0.16+ enforces CHECK constraints (prior versions parsed but ignored them). The project uses MySQL 8.0.

### Pattern 2: XOR Validation (DTO Level)

Use `@ValidateIf` from class-validator for conditional validation. When `fabricId` is provided, `productId` must be absent, and vice versa. Add a custom class-level validator for the XOR check.

```typescript
import { ValidateIf, IsInt, Min, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

// Custom class-level decorator for XOR validation
function IsProductXor(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isProductXor',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const obj = args.object as { fabricId?: number; productId?: number };
          const hasFabric = obj.fabricId !== undefined && obj.fabricId !== null;
          const hasProduct = obj.productId !== undefined && obj.productId !== null;
          return (hasFabric && !hasProduct) || (!hasFabric && hasProduct);
        },
        defaultMessage() {
          return 'Exactly one of fabricId or productId must be provided (not both, not neither)';
        },
      },
    });
  };
}

// Usage in DTO:
export class AddOrderItemDto {
  @ValidateIf((o: AddOrderItemDto) => !o.productId)
  @IsInt()
  @Min(1)
  fabricId?: number;

  @ValidateIf((o: AddOrderItemDto) => !o.fabricId)
  @IsInt()
  @Min(1)
  productId?: number;

  @IsProductXor({ message: 'Exactly one of fabricId or productId must be provided' })
  _xorCheck?: never; // Dummy field for class-level validation
}
```

**Better approach (avoid dummy field):** Use `@Validate` at class level or place the XOR decorator on one of the real fields:

```typescript
export class AddOrderItemDto {
  @ValidateIf((o: AddOrderItemDto) => !o.productId)
  @IsInt()
  @Min(1)
  fabricId?: number;

  @IsProductXor({ message: 'Exactly one of fabricId or productId must be provided' })
  @ValidateIf((o: AddOrderItemDto) => !o.fabricId)
  @IsInt()
  @Min(1)
  productId?: number;
}
```

**Confidence:** HIGH - This is a well-established pattern with class-validator. The project's existing DTOs already use `@ValidateIf` pattern (see `tech-decisions.md` note about explicit type annotation on callbacks).

### Pattern 3: Unit Derivation from SubCategory

Create a utility function that maps `Product.subCategory` to unit string. Place in a shared location accessible to both OrderItemService and QuoteService.

```typescript
// e.g., backend/src/common/utils/product-units.ts
import { ProductSubCategory } from '../../system/enums';

export const UNIT_BY_SUB_CATEGORY: Record<string, string> = {
  [ProductSubCategory.IRON_FRAME]: 'set',    // 套
  [ProductSubCategory.MOTOR]: 'piece',       // 个
  [ProductSubCategory.MATTRESS]: 'sheet',    // 张
  [ProductSubCategory.ACCESSORY]: 'piece',   // 个
};

export const FABRIC_UNIT = 'meter'; // 米

export function getUnitForProduct(subCategory: string): string {
  return UNIT_BY_SUB_CATEGORY[subCategory] ?? 'piece';
}
```

**Confidence:** HIGH - Simple mapping, no external dependency.

### Pattern 4: Quote Model Restructure

Current Quote model has `fabricId`, `quantity`, `unitPrice`, `totalPrice` directly on Quote. These move to a new `QuoteItem` table. The Quote model becomes a header.

**New Schema:**
```prisma
model Quote {
  id         Int      @id @default(autoincrement())
  quoteCode  String   @unique @map("quote_code")
  customerId Int      @map("customer_id")
  totalPrice Decimal  @map("total_price") @db.Decimal(12, 2)
  validUntil DateTime @map("valid_until")
  status     String   @default("active")
  notes      String?  @db.Text
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  customer   Customer    @relation(fields: [customerId], references: [id])
  items      QuoteItem[]
  orderItems OrderItem[] // Keep backward compat for quote-linked order items

  @@index([quoteCode])
  @@index([customerId])
  @@index([validUntil])
  @@index([status])
  @@index([status, validUntil], name: "idx_quotes_status_valid_until")
  @@map("quotes")
}

model QuoteItem {
  id            Int      @id @default(autoincrement())
  quoteId       Int      @map("quote_id")
  fabricId      Int?     @map("fabric_id")
  productId     Int?     @map("product_id")
  quantity      Decimal  @db.Decimal(10, 2)
  unitPrice     Decimal  @map("unit_price") @db.Decimal(10, 2)
  subtotal      Decimal  @db.Decimal(12, 2)
  unit          String   @default("meter")
  isConverted   Boolean  @default(false) @map("is_converted")
  notes         String?  @db.Text
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  quote    Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  fabric   Fabric?  @relation(fields: [fabricId], references: [id])
  product  Product? @relation(fields: [productId], references: [id])

  @@index([quoteId])
  @@index([fabricId])
  @@index([productId])
  @@map("quote_items")
}
```

### Pattern 5: Data Migration for Existing Quotes

Existing quotes need to be migrated to the new multi-item structure. Each existing quote becomes a single-item quote with one QuoteItem.

**Custom SQL in migration file (after QuoteItem table creation):**
```sql
-- Migrate existing quote data to quote_items table
INSERT INTO quote_items (quote_id, fabric_id, quantity, unit_price, subtotal, unit, is_converted, created_at, updated_at)
SELECT id, fabric_id, quantity, unit_price, total_price, 'meter',
  CASE WHEN status = 'converted' THEN 1 ELSE 0 END,
  created_at, updated_at
FROM quotes;

-- Drop old columns from quotes table (after data migration)
ALTER TABLE quotes DROP COLUMN fabric_id;
ALTER TABLE quotes DROP COLUMN quantity;
ALTER TABLE quotes DROP COLUMN unit_price;
```

**Note:** `total_price` remains on Quote as a computed aggregate, recalculated from QuoteItems (same pattern as Order.totalAmount).

### Pattern 6: Partial Conversion DTO

Replace the current `ConvertQuotesToOrderDto` (which takes quoteIds) with a new DTO that supports item-level selection:

```typescript
export class ConvertQuoteItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  quoteItemIds!: number[];
}
```

The service logic:
1. Fetch all QuoteItems by IDs, validate they belong to the same quote
2. Validate the quote is active or partially_converted
3. Validate none of the selected items are already converted
4. Create OrderItems from selected QuoteItems
5. Mark selected QuoteItems as `isConverted = true`
6. Update Quote status: all converted = `converted`, some converted = `partially_converted`

### Pattern 7: Supplier Auto-Fill for Products

Mirror the existing FabricSupplier cheapest-price lookup pattern for ProductSupplier:

```typescript
// In service, when productId is provided:
const productSuppliers = await tx.productSupplier.findMany({
  where: { productId },
  orderBy: { purchasePrice: 'asc' },
  take: 1,
});
const cheapestSupplier = productSuppliers[0];
// Set supplierId and purchasePrice from cheapestSupplier
```

**Confidence:** HIGH - Directly mirrors the existing `batchConvertToOrder` pattern for fabric suppliers.

### Recommended Project Structure Changes

```
backend/src/
├── common/
│   └── utils/
│       └── product-units.ts       # NEW: unit derivation utility
├── order/
│   ├── dto/
│   │   ├── add-order-item.dto.ts  # MODIFY: fabricId optional, add productId, add unit
│   │   ├── create-order.dto.ts    # NO CHANGE (uses AddOrderItemDto)
│   │   └── update-order-item.dto.ts # MODIFY: add productId handling
│   ├── order-item.service.ts      # MODIFY: XOR validation, product supplier auto-fill
│   ├── order.validators.ts        # MODIFY: add validateProductExists, update validateOrderItemReferences
│   ├── order.includes.ts          # MODIFY: add product relation to includes
│   └── order.service.ts           # MODIFY: handle productId in create
├── quote/
│   ├── dto/
│   │   ├── create-quote.dto.ts    # MAJOR REWRITE: multi-item structure
│   │   ├── update-quote.dto.ts    # MODIFY: adapt for multi-item
│   │   ├── convert-quote.dto.ts   # MAJOR REWRITE: item-level selection
│   │   └── query-quote.dto.ts     # MODIFY: remove fabricId filter, add product-aware filters
│   ├── quote.service.ts           # MAJOR REWRITE: multi-item CRUD, partial conversion
│   ├── quote.controller.ts        # MODIFY: new endpoints for QuoteItem management
│   └── quote.scheduler.ts         # MINOR: update query for partially_converted status
└── prisma/
    └── schema.prisma              # MODIFY: OrderItem, Quote, new QuoteItem
```

### Anti-Patterns to Avoid

- **Don't use string enum for unit**: Use a simple string column, not a Prisma enum. The project convention (see tech-decisions.md: "String columns for category/subCategory, not Prisma enum") avoids DDL per enum change.
- **Don't create separate DTO classes for fabric vs product items**: Use a single AddOrderItemDto with conditional validation. The XOR pattern keeps it clean.
- **Don't break the existing API for backward compatibility testing**: The `POST /quotes/batch-convert` endpoint needs a different body shape. Since frontend changes are Phase 8, consider maintaining the old endpoint temporarily or making the new format backward-compatible.
- **Don't migrate Quote model incrementally (add QuoteItem, keep old columns, then remove)**: Do it in a single migration with data migration SQL. Intermediate states with duplicate data are error-prone.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XOR validation at DTO level | Custom middleware or manual check in controller | class-validator `@ValidateIf` + custom decorator | Consistent with project pattern, auto-generates error messages |
| XOR constraint at DB level | Application-only enforcement | MySQL CHECK constraint in migration | Defense in depth; DB prevents invalid data even if app layer bypassed |
| Data migration | Manual script or seed file | SQL in Prisma migration file | Runs automatically, tracked in migration history, rollback-safe |
| Unit derivation | Hardcoded if/else in each service | Centralized mapping utility | Single source of truth, used by both Order and Quote modules |
| Quote totalPrice recalculation | Manual sum in every operation | Shared helper (same pattern as `recalculateOrderTotals`) | Prevents drift between items and header |

## Common Pitfalls

### Pitfall 1: Prisma Schema Drift After Custom Migration SQL
**What goes wrong:** After adding CHECK constraints manually to migration SQL, running `prisma migrate dev` again may try to recreate the migration or warn about drift.
**Why it happens:** Prisma doesn't model CHECK constraints in schema.prisma, so it doesn't know they exist.
**How to avoid:** Use `--create-only` to generate migration, edit SQL, then apply. The CHECK constraint is invisible to Prisma's schema diffing and won't cause drift warnings.
**Warning signs:** `prisma migrate dev` warnings about schema drift.

### Pitfall 2: Existing E2E Tests Break on Quote Restructure
**What goes wrong:** 26 E2E tests for Quote and 82 for Order assume the old Quote schema (fabricId/quantity/unitPrice on Quote).
**Why it happens:** The Quote model fundamentally changes from single-item to multi-item.
**How to avoid:** Update Quote E2E tests alongside the restructure. The OrderItem E2E tests should mostly survive since OrderItem changes are additive (nullable fabricId, new productId).
**Warning signs:** Mass test failures after migration.

### Pitfall 3: Decimal vs Integer Quantity Validation
**What goes wrong:** Non-fabric products allow integer quantities only, but the DB column is Decimal(10,2). Decimal allows 100.50 which should be rejected for non-fabric items.
**Why it happens:** The DTO needs different validation rules based on whether fabricId or productId is provided.
**How to avoid:** Use `@ValidateIf` to apply `@IsInt()` when productId is present, and `@IsNumber({ maxDecimalPlaces: 2 })` when fabricId is present.
**Warning signs:** Non-integer quantities stored for non-fabric items.

### Pitfall 4: Quote Status Partially Converted Not Handled in Scheduler
**What goes wrong:** The quote expiration scheduler currently only marks `active` quotes as expired. Partially converted quotes should also be checked.
**Why it happens:** New status not accounted for in `markExpiredQuotes()`.
**How to avoid:** Update the where clause: `status: { in: [QuoteStatus.ACTIVE, QuoteStatus.PARTIALLY_CONVERTED] }`.
**Warning signs:** Partially converted quotes never expire.

### Pitfall 5: OrderItem.quoteId FK Still References Old Quote
**What goes wrong:** OrderItem has `quoteId` FK to Quote. After restructure, we need to decide if this should reference Quote (header) or QuoteItem (specific item).
**Why it happens:** The current design links OrderItem to the entire Quote, but partial conversion creates OrderItems from individual QuoteItems.
**How to avoid:** Add `quoteItemId` to OrderItem (nullable) to track which specific QuoteItem was converted. Keep `quoteId` for backward compatibility and quick header lookup.
**Warning signs:** Can't trace which specific quote item created which order item.

### Pitfall 6: Fabric Relation Removal on Quote Breaks Prisma Types
**What goes wrong:** Removing `fabricId` from Quote model changes Prisma generated types. Any code accessing `quote.fabric` or `quote.fabricId` will fail at compile time.
**Why it happens:** Prisma regenerates types after schema change.
**How to avoid:** After migration, run `prisma generate` and fix all TypeScript compilation errors. The Quote includes in quote.service.ts (`QUOTE_LIST_INCLUDE`, `QUOTE_DETAIL_INCLUDE`) reference `fabric:` which must be updated to use items relation.
**Warning signs:** TypeScript build errors referencing `quote.fabricId` or `quote.fabric`.

## Code Examples

### XOR Custom Validator (Reusable)

```typescript
// backend/src/common/validators/xor-field.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates XOR constraint between two fields.
 * Exactly one of the two fields must be set (not both, not neither).
 */
export function IsXorWith(
  otherField: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isXorWith',
      target: object.constructor,
      propertyName,
      constraints: [otherField],
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const thisValue = obj[args.property];
          const otherValue = obj[args.constraints[0] as string];
          const hasThis =
            thisValue !== undefined && thisValue !== null;
          const hasOther =
            otherValue !== undefined && otherValue !== null;
          return (hasThis && !hasOther) || (!hasThis && hasOther);
        },
        defaultMessage(args: ValidationArguments) {
          return `Exactly one of ${args.property} or ${args.constraints[0]} must be provided`;
        },
      },
    });
  };
}
```

### Updated AddOrderItemDto

```typescript
export class AddOrderItemDto {
  @ValidateIf((o: AddOrderItemDto) => !o.productId)
  @IsInt()
  @Min(1)
  fabricId?: number;

  @IsXorWith('fabricId', {
    message: 'Exactly one of fabricId or productId must be provided',
  })
  @ValidateIf((o: AddOrderItemDto) => !o.fabricId)
  @IsInt()
  @Min(1)
  productId?: number;

  // When productId is set, quantity must be integer
  @ValidateIf((o: AddOrderItemDto) => !!o.productId)
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantityInt?: never; // Validated via custom logic

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  quantity!: number;

  @IsString()
  @IsOptional()
  unit?: string; // Auto-derived if not provided

  // ... rest unchanged
}
```

**Note:** The integer quantity validation for products is better handled at the service level since the DTO doesn't know the product type until the DB is consulted. Alternatively, use a custom decorator that checks `productId` presence.

### Updated OrderItem Includes

```typescript
// Add to order.includes.ts
export const PRODUCT_SELECT = {
  id: true,
  productCode: true,
  name: true,
  subCategory: true,
} as const satisfies Prisma.ProductSelect;

// Update existing includes
export const ORDER_ITEM_INCLUDE_BASIC = {
  fabric: { select: FABRIC_SELECT },
  product: { select: PRODUCT_SELECT },
  supplier: { select: SUPPLIER_SELECT },
} as const satisfies Prisma.OrderItemInclude;
```

### Quote Recalculate Total Pattern

```typescript
// Mirrors recalculateOrderTotals pattern
private async recalculateQuoteTotal(
  tx: Prisma.TransactionClient,
  quoteId: number,
): Promise<void> {
  const items = await tx.quoteItem.findMany({
    where: { quoteId, isConverted: false },
    select: { subtotal: true },
  });

  const totalPrice = items.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0,
  );

  await tx.quote.update({
    where: { id: quoteId },
    data: { totalPrice },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Quote = single item (fabricId on Quote) | Quote = header + QuoteItem[] | This phase | All quote CRUD, conversion, queries change |
| OrderItem.fabricId required | OrderItem: fabricId XOR productId | This phase | All order item creation/validation paths change |
| Quote conversion = all-or-nothing (quoteIds[]) | Partial conversion = item-level (quoteItemIds[]) | This phase | Conversion DTO, service logic, status model change |
| Quote status: active/expired/converted | + partially_converted | This phase | Scheduler, status checks, frontend display |

## Open Questions

1. **Should quoteItemId be added to OrderItem?**
   - What we know: Currently OrderItem has quoteId (nullable) linking to the Quote header. With partial conversion, we need to track which specific QuoteItem was converted.
   - What's unclear: Whether quoteId alone is sufficient (can trace via QuoteItem.isConverted) or if a direct FK is cleaner.
   - Recommendation: Add `quoteItemId` to OrderItem for direct traceability. This makes it easy to show "this order item came from this specific quote line" without reverse lookups.

2. **Backward compatibility for batch-convert endpoint**
   - What we know: Current `POST /quotes/batch-convert` accepts `{ quoteIds: number[] }`. Phase 8 (frontend) will use the new format.
   - What's unclear: Whether the old endpoint should be maintained temporarily.
   - Recommendation: Replace the endpoint with the new item-level format. Since frontend changes are Phase 8, and the old batch-convert is not used by external consumers, a clean break is acceptable. Add a new `POST /quotes/convert-items` endpoint.

3. **Quote totalPrice: include or exclude converted items?**
   - What we know: Quote.totalPrice currently represents the full quote value. After partial conversion, some items are already in orders.
   - What's unclear: Business expectation of what totalPrice means post-conversion.
   - Recommendation: totalPrice represents the FULL quote value (all items). Add a computed `remainingTotal` in the response (or compute on frontend) for unconverted items. This preserves historical accuracy.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (backend) |
| Config file | `backend/package.json` (inline config) |
| Quick run command | `cd backend && pnpm test -- --testPathPattern "quote\|order" --bail` |
| Full suite command | `cd backend && pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCAT-07a | OrderItem accepts productId with XOR validation | unit | `cd backend && pnpm test -- --testPathPattern order-item.service.spec -x` | Needs update |
| MCAT-07b | OrderItem DB check constraint rejects invalid data | e2e | `cd backend && pnpm test:e2e -- --testPathPattern order.e2e -x` | Needs update |
| MCAT-07c | Product supplier auto-fill on OrderItem creation | unit | `cd backend && pnpm test -- --testPathPattern order-item.service.spec -x` | Needs new tests |
| MCAT-07d | AddOrderItemDto XOR validation rejects both/neither | unit | DTO validation tests | New file needed |
| MCAT-08a | Quote create with multi-item | unit | `cd backend && pnpm test -- --testPathPattern quote.service.spec -x` | Needs rewrite |
| MCAT-08b | QuoteItem fabricId XOR productId validation | unit | `cd backend && pnpm test -- --testPathPattern quote.service.spec -x` | Needs new tests |
| MCAT-08c | Partial conversion selects specific items | unit | `cd backend && pnpm test -- --testPathPattern quote.service.spec -x` | Needs new tests |
| MCAT-08d | Quote status transitions with partially_converted | unit | `cd backend && pnpm test -- --testPathPattern quote.service.spec -x` | Needs new tests |
| MCAT-08e | Quote expiration scheduler handles partially_converted | unit | `cd backend && pnpm test -- --testPathPattern quote.scheduler.spec -x` | Needs update |
| MCAT-08f | Quote E2E with multi-item CRUD | e2e | `cd backend && pnpm test:e2e -- --testPathPattern quote.e2e -x` | Needs rewrite |

### Sampling Rate
- **Per task commit:** `cd backend && pnpm test -- --testPathPattern "quote|order" --bail`
- **Per wave merge:** `cd backend && pnpm build && pnpm test && pnpm lint`
- **Phase gate:** Full backend suite green (unit + e2e + lint + build)

### Wave 0 Gaps
- [ ] `backend/src/common/validators/xor-field.validator.spec.ts` -- unit tests for XOR custom validator
- [ ] Quote service spec needs major rewrite for multi-item model (894 lines currently)
- [ ] Quote E2E spec needs major rewrite for new API shape (527 lines currently)
- [ ] Order item service spec needs new test cases for productId path (480 lines currently)

## Sources

### Primary (HIGH confidence)
- `backend/prisma/schema.prisma` -- Current schema analyzed for OrderItem (fabricId required), Quote (single-item), Product model
- `backend/src/order/order-item.service.ts` -- 599 lines, full CRUD + status + timeline logic
- `backend/src/order/order.validators.ts` -- 239 lines, validation helpers
- `backend/src/order/order.includes.ts` -- 177 lines, Prisma include configs
- `backend/src/quote/quote.service.ts` -- 515 lines, single-item CRUD + conversion
- `backend/src/quote/dto/create-quote.dto.ts` -- Current DTO with required fabricId
- `backend/src/quote/dto/convert-quote.dto.ts` -- Current batch conversion DTO
- `backend/src/product/product.service.ts` -- Product CRUD, ProductSupplier pattern
- `backend/src/system/enums/index.ts` -- ProductSubCategory enum
- MySQL 8.0 CHECK constraint support -- standard feature since 8.0.16

### Secondary (MEDIUM confidence)
- [Prisma custom migrations docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) -- `--create-only` workflow for adding CHECK constraints
- [class-validator GitHub](https://github.com/typestack/class-validator) -- ValidateIf, registerDecorator for custom validators

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all within existing project toolchain
- Architecture: HIGH -- patterns directly mirror existing OrderItem/FabricSupplier/OrderService patterns
- Pitfalls: HIGH -- identified from direct code analysis of 5 affected service files and 5 test files
- Migration strategy: HIGH -- MySQL 8.0 CHECK constraint is well-established, Prisma custom migration is documented

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain, no fast-moving dependencies)
