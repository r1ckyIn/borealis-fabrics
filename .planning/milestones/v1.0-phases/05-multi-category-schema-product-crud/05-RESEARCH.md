# Phase 5: Multi-Category Schema + Product CRUD - Research

**Researched:** 2026-03-24
**Domain:** Prisma schema design, NestJS module CRUD, JSON column patterns, code generation extension
**Confidence:** HIGH

## Summary

Phase 5 introduces a Product table parallel to the existing Fabric table, supporting iron frame and motor categories with supplier/customer pricing. The codebase already has mature patterns for all required features: FabricModule provides a complete CRUD template (controller + service + DTOs + specs), FabricSupplier provides the multi-supplier pricing pattern, CustomerPricing provides the customer-specific pricing pattern, and CodeGeneratorService provides the auto-code generation pattern.

The key architectural decisions are already locked: Product is independent from Fabric (no migration risk), uses a single `IRON_FRAME_MOTOR` category with subCategory discrimination, stores flexible specs in a JSON column, and replicates the FabricSupplier pattern for ProductSupplier. The CustomerPricing table needs extension with a nullable productId (XOR with fabricId), and CodeGeneratorService needs new prefix entries.

**Primary recommendation:** Replicate the FabricModule pattern exactly for ProductModule, extending CodeGeneratorService and CustomerPricing incrementally. Use application-level validation for the CustomerPricing XOR constraint (not database CHECK constraint) since Prisma does not natively support CHECK constraints and the XOR will only matter in Phase 7 when OrderItem gets productId.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Product table is **independent and parallel** to Fabric table -- zero migration risk
- Product table stores iron frame/motor products only (no fabric data migration)
- Fabric table stays untouched; all existing tests and data preserved
- Phase 7 will add productId to OrderItem with XOR constraint (fabricId XOR productId)
- Single category for now: `IRON_FRAME_MOTOR`
- **subCategory field required**: `IRON_FRAME` | `MOTOR` | `MATTRESS` | `ACCESSORY`
- Common fields: productCode, name, subCategory, defaultPrice, specs (JSON), notes, isActive
- Iron frame specs: modelNumber, specification, seatType
- Motor/accessory specs: modelNumber, specification
- Mattress specs: specification
- Temporary prefixes: TJ (iron frame), DJ (motor), CD (mattress), PJ (accessory)
- Extend CodeGeneratorService with new CodePrefix entries per subCategory
- ProductSupplier table: productId + supplierId + purchasePrice + minOrderQty + leadTimeDays
- Extend CustomerPricing with nullable productId (XOR with fabricId)
- ProductBundle table for set/kit templates
- ProductBundleItem: bundleId + productId + quantity
- Bundle has its own pricing (not necessarily sum of parts)
- Phase 5 scope: schema + basic CRUD only, order integration in later phases

### Claude's Discretion
- Prisma schema design details (indexes, column types, JSON structure)
- Module organization (ProductModule structure, service decomposition)
- DTO design and validation rules
- Test strategy and mock patterns
- API endpoint design (follows existing NestJS conventions)

### Deferred Ideas (OUT OF SCOPE)
- Hardware (五金) category -- business content not yet defined, add when ready
- Fabric migration into Product table -- intentionally deferred, may never happen
- Bundle integration with orders -- Phase 7+ scope
- Product images -- not in current requirements, add if needed
- Old/new price versioning -- Excel has historical prices, system only tracks current
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MCAT-01 | Product abstraction schema designed and migrated (products table + category enum) | Prisma schema pattern from Fabric model; JSON column for specs; category/subCategory string columns with enum validation |
| MCAT-02 | Iron frame CRUD with model numbers, specifications, and pricing | Replicate FabricModule pattern; ProductSupplier for multi-supplier pricing |
| MCAT-03 | Motor CRUD with channel configurations and pricing | Same ProductModule handles motors via subCategory discrimination |
| MCAT-04 | Hardware/accessories CRUD with specifications and pricing | Accessories handled as ACCESSORY subCategory; hardware deferred per CONTEXT.md |
| MCAT-09 | Product code generation (category-specific prefixes via CodeGeneratorService) | Extend CodePrefix enum + switch cases in getMaxSequenceFromDbTx |
</phase_requirements>

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | ^11.0.1 | Backend framework | Already the project framework |
| Prisma | 6.19.2 | ORM + migrations | Already the project ORM |
| class-validator | ^0.14.3 | DTO validation | Already used for all DTOs |
| class-transformer | ^0.5.1 | DTO transforms | Already used for trimTransform, Type conversion |
| @nestjs/swagger | ^11.2.5 | API documentation | Already used for all controllers |
| Jest | (project default) | Backend testing | Already configured |

### No New Dependencies Required

This phase requires zero new npm packages. Everything is built using existing project dependencies. The Product module follows the exact same patterns as the Fabric module.

## Architecture Patterns

### Recommended Project Structure

```
backend/src/product/
├── product.module.ts           # Module definition
├── product.service.ts          # CRUD + supplier + pricing logic
├── product.service.spec.ts     # Unit tests
├── product.controller.ts       # REST endpoints
├── product.controller.spec.ts  # Controller unit tests
└── dto/
    ├── index.ts                      # Barrel exports
    ├── create-product.dto.ts         # Create product DTO
    ├── update-product.dto.ts         # Update (PartialType)
    ├── query-product.dto.ts          # List/filter/paginate DTO
    ├── create-product-supplier.dto.ts # Link supplier
    ├── update-product-supplier.dto.ts # Update supplier pricing
    ├── query-product-suppliers.dto.ts # List product suppliers
    ├── create-product-pricing.dto.ts  # Customer special pricing
    ├── update-product-pricing.dto.ts  # Update customer pricing
    ├── query-product-pricing.dto.ts   # List customer pricing
    ├── create-product-bundle.dto.ts   # Create bundle
    ├── update-product-bundle.dto.ts   # Update bundle
    └── query-product-bundle.dto.ts    # List bundles
```

### Pattern 1: Prisma Schema for Product Table

**What:** New Product model parallel to Fabric, with category/subCategory string columns and JSON specs column.

**Design decision -- String columns over Prisma enum:**
The existing codebase uses string columns for all enum-like fields (Order.status, Supplier.status, CustomerPricing) with TypeScript enum validation at the application layer. This is the established pattern. Do NOT use Prisma `enum` type -- it generates ALTER TABLE for every enum change and is rigid. Use string columns + class-validator `@IsEnum()` at the DTO layer, consistent with every other enum in the project.

**Schema:**
```prisma
// Source: Derived from existing Fabric model pattern in schema.prisma
model Product {
  id           Int      @id @default(autoincrement())
  productCode  String   @unique @map("product_code")
  name         String
  category     String   // IRON_FRAME_MOTOR (extensible for future HARDWARE)
  subCategory  String   @map("sub_category") // IRON_FRAME | MOTOR | MATTRESS | ACCESSORY
  modelNumber  String?  @map("model_number")
  specification String?
  defaultPrice Decimal? @map("default_price") @db.Decimal(10, 2)
  specs        Json?    @db.Json   // Category-specific fields (seatType, etc.)
  notes        String?  @db.Text
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  productSuppliers ProductSupplier[]
  bundleItems      ProductBundleItem[]

  @@index([productCode])
  @@index([name])
  @@index([category])
  @@index([subCategory])
  @@map("products")
}

model ProductSupplier {
  id            Int      @id @default(autoincrement())
  productId     Int      @map("product_id")
  supplierId    Int      @map("supplier_id")
  purchasePrice Decimal  @map("purchase_price") @db.Decimal(10, 2)
  minOrderQty   Decimal? @map("min_order_qty") @db.Decimal(10, 2)
  leadTimeDays  Int?     @map("lead_time_days")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  product  Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@unique([productId, supplierId])
  @@index([productId])
  @@index([supplierId])
  @@map("product_suppliers")
}

model ProductBundle {
  id          Int      @id @default(autoincrement())
  bundleCode  String   @unique @map("bundle_code")
  name        String
  description String?  @db.Text
  totalPrice  Decimal? @map("total_price") @db.Decimal(12, 2)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  items ProductBundleItem[]

  @@index([bundleCode])
  @@map("product_bundles")
}

model ProductBundleItem {
  id        Int     @id @default(autoincrement())
  bundleId  Int     @map("bundle_id")
  productId Int     @map("product_id")
  quantity  Int     @default(1)

  bundle  ProductBundle @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  product Product       @relation(fields: [productId], references: [id])

  @@unique([bundleId, productId])
  @@index([bundleId])
  @@index([productId])
  @@map("product_bundle_items")
}
```

**Key design decisions:**
- `modelNumber` and `specification` are promoted to top-level columns (not buried in JSON) because they are common to all subCategories and frequently queried/displayed
- `specs` JSON stores only truly category-specific fields like `seatType` for iron frames
- `category` is string ("IRON_FRAME_MOTOR") for future extensibility ("HARDWARE")
- `subCategory` is string for application-level enum validation

### Pattern 2: CustomerPricing Extension

**What:** Add nullable `productId` to CustomerPricing with application-level XOR validation.

**Schema change:**
```prisma
model CustomerPricing {
  id           Int      @id @default(autoincrement())
  customerId   Int      @map("customer_id")
  fabricId     Int?     @map("fabric_id")     // Changed: nullable
  productId    Int?     @map("product_id")    // New: nullable
  specialPrice Decimal  @map("special_price") @db.Decimal(10, 2)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  fabric   Fabric?  @relation(fields: [fabricId], references: [id], onDelete: Cascade)
  product  Product? @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([customerId, fabricId])     // Existing
  @@unique([customerId, productId])    // New
  @@index([customerId])
  @@index([fabricId])
  @@index([productId])                 // New
  @@map("customer_pricing")
}
```

**CRITICAL: fabricId becomes nullable.** This is a breaking schema change. The migration must:
1. First add `productId` column (nullable)
2. Then alter `fabricId` to be nullable
3. All existing rows already have fabricId set, so no data loss

**XOR validation approach:** Application-level validation in the DTO/service, NOT a database CHECK constraint. Reasons:
- Prisma does not support CHECK constraints natively (confirmed via [GitHub issue #3388](https://github.com/prisma/prisma/issues/3388))
- MySQL CHECK constraints cause problems with Prisma's sequential update approach for XOR fields (confirmed via [Prisma discussion #8462](https://github.com/prisma/prisma/discussions/8462))
- The existing codebase validates all business rules at the service layer, which is consistent

### Pattern 3: CodeGeneratorService Extension

**What:** Add new CodePrefix entries for product subCategories.

**Source:** `backend/src/common/services/code-generator.service.ts`

```typescript
export enum CodePrefix {
  FABRIC = 'BF',
  ORDER = 'ORD',
  QUOTE = 'QT',
  // New product code prefixes
  IRON_FRAME = 'TJ',
  MOTOR = 'DJ',
  MATTRESS = 'CD',
  ACCESSORY = 'PJ',
  BUNDLE = 'BD',   // For ProductBundle codes
}
```

The `getMaxSequenceFromDbTx` method needs new switch cases for each prefix querying the `products` table by `productCode` prefix pattern. All new prefixes query the same `products` table but filter by prefix.

### Pattern 4: Supplier Relation Extension

**What:** Add `productSuppliers` relation to existing Supplier model.

```prisma
model Supplier {
  // ... existing fields ...
  productSuppliers ProductSupplier[]  // New relation
}
```

This is additive -- no existing data or tests affected.

### Pattern 5: System Enum Registration

**What:** Register new product enums in the SystemService for frontend consumption.

New enums needed:
```typescript
export enum ProductCategory {
  IRON_FRAME_MOTOR = 'IRON_FRAME_MOTOR',
}

export enum ProductSubCategory {
  IRON_FRAME = 'IRON_FRAME',
  MOTOR = 'MOTOR',
  MATTRESS = 'MATTRESS',
  ACCESSORY = 'ACCESSORY',
}

export const PRODUCT_CATEGORY_LABELS = {
  IRON_FRAME_MOTOR: '铁架电机',
} as const;

export const PRODUCT_SUB_CATEGORY_LABELS = {
  IRON_FRAME: '铁架',
  MOTOR: '电机',
  MATTRESS: '床垫',
  ACCESSORY: '配件',
} as const;
```

### Anti-Patterns to Avoid

- **Do NOT use Prisma `enum` type for category/subCategory.** The project uses string columns + TypeScript enums for all business enums. Prisma enum requires DDL migration for every new value.
- **Do NOT add database CHECK constraints for XOR.** Use application-level validation. Prisma has known issues with CHECK constraints during updates.
- **Do NOT create separate tables per subCategory.** One Product table with subCategory discrimination handles all types. This is the established pattern for extensibility.
- **Do NOT nest all specs in JSON.** Promote frequently accessed fields (modelNumber, specification) to top-level columns for better query performance and simpler DTOs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination | Custom pagination logic | `buildPaginationArgs()` + `buildPaginatedResult()` from CommonModule | Already handles page/pageSize/total/totalPages |
| Code generation | Custom sequence counter | `CodeGeneratorService.generateCode()` | Redis atomic increment + DB fallback already built |
| DTO validation | Manual request validation | class-validator decorators + global ValidationPipe | Already configured globally in AppModule |
| API docs | Manual API documentation | @nestjs/swagger decorators | Already set up with Swagger UI |
| String trimming | Manual trim in service | `trimTransform` from `common/transforms` | Consistent with all existing DTOs |
| Decimal handling | Manual BigDecimal conversion | `toNumber()` / `toNumberRequired()` from `common/utils/decimal` | Handles Prisma Decimal -> number safely |
| Sort field whitelist | Manual sort validation | Enum + `@IsEnum()` pattern from QueryFabricDto | Prevents Prisma query injection |

## Common Pitfalls

### Pitfall 1: CustomerPricing fabricId Nullability Migration

**What goes wrong:** Making `fabricId` nullable in CustomerPricing breaks the existing `@@unique([customerId, fabricId])` constraint behavior. MySQL treats NULL as unique, so multiple rows with `(customerId=1, fabricId=NULL)` are allowed.
**Why it happens:** The existing unique constraint assumes fabricId is always set.
**How to avoid:** The existing `@@unique([customerId, fabricId])` still works for fabric-based pricing (NULL fabricId rows are for product pricing, which use the new `@@unique([customerId, productId])` constraint). Application-level validation must enforce: exactly one of fabricId or productId is set (not both, not neither).
**Warning signs:** Duplicate customer pricing records in the database with NULL fabricId/productId.

### Pitfall 2: CodeGeneratorService Switch Fall-Through

**What goes wrong:** Adding new CodePrefix entries without adding corresponding switch cases in `getMaxSequenceFromDbTx` causes the method to return `null` for new prefixes, starting sequence from 0 every time.
**Why it happens:** The switch statement has no default case that queries the products table.
**How to avoid:** Add switch cases for all four new prefixes (TJ, DJ, CD, PJ) plus BUNDLE (BD). All product prefixes query `tx.product.findFirst()` with the productCode prefix pattern. Add a default case that throws an error for unknown prefixes.
**Warning signs:** Duplicate product codes generated.

### Pitfall 3: JSON Specs Validation

**What goes wrong:** No runtime validation on the `specs` JSON column means invalid data can be stored (e.g., seatType: "invalid" for iron frames).
**Why it happens:** Prisma's JSON type is `Prisma.JsonValue` with no schema validation.
**How to avoid:** Validate specs structure in the service layer before save. For Phase 5, keep validation simple: check that known fields have valid values. Do NOT add prisma-json-types-generator -- it adds complexity without runtime validation. Service-level validation is sufficient and consistent with how the project validates other JSON fields (material, application, tags on Fabric are not validated beyond IsObject/IsArray).
**Warning signs:** Frontend displays unexpected specs field values.

### Pitfall 4: Supplier Model Missing Relation

**What goes wrong:** Forgetting to add `productSuppliers ProductSupplier[]` to the Supplier model in schema.prisma causes Prisma generation failure.
**Why it happens:** When adding the ProductSupplier model, both sides of the relation must be declared.
**How to avoid:** Checklist before migration: verify both Product and Supplier models have the new relation array field. Same for CustomerPricing needing `product Product?` relation.
**Warning signs:** `prisma generate` fails with relation error.

### Pitfall 5: Existing Test Breakage from CustomerPricing Change

**What goes wrong:** Making `fabricId` nullable in CustomerPricing may break existing FabricService tests that mock CustomerPricing operations.
**Why it happens:** Test mocks may assume `fabricId` is always present (non-nullable type).
**How to avoid:** After schema change, run `prisma generate` and then `pnpm test` to identify any TypeScript type errors in existing tests. Fix by updating mock data types to allow `fabricId: number | null`. The actual data won't change (all existing rows have fabricId set), but the TypeScript type changes.
**Warning signs:** TypeScript compilation errors in fabric.service.spec.ts after migration.

## Code Examples

### Product Service Create (following Fabric pattern)

```typescript
// Source: Derived from fabric.service.ts create() method
async create(createProductDto: CreateProductDto): Promise<Product> {
  return this.prisma.$transaction(async (tx) => {
    // Check for duplicate productCode
    const existing = await tx.product.findFirst({
      where: { productCode: createProductDto.productCode },
    });

    if (existing) {
      throw new ConflictException(
        `Product with code "${createProductDto.productCode}" already exists`,
      );
    }

    return tx.product.create({
      data: {
        ...createProductDto,
        specs: createProductDto.specs ?? undefined,
      },
    });
  });
}
```

### CodePrefix Extension

```typescript
// Source: Derived from code-generator.service.ts
// All product prefixes query the same 'product' table
case CodePrefix.IRON_FRAME:
case CodePrefix.MOTOR:
case CodePrefix.MATTRESS:
case CodePrefix.ACCESSORY: {
  const result = await tx.product.findFirst({
    where: {
      productCode: { startsWith: `${prefix}-${yearMonth}-` },
    },
    orderBy: { productCode: 'desc' },
    select: { productCode: true },
  });
  maxCode = result?.productCode ?? null;
  break;
}
```

### CustomerPricing XOR Validation (Service Layer)

```typescript
// Source: Application-level XOR validation pattern
private validatePricingTarget(fabricId?: number, productId?: number): void {
  if (fabricId && productId) {
    throw new BadRequestException(
      'CustomerPricing must reference either fabricId or productId, not both',
    );
  }
  if (!fabricId && !productId) {
    throw new BadRequestException(
      'CustomerPricing must reference either fabricId or productId',
    );
  }
}
```

### Product Query DTO (following Fabric pattern)

```typescript
// Source: Derived from query-fabric.dto.ts
export enum ProductSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  productCode = 'productCode',
  name = 'name',
  defaultPrice = 'defaultPrice',
  subCategory = 'subCategory',
}

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ProductSortField)
  sortBy?: ProductSortField = ProductSortField.createdAt;

  @IsOptional()
  @IsString()
  @Transform(trimTransform)
  keyword?: string;

  @IsOptional()
  @IsEnum(ProductSubCategory)
  subCategory?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean | undefined;
  })
  isActive?: boolean = true;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma enum for status fields | String columns + TS enum + class-validator | Project convention since Phase 1 | Avoids migration-per-enum-value; consistent |
| Database CHECK constraints | Application-level validation in service | Prisma limitation (no native CHECK) | XOR enforced in DTO/service, not DB |
| Separate table per product type | Single table + discriminator column | Modern EAV/STI pattern | Extensible, fewer joins, simpler queries |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (backend) |
| Config file | `backend/package.json` jest section |
| Quick run command | `cd backend && pnpm test -- --testPathPattern=product` |
| Full suite command | `cd backend && pnpm build && pnpm test && pnpm lint` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCAT-01 | Product schema migration, CRUD basic operations | unit | `cd backend && pnpm test -- --testPathPattern=product.service` | Wave 0 |
| MCAT-02 | Iron frame create/read/update/delete with specs | unit | `cd backend && pnpm test -- --testPathPattern=product.service` | Wave 0 |
| MCAT-03 | Motor create/read/update/delete with specs | unit | `cd backend && pnpm test -- --testPathPattern=product.service` | Wave 0 |
| MCAT-04 | Accessory CRUD (hardware deferred) | unit | `cd backend && pnpm test -- --testPathPattern=product.service` | Wave 0 |
| MCAT-09 | Product code generation per subCategory | unit | `cd backend && pnpm test -- --testPathPattern=code-generator` | Existing (extend) |

### Sampling Rate

- **Per task commit:** `cd backend && pnpm test -- --testPathPattern=product`
- **Per wave merge:** `cd backend && pnpm build && pnpm test && pnpm lint`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/src/product/product.service.spec.ts` -- covers MCAT-01, MCAT-02, MCAT-03, MCAT-04
- [ ] `backend/src/product/product.controller.spec.ts` -- covers controller routing + validation
- [ ] `backend/src/common/services/code-generator.service.spec.ts` -- extend existing tests for new prefixes (MCAT-09)
- [ ] Prisma migration: `npx prisma migrate dev --name add_product_tables`
- [ ] Prisma generate after schema changes

## Open Questions

1. **CustomerPricing unique constraint with nullable fabricId**
   - What we know: MySQL allows multiple NULL values in unique constraints. `@@unique([customerId, fabricId])` will still work for fabric pricing rows.
   - What's unclear: Whether Prisma's upsert operations handle the nullable unique correctly in all edge cases.
   - Recommendation: Test thoroughly with unit tests. If issues arise, consider splitting into two unique constraints: one for fabric pricing (`@@unique([customerId, fabricId])` where fabricId is set) and one for product pricing (`@@unique([customerId, productId])` where productId is set). The application-level XOR validation ensures only one is ever set.

2. **ProductBundle code prefix**
   - What we know: Context mentions bundle CRUD but doesn't specify a code prefix.
   - What's unclear: Whether bundles need auto-generated codes like products.
   - Recommendation: Use "BD" prefix (BD-YYMM-NNNN) for bundle codes, added to CodeGeneratorService. Keep it simple.

## Sources

### Primary (HIGH confidence)
- `backend/prisma/schema.prisma` -- Complete current database schema, all model patterns
- `backend/src/fabric/` -- Complete CRUD module pattern (controller, service, DTOs, specs)
- `backend/src/common/services/code-generator.service.ts` -- Code generation logic to extend
- `backend/src/system/enums/index.ts` -- Enum registration pattern with Chinese labels
- `backend/src/common/utils/pagination.ts` -- PaginatedResult + builder functions
- `backend/src/common/transforms/index.ts` -- trimTransform reusable in DTOs
- `backend/src/app.module.ts` -- Module registration location

### Secondary (MEDIUM confidence)
- [Prisma JSON fields documentation](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) -- JSON column handling in Prisma
- [Prisma CHECK constraints issue #3388](https://github.com/prisma/prisma/issues/3388) -- Confirms no native CHECK support
- [Prisma XOR update discussion #8462](https://github.com/prisma/prisma/discussions/8462) -- Confirms application-level XOR is better approach

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official Prisma documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns exist in codebase
- Architecture: HIGH -- direct replication of FabricModule pattern with minimal extensions
- Pitfalls: HIGH -- identified from actual codebase analysis (nullable migration, switch cases, test breakage)
- Code generation extension: HIGH -- CodeGeneratorService is well-structured with clear extension points

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable -- no external dependencies changing)
