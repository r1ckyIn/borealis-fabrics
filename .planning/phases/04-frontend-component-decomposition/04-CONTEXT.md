# Phase 4: Frontend Component Decomposition - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Frontend components decomposed into focused sub-components with custom hooks, test `any` types eliminated, frontend error handling tests added. Covers QUAL-03~05 (component decomposition), QUAL-07 (test any elimination), QUAL-08 (max 5 props), QUAL-09 (zero useState in pages), TEST-06 (error handling tests), TEST-07 (regression). No new features, no backend changes — pure frontend refactoring and test hardening.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All decisions in this phase are technical refactoring choices. User confirmed full Claude discretion on 2026-03-23.

#### Component Decomposition Strategy (QUAL-03, QUAL-04, QUAL-05)
- FabricDetailPage (815L, 5 useState): extract useFabricDetail hook for state + API logic, split into sub-components (FabricBasicInfo, FabricPricing, FabricImages, FabricSuppliers)
- CustomerDetailPage (703L, 7 useState): extract useCustomerDetail hook, split into sub-components (CustomerBasicInfo, CustomerAddresses, CustomerOrders)
- OrderItemsSection (654L, 6 useState): extract useOrderItems hook, split into sub-components (OrderItemTable, OrderItemForm, OrderItemStatusActions)
- Each sub-component max 5 props (QUAL-08)
- All useState calls move to custom hooks; page components become pure orchestrators (QUAL-09)
- Decomposed sub-components live alongside their parent (e.g., `pages/fabrics/components/`)

#### Frontend Test `any` Elimination (QUAL-07)
- REQUIREMENTS specified 13 instances, but codebase scan found only 2 remaining:
  1. `test/setup.ts` — `(globalThis as any).ResizeObserver` polyfill
  2. `test/integration/integrationTestUtils.tsx` — `PaginatedResult<any>`
- Both will be replaced with proper typing
- The gap (13 → 2) likely due to cleanup during earlier phases; REQUIREMENTS count outdated

#### Error Handling Tests (TEST-06)
- Test unexpected API response scenarios:
  - Empty response body (null/undefined)
  - Missing required fields in response
  - Incorrect data types (string where number expected)
  - HTML error pages instead of JSON (nginx 502/503)
  - Network timeout / connection refused
- Tests verify graceful degradation: no crashes, user-friendly error messages displayed
- Follows Phase 1 error display strategy: ERROR_CODE_MESSAGES > HTTP_STATUS > raw message > fallback

#### Regression Safety (TEST-07)
- All 608 backend + 753+ frontend tests must continue passing after refactoring
- Refactored component tests updated to match new sub-component structure
- No behavior changes — only structural decomposition

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — QUAL-03~09, TEST-06~07 requirement definitions
- `.planning/ROADMAP.md` — Phase 4 success criteria

### Prior Phase Decisions
- `.planning/phases/01-frontend-bug-fixes/01-CONTEXT.md` — Error message display strategy (ERROR_CODE_MESSAGES mapping), Form.useForm() pattern
- `.planning/phases/03-backend-service-decomposition/03-CONTEXT.md` — Backend decomposition patterns (reference for consistency)

### Codebase Conventions
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, file organization, hook conventions
- `.planning/codebase/STRUCTURE.md` — Directory layout, where to add new components

### Target Components (must read before decomposing)
- `frontend/src/pages/fabrics/FabricDetailPage.tsx` — 815 lines, 5 useState
- `frontend/src/pages/customers/CustomerDetailPage.tsx` — 703 lines, 7 useState
- `frontend/src/pages/orders/components/OrderItemsSection.tsx` — 654 lines, 6 useState

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hooks/queries/` — 7 query hooks (useCustomers, useFabrics, useOrders, etc.) — reuse for data fetching in new custom hooks
- `hooks/useDebounce.ts`, `hooks/usePagination.ts` — utility hooks available for composition
- `components/business/` — 11 business components (AddressManager, FabricSelector, ImageUploader, etc.) — sub-components can delegate to these
- `components/common/` — 6 generic components (ConfirmModal, LoadingSpinner, StatusTag, etc.)
- `components/forms/` — 7 form components already extracted (CustomerForm, FabricForm, etc.)

### Established Patterns
- Query hooks in `hooks/queries/` use TanStack Query with consistent patterns (useQuery/useMutation)
- Business components use props-based dependency injection
- Form components receive `form` instance from parent via props (Form.useForm() at page level)
- Test files co-located in `__tests__/` subdirectories

### Integration Points
- Refactored page components must maintain same route/export (lazy loading in `routes/index.tsx`)
- Sub-components inherit existing Ant Design patterns (Form, Table, Modal, Descriptions)
- Custom hooks compose existing query hooks from `hooks/queries/`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User confirmed full Claude discretion for this technical refactoring phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-frontend-component-decomposition*
*Context gathered: 2026-03-23*
