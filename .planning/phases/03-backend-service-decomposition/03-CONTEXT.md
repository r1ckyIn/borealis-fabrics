# Phase 3: Backend Service Decomposition - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend services decomposed into focused units, test `any` types eliminated with typed mock builders, edge case tests added for path traversal and malformed Excel import. Covers QUAL-01, QUAL-02, QUAL-06, TEST-04, TEST-05. No new features, no frontend changes — pure backend refactoring and test hardening.

</domain>

<decisions>
## Implementation Decisions

### OrderService Decomposition (QUAL-01)
- Split 1121-line OrderService into 3 focused services:
  - **OrderService** (core CRUD): create, findAll, findOne, update, remove, updateAggregateStatus, updateTotalAmount
  - **OrderItemService** (item operations): getOrderItems, addOrderItem, updateOrderItem, removeOrderItem, updateItemStatus, cancelOrderItem, restoreOrderItem, getOrderTimeline, getItemTimeline
  - **OrderPaymentService** (payment operations): updateCustomerPayment, getSupplierPayments, updateSupplierPayment
- Transaction coordination: parent service pattern — OrderItemService returns results, OrderService calls updateAggregateStatus/updateTotalAmount. Sub-services don't know about each other
- Timeline methods stay with OrderItemService — timeline records are tightly coupled to item status changes
- OrderController delegates to the appropriate sub-service; controller itself does not change its public API
- All existing tests must continue passing after decomposition — refactor tests to match new service boundaries

### ImportService Strategy Pattern (QUAL-02)
- Refactor 607-line ImportService using Strategy pattern via NestJS DI
- Create `ImportStrategy` interface with methods: `validate(row)`, `transform(row)`, `getTemplate()`
- Implement `FabricImportStrategy` and `SupplierImportStrategy`
- ImportService becomes orchestrator: file parsing → strategy selection (by file type/header detection) → row-by-row validation + transformation → bulk upsert
- Shared validation logic (required fields, data type checks) stays in base class or utility
- Error aggregation: collect per-row errors, return summary with row numbers and failure reasons
- Strategy selection: auto-detect from Excel column headers (not user-specified parameter)

### Backend Test `any` Elimination (QUAL-06)
- Replace all 11 `as any` casts in backend test files with typed alternatives:
  - `buffer as any` in import tests → proper Buffer typing
  - `'partial' as any` in order tests → use correct enum value or type assertion to specific type
  - `'purchasePrice' as any` / `'supplierName' as any` in fabric tests → use valid enum/string literal types
  - `req as any` in auth controller tests → create typed mock Request object with required properties
- Create shared mock builder utilities in `backend/test/helpers/` for reusable typed mocks (mockRequest, mockResponse, etc.)
- Enable `@typescript-eslint/no-explicit-any` as warning on test files to prevent future `any` introduction

### Path Traversal Edge Case Tests (TEST-04)
- Test file service against path traversal attacks:
  - URL-encoded sequences: `%2e%2e%2f` (../), `%2e%2e/`, `..%2f`
  - Double encoding: `%252e%252e%252f`
  - Unicode normalization: `\u002e\u002e\u002f`, fullwidth characters
  - Null byte injection: `file%00.txt`
  - Windows-style paths: `..\\`, `....//`
- Tests verify that all attacks are rejected or sanitized to safe paths
- Tests target FileService and FileController (both unit and E2E level)

### Malformed Excel Import Tests (TEST-05)
- Test ImportService with edge-case Excel files:
  - Merged cells: header row with merged cells, data rows with merged cells
  - Blank rows: empty rows between data, trailing blank rows
  - Encoding edge cases: mixed UTF-8/GBK content, BOM markers, special characters in cell values
  - Missing required columns: partial headers, swapped columns
  - Numeric precision: floating point prices, currency formatting in cells
  - Extra columns: unexpected columns that should be ignored
- Use ExcelJS to programmatically generate test fixtures (not static files)
- Each edge case has explicit expected behavior (skip row, report error, handle gracefully)

### Claude's Discretion
- Exact method signatures and return types for sub-services
- Mock builder utility API design and naming
- ExcelJS test fixture generation approach
- ESLint rule severity level for `no-explicit-any` on test files
- Whether to use abstract base class or utility functions for shared import validation
- Path traversal test implementation details (unit vs E2E split)
- Transaction isolation level for decomposed services

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/PROJECT.md` — Business context, product categories, numbering systems
- `.planning/REQUIREMENTS.md` — QUAL-01, QUAL-02, QUAL-06, TEST-04, TEST-05 requirement definitions
- `.planning/ROADMAP.md` — Phase 3 success criteria and dependency graph

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Backend layers, data flow, key abstractions
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, error handling, module design
- `.planning/codebase/TESTING.md` — Test patterns, frameworks, configuration

### Key Source Files — OrderService Decomposition
- `backend/src/order/order.service.ts` — 1121-line service to decompose (22 methods)
- `backend/src/order/order.controller.ts` — Controller routing to update after split
- `backend/src/order/order.module.ts` — Module providers to update
- `backend/src/order/order.service.spec.ts` — Tests to refactor (10 `any` occurrences)
- `backend/src/order/order.validators.ts` — Shared validators (keep as-is)
- `backend/src/order/order.includes.ts` — Prisma include definitions (keep as-is)
- `backend/src/order/enums/order-status.enum.ts` — Status machine, transitions, aggregate calculation
- `backend/src/order/dto/` — DTOs used by all three sub-services

### Key Source Files — ImportService Strategy
- `backend/src/import/import.service.ts` — 607-line service to refactor
- `backend/src/import/import.service.spec.ts` — Tests to update (1 `any` occurrence)
- `backend/src/import/import.controller.ts` — Controller (minimal changes expected)
- `backend/src/import/import.module.ts` — Module providers to update with strategies

### Key Source Files — Test `any` Elimination
- `backend/src/auth/auth.controller.spec.ts` — 5 `req as any` casts
- `backend/src/fabric/fabric.service.spec.ts` — 4 `sortBy as any` casts
- `backend/src/order/order.service.spec.ts` — 1 `as any` cast
- `backend/src/import/import.service.spec.ts` — 1 `buffer as any` cast

### Key Source Files — Edge Case Tests
- `backend/src/file/file.service.ts` — File storage service (path validation)
- `backend/src/file/file.controller.ts` — Upload endpoint
- `backend/src/file/storage/` — Storage provider implementations

### Phase 1 & 2 Context
- `.planning/phases/01-frontend-bug-fixes/01-CONTEXT.md` — Error handling patterns
- `.planning/phases/02-core-feature-implementation/02-CONTEXT.md` — StorageProvider, Redis locking patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `order.validators.ts`: Shared validation functions (validateCustomerExists, validateFabricExists, etc.) — keep shared, used by all sub-services
- `order.includes.ts`: Prisma include definitions — keep shared, used by all sub-services
- `order-status.enum.ts`: State machine logic (calculateAggregateStatus, isValidStatusTransition) — keep shared
- `PrismaService.$transaction()`: Available for cross-service transaction coordination
- `RedisService`: Available for distributed locking if needed during decomposition
- `CodeGeneratorService`: Used by OrderService.create() — stays in OrderService

### Established Patterns
- NestJS constructor injection for all service dependencies
- DTO barrel exports from `dto/index.ts`
- Service-level business validation throws HttpException
- Prisma includes defined in separate file for reuse
- E2E tests use minimal module composition (not AppModule)

### Integration Points
- `OrderController` → must delegate to correct sub-service based on route
- `QuoteService.convertToOrder()` → calls OrderService.create() (Phase 2) — no change needed
- `order.service.spec.ts` → must be split into 3 spec files matching new services
- Backend E2E tests for order endpoints → may need provider updates

</code_context>

<specifics>
## Specific Ideas

- User trusts Claude's technical judgment on all architecture/pattern decisions — no business logic in this phase
- All decisions follow best practices; user confirmed "选最佳实践" for all technical choices
- Phase is pure refactoring + test hardening — zero behavior changes to existing functionality

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-backend-service-decomposition*
*Context gathered: 2026-03-23*
