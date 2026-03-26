# Phase 8: Frontend Multi-Category Pages - Research

**Researched:** 2026-03-25
**Domain:** React frontend — multi-category product pages, order/quote form refactoring, sidebar navigation restructuring
**Confidence:** HIGH

## Summary

Phase 8 is a frontend-only phase that adds product category management pages, restructures the sidebar navigation from flat menu items to a hierarchical "产品管理" parent with sub-menus, refactors the order/quote forms to support unified product+fabric selection, and adapts the quote pages to the new multi-item model introduced in Phase 7.

The codebase already has all the backend APIs ready (Product CRUD, ProductSupplier, ProductPricing, multi-item Quote with QuoteItem, OrderItem XOR fabricId/productId). The frontend patterns are well-established — FabricListPage, FabricDetailPage, FabricFormPage serve as direct templates. The main complexity lies in: (1) the UnifiedProductSelector component that searches both fabrics and products, (2) the QuoteForm rebuild from single-item to multi-item with expandable row display, and (3) the dynamic ProductForm that renders category-specific spec fields based on subCategory.

**Primary recommendation:** Follow existing page patterns exactly (PageContainer + SearchForm + usePagination for lists, Tabs + custom hooks for details, Form.useForm() at page level for forms). Build the UnifiedProductSelector as a parallel-request approach (query both `/fabrics` and `/products` APIs simultaneously) rather than a new backend endpoint, keeping the frontend self-contained.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Merge "面料管理" into a new "产品管理" parent menu with sub-menus: 面料, 铁架, 电机, 床垫, 配件
- Old `/fabrics` route redirects to `/products/fabrics`; fabric pages reuse existing code with new route paths
- All sub-categories share a single `ProductListPage` component that dynamically switches table columns based on the `:category` URL parameter
- Sidebar uses Ant Design Menu with `children` items (SubMenu pattern)
- Unified search box in OrderItemForm/QuoteItemForm: one search input queries both fabrics and products simultaneously
- Search results show category tags ([面料], [铁架], etc.) so user can distinguish
- After selection, auto-populate: category type, unit (米/套/个), supplier (lowest-price ProductSupplier/FabricSupplier), purchase price
- Single `ProductForm` component with dynamic fields based on subCategory
- Product detail page has 3 tabs: 基本信息, 供应商, 定价
- Bundles are NOT a tab on detail page -- managed separately
- Quote list page uses expandable rows to show QuoteItem details inline
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

### Deferred Ideas (OUT OF SCOPE)
- Bundle management UI (product bundles as a separate page)
- Product image upload/display
- Advanced product filtering (by specs fields)
- Dashboard/analytics for product data
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MCAT-10 | Frontend product list page with category filter | ProductListPage with `:category` URL param, uses `GET /api/v1/products?subCategory=X`, reuses PageContainer + SearchForm + usePagination pattern |
| MCAT-11 | Frontend product detail/edit pages for each category | ProductDetailPage with 3 tabs (info/suppliers/pricing) following FabricDetailPage pattern; ProductForm with dynamic spec fields per subCategory |
| MCAT-12 | Frontend order form supports selecting products from any category | UnifiedProductSelector replaces FabricSelector in OrderItemForm; parallel search of `/fabrics` + `/products` APIs; auto-populate unit, supplier, purchasePrice |
</phase_requirements>

## Standard Stack

### Core (already installed in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Project standard |
| Ant Design | 6.x | UI component library | Project standard — Menu (SubMenu), Table (expandable), Tabs, Form, Select, Tag |
| TanStack Query | 5.x | Server state management | Project standard — useQuery/useMutation for all API data |
| React Router | 7.x | Routing | Project standard — createBrowserRouter with lazy loading |
| Zustand | Latest | Client state | Project standard (sidebar collapse state) |
| Vitest | Latest | Test framework | Project standard — jsdom environment, @testing-library/react |
| dayjs | Latest | Date handling | Project standard — used in quote validUntil, date pickers |
| Axios | Latest | HTTP client | Project standard — configured in `api/client.ts` |

### Supporting (no new libraries needed)
This phase requires no new npm dependencies. All needed functionality is available from the existing stack.

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure (new files)
```
frontend/src/
├── api/
│   └── product.api.ts           # NEW: Product CRUD + supplier + pricing API
├── types/
│   ├── entities.types.ts        # MODIFY: Add Product, ProductSupplier, ProductPricing, QuoteItem types
│   ├── enums.types.ts           # MODIFY: Add ProductCategory, ProductSubCategory enums + labels
│   ├── forms.types.ts           # MODIFY: Add product form types, update quote/order types
│   └── index.ts                 # MODIFY: Export new types
├── hooks/
│   └── queries/
│       └── useProducts.ts       # NEW: TanStack Query hooks for product CRUD
├── pages/
│   └── products/
│       ├── ProductListPage.tsx   # NEW: Dynamic list page (reads :category from URL)
│       ├── ProductDetailPage.tsx # NEW: Detail with 3 tabs
│       ├── ProductFormPage.tsx   # NEW: Create/edit form page
│       ├── components/
│       │   ├── ProductBasicInfo.tsx     # NEW: Info tab content
│       │   ├── ProductSupplierTab.tsx   # NEW: Supplier tab (follows FabricSupplierTab)
│       │   └── ProductPricingTab.tsx    # NEW: Pricing tab (follows FabricPricingTab)
│       └── __tests__/
│           ├── ProductListPage.test.tsx
│           ├── ProductDetailPage.test.tsx
│           └── ProductFormPage.test.tsx
├── components/
│   ├── business/
│   │   └── UnifiedProductSelector.tsx  # NEW: Combined fabric+product search selector
│   ├── forms/
│   │   ├── OrderItemForm.tsx           # MODIFY: Replace FabricSelector with UnifiedProductSelector
│   │   ├── QuoteForm.tsx               # REWRITE: Multi-item form (mirrors OrderForm)
│   │   └── ProductForm.tsx             # NEW: Dynamic form with subCategory-specific fields
│   └── layout/
│       └── Sidebar.tsx                 # MODIFY: Restructure to SubMenu pattern
└── routes/
    └── index.tsx                       # MODIFY: Add product routes, redirect /fabrics
```

### Pattern 1: Dynamic List Page by URL Category
**What:** Single ProductListPage component that reads `:category` from URL params and dynamically renders category-appropriate table columns and search filters.
**When to use:** Multiple sub-categories sharing the same list page infrastructure.
**Example:**
```typescript
// Route: /products/:category (e.g., /products/iron-frames)
// Category-to-subCategory mapping:
const CATEGORY_ROUTE_MAP: Record<string, string> = {
  'iron-frames': 'IRON_FRAME',
  'motors': 'MOTOR',
  'mattresses': 'MATTRESS',
  'accessories': 'ACCESSORY',
};

// Column config per subCategory:
const COLUMN_CONFIGS: Record<string, ColumnsType<Product>> = {
  IRON_FRAME: [
    { title: '产品编码', dataIndex: 'productCode' },
    { title: '产品名称', dataIndex: 'name' },
    { title: '型号', dataIndex: 'modelNumber' },
    { title: '规格', dataIndex: 'specification' },
    { title: '默认单价', dataIndex: 'defaultPrice' },
  ],
  // ... other categories
};
```

### Pattern 2: Dynamic Form Fields via Config Object
**What:** A config-driven approach to render different form fields based on product subCategory.
**When to use:** When a single form component must render different fields for different product types.
**Example:**
```typescript
interface SpecFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  required?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

const SPEC_FIELDS_BY_CATEGORY: Record<string, SpecFieldConfig[]> = {
  IRON_FRAME: [
    { name: 'modelNumber', label: '型号', type: 'text', required: true },
    { name: 'specification', label: '规格', type: 'text' },
    { name: 'seatType', label: '座位类型', type: 'select',
      options: [
        { label: '单人位', value: 'single' },
        { label: '双人位', value: 'double' },
        { label: '三人位', value: 'triple' },
      ],
    },
  ],
  MOTOR: [
    { name: 'modelNumber', label: '型号', type: 'text', required: true },
    { name: 'specification', label: '详细规格', type: 'text' },
  ],
  MATTRESS: [
    { name: 'specification', label: '规格尺寸', type: 'text', required: true,
      placeholder: '如 190x140x11cm' },
  ],
  ACCESSORY: [
    { name: 'modelNumber', label: '型号', type: 'text' },
    { name: 'specification', label: '规格', type: 'text' },
  ],
};
```

### Pattern 3: UnifiedProductSelector (Parallel API Calls)
**What:** A single Select component that searches both fabrics and products simultaneously, displaying results with category tags.
**When to use:** In OrderItemForm and QuoteItemForm where the user can select either a fabric or a product.
**Recommendation:** Use parallel `Promise.allSettled()` approach — query `GET /fabrics?keyword=X` and `GET /products?keyword=X` simultaneously, merge results with a discriminator field.
**Example:**
```typescript
interface UnifiedSearchResult {
  type: 'fabric' | 'product';
  id: number;
  code: string;
  name: string;
  category?: string;        // e.g., 'IRON_FRAME'
  categoryLabel?: string;   // e.g., '铁架'
  defaultPrice?: number;
  unit: string;             // '米' | '套' | '个' | '张'
}

// Merge results from both APIs:
async function unifiedSearch(keyword: string): Promise<UnifiedSearchResult[]> {
  const [fabricResult, productResult] = await Promise.allSettled([
    getFabrics({ keyword, pageSize: 10 }),
    getProducts({ keyword, pageSize: 10 }),
  ]);
  // Map fabric results with type: 'fabric'
  // Map product results with type: 'product'
  // Combine and return
}
```

### Pattern 4: Sidebar SubMenu Navigation
**What:** Restructure sidebar from flat menu items to nested SubMenu under "产品管理".
**When to use:** When menu items need hierarchical grouping.
**Key implementation note:** The Ant Design Menu `selectedKeys` logic must handle both `/products/:category` paths and the old `/fabrics` redirect. The `openKeys` state must persist "产品管理" as open when any sub-page is active.
**Example:**
```typescript
const menuItems: MenuItem[] = [
  {
    key: '/products',
    icon: <AppstoreOutlined />,
    label: '产品管理',
    children: [
      { key: '/products/fabrics', icon: <SkinOutlined />, label: '面料' },
      { key: '/products/iron-frames', label: '铁架' },
      { key: '/products/motors', label: '电机' },
      { key: '/products/mattresses', label: '床垫' },
      { key: '/products/accessories', label: '配件' },
    ],
  },
  // ... other top-level items unchanged
];
```

### Pattern 5: Quote Multi-Item Form (mirrors OrderForm)
**What:** Rebuild QuoteForm from single-item to multi-item using Form.List, same pattern as OrderForm.
**When to use:** Quote create/edit pages.
**Key differences from OrderForm:**
- No supplier fields (quotes are customer-facing)
- Uses `UnifiedProductSelector` instead of `FabricSelector`
- Each item has: product/fabric selector, quantity, unitPrice, unit (auto-filled), notes
- Bottom shows auto-calculated total

### Anti-Patterns to Avoid
- **Creating a new backend unified-search endpoint:** The parallel API call approach is simpler, avoids backend changes, and keeps this phase frontend-only. A backend endpoint would add unnecessary coupling.
- **Duplicating FabricListPage for each category:** The decision is one shared `ProductListPage` with dynamic columns — do NOT create separate IronFrameListPage, MotorListPage, etc.
- **Hardcoding spec fields in ProductForm JSX:** Use config-driven rendering so new categories can be added by updating a config object, not editing JSX.
- **Breaking existing fabric routes:** The `/fabrics` URL must redirect to `/products/fabrics` — do NOT remove the redirect or break bookmarked URLs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced search | Custom debounce timer in every selector | Reuse FabricSelector debounce pattern (useRef + setTimeout) | Already proven in codebase |
| Paginated data fetching | Manual state + useEffect | TanStack Query useQuery with queryKey patterns | Existing pattern in all hooks/queries/* files |
| Form state management | Manual useState per field | Ant Design Form.useForm() + Form.List for multi-item | Project convention, enables setFields() for validation |
| Table with expandable rows | Custom accordion component | Ant Design Table `expandable` prop | Built-in, well-tested |
| Category label mapping | Inline switch/if-else | Const record objects (PRODUCT_SUB_CATEGORY_LABELS) | Pattern from enums.types.ts |
| Unit derivation | Per-component logic | Const mapping UNIT_BY_CATEGORY | Single source of truth |

**Key insight:** This phase is fundamentally about wiring existing UI patterns to new backend APIs. The codebase already has every pattern needed — the task is composition, not invention.

## Common Pitfalls

### Pitfall 1: Quote Type Mismatch After Phase 7 Restructure
**What goes wrong:** The existing frontend Quote type has `fabricId`, `quantity`, `unitPrice`, `totalPrice` on the Quote entity. Phase 7 moved these to QuoteItem. The existing QuoteListPage, QuoteDetailPage, QuoteForm, and useQuotes hook all reference the old single-item Quote shape.
**Why it happens:** Phase 7 was backend-only; frontend types were not updated.
**How to avoid:** Update the Quote entity type first. Quote now has `items: QuoteItem[]` instead of `fabricId/quantity/unitPrice`. Update all pages that display quote data. The QuoteListPage will need to either show item count or use expandable rows to display items.
**Warning signs:** TypeScript errors on `quote.fabricId`, `quote.quantity`, `quote.unitPrice` properties.

### Pitfall 2: OrderItem Type Update for productId + unit
**What goes wrong:** The existing OrderItem type has `fabricId: number` (required). Phase 7 made it nullable and added `productId` and `unit` fields. The frontend OrderItem type and AddOrderItemData need updating.
**Why it happens:** Backend schema changed in Phase 7 but frontend types lag behind.
**How to avoid:** Update `entities.types.ts` OrderItem interface: `fabricId` becomes `number | null`, add `productId?: number | null`, add `unit: string`, add `product?: Product`. Update `forms.types.ts` AddOrderItemData similarly.
**Warning signs:** TypeScript strict null errors, missing `unit` field on order item display.

### Pitfall 3: Sidebar selectedKeys Logic for Nested Routes
**What goes wrong:** With SubMenu, the `selectedKey` logic `'/' + pathname.split('/')[1]` no longer works because `/products/iron-frames` would match `/products` but not highlight the specific sub-menu item.
**Why it happens:** Current sidebar uses first path segment; new structure needs second segment too.
**How to avoid:** Update `selectedKey` to match the full path prefix: for `/products/iron-frames/123`, selectedKey should be `/products/iron-frames`. Also add `defaultOpenKeys` or manage `openKeys` state so the "产品管理" SubMenu stays open.
**Warning signs:** No menu item highlighted when viewing product pages; SubMenu collapsed when navigating.

### Pitfall 4: UnifiedProductSelector Value Format
**What goes wrong:** FabricSelector uses `value: number` (fabricId). UnifiedProductSelector must encode BOTH the type (fabric vs product) and the ID, because the same numeric ID could exist in both tables.
**Why it happens:** Two separate database tables with independent auto-increment IDs.
**How to avoid:** Use a composite value like `"fabric:1"` or `"product:5"` as the Select value. On selection change, parse it to set the correct field (fabricId or productId) and clear the other. Alternatively, use a discriminated union in the onChange callback.
**Warning signs:** Wrong product/fabric association in saved orders; type collisions with same numeric IDs.

### Pitfall 5: Quote Conversion API Change
**What goes wrong:** The existing `useConvertQuoteToOrder` hook calls `POST /quotes/:id/convert-to-order`. Phase 7 replaced this with `POST /quotes/convert-items` accepting `{ quoteItemIds: number[], orderId?: number }`. The old endpoint may no longer exist.
**Why it happens:** Backend API changed in Phase 7.
**How to avoid:** Update the quote API layer to use the new `convert-items` endpoint. The QuoteDetailPage must now allow selecting specific QuoteItems (checkbox) and converting them, not converting the entire quote at once.
**Warning signs:** 404 errors on quote conversion; missing item-level selection UI.

### Pitfall 6: API Base Path
**What goes wrong:** Using `/api` instead of `/api/v1` in new API files.
**Why it happens:** Documented in CLAUDE.md as a known pitfall.
**How to avoid:** The `client.ts` axios instance already has the base URL configured — use the `get`/`post`/`patch`/`del` helpers from `api/client.ts` which prepend the correct base path. New API files just use relative paths like `/products`.
**Warning signs:** 404 errors on API calls.

### Pitfall 7: Ant Design Chinese Button Space in Tests
**What goes wrong:** 2-character Chinese button text gets a space inserted in jsdom (e.g., "删 除" instead of "删除").
**Why it happens:** Ant Design inserts space between two CJK characters in button text under jsdom.
**How to avoid:** Use `document.querySelector` with CSS selectors or `getByTestId` instead of `getByText` for Chinese button assertions.
**Warning signs:** Test assertions failing on exact Chinese text match.

## Code Examples

### Example 1: Product API Layer (follows fabric.api.ts pattern)
```typescript
// frontend/src/api/product.api.ts
import type { PaginatedResult } from '@/types';
import { get, post, patch, del } from './client';

// Types will be defined in types/ files
export function getProducts(params?: QueryProductParams): Promise<PaginatedResult<Product>> {
  return get<PaginatedResult<Product>>('/products', params);
}

export function getProduct(id: number): Promise<Product> {
  return get<Product>(`/products/${id}`);
}

export function createProduct(data: CreateProductData): Promise<Product> {
  return post<Product>('/products', data);
}

export function updateProduct(id: number, data: UpdateProductData): Promise<Product> {
  return patch<Product>(`/products/${id}`, data);
}

export function deleteProduct(id: number, force?: boolean): Promise<void> {
  return del<void>(`/products/${id}`, { force });
}

// Product suppliers
export function getProductSuppliers(
  productId: number,
  params?: QueryProductSuppliersParams
): Promise<PaginatedResult<ProductSupplier>> {
  return get<PaginatedResult<ProductSupplier>>(`/products/${productId}/suppliers`, params);
}

// Product pricing
export function getProductPricing(
  productId: number,
  params?: QueryProductPricingParams
): Promise<PaginatedResult<ProductPricing>> {
  return get<PaginatedResult<ProductPricing>>(`/products/${productId}/pricing`, params);
}
```

### Example 2: Product Entity Types
```typescript
// Add to entities.types.ts
export interface Product extends SoftDeletableEntity {
  productCode: string;
  name: string;
  category: string;      // 'IRON_FRAME_MOTOR'
  subCategory: string;   // 'IRON_FRAME' | 'MOTOR' | 'MATTRESS' | 'ACCESSORY'
  modelNumber?: string | null;
  specification?: string | null;
  defaultPrice?: number | null;
  specs?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface ProductSupplier extends BaseEntity {
  productId: number;
  supplierId: number;
  purchasePrice: number;
  minOrderQty?: number | null;
  leadTimeDays?: number | null;
  product?: Product;
  supplier?: Supplier;
}

export interface ProductPricing extends BaseEntity {
  // Uses existing CustomerPricing with productId extension
  customerId: number;
  productId: number;
  specialPrice: number;
  customer?: Customer;
  product?: Product;
}

export interface QuoteItem extends BaseEntity {
  quoteId: number;
  fabricId?: number | null;
  productId?: number | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  unit: string;
  isConverted: boolean;
  notes?: string | null;
  fabric?: Fabric;
  product?: Product;
}
```

### Example 3: Unit Mapping Constant
```typescript
// frontend/src/utils/constants.ts or a new product-constants.ts
export const UNIT_BY_SUB_CATEGORY: Record<string, string> = {
  IRON_FRAME: '套',
  MOTOR: '个',
  MATTRESS: '张',
  ACCESSORY: '个',
};

export const UNIT_LABEL_FABRIC = '米';

// Helper to get unit from item type
export function getItemUnit(fabricId?: number | null, subCategory?: string): string {
  if (fabricId) return UNIT_LABEL_FABRIC;
  if (subCategory && UNIT_BY_SUB_CATEGORY[subCategory]) {
    return UNIT_BY_SUB_CATEGORY[subCategory];
  }
  return '个'; // fallback
}
```

### Example 4: Category Tag Colors
```typescript
// For UnifiedProductSelector results
const CATEGORY_TAG_COLORS: Record<string, string> = {
  fabric: 'blue',
  IRON_FRAME: 'orange',
  MOTOR: 'green',
  MATTRESS: 'purple',
  ACCESSORY: 'cyan',
};

const CATEGORY_TAG_LABELS: Record<string, string> = {
  fabric: '面料',
  IRON_FRAME: '铁架',
  MOTOR: '电机',
  MATTRESS: '床垫',
  ACCESSORY: '配件',
};
```

### Example 5: Route Configuration Update
```typescript
// New route structure in routes/index.tsx
// Product routes (new)
{ path: '/products/fabrics', element: withSuspense(FabricListPage) },
{ path: '/products/fabrics/new', element: withSuspense(FabricFormPage) },
{ path: '/products/fabrics/:id', element: withSuspense(FabricDetailPage) },
{ path: '/products/fabrics/:id/edit', element: withSuspense(FabricFormPage) },

{ path: '/products/:category', element: withSuspense(ProductListPage) },
{ path: '/products/:category/new', element: withSuspense(ProductFormPage) },
{ path: '/products/:category/:id', element: withSuspense(ProductDetailPage) },
{ path: '/products/:category/:id/edit', element: withSuspense(ProductFormPage) },

// Redirect old fabric routes
{ path: '/fabrics', element: <Navigate to="/products/fabrics" replace /> },
{ path: '/fabrics/new', element: <Navigate to="/products/fabrics/new" replace /> },
{ path: '/fabrics/:id', element: <Navigate to="/products/fabrics/:id" replace /> },
// Note: parametric redirect needs a small wrapper component
```

## State of the Art

| Old Approach (current frontend) | New Approach (Phase 8) | Impact |
|--------------------------------|------------------------|--------|
| Quote = single item (fabricId, quantity, unitPrice on Quote) | Quote = header + QuoteItem[] | QuoteListPage, QuoteDetailPage, QuoteForm, QuoteFormPage all need updating |
| OrderItem.fabricId required | OrderItem.fabricId nullable, productId nullable (XOR) | OrderItemForm needs UnifiedProductSelector, type updates |
| Flat sidebar (面料管理 top-level) | SubMenu (产品管理 > 面料/铁架/电机/床垫/配件) | Sidebar.tsx restructure |
| Quote conversion = whole-quote (`POST /quotes/:id/convert-to-order`) | Item-level conversion (`POST /quotes/convert-items` with quoteItemIds) | QuoteDetailPage needs checkbox selection UI |
| QuoteStatus: active, expired, converted | QuoteStatus: active, expired, converted, partially_converted | Frontend enum needs new status |

**Deprecated/outdated after Phase 7:**
- `quote.fabricId`, `quote.quantity`, `quote.unitPrice`, `quote.totalPrice` as direct Quote properties (moved to QuoteItem)
- `POST /quotes/:id/convert-to-order` endpoint (replaced by `POST /quotes/convert-items`)
- `ConvertQuotesToOrderDto` with quoteIds array (replaced by `ConvertQuoteItemsDto` with quoteItemIds)

## Open Questions

1. **Parametric Route Redirect for `/fabrics/:id`**
   - What we know: React Router `Navigate` doesn't support parameter forwarding natively
   - What's unclear: Best approach for redirecting `/fabrics/123` to `/products/fabrics/123`
   - Recommendation: Create a small `FabricRedirect` component that reads params and navigates, or use a catch-all `/fabrics/*` redirect with `useParams` + `useNavigate`

2. **Fabric Pages Under /products/fabrics vs Reuse**
   - What we know: Decision says "fabric pages reuse existing code with new route paths"
   - What's unclear: Whether fabric pages need any modification or just route remapping
   - Recommendation: Keep existing FabricListPage/FabricDetailPage/FabricFormPage unchanged, just mount them under `/products/fabrics` routes. The components don't hardcode their own paths (they use `useNavigate` with relative or click-handler paths). Update internal navigation links if they use absolute paths like `/fabrics/...` to `/products/fabrics/...`.

3. **ProductPricing Endpoint vs CustomerPricing**
   - What we know: Backend has `GET /products/:id/pricing` for product-specific pricing. CustomerPricing now has nullable productId.
   - What's unclear: Whether the frontend should use the product pricing endpoints or the existing customer pricing pattern
   - Recommendation: Use `GET /products/:id/pricing` endpoint in the ProductPricingTab — it mirrors the FabricPricingTab pattern exactly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest, via vite.config.ts `test` block) |
| Config file | `frontend/vite.config.ts` (test section) |
| Quick run command | `cd frontend && pnpm test -- --run --reporter=verbose` |
| Full suite command | `cd frontend && pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCAT-10 | ProductListPage renders table with category-filtered data | unit | `cd frontend && pnpm vitest run src/pages/products/__tests__/ProductListPage.test.tsx` | Wave 0 |
| MCAT-10 | ProductListPage switches columns based on :category param | unit | (same file as above) | Wave 0 |
| MCAT-11 | ProductDetailPage renders 3 tabs, loads product data | unit | `cd frontend && pnpm vitest run src/pages/products/__tests__/ProductDetailPage.test.tsx` | Wave 0 |
| MCAT-11 | ProductFormPage renders dynamic fields by subCategory | unit | `cd frontend && pnpm vitest run src/pages/products/__tests__/ProductFormPage.test.tsx` | Wave 0 |
| MCAT-12 | UnifiedProductSelector searches both fabrics and products | unit | `cd frontend && pnpm vitest run src/components/business/__tests__/UnifiedProductSelector.test.tsx` | Wave 0 |
| MCAT-12 | OrderItemForm uses UnifiedProductSelector, auto-populates unit | unit | `cd frontend && pnpm vitest run src/components/forms/__tests__/OrderItemForm.test.tsx` | Exists (needs update) |
| ALL | Quote pages work with new multi-item model | unit | `cd frontend && pnpm vitest run src/pages/quotes/__tests__/` | Exists (needs update) |
| ALL | Sidebar renders SubMenu with correct items | unit | `cd frontend && pnpm vitest run src/components/layout/__tests__/Sidebar.test.tsx` | Exists (needs update) |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && pnpm test && pnpm build && pnpm lint && pnpm typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/pages/products/__tests__/ProductListPage.test.tsx` -- covers MCAT-10
- [ ] `frontend/src/pages/products/__tests__/ProductDetailPage.test.tsx` -- covers MCAT-11
- [ ] `frontend/src/pages/products/__tests__/ProductFormPage.test.tsx` -- covers MCAT-11
- [ ] `frontend/src/components/business/__tests__/UnifiedProductSelector.test.tsx` -- covers MCAT-12
- [ ] Existing test updates: Sidebar.test.tsx, OrderItemForm.test.tsx, Quote page tests

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: `frontend/src/pages/fabrics/`, `frontend/src/components/`, `frontend/src/hooks/queries/`, `frontend/src/types/` -- all patterns verified from source code
- Backend API endpoints: `backend/src/product/product.controller.ts`, `backend/src/quote/quote.controller.ts` -- all APIs verified from source code
- Prisma schema: `backend/prisma/schema.prisma` -- Product, ProductSupplier, OrderItem, QuoteItem, Quote models verified
- Backend enums: `backend/src/system/enums/index.ts` -- ProductCategory, ProductSubCategory confirmed

### Secondary (MEDIUM confidence)
- Ant Design Menu SubMenu pattern -- based on existing codebase Menu usage and standard Ant Design API
- Table expandable rows -- standard Ant Design Table feature

### Tertiary (LOW confidence)
- None -- all findings verified from codebase source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing libraries
- Architecture: HIGH - all patterns directly observable in existing codebase, replication not invention
- Pitfalls: HIGH - identified from actual code comparison (Phase 7 backend changes vs current frontend types)

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable stack, no external dependency changes)
