# Phase 1: Frontend Bug Fixes - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all existing frontend UI bugs so every feature works correctly: buttons respond, forms submit, pages load, detail pages display complete data, API calls match backend endpoints, and error messages show user-friendly Chinese text. Also fix loading states, empty states, and UX issues for a polished experience. No new features — only fix what exists.

</domain>

<decisions>
## Implementation Decisions

### Bug Discovery & Prioritization
- Full audit before fixing: agent scans all frontend pages + backend API endpoints, outputs comprehensive bug list before any fixes begin
- Audit scope covers both frontend and backend: compare frontend API calls with actual backend endpoint signatures to find all mismatches
- Fix order follows business flow: Supplier → Customer → Fabric → Quote → Order → Logistics → Import
- Audit report format: each bug includes ID, severity (P0/P1/P2), module, page, description, root cause analysis, affected files, and suggested fix approach
- Severity levels: P0 = completely broken (page crash, data loss), P1 = feature abnormal but has workaround (button unresponsive, wrong display), P2 = experience issue (missing loading state, unfriendly error message)
- Audit report output: `.planning/phases/01-frontend-bug-fixes/01-AUDIT.md`

### API Mismatch Resolution
- Direction: case-by-case — fix backend when backend is clearly wrong, frontend adapts otherwise
- Backend modification scope: all layers allowed (Controller, DTO, Service, Prisma schema)
- Database migrations allowed: local development stage, schema change risk is low
- When backend changes break existing tests: synchronize test updates in the same commit
- API contract: define unified specification first, then both frontend and backend converge toward the spec
- Specification approach: audit phase outputs a diff report showing all frontend-backend discrepancies, then defines unified API response format (e.g., all paginated endpoints return `{ items, total, page, pageSize }`)
- API path convention: RESTful resource nesting (e.g., `POST /quotes/:id/convert-to-order`, `GET /orders/:id/items`)

### Error Message Display Strategy
- Business operation errors (delete failed, submit failed): `message.error()` toast notification
- Form validation errors from backend: inline display on corresponding field via `form.setFields()`
- Network/server errors (500, timeout, service unavailable): toast notification + error page combined (API call failure uses toast, full page load failure uses error page with retry button)
- Chinese message approach: hybrid — backend returns `{ code, message }` where code is an error code (e.g., `CUSTOMER_HAS_ORDERS`) and message is Chinese text. Frontend maintains an error code mapping table; looks up code first, falls back to backend message field if code not found
- Existing ErrorBoundary component is available for page-level crashes

### Fix Verification Standard
- Every bug fix must pass: build + test + lint (full green)
- Every bug fix must include comprehensive regression tests: both happy path and error path coverage
- Test location: follows existing structure — frontend tests in `__tests__/` directories, backend tests in `.spec.ts` files
- Commit granularity: one bug = one commit (fix + regression tests together)
- Test modification commits: must include reason in commit message (e.g., `test: update supplier API mock to match new response format`)
- Existing test maintenance: analyze test intent — if test validates old incorrect behavior, update test; if test validates correct behavior, fix code

### Frontend-Backend Verification
- Backend: Claude runs automated tests (unit + E2E)
- Frontend: user manually verifies in browser after each module is fixed
- Verification cadence: per module (fix supplier → user verifies → fix customer → user verifies...)
- Follow GSD fusion workflow: use `/gsd:verify-work` standard process for phase-level verification

### Performance & UX
- Bug scope: comprehensive — functional bugs + UX issues + loading states + empty states all included
- Loading states: every async operation must have visible loading/disabled state (list loading, detail loading, form submission, delete confirmation)
- Empty states: Ant Design Empty component + action guidance button (e.g., "新建供应商" on empty supplier list)
- Existing LoadingSpinner component is available

### Claude's Discretion
- Specific implementation details for error code mapping table structure
- Exact loading spinner/skeleton placement per page
- Audit report internal organization beyond the defined fields
- Order of fixing bugs within each module
- Whether to use Skeleton or Spinner for specific loading scenarios

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/PROJECT.md` — Business context, product categories, document types, numbering systems
- `.planning/REQUIREMENTS.md` — BUGF-01~06 requirements defining what "fixed" means
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependency graph

### Existing Documentation
- `docs/ARCHITECTURE.md` — Business architecture, API specifications, module relationships
- `docs/SECURITY.md` — Authentication flow, CSP, rate limiting, input validation
- `docs/reference/backend-types-reference.md` — Backend API types, enums, entity structures
- `docs/design/frontend-design-doc.md` — Frontend architecture design

### Key Source Files
- `frontend/src/api/client.ts` — API client with interceptors, error handling pattern
- `frontend/src/utils/constants.ts` — API_BASE_URL = `/api/v1`, pagination defaults
- `frontend/src/components/common/ErrorBoundary.tsx` — Existing error boundary component
- `frontend/src/components/common/LoadingSpinner.tsx` — Existing loading component

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LoadingSpinner` component: available for all async loading states
- `ErrorBoundary` component: catches page-level React errors
- `StatusTag` + `statusTagHelpers`: status display for entities
- `ConfirmModal`: delete confirmation dialogs
- `SearchForm`: reusable search component for list pages
- `AmountDisplay`: currency formatting
- `message` from Ant Design: already used for success/error toasts in many pages
- TanStack Query hooks (`useCustomers`, `useOrders`, `useQuotes`, etc.): data fetching with built-in loading/error states

### Established Patterns
- API client unwraps `ApiResponse<T>` in interceptor — consumers receive data directly
- 401 responses trigger redirect to login page
- Chinese success/error messages already used in some pages (CustomerFormPage, ImportPage)
- Form pages follow pattern: useParams for ID, create/edit mode toggle, onFinish handler
- List pages follow pattern: search form + table + pagination + delete with confirmation

### Integration Points
- `frontend/src/api/*.api.ts` — API service layer (one file per module)
- `frontend/src/hooks/queries/*.ts` — TanStack Query hooks per module
- `frontend/src/types/*.types.ts` — Shared type definitions
- Backend controllers in `backend/src/modules/*/` — endpoint definitions to compare against

</code_context>

<specifics>
## Specific Ideas

- User wants the most standardized, comprehensive best practices across all aspects
- API paths should follow RESTful resource nesting convention (e.g., `/quotes/:id/convert-to-order`)
- Error handling follows a layered approach: toast for operations, inline for forms, error page for fatal failures
- Audit must be thorough: every page, every button, every API call checked before any fix begins
- One bug = one atomic commit with full regression test coverage

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-frontend-bug-fixes*
*Context gathered: 2026-03-17*
