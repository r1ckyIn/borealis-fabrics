# Phase 7: Order/Quote Multi-Category Extension - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Orders and quotes support non-fabric products (iron frame, motor, mattress, accessory) alongside existing fabric items. Quote model restructured from single-item to multi-item. OrderItem extended with productId XOR fabricId constraint. Frontend changes belong to Phase 8.

</domain>

<decisions>
## Implementation Decisions

### OrderItem Product Reference
- Add nullable `productId` FK to OrderItem (references Product table)
- `fabricId` becomes nullable (was required)
- XOR constraint: exactly one of fabricId or productId must be set (never both, never neither)
- Validation at application layer (DTO + service) and DB check constraint

### Unit of Measure
- Add `unit` field to OrderItem and QuoteItem to indicate measurement unit
- Units by subCategory:
  - Fabric (面料): 米 (meter)
  - Iron frame (铁架): 套 (set)
  - Motor (电机): 个 (piece)
  - Mattress (床垫): 张 (sheet)
  - Accessory (配件): 个 (piece)
- Unit derived from product category when creating order/quote items
- Non-fabric products require integer quantities (no decimals); fabric allows Decimal(10,2)

### Quote Restructure (Single-Item → Multi-Item)
- Quote model restructured to Quote + QuoteItem (similar to Order + OrderItem pattern)
- Quote header: quoteCode, customerId, validUntil, status, notes
- QuoteItem: quoteId, fabricId (nullable), productId (nullable), quantity, unitPrice, unit, notes
- Same fabricId XOR productId constraint as OrderItem
- A single quote can contain mixed product categories (fabric + iron frame + motor in one quote)

### Quote Status with Partial Conversion
- New status: `partially_converted` — some items converted to order, others remain
- Each QuoteItem has its own `isConverted` boolean flag
- Status flow: active → partially_converted (some items converted) → converted (all items converted)
- Status flow: active → expired (via scheduler, unchanged)
- Status flow: active → converted (all items converted at once)

### Quote-to-Order Partial Conversion
- User can select specific QuoteItems to convert (not all-or-nothing)
- Selected items create OrderItems in the target order
- Unconverted items remain on the quote in active/partially_converted state
- Quote status updates based on conversion completeness

### Supplier Auto-Fill
- Non-fabric products auto-fill cheapest supplier from ProductSupplier (same logic as FabricSupplier)
- When adding a product OrderItem/QuoteItem, auto-populate supplierId + purchasePrice from lowest-price ProductSupplier
- Nullable when no ProductSupplier relationship exists (same pattern as fabric)

### Price and Quantity Validation
- Quantity upper limit: 1,000,000 (same as fabric — unified validation)
- Unit price upper limit: 100,000 (same as fabric — unified validation)
- Non-fabric quantity must be integer (validated at DTO level when productId is present)

### Claude's Discretion
- Prisma schema migration strategy (add columns, create QuoteItem table)
- XOR constraint implementation details (DB check constraint syntax, DTO validator pattern)
- Quote-to-order conversion refactor approach (existing ConvertQuotesToOrderDto adaptation)
- Service-level unit derivation logic
- Test strategy for new XOR validation, partial conversion, mixed product orders
- Order includes/query adaptation for product relations
- Backward compatibility approach for existing quote data migration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model
- `backend/prisma/schema.prisma` — Current OrderItem (fabricId required), Quote (single-item), Product models
- `backend/src/order/dto/add-order-item.dto.ts` — Current DTO with required fabricId
- `backend/src/quote/dto/create-quote.dto.ts` — Current DTO with required fabricId

### Order Service Layer
- `backend/src/order/order-item.service.ts` — OrderItemService with fabric-specific validation and supplier auto-fill
- `backend/src/order/order.validators.ts` — Validator helpers (validateFabricExists, etc.)
- `backend/src/order/order.includes.ts` — Prisma include configurations for order queries

### Quote Service Layer
- `backend/src/quote/quote.service.ts` — QuoteService with single-item model, conversion logic, scheduler
- `backend/src/quote/dto/convert-quote.dto.ts` — Current conversion DTO

### Product Module (Phase 5)
- `backend/src/product/product.service.ts` — ProductService CRUD
- `backend/src/product/dto/` — Product DTOs

### Prior Phase Context
- `.planning/phases/05-multi-category-schema-product-crud/05-CONTEXT.md` — Product schema decisions, XOR constraint planned
- `.planning/phases/06-import-strategy-refactor/06-CONTEXT.md` — Import system decisions

### Requirements
- `.planning/REQUIREMENTS.md` — MCAT-07 (OrderItem productId), MCAT-08 (Quote non-fabric support)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OrderItemService`: Extend addOrderItem/updateOrderItem to handle productId with XOR validation
- `order.validators.ts`: Add validateProductExists alongside validateFabricExists
- `QuoteService.convertQuotesToOrder()`: Refactor for multi-item quote with partial conversion
- `ProductSupplier` model: Query for cheapest supplier auto-fill (mirrors FabricSupplier pattern)
- `PaginatedResult<T>` + pagination utilities: Reuse for QuoteItem listing

### Established Patterns
- OrderItem.fabricId is currently required (Int, not nullable) — needs migration to nullable
- Quote.fabricId is currently required — needs migration to QuoteItem table
- Supplier auto-fill pattern: find cheapest FabricSupplier for fabric, replicate for ProductSupplier
- Transaction-based operations with recalculateOrderTotals pattern
- Status enum with valid transition checks (isValidStatusTransition)
- Timeline recording for status changes

### Integration Points
- `schema.prisma`: Add productId to OrderItem (nullable), create QuoteItem table, update Quote model
- `OrderItemService.addOrderItem()`: XOR validation, product-aware supplier auto-fill
- `QuoteService`: Restructure to multi-item, update conversion logic
- `order.includes.ts`: Add product relation to OrderItem includes
- `QuoteScheduler`: Update expiration logic for multi-item quotes
- Existing quote E2E tests: Need migration for new Quote structure

</code_context>

<specifics>
## Specific Ideas

- Quote restructure is the biggest change — current Quote has fabricId/quantity/unitPrice/totalPrice directly on the model, all need to move to QuoteItem
- Existing quote data migration: all existing quotes become single-item quotes (one QuoteItem per Quote)
- The quote-to-order conversion currently uses ConvertQuotesToOrderDto with quoteIds array — needs refactoring to support item-level selection
- Mixed product orders are the business norm (parent company sends POs with fabric + iron frame + motor)

</specifics>

<deferred>
## Deferred Ideas

- Frontend UI for multi-category orders/quotes — Phase 8
- Product bundle integration with orders (ordering a "伸缩床套装" as one line item) — future phase
- CustomerPricing auto-fill in quotes (customer-specific pricing lookup) — future phase
- Quote template/PDF generation — out of scope

</deferred>

---

*Phase: 07-order-quote-multi-category-extension*
*Context gathered: 2026-03-25*
