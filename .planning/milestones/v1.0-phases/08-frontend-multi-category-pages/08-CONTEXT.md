# Phase 8: Frontend Multi-Category Pages - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Frontend displays and manages all product categories (iron frames, motors, mattresses, accessories) alongside fabrics. Includes product CRUD pages, sidebar navigation restructuring, order/quote form updates for multi-category product selection, and quote page adaptation to the new multi-item model from Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Navigation & page organization
- Merge "面料管理" into a new "产品管理" parent menu with sub-menus: 面料, 铁架, 电机, 床垫, 配件
- Old `/fabrics` route redirects to `/products/fabrics`; fabric pages reuse existing code with new route paths
- All sub-categories share a single `ProductListPage` component that dynamically switches table columns based on the `:category` URL parameter
- Sidebar uses Ant Design Menu with `children` items (SubMenu pattern)

### Order/quote item category selection
- Unified search box in OrderItemForm/QuoteItemForm: one search input queries both fabrics and products simultaneously
- Search results show category tags ([面料], [铁架], etc.) so user can distinguish
- After selection, auto-populate: category type, unit (米/套/个), supplier (lowest-price ProductSupplier/FabricSupplier), purchase price
- Implementation of unified search: Claude's Discretion (front-end parallel requests vs new backend endpoint)

### Product form & detail pages
- Single `ProductForm` component with dynamic fields based on subCategory — common fields (name, code, description) always shown, category-specific specs rendered from a field config per subCategory
- Product detail page has 3 tabs: 基本信息 (specs + description), 供应商 (ProductSupplier list), 定价 (ProductPricing records)
- Bundles are NOT a tab on detail page — managed separately

### Quote page updates
- Quote list page uses expandable rows to show QuoteItem details inline (product, quantity, unit price)
- Quote form (create/edit) mirrors order form UX: multi-line items with unified product search, add/remove rows, auto-calculate totals
- Quote form does NOT show supplier info (quotes are customer-facing)
- Quote detail page shows QuoteItems with checkbox selection + "转化为订单" button for partial conversion
- Already-converted items show visual marker (tag or strikethrough)

### Claude's Discretion
- Unified search implementation strategy (parallel API calls vs backend endpoint)
- Component decomposition details (hooks, sub-components)
- Table column configurations per subCategory
- Loading states, empty states, error handling
- ProductForm field config structure for dynamic rendering
- Route structure details (nested vs flat with redirects)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend API & types
- `.planning/codebase/CONVENTIONS.md` — Frontend coding conventions, hook patterns, component structure
- `.planning/codebase/STRUCTURE.md` — Full project structure map
- `docs/reference/backend-types-reference.md` — Backend API endpoints, DTOs, entity types for Product, ProductSupplier, ProductPricing, ProductBundle

### Prior phase context
- `.planning/phases/05-multi-category-schema-product-crud/05-CONTEXT.md` — Product data model decisions: categories, subCategories, specs JSON structure
- `.planning/phases/07-order-quote-multi-category-extension/07-CONTEXT.md` — Order/Quote multi-category extension: XOR fabricId/productId, QuoteItem model, partial quote conversion

### Frontend patterns (existing code to follow)
- `frontend/src/pages/fabrics/` — FabricListPage, FabricDetailPage, FabricFormPage as templates
- `frontend/src/components/business/FabricSelector.tsx` — Selector pattern to extend for unified search
- `frontend/src/components/forms/OrderItemForm.tsx` — Current order item form to refactor
- `frontend/src/components/layout/Sidebar.tsx` — Current sidebar to restructure
- `frontend/src/routes/index.tsx` — Route definitions to update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PageContainer` + `SearchForm` + `usePagination`: List page infrastructure, directly reusable for ProductListPage
- `AmountDisplay`: Currency formatting component, reuse for pricing display
- `FabricSelector`: Debounced Select with search, template for UnifiedProductSelector
- `useFabrics` / `useOrders` / `useQuotes`: TanStack Query hook patterns to follow for useProducts
- `OrderItemForm`: Multi-row dynamic form pattern with add/remove, extend for product support
- `FabricDetailPage` tab pattern: Tabs with lazy-loaded content panels

### Established Patterns
- List pages: Card + Table + SearchForm with URL-synced pagination
- Detail pages: Tabs component with sub-tab content loaded via separate hooks
- Form pages: Form.useForm() at page level, pass form instance to sub-components
- API layer: `api/<entity>.api.ts` with typed Axios calls, interceptors handle auth
- Type definitions: `types/entities.types.ts` for entities, `types/enums.types.ts` for enums

### Integration Points
- Sidebar: Add "产品管理" SubMenu, move 面料 under it, add 铁架/电机/床垫/配件 sub-items
- Routes: Add /products/:category routes, redirect /fabrics → /products/fabrics
- OrderItemForm: Replace FabricSelector with UnifiedProductSelector
- QuoteForm: Rebuild from single-item to multi-item form (same pattern as OrderForm)
- Type system: Add Product, ProductSupplier, ProductPricing, ProductBundle types + ProductCategory/ProductSubCategory enums

</code_context>

<specifics>
## Specific Ideas

- Quote list page should use Ant Design Table `expandable` prop for inline QuoteItem display
- Partial quote conversion: checkbox column on QuoteItem rows + action button, converted items get a visual tag
- Unified search dropdown should show category tags with different colors per category (like Ant Design Tag component)
- Product form specs fields should be driven by a config object per subCategory, making it easy to add new categories later

</specifics>

<deferred>
## Deferred Ideas

- Bundle management UI (product bundles as a separate page) — could be its own phase
- Product image upload/display — not in current scope
- Advanced product filtering (by specs fields) — future enhancement
- Dashboard/analytics for product data — separate phase

</deferred>

---

*Phase: 08-frontend-multi-category-pages*
*Context gathered: 2026-03-25*
