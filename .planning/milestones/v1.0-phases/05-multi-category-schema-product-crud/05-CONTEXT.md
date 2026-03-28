# Phase 5: Multi-Category Schema + Product CRUD - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Add product abstraction schema and CRUD for iron frame/motor category. Fabric table remains unchanged. Product table is independent and parallel — connected via OrderItem's fabricId/productId XOR constraint (Phase 7). Hardware category deferred.

</domain>

<decisions>
## Implementation Decisions

### Product-Fabric Relationship
- Product table is **independent and parallel** to Fabric table — zero migration risk
- Product table stores iron frame/motor products only (no fabric data migration)
- Fabric table stays untouched; all existing tests and data preserved
- Phase 7 will add productId to OrderItem with XOR constraint (fabricId XOR productId)

### Category Design
- Single category for now: `IRON_FRAME_MOTOR` (铁架电机)
- Category enum designed for extensibility (HARDWARE can be added later)
- **subCategory field required**: `IRON_FRAME` | `MOTOR` | `MATTRESS` | `ACCESSORY` to distinguish product types within the category
- Mattresses (床垫) belong under iron frame category
- Motor accessories (推杆, 电源, 手控器, 杯托, 灯带) belong under iron frame/motor category
- Hardware (五金) deferred — content not yet defined by business

### Product Fields (from real business data)
- Common fields: productCode, name, subCategory, defaultPrice, specs (JSON), notes, isActive
- Iron frame specs: modelNumber (型号如 A4318HK-0--5), specification (规格如 "全套"), seatType (单人位/双人位/三人位)
- Motor/accessory specs: modelNumber (型号如 Y11110000303), specification (详细规格尺寸)
- Mattress specs: specification (规格尺寸如 190x140x11cm)
- specs JSON column stores category-specific fields; common fields are top-level columns

### Product Code Generation
- Temporary prefixes (company codes pending confirmation):
  - 铁架: TJ-YYMM-NNNN
  - 电机: DJ-YYMM-NNNN
  - 床垫: CD-YYMM-NNNN
  - 配件: PJ-YYMM-NNNN
- Extend CodeGeneratorService with new CodePrefix entries per subCategory
- Format follows existing pattern: {PREFIX}-{YYMM}-{4-digit sequence}

### Supplier-Product Pricing
- Same multi-supplier multi-price model as FabricSupplier
- ProductSupplier table: productId + supplierId + purchasePrice + minOrderQty + leadTimeDays
- Real data confirms: same iron frame model has different prices from different suppliers (e.g., Cenro vs 义莲)

### Customer-Product Pricing
- Extend existing CustomerPricing to support productId (nullable, XOR with fabricId)
- Real data confirms: same product has different sale prices for different customers (ASH, LFH, JZD, JTD)

### Product Bundle (套装) — Basic Modeling
- ProductBundle table for set/kit templates (e.g., 伸缩床套装 = 铁架 + 电机 + 手控器 + 电源)
- ProductBundleItem: bundleId + productId + quantity
- Bundle has its own pricing (not necessarily sum of parts)
- Phase 5 scope: schema + basic CRUD only, order integration in later phases

### Claude's Discretion
- Prisma schema design details (indexes, column types, JSON structure)
- Module organization (ProductModule structure, service decomposition)
- DTO design and validation rules
- Test strategy and mock patterns
- API endpoint design (follows existing NestJS conventions)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model
- `backend/prisma/schema.prisma` — Current database schema, Fabric/FabricSupplier/CustomerPricing patterns to replicate
- `backend/src/common/services/code-generator.service.ts` — CodePrefix enum and generation logic to extend

### Business Data
- `/Users/qinyuan/Desktop/铂润测试资料/铁架电机价格2025.xlsx` — Real iron frame/motor price data with field structure, supplier relationships, and customer-specific pricing

### Architecture
- `.planning/codebase/CONVENTIONS.md` — Naming conventions, module structure, DTO patterns
- `.planning/codebase/STRUCTURE.md` — Where to add new backend modules and frontend pages
- `.planning/REQUIREMENTS.md` — MCAT-01~04, MCAT-09 requirement definitions

### Prior Patterns
- `backend/src/fabric/` — Reference module for CRUD pattern (controller + service + DTOs)
- `backend/src/import/strategies/` — Strategy pattern for category-specific logic

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CodeGeneratorService`: Extend CodePrefix enum with TJ/DJ/CD/PJ for new subCategories
- `PaginatedResult<T>` + `buildPaginatedResult()`: Reuse for product list pagination
- `FabricSupplier` model pattern: Replicate for ProductSupplier
- `CustomerPricing` model: Extend with productId FK (nullable, XOR with fabricId)
- Backend module pattern (fabric/): Controller + Service + DTOs + Module as template

### Established Patterns
- Prisma `@map()` for snake_case DB columns with camelCase TypeScript
- `isActive` for soft delete, `status` for business state
- JSON columns for flexible/variable fields (addresses, material, tags)
- Transaction-based uniqueness checks (ConflictException on duplicate)
- Service-level error handling with NestJS exceptions

### Integration Points
- `app.module.ts`: Register new ProductModule
- `CodeGeneratorService`: Add new CodePrefix entries + switch cases for DB fallback
- `CustomerPricing`: Add nullable productId with XOR constraint
- Future Phase 7: OrderItem.productId FK to Product table

</code_context>

<specifics>
## Specific Ideas

- Iron frame model numbers follow supplier patterns: A4318HK-0--5, 5618H-0--5, 4181-0--5
- Motor model numbers use Y-series: Y11110000303, Y11110000066
- Real data shows 4 main suppliers: Cenro, 义莲, 丽华, AOYO (iron frames); 钰龙, 慕林, 圣瑞驰 (motors)
- Product bundles in real data: 伸缩床套装 (1705同步, 1706平移), 零重力套装, 搁脚升降套装
- Each bundle has separate purchase and sale pricing per component

</specifics>

<deferred>
## Deferred Ideas

- Hardware (五金) category — business content not yet defined, add when ready
- Fabric migration into Product table — intentionally deferred, may never happen
- Bundle integration with orders — Phase 7+ scope
- Product images — not in current requirements, add if needed
- Old/new price versioning — Excel has historical prices, system only tracks current

</deferred>

---

*Phase: 05-multi-category-schema-product-crud*
*Context gathered: 2026-03-24*
