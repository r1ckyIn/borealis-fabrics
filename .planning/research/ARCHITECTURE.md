# Architecture Research

**Domain:** Multi-category supply chain management system (brownfield extension)
**Researched:** 2026-03-17
**Confidence:** HIGH (based on direct codebase analysis + verified patterns)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React 18 + Vite)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │ FabricModule │  │ ProductModule│  │  Orders   │  │  Quotes   │  │
│  │  (existing)  │  │  (new M2)    │  │ (extend)  │  │ (extend)  │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  └─────┬─────┘  │
│         │                 │                │              │         │
│  ┌──────┴─────────────────┴────────────────┴──────────────┴──────┐  │
│  │        TanStack Query (server state) + Zustand (UI state)      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                          ↕ REST /api/v1
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend (NestJS 11 Modular Monolith)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Fabric  │  │ Product  │  │  Order   │  │  Quote   │           │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │           │
│  │(existing)│  │ (new M2) │  │(extended)│  │(extended)│           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │             │             │                  │
│  ┌────┴──────────────┴─────────────┴─────────────┴──────────────┐  │
│  │   ImportModule (strategy-extended)   FileModule   CommonModule│  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────┴──────────────────────────────────┐   │
│  │              Prisma ORM → MySQL 8.0 + Redis cache             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| FabricModule | Fabric CRUD, supplier pricing, customer pricing, image management | Existing — keep, preserve API |
| ProductModule (new) | Iron frame / motor / hardware CRUD with category-specific specs | New in M2 |
| OrderModule | Order lifecycle state machine, item tracking (cross-category in M2) | Existing — extend OrderItem to support non-fabric products |
| QuoteModule | Quote creation and quote-to-order conversion | Existing — extend to support non-fabric products |
| ImportModule | Excel import and template generation (extend with strategy per category) | Existing — refactor to strategy pattern |
| CommonModule | CodeGeneratorService, pagination, validators, exception filters | Existing — extend CodePrefix enum for new categories |

## Recommended Project Structure

### Backend — Target State (M2)

```
backend/src/
├── auth/                     # No change
├── common/
│   ├── services/
│   │   └── code-generator.service.ts  # Add PRODUCT_* prefixes
│   └── utils/
├── fabric/                   # No change — keep as-is
│   ├── fabric.service.ts
│   └── dto/
├── product/                  # NEW in M2 — non-fabric product categories
│   ├── product.module.ts
│   ├── product.controller.ts
│   ├── product.service.ts    # Generic CRUD for iron frame / motor / hardware
│   └── dto/
│       ├── create-product.dto.ts
│       └── query-product.dto.ts
├── order/
│   ├── order.service.ts      # Extend: productId nullable alongside fabricId
│   ├── order-item.service.ts # EXTRACTED from order.service.ts (M1 refactor)
│   ├── order-payment.service.ts # EXTRACTED from order.service.ts (M1 refactor)
│   └── order.validators.ts   # Extend: validate productId
├── import/
│   ├── import.module.ts
│   ├── import.controller.ts
│   ├── import.service.ts     # Orchestrator only — delegates to strategies
│   └── strategies/           # NEW in M2
│       ├── import-strategy.interface.ts
│       ├── fabric-import.strategy.ts  # Extracted from import.service.ts
│       ├── supplier-import.strategy.ts
│       └── product-import.strategy.ts # NEW
└── prisma/
    └── schema.prisma          # Add Product model, update OrderItem
```

### Frontend — Target State (M2)

```
frontend/src/pages/
├── fabrics/                  # No change — keep existing pages
│   ├── FabricDetailPage.tsx  # REFACTOR in M1 (769L → ~200L + sub-components)
│   ├── components/           # EXTRACTED in M1
│   │   ├── FabricSpecsSection.tsx
│   │   ├── FabricSuppliersSection.tsx
│   │   └── FabricPricingSection.tsx
│   └── hooks/
│       └── useFabricDetail.ts # EXTRACTED in M1
├── products/                 # NEW in M2
│   ├── ProductListPage.tsx
│   ├── ProductDetailPage.tsx
│   └── ProductFormPage.tsx
└── orders/
    └── components/
        ├── OrderItemsSection.tsx  # REFACTOR in M1 (652L → ~200L + sub-components)
        ├── ItemTable.tsx          # EXTRACTED in M1
        ├── ItemStatusFlow.tsx     # EXTRACTED in M1
        └── hooks/
            └── useOrderItems.ts   # EXTRACTED in M1
```

## Architectural Patterns

### Pattern 1: Class Table Inheritance (CTI) for Product Categories

**What:** Separate `products` table for shared attributes, and category-specific attribute stored as `specs` JSON field on the same table. No separate table per category.

**When to use:** 4 product categories with < 10 distinct fields each, small team, Prisma + MySQL (no native CTI support). Avoids the join overhead of full CTI while keeping schema clean.

**Trade-offs:** JSON `specs` sacrifices column-level constraints for category-specific fields; querying by spec fields requires JSON path syntax in MySQL. For this domain (2-5 users, no analytics queries on spec fields), this is acceptable.

**Example:**
```typescript
// schema.prisma
model Product {
  id           Int      @id @default(autoincrement())
  productCode  String   @unique @map("product_code")
  category     String   // "iron_frame" | "motor" | "hardware"
  name         String
  defaultPrice Decimal? @map("default_price") @db.Decimal(10, 2)
  specs        Json?    @db.Json  // category-specific: { modelNo, setQty, ... }
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  orderItems OrderItem[]

  @@index([category])
  @@index([productCode])
  @@map("products")
}
```

**What goes in `specs` JSON per category:**

| Category | Spec fields |
|----------|-------------|
| iron_frame | `modelNo`, `setQty`, `mattressIncluded` |
| motor | `type` (一拖一/一拖二), `voltage`, `brand` |
| hardware | `unit` (piece/set), `accessoryType` |

**Why not separate tables per category:** Adding `IronFrameModule`, `MotorModule`, `HardwareModule` as full modules would require 3x code duplication across service/controller/DTOs. The categories share 95% of CRUD logic. A single `ProductModule` with category filtering avoids this.

**Why not extending FabricModule:** Fabrics are metered goods with width/weight/composition/image management. The data model diverges significantly from set-priced hardware. Keeping them separate preserves the fabric-specific logic (FabricSupplier pricing, CustomerPricing, image uploads) without contaminating it.

### Pattern 2: OrderItem Polymorphic Product Reference

**What:** Extend `OrderItem.fabricId` to also accommodate the new `Product` entity, using nullable foreign keys with application-level enforcement of "exactly one must be set."

**When to use:** The Order state machine should not care whether an item is fabric or iron frame — it only tracks quantity, price, and status. Polymorphic reference at the item level is the correct boundary.

**Trade-offs:** Adds one nullable column (`productId`) to `order_items`. No breaking change to existing fabric-based orders (fabricId remains populated for those).

**Example:**
```prisma
model OrderItem {
  // existing fields...
  fabricId   Int?   @map("fabric_id")    // nullable: one or the other
  productId  Int?   @map("product_id")   // nullable: for iron frame/motor/hardware
  // ...
  fabric     Fabric?   @relation(fields: [fabricId], references: [id])
  product    Product?  @relation(fields: [productId], references: [id])
}
```

**Application-level guard (in order.validators.ts):**
```typescript
// Exactly one of fabricId or productId must be set
if (!item.fabricId && !item.productId) {
  throw new BadRequestException('Order item must reference either a fabric or a product');
}
if (item.fabricId && item.productId) {
  throw new BadRequestException('Order item cannot reference both fabric and product');
}
```

### Pattern 3: Strategy Pattern for ImportService

**What:** Extract per-category parsing logic from `ImportService` (currently a 607L god service) into a `ImportStrategy` interface. `ImportService` becomes an orchestrator that selects the correct strategy by type.

**When to use:** When adding new import formats (product categories) would otherwise require extending an already large service. The strategy pattern allows each category's import logic to live in its own focused file.

**Example:**
```typescript
// import-strategy.interface.ts
export interface ImportStrategy {
  generateTemplate(): Promise<Buffer>;
  importData(file: Express.Multer.File): Promise<ImportResultDto>;
}

// product-import.strategy.ts
@Injectable()
export class ProductImportStrategy implements ImportStrategy {
  async generateTemplate(): Promise<Buffer> { ... }
  async importData(file: Express.Multer.File): Promise<ImportResultDto> { ... }
}

// import.service.ts (orchestrator)
@Injectable()
export class ImportService {
  private strategies: Record<string, ImportStrategy>;

  constructor(
    private readonly fabricStrategy: FabricImportStrategy,
    private readonly supplierStrategy: SupplierImportStrategy,
    private readonly productStrategy: ProductImportStrategy,
  ) {
    this.strategies = {
      fabric: this.fabricStrategy,
      supplier: this.supplierStrategy,
      product: this.productStrategy,
    };
  }

  getStrategy(type: string): ImportStrategy {
    const strategy = this.strategies[type];
    if (!strategy) throw new BadRequestException(`Unknown import type: ${type}`);
    return strategy;
  }
}
```

### Pattern 4: OrderService Decomposition (M1 Refactor)

**What:** Extract `OrderItemService` and `OrderPaymentService` from the 1121L `OrderService`. Use composition — `OrderService` imports and delegates to the sub-services.

**When to use:** When a service exceeds ~400L due to multiple distinct responsibility areas (item lifecycle, payment tracking) that can be unit-tested independently.

**Key extraction boundaries:**

| Extracted Service | Methods Moved |
|-------------------|---------------|
| `OrderItemService` | `addItem`, `updateItem`, `removeItem`, `updateItemStatus`, `cancelItem`, `restoreItem` |
| `OrderPaymentService` | `updateCustomerPayment`, `getSupplierPayments`, `updateSupplierPayment`, `upsertSupplierPayment` |
| `OrderService` (retained) | `create`, `findAll`, `findOne`, `update`, `cancel`, `getTimelines` |

**Important:** `OrderService` retains `recalculateOrderTotals` because it's called from both item mutations and payment updates — it's genuinely shared logic.

### Pattern 5: React Component Decomposition

**What:** Extract sub-components and custom hooks from oversized page components. Target: no component file exceeds ~300L.

**FabricDetailPage.tsx (769L) decomposition:**

```
FabricDetailPage.tsx (~150L)       — layout, routing, data fetch orchestration
  └── FabricSpecsSection.tsx       — specs display + inline edit
  └── FabricSuppliersSection.tsx   — supplier price table + CRUD
  └── FabricPricingSection.tsx     — customer pricing table + CRUD
  └── FabricImagesSection.tsx      — image gallery + upload

hooks/useFabricDetail.ts           — all useState, useMutation, useQuery logic
hooks/useFabricSuppliers.ts        — supplier list mutations
```

**OrderItemsSection.tsx (652L) decomposition:**

```
OrderItemsSection.tsx (~150L)      — table + toolbar orchestration
  └── ItemTable.tsx                — Ant Design Table, column definitions
  └── ItemStatusFlow.tsx           — status badge + transition buttons
  └── modals/ (already exists)

hooks/useOrderItems.ts             — item CRUD mutations, status transitions
```

## Data Flow

### Multi-Category Quote/Order Creation Flow

```
User selects product category (fabric OR product)
    ↓
Frontend form renders category-appropriate fields
    ↓
POST /api/v1/quotes or POST /api/v1/orders
    ↓
DTO validates: exactly one of fabricId/productId is set
    ↓
OrderService.create() → validateEntityIds() extended for Product model
    ↓
OrderItem created with either fabricId OR productId populated
    ↓
State machine proceeds identically (status transitions agnostic to product type)
    ↓
Response includes joined fabric OR product data via Prisma include
```

### Import Flow (Post-Strategy Refactor)

```
POST /api/v1/import/:type/upload
    ↓
ImportController → ImportService.getStrategy(type)
    ↓
strategy.importData(file) → parses Excel, validates rows
    ↓
Batch upsert in Prisma $transaction (skip existing, per existing conflict policy)
    ↓
Returns ImportResultDto { success, skipped, failures[] }
```

### Key Data Flows

1. **FabricModule isolation:** Fabric data never flows through ProductModule. Quotes/Orders reference both by separate foreign keys. No code shared between Fabric and Product domain logic.
2. **CodeGenerator extension:** Adding product codes (e.g., `PRD-YYMM-NNNN`) requires only adding a new `CodePrefix` enum value. No structural change to `CodeGeneratorService`.
3. **Quote-to-Order conversion (M1 fix):** Quote has `fabricId` — conversion creates `OrderItem` with `fabricId` populated. After M2, quotes may reference either. The conversion logic must propagate the correct FK.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (2-5 users) | Modular monolith is correct. No changes needed beyond this plan. |
| 10-50 users | Current architecture handles comfortably. Redis connection pool may need tuning. |
| 50+ users | Still fine as modular monolith. Prisma connection pool configuration (DATABASE_URL `connection_limit`) before any structural change. |

### Scaling Priorities

1. **First bottleneck:** Prisma connection pool under concurrent E2E test load (already observed — testTimeout:15000). Fix: tune `connection_limit` in DATABASE_URL, not architectural split.
2. **Second bottleneck:** Import service under bulk data (30+ doc test). Fix: use streaming Excel parse (ExcelJS `stream.xlsx.readFile`) rather than full buffer load.

## Anti-Patterns

### Anti-Pattern 1: Converting FabricModule into a Generic ProductModule

**What people do:** Rename `FabricModule` to `ProductModule`, add a `type` discriminator, put fabric + iron frame + motor + hardware all in one `products` table.

**Why it's wrong:** Fabric has unique domain concepts (width, weight, composition, FabricSupplier pricing, CustomerPricing, image gallery) that have no counterpart in iron frames. Forcing them into a shared table creates nullable columns for fabric-only or product-only fields, pollutes service methods with `if (type === 'fabric')` branches, and breaks the 608 existing unit tests that mock `fabric.*` Prisma calls.

**Do this instead:** Keep `FabricModule` intact. Add `ProductModule` as a new, separate module for iron frame / motor / hardware. Extend `OrderItem` to support both product types via nullable foreign keys.

### Anti-Pattern 2: Full Class Table Inheritance (Separate Table Per Category)

**What people do:** Create `iron_frames` table, `motors` table, `hardware` table, each with their own module, service, and controller.

**Why it's wrong:** For a 2-5 user system with 4 product categories, this creates 3x code duplication. Iron frames, motors, and hardware share identical CRUD patterns: code, name, price, supplier, import template. Adding a 5th category requires another full module.

**Do this instead:** One `products` table with a `category` enum column and a `specs` JSON column for category-specific attributes. One `ProductModule` handles all three non-fabric categories.

### Anti-Pattern 3: Putting Quote/Order Extension Logic in FabricModule

**What people do:** When making quotes support iron frames, add `productType` logic to `QuoteService.create()` inside `FabricModule` scope.

**Why it's wrong:** Violates module boundaries. `FabricModule` should have no knowledge of iron frames or motors. Quote/Order domain logic belongs in `QuoteModule` / `OrderModule`.

**Do this instead:** `QuoteModule` and `OrderModule` import both `FabricModule` (for fabric validation) and `ProductModule` (for product validation). Each validates its own domain entity. Orchestration happens in Quote/Order services.

### Anti-Pattern 4: One Giant ImportService with `if (type === ...)` Branches

**What people do:** Add fabric-import, supplier-import, and product-import logic into `ImportService` as `if` chains, growing it past 1000L.

**Why it's wrong:** Each new category adds another branch. Testing requires mocking unrelated strategies. The service becomes a maintenance burden and has low cohesion.

**Do this instead:** Strategy pattern (see Pattern 3 above). Each category gets a focused strategy class that is independently testable.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Tencent COS | `@tencentcloud/cos-js-sdk-v5` via FileService | Product images follow same upload path as fabric images |
| WeChat Work OAuth | Enterprise OAuth 2.0 via AuthModule | No change for M2 |
| Redis | Sequence generation for product codes + auth session | Add `PRD` prefix to CodePrefix enum |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| FabricModule ↔ OrderModule | OrderItem.fabricId FK | Fabric validates via order.validators.ts |
| ProductModule ↔ OrderModule | OrderItem.productId FK | Product validates same pattern as fabric |
| ProductModule ↔ ImportModule | ImportStrategy injection | ProductImportStrategy injected into ImportModule |
| QuoteModule ↔ OrderModule | convertQuoteToOrder() | M1 fix — must propagate fabricId OR productId correctly |
| CommonModule → All | CodeGeneratorService, PaginationDto | Add CodePrefix.PRODUCT |

### Build Order Implications

M1 phase (code remediation) must complete before M2 (multi-category expansion). Within M2:

1. **Database schema first** — Add `products` table, add `productId` nullable FK to `order_items`. Migration must be backward-compatible (all existing rows have NULL productId).
2. **ProductModule second** — CRUD and code generation. No dependencies on Quote or Order.
3. **ImportModule strategy refactor concurrent with ProductModule** — Independent. Fabric and supplier import strategies are extracted at the same time as the new product strategy is added.
4. **Order/Quote extension third** — Depends on ProductModule existing. Extends validators and DTOs to accept productId.
5. **Frontend last** — Depends on all backend endpoints existing.

## Sources

- Direct codebase analysis: `backend/prisma/schema.prisma`, `backend/src/order/order.service.ts` (1121L), `backend/src/import/import.service.ts` (607L), `frontend/src/pages/fabrics/FabricDetailPage.tsx` (769L)
- [Polymorphic Associations with Prisma (wanago.io, Feb 2024)](https://wanago.io/2024/02/19/api-nestjs-postgresql-prisma-polymorphic-associations/) — separate nullable FK columns recommended over single polymorphic ID
- [Prisma Category Modeling Discussion](https://github.com/prisma/prisma/discussions/11973) — category-specific attributes as regular fields on shared table
- [Table Inheritance Patterns (Medium)](https://medium.com/@artemkhrenov/table-inheritance-patterns-single-table-vs-class-table-vs-concrete-table-inheritance-1aec1d978de1) — CTI vs STI tradeoffs
- [Strategy Pattern in NestJS (Medium)](https://medium.com/@dineshbyte/embracing-the-strategy-pattern-in-nestjs-391715d49c4f) — modular service decomposition via strategy injection
- [Martin Fowler: Modularizing React Apps](https://martinfowler.com/articles/modularizing-react-apps.html) — extract hooks + sub-components pattern

---
*Architecture research for: Borealis Supply Chain — multi-category extension*
*Researched: 2026-03-17*
