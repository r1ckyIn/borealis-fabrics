# Phase 4: Frontend Component Decomposition - Research

**Researched:** 2026-03-23
**Domain:** React component decomposition, custom hooks extraction, TypeScript test hardening
**Confidence:** HIGH

## Summary

This phase is a pure frontend refactoring phase with zero behavior changes. Three oversized components (FabricDetailPage 815L/5 useState, CustomerDetailPage 703L/7 useState, OrderItemsSection 654L/6 useState) need decomposition into focused sub-components with custom hooks managing all state. Additionally, 2 remaining frontend test `any` types need elimination, and new error handling tests need to be written for unexpected API response formats.

The codebase already has a working decomposition pattern: `OrderDetailPage` delegates to `OrderInfoSection`, `OrderItemsSection`, `OrderPaymentSection`, `OrderLogisticsSection` in `pages/orders/components/`. This is the exact pattern to replicate for FabricDetailPage and CustomerDetailPage. The existing TanStack Query hooks in `hooks/queries/` provide the data-fetching layer that custom hooks will compose.

**Primary recommendation:** Follow the existing `OrderDetailPage` decomposition pattern exactly. Extract state + handlers into `useFabricDetail`/`useCustomerDetail`/`useOrderItems` custom hooks, then split rendering into sub-components with max 5 props each. Page components become pure orchestrators with zero useState calls.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All decisions in this phase are technical refactoring choices. User confirmed full Claude discretion on 2026-03-23.

### Claude's Discretion
- Component decomposition strategy for all three targets
- Custom hook API design and naming
- Sub-component structure and props interfaces
- Frontend test `any` elimination approach (2 instances)
- Error handling test scenarios and implementation
- Regression test updates for new component structure

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-03 | FabricDetailPage refactored: custom hooks extracted, sub-components split | Custom hook pattern (useFabricDetail), sub-component structure (pages/fabrics/components/), existing OrderDetailPage pattern as reference |
| QUAL-04 | CustomerDetailPage refactored: custom hooks extracted, sub-components split | Custom hook pattern (useCustomerDetail), sub-component structure (pages/customers/components/), mirror fabric pattern |
| QUAL-05 | OrderItemsSection refactored: custom hooks extracted, sub-components split | Custom hook pattern (useOrderItems), split into OrderItemTable + OrderItemFormModal + OrderItemStatusActions |
| QUAL-07 | Frontend test `any` types eliminated (13 specified, 2 remaining) | Two instances found: test/setup.ts globalThis cast, integrationTestUtils.tsx PaginatedResult<any>. Both replaceable with proper types |
| QUAL-08 | No sub-component has more than 5 props after refactoring | Props interface design patterns documented; use object/config props for complex data |
| QUAL-09 | All refactored page components have zero useState calls | All state moves to custom hooks; page components only call hooks and pass results as props |
| TEST-06 | Frontend error handling tests for unexpected API response formats | Test scenarios: null/undefined body, missing fields, wrong types, HTML error pages, network timeout |
| TEST-07 | All existing tests continue passing after refactoring (608 backend + 808 frontend) | Test update strategy for mocking decomposed components; backend tests untouched |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Project standard |
| TypeScript | strict mode | Type safety | Project standard |
| Vitest | (project config) | Test framework | Project standard via vite.config.ts |
| @testing-library/react | (project dep) | Component testing | Project standard |
| TanStack Query | (project dep) | Server state management | Already used in hooks/queries/ |
| Ant Design | 5.x (6 in CLAUDE.md, but actual import patterns suggest 5.x) | UI components | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/user-event | (project dep) | User interaction testing | All interactive tests |
| vitest | (project config) | vi.mock, vi.fn | Mocking hooks in decomposed component tests |

### Alternatives Considered
None. This is pure refactoring using existing stack -- no new dependencies.

## Architecture Patterns

### Recommended Project Structure (after decomposition)

```
frontend/src/pages/
├── fabrics/
│   ├── FabricDetailPage.tsx              # Orchestrator (zero useState)
│   ├── FabricListPage.tsx                # Unchanged
│   ├── FabricFormPage.tsx                # Unchanged
│   ├── components/                       # NEW: sub-components
│   │   ├── FabricBasicInfo.tsx           # Descriptions tab content
│   │   ├── FabricImageGallery.tsx        # Image upload/gallery tab
│   │   ├── FabricSupplierTab.tsx         # Supplier table + modal
│   │   └── FabricPricingTab.tsx          # Pricing table + modal
│   └── __tests__/
│       ├── FabricDetailPage.test.tsx     # Updated: mocks sub-components
│       ├── FabricBasicInfo.test.tsx       # NEW: unit tests
│       ├── FabricImageGallery.test.tsx    # NEW: unit tests
│       ├── FabricSupplierTab.test.tsx     # NEW: unit tests
│       └── FabricPricingTab.test.tsx      # NEW: unit tests
├── customers/
│   ├── CustomerDetailPage.tsx            # Orchestrator (zero useState)
│   ├── components/                       # NEW: sub-components
│   │   ├── CustomerBasicInfo.tsx         # Descriptions tab content
│   │   ├── CustomerAddressTab.tsx        # Address list tab
│   │   ├── CustomerPricingTab.tsx        # Pricing table + modal
│   │   └── CustomerOrdersTab.tsx         # Order history table
│   └── __tests__/
│       ├── CustomerDetailPage.test.tsx   # Updated: mocks sub-components
│       └── Customer*.test.tsx            # NEW: unit tests for subs
├── orders/
│   ├── components/
│   │   ├── OrderItemsSection.tsx         # Orchestrator (zero useState)
│   │   ├── OrderItemTable.tsx            # NEW: table rendering
│   │   ├── OrderItemFormModal.tsx        # NEW: add/edit modals
│   │   └── OrderItemStatusActions.tsx    # NEW: status/cancel/restore modals

frontend/src/hooks/
├── queries/                              # Existing TanStack Query hooks
│   ├── useFabrics.ts                     # Unchanged
│   ├── useCustomers.ts                   # Unchanged
│   └── useOrders.ts                      # Unchanged
├── useFabricDetail.ts                    # NEW: state + handlers for FabricDetailPage
├── useCustomerDetail.ts                  # NEW: state + handlers for CustomerDetailPage
└── useOrderItems.ts                      # NEW: state + handlers for OrderItemsSection
```

### Pattern 1: Custom Hook Extraction (State + Handlers)

**What:** Extract all useState calls, Form.useForm() calls, useCallback handlers, and useMemo computations into a single custom hook per page component.

**When to use:** Any page component with 3+ useState calls and multiple event handlers.

**Example (useFabricDetail pattern):**

```typescript
// Source: Derived from existing FabricDetailPage.tsx analysis

interface UseFabricDetailReturn {
  // Data
  fabric: Fabric | undefined;
  isLoading: boolean;
  fetchError: Error | null;

  // Tab state
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Delete
  deleteFabricModalOpen: boolean;
  setDeleteFabricModalOpen: (open: boolean) => void;
  handleDeleteFabric: () => Promise<void>;
  isDeleting: boolean;

  // Supplier modal
  supplierModal: ModalState<FabricSupplier>;
  supplierForm: FormInstance;
  openAddSupplier: () => void;
  openEditSupplier: (record: FabricSupplier) => void;
  closeSupplierModal: () => void;
  submitSupplier: () => Promise<void>;
  removeSupplier: (supplierId: number) => Promise<void>;
  isSubmittingSupplier: boolean;

  // ... similar for pricing, images

  // Computed
  breadcrumbs: BreadcrumbItem[];
}

export function useFabricDetail(fabricId: number | undefined): UseFabricDetailReturn {
  // ALL useState calls live here
  const [activeTab, setActiveTab] = useState('info');
  const [deleteFabricModalOpen, setDeleteFabricModalOpen] = useState(false);
  const [supplierModal, setSupplierModal] = useState<ModalState<FabricSupplier>>({...});
  const [pricingModal, setPricingModal] = useState<ModalState<CustomerPricing>>({...});

  // ALL Form.useForm calls live here
  const [supplierForm] = Form.useForm();
  const [pricingForm] = Form.useForm();

  // Query hooks composition
  const { data: fabric, isLoading, error: fetchError } = useFabric(fabricId);
  const { data: suppliersData } = useFabricSuppliers(fabricId, undefined, activeTab === 'suppliers');

  // ALL mutation hooks
  const deleteMutation = useDeleteFabric();
  // ...

  // ALL handlers (useCallback)
  const handleDeleteFabric = useCallback(async () => { ... }, [...]);

  // Return everything the view needs
  return { fabric, isLoading, fetchError, activeTab, setActiveTab, ... };
}
```

### Pattern 2: Sub-Component with Max 5 Props (QUAL-08)

**What:** Each sub-component receives at most 5 props. Complex data is passed as a single object prop.

**When to use:** All decomposed sub-components.

**Example:**

```typescript
// GOOD: 4 props
interface FabricBasicInfoProps {
  fabric: Fabric;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

// GOOD: 5 props with grouped handlers
interface FabricSupplierTabProps {
  fabricId: number;
  suppliers: PaginatedResult<FabricSupplier> | undefined;
  isLoading: boolean;
  modal: SupplierModalState;    // Groups: open, mode, data, form, handlers
  onAdd: () => void;
}

// BAD: Too many individual props
interface FabricSupplierTabProps {
  fabricId: number;
  suppliers: PaginatedResult<FabricSupplier> | undefined;
  isLoading: boolean;
  modalOpen: boolean;           // 6+ props = violation
  modalMode: 'add' | 'edit';
  onAdd: () => void;
  onEdit: (record: FabricSupplier) => void;
  onRemove: (id: number) => void;
  onSubmit: () => Promise<void>;
  onClose: () => void;
}
```

**Grouping strategy for QUAL-08 compliance:** When a sub-component needs many related values (e.g., modal state + form + handlers), group them into a single typed object prop:

```typescript
interface ModalControl<T> {
  open: boolean;
  mode: 'add' | 'edit';
  data?: T;
  form: FormInstance;
  onOpen: () => void;
  onEdit: (record: T) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

// Sub-component only needs 4 props:
interface FabricSupplierTabProps {
  fabricId: number;
  suppliers: PaginatedResult<FabricSupplier> | undefined;
  isLoading: boolean;
  modal: ModalControl<FabricSupplier>;
}
```

### Pattern 3: Orchestrator Page (Zero useState)

**What:** After decomposition, the page component calls the custom hook and passes results to sub-components. Zero local state.

**When to use:** All three refactored page components.

**Example:**

```typescript
// Source: Modeled after existing OrderDetailPage pattern

export default function FabricDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fabricId = parseEntityId(id);

  // Single hook call -- ALL state is here
  const detail = useFabricDetail(fabricId);

  // Loading/error states
  if (detail.isLoading) return <LoadingView breadcrumbs={detail.breadcrumbs} />;
  if (detail.fetchError) return <ErrorView breadcrumbs={detail.breadcrumbs} onBack={() => navigate('/fabrics')} />;
  if (!detail.fabric) return <NotFoundView breadcrumbs={detail.breadcrumbs} onBack={() => navigate('/fabrics')} />;

  // Pure rendering orchestration
  const tabItems = [
    { key: 'info', label: '基本信息', children: <FabricBasicInfo fabric={detail.fabric} /> },
    { key: 'images', label: '图片管理', children: <FabricImageGallery ... /> },
    { key: 'suppliers', label: '供应商关联', children: <FabricSupplierTab ... /> },
    { key: 'pricing', label: '客户定价', children: <FabricPricingTab ... /> },
  ];

  return (
    <PageContainer title={detail.fabric.name} breadcrumbs={detail.breadcrumbs} extra={...}>
      <Card>
        <Tabs activeKey={detail.activeTab} onChange={detail.setActiveTab} items={tabItems} />
      </Card>
      {/* Modals rendered by sub-components that own them */}
    </PageContainer>
  );
}
```

### Pattern 4: Test Strategy for Decomposed Components

**What:** OrderDetailPage test already demonstrates the pattern -- mock sub-components to shallow-render, test orchestration logic only.

**Existing pattern from codebase:**

```typescript
// Source: frontend/src/pages/orders/__tests__/OrderDetailPage.test.tsx lines 52-64
vi.mock('../components/OrderInfoSection', () => ({
  OrderInfoSection: () => <div data-testid="order-info-section">Order Info</div>,
}));
vi.mock('../components/OrderItemsSection', () => ({
  OrderItemsSection: () => <div data-testid="order-items-section">Order Items</div>,
}));
```

**Apply same pattern to FabricDetailPage and CustomerDetailPage tests:**
- Mock decomposed sub-components in parent test
- Test parent orchestration: loading/error/404 states, tab switching, navigation
- Write separate test files for each sub-component with focused assertions

### Anti-Patterns to Avoid

- **Prop drilling through many layers:** Don't pass individual handler props through 3+ levels. Group into typed objects or keep hooks at the component that needs them.
- **Splitting modals from their triggers:** Keep modal + trigger button + form in the same sub-component. Don't separate modal rendering from its open/close logic.
- **Over-decomposition:** Don't create sub-components smaller than ~50 lines. The goal is focused responsibility, not maximum decomposition.
- **Breaking lazy loading contract:** FabricDetailPage must remain the default export at `pages/fabrics/FabricDetailPage.tsx` -- routes/index.tsx uses lazy() to load it.
- **Moving Form.useForm() to wrong level:** In the current pattern, form instances are created at the page/section level and passed to form components. After decomposition, form instances should be created in the custom hook and passed to the sub-component that renders the form.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | Custom form reducer | Ant Design Form.useForm() + custom hook wrapper | Already used throughout codebase, handles validation |
| Server state | Custom fetch/cache | TanStack Query hooks from hooks/queries/ | Already composable, handles cache invalidation |
| Type-safe mock builders | Manual mock objects | Extend existing createMockMutation() pattern from tests | DRY, already proven in FabricDetailPage.test.tsx |
| Modal state machine | Complex reducer | Simple ModalState<T> type + useState (existing pattern) | Sufficient for add/edit modals |

**Key insight:** This phase adds zero new libraries. All patterns already exist in the codebase -- we are reorganizing, not introducing.

## Common Pitfalls

### Pitfall 1: Breaking Existing Test Mocks
**What goes wrong:** After decomposition, existing tests that mock `useFabrics` hooks directly will fail because the import paths change or the component tree changes.
**Why it happens:** Tests for FabricDetailPage.test.tsx currently mock 12 hooks directly. After extracting useFabricDetail, those hooks are called inside the custom hook, not the page component.
**How to avoid:** Update parent test to mock the custom hook (`useFabricDetail`) instead of individual query hooks. Sub-component tests mock their own dependencies.
**Warning signs:** Tests fail with "hook called outside of component" or "mock not applied".

### Pitfall 2: Ant Design Tabs Rendering All Panels
**What goes wrong:** Testing tab content fails because Ant Design renders all TabPanel children to DOM simultaneously.
**Why it happens:** Ant Design Tabs component pre-renders all panels for animation performance.
**How to avoid:** Use `within()` or `getByTestId()` to scope assertions to the active tab panel. This is already documented in project CLAUDE.md.
**Warning signs:** Multiple matches when using `getByText()` for elements that appear in different tabs.

### Pitfall 3: Custom Hook Return Type Becomes God Object
**What goes wrong:** useFabricDetail returns 30+ properties, making it hard to understand and test.
**Why it happens:** Dumping all state into one hook without organization.
**How to avoid:** Group return values by domain area. Consider returning nested objects:
```typescript
return {
  data: { fabric, isLoading, fetchError },
  tabs: { activeTab, setActiveTab },
  supplier: { modal, openAdd, openEdit, close, submit, remove },
  pricing: { modal, openAdd, openEdit, close, submit, delete: deletePricing },
  images: { upload, delete: deleteImage, isUploading },
  delete: { modalOpen, setModalOpen, handle, isDeleting },
  breadcrumbs,
};
```
**Warning signs:** Hook return interface exceeds 20 individual properties.

### Pitfall 4: QUAL-08 Props Count Violation
**What goes wrong:** Sub-components end up with 6+ props because each handler is passed individually.
**Why it happens:** Decomposing without grouping related props.
**How to avoid:** Use the ModalControl<T> pattern to bundle modal-related state + handlers into one prop object.
**Warning signs:** Props interface has more than 5 required properties.

### Pitfall 5: ResizeObserver `any` Cast (QUAL-07)
**What goes wrong:** Attempt to remove `(globalThis as any).ResizeObserver` breaks all Ant Design tests.
**Why it happens:** `globalThis` doesn't have ResizeObserver in its type definition for jsdom environment.
**How to avoid:** Use TypeScript declaration merging:
```typescript
declare global {
  // eslint-disable-next-line no-var
  var ResizeObserver: {
    new (callback: ResizeObserverCallback): ResizeObserver;
  };
}
globalThis.ResizeObserver = class ResizeObserver { ... };
```
**Warning signs:** TypeScript compile error when removing `as any` without adding declaration.

### Pitfall 6: Breaking Lazy Loading Route Contract
**What goes wrong:** Renaming or moving FabricDetailPage breaks routing.
**Why it happens:** `routes/index.tsx` uses `lazy(() => import('../pages/fabrics/FabricDetailPage'))` which expects a default export.
**How to avoid:** Keep default export at the same file path. Only internal structure changes.
**Warning signs:** White screen or "Cannot find module" at runtime.

## Code Examples

Verified patterns from the existing codebase:

### Existing Decomposition Reference (OrderDetailPage)
```typescript
// Source: frontend/src/pages/orders/OrderDetailPage.tsx
// This is the EXACT pattern to replicate

// Page imports sub-components from ./components/
import { OrderInfoSection } from './components/OrderInfoSection';
import { OrderItemsSection } from './components/OrderItemsSection';

// Page calls query hooks directly, passes results to sub-components
export default function OrderDetailPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState('items');
  const { data: order } = useOrder(orderId);
  const { data: orderItems } = useOrderItems(orderId, undefined, true);

  // Sub-components receive data + navigate as props
  return (
    <Tabs items={[
      { key: 'items', children: <OrderItemsSection orderId={orderId!} orderItems={orderItems} ... /> },
    ]} />
  );
}
```

### Existing Sub-Component Props Pattern (OrderInfoSection)
```typescript
// Source: frontend/src/pages/orders/components/OrderInfoSection.tsx
// Props: 3 (under the 5-prop limit)

export interface OrderInfoSectionProps {
  order: Order;
  aggregateStatus: OrderItemStatus;
  navigate: NavigateFunction;
}
```

### Existing Test Mock Pattern for Sub-Components
```typescript
// Source: frontend/src/pages/orders/__tests__/OrderDetailPage.test.tsx
vi.mock('../components/OrderItemsSection', () => ({
  OrderItemsSection: () => <div data-testid="order-items-section">Order Items</div>,
}));
```

### Existing Mock Mutation Helper
```typescript
// Source: frontend/src/pages/fabrics/__tests__/FabricDetailPage.test.tsx
const createMockMutation = () => ({
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
});
```

### Existing Error Handler Chain
```typescript
// Source: frontend/src/utils/errorMessages.ts
// Resolution: ERROR_CODE_MESSAGES > HTTP_STATUS_MESSAGES > raw message > fallback
export function getErrorMessage(error: ApiError): string { ... }

// Source: frontend/src/api/client.ts
// Interceptor normalizes errors to ApiError format
const apiError: ApiError = {
  code: error.response?.data?.code ?? error.response?.status ?? 500,
  message: error.response?.data?.message ?? error.message ?? 'Unknown error',
  data: null,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All state in page component | State in custom hooks, page as orchestrator | React 16.8+ (hooks) | Standard React pattern |
| One monolith test per page | Mock sub-components in parent, unit-test subs independently | Already used in OrderDetailPage | Faster, more focused tests |
| `as any` in test globals | Declaration merging for globalThis polyfills | TypeScript 4.x+ | Type-safe test setup |
| PaginatedResult<any> | PaginatedResult<never> or PaginatedResult<unknown> for empty results | TypeScript strict | Avoids any propagation |

**Deprecated/outdated:**
- None for this phase. All patterns used are current React + TypeScript best practices.

## Open Questions

1. **Existing Test Count Baseline**
   - What we know: Backend 608 tests, frontend 808 tests (verified by running `pnpm test` today)
   - What's unclear: REQUIREMENTS.md states 753 frontend tests; actual count is 808 (grew during Phase 3)
   - Recommendation: Use 808 as the baseline for TEST-07 regression check

2. **QUAL-07 Count Discrepancy**
   - What we know: REQUIREMENTS says 13 frontend test `any` instances; codebase scan found only 2
   - What's unclear: Whether the 11 missing instances were fixed during earlier phases
   - Recommendation: Fix the 2 that exist. Document the discrepancy in SUMMARY.md

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured in vite.config.ts) |
| Config file | `frontend/vite.config.ts` (test section) |
| Quick run command | `cd frontend && pnpm test -- --reporter=verbose` |
| Full suite command | `cd frontend && pnpm test && pnpm lint && pnpm typecheck && cd ../backend && pnpm test && pnpm lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-03 | FabricDetailPage decomposed | unit | `cd frontend && pnpm test -- --testPathPattern="FabricDetailPage\|FabricBasicInfo\|FabricImageGallery\|FabricSupplierTab\|FabricPricingTab" -x` | Partial (parent exists, subs Wave 0) |
| QUAL-04 | CustomerDetailPage decomposed | unit | `cd frontend && pnpm test -- --testPathPattern="CustomerDetailPage\|CustomerBasicInfo\|CustomerAddressTab\|CustomerPricingTab\|CustomerOrdersTab" -x` | Partial (parent exists, subs Wave 0) |
| QUAL-05 | OrderItemsSection decomposed | unit | `cd frontend && pnpm test -- --testPathPattern="OrderItemsSection\|OrderItemTable\|OrderItemFormModal\|OrderItemStatusActions\|OrderDetailPage" -x` | Partial (parent exists, subs Wave 0) |
| QUAL-07 | Frontend test any eliminated | manual | `grep -rn 'as any\|: any\|<any>' frontend/src/test/ --include='*.ts' --include='*.tsx'` | N/A (code fix, not test) |
| QUAL-08 | Max 5 props per sub-component | manual | Review props interfaces in code | N/A (design constraint) |
| QUAL-09 | Zero useState in page components | manual | `grep -c 'useState' frontend/src/pages/fabrics/FabricDetailPage.tsx` should be 0 | N/A (code check) |
| TEST-06 | Error handling tests | unit | `cd frontend && pnpm test -- --testPathPattern="errorHandling" -x` | Wave 0 |
| TEST-07 | All existing tests pass | unit+integration | `cd frontend && pnpm test && cd ../backend && pnpm test` | Existing (808 frontend + 608 backend) |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm test -- --reporter=verbose`
- **Per wave merge:** `cd frontend && pnpm test && pnpm lint && pnpm typecheck && cd ../backend && pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/pages/fabrics/__tests__/FabricBasicInfo.test.tsx` -- covers QUAL-03 sub-component
- [ ] `frontend/src/pages/fabrics/__tests__/FabricImageGallery.test.tsx` -- covers QUAL-03 sub-component
- [ ] `frontend/src/pages/fabrics/__tests__/FabricSupplierTab.test.tsx` -- covers QUAL-03 sub-component
- [ ] `frontend/src/pages/fabrics/__tests__/FabricPricingTab.test.tsx` -- covers QUAL-03 sub-component
- [ ] `frontend/src/pages/customers/__tests__/CustomerBasicInfo.test.tsx` -- covers QUAL-04 sub-component
- [ ] `frontend/src/pages/customers/__tests__/CustomerAddressTab.test.tsx` -- covers QUAL-04 sub-component
- [ ] `frontend/src/pages/customers/__tests__/CustomerPricingTab.test.tsx` -- covers QUAL-04 sub-component
- [ ] `frontend/src/pages/customers/__tests__/CustomerOrdersTab.test.tsx` -- covers QUAL-04 sub-component
- [ ] `frontend/src/hooks/__tests__/useFabricDetail.test.ts` -- covers QUAL-03 hook
- [ ] `frontend/src/hooks/__tests__/useCustomerDetail.test.ts` -- covers QUAL-04 hook
- [ ] `frontend/src/hooks/__tests__/useOrderItems.test.ts` -- covers QUAL-05 hook
- [ ] Error handling test file for TEST-06 (location TBD in plan)

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- Direct reading of all target files (FabricDetailPage.tsx 815L, CustomerDetailPage.tsx 703L, OrderItemsSection.tsx 654L)
- **Existing decomposition pattern** -- OrderDetailPage.tsx + OrderInfoSection.tsx demonstrate the exact approach
- **Test patterns** -- OrderDetailPage.test.tsx (sub-component mocking), FabricDetailPage.test.tsx (mutation mocking)
- **Test any scan** -- `grep -rn 'as any\|: any\|<any>'` found exactly 2 instances in frontend test files

### Secondary (MEDIUM confidence)
- **React custom hook extraction** -- Standard React pattern documented in React official docs, widely practiced

### Tertiary (LOW confidence)
- None. All findings are based on direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all patterns from existing codebase
- Architecture: HIGH -- directly modeled on existing OrderDetailPage decomposition
- Pitfalls: HIGH -- identified from actual codebase patterns and known Ant Design issues documented in project CLAUDE.md
- Test strategy: HIGH -- mirrors existing OrderDetailPage.test.tsx pattern

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable -- pure refactoring, no external dependency changes)
