# Codebase Concerns

**Analysis Date:** 2026-03-17

## Tech Debt

**Quote to Order Conversion Not Implemented:**
- Issue: Quote service has incomplete `convertQuoteToOrder()` method that throws `NotImplementedException`
- Files: `backend/src/quote/quote.service.ts` (line 370-376)
- Impact: Users cannot convert quotes to orders through the API; feature is partially stubbed
- Fix approach: Implement the method to create order with items from quote, update quote status to CONVERTED, and add timeline entry. Block is on OrderModule integration - but OrderModule exists and is ready for integration.

**Local File Storage in Production Path:**
- Issue: File service uses local filesystem for MVP (`fs.promises.writeFile`), with TODO comment to replace with COS SDK
- Files: `backend/src/file/file.service.ts` (lines 137-147)
- Impact: Files won't persist on production Tencent Cloud deployment (lightweightcloud server doesn't have shared storage); lost on server restart; no scalability
- Fix approach: Replace local fs operations with COS SDK (Tencent Cloud Object Storage). Test with COS client before deployment. `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION` env vars already defined in security validation.

## Security Considerations

**Type Safety in Test Files (97 occurrences of `any` in backend, 13 in frontend):**
- Risk: `any` type bypasses TypeScript strict type checking; could hide type errors during reviews
- Files: `backend/src/customer/customer.service.spec.ts`, `backend/src/order/order.service.spec.ts`, `backend/src/quote/quote.service.spec.ts`, `backend/src/import/import.service.ts`, `backend/src/fabric/fabric.service.spec.ts`, and others
- Current mitigation: Tests are spec files, not production code; ESLint likely doesn't flag `any` in tests
- Recommendations: Consider `@typescript-eslint/no-explicit-any` rule even in tests, or use `type-safe` patterns (Mock helper functions with proper types)

**HttpOnly Cookie Configuration in Development:**
- Risk: `secure: true` flag disabled in development (cookie sent over HTTP), which differs from production. Could leak tokens if dev environment exposed.
- Current mitigation: Only during development; production enforces `secure: true`
- Recommendations: Use environment-specific configuration (already in place via `NODE_ENV`); document clearly that dev cookies are not secure

## Performance Bottlenecks

**Large Component File Sizes:**
- Problem: Frontend components exceed 500+ lines (FabricDetailPage.tsx 769 lines, CustomerDetailPage.tsx 658 lines, OrderItemsSection.tsx 652 lines)
- Files: `frontend/src/pages/fabrics/FabricDetailPage.tsx` (769 lines), `frontend/src/pages/customers/CustomerDetailPage.tsx` (658 lines), `frontend/src/pages/orders/components/OrderItemsSection.tsx` (652 lines)
- Cause: Multiple UI sections (details, forms, tables, modals) bundled in single file
- Improvement path: Extract sub-components (e.g., DetailHeader, DetailsForm, StatusTimeline as separate files). Consider moving business logic to custom hooks.

**Order Service Complexity (1121 lines):**
- Problem: Order service handles create, update, item management, payment updates, and cancellation
- Files: `backend/src/order/order.service.ts` (1121 lines)
- Cause: High responsibility (order lifecycle + item lifecycle + payment tracking)
- Improvement path: Extract payment logic to separate service (OrderPaymentService), item management to OrderItemService; use composition pattern

## Fragile Areas

**Quote to Order Integration Boundary:**
- Files: `backend/src/quote/quote.service.ts` (lines 370-376), related order APIs
- Why fragile: When quote-to-order conversion is implemented, it bridges quote and order domains with complex state transitions. Missing timeline entry or status inconsistency could break audit trail.
- Safe modification: Add comprehensive integration tests before implementation, mock OrderModule interactions, test all status transitions, ensure timeline captures conversion event
- Test coverage: Currently no test for this method (throws NotImplementedException); needs full E2E test once implemented

**File Service Path Validation:**
- Files: `backend/src/file/file.service.ts` (lines 79-95 path validation function)
- Why fragile: Path traversal protection is security-critical; any bypass could expose arbitrary files on server
- Safe modification: Keep path validation logic separate and well-documented; add explicit unit tests for path traversal attacks (e.g., `../../sensitive`, URL encoding bypass attempts)
- Test coverage: Has unit tests; verify they cover null bytes, encoding tricks, edge cases

**Import Service Excel Parsing (607 lines):**
- Files: `backend/src/import/import.service.ts`
- Why fragile: Excel import is user-facing data ingestion; malformed data or unexpected formats could crash or corrupt database
- Safe modification: Add input validation layer before Prisma calls; test with edge cases (empty rows, null values, type mismatches); ensure transactions roll back on partial failure
- Test coverage: Has `import.service.spec.ts` (577 lines); verify it covers malformed Excel, encoding issues, boundary conditions

## Scaling Limits

**Local File Storage (MVP Limitation):**
- Current capacity: Depends on server disk (lightweightcloud probably 100GB-500GB)
- Limit: Breaks at disk full; single-server failure loses all uploads
- Scaling path: Migrate to COS (already integrated in security model); implement versioning/cleanup policy for old files

**Database Connection Pool:**
- Current capacity: Prisma default connection pool (likely 10-20 concurrent connections per process)
- Limit: Hits connection exhaustion under high concurrency; E2E tests already have testTimeout: 15000 due to pool pressure
- Scaling path: Tune `SHADOW_DATABASE_URL` for migrations; consider connection pooling (PgBouncer or cloud-native pooling); monitor via Redis metrics

**In-Memory Redis Caching:**
- Current capacity: Single Redis instance (likely small cloud instance)
- Limit: Eviction policy may drop important data (OAuth state, token blacklist)
- Scaling path: Monitor cache hit rate; implement TTL strategy; consider Redis cluster if blacklist grows

## Dependencies at Risk

**ExcelJS (`exceljs` package):**
- Risk: Used for import template generation and file parsing; no recent activity noted
- Impact: If security vulnerability found in ExcelJS, affects fabric/supplier import feature
- Migration plan: Keep pinned to tested version; monitor npm advisories; fallback is CSV import format

**Class-Validator TypeScript Strictness:**
- Risk: 97 `any` occurrences in test mocks bypass validation of DTO decorators
- Impact: New DTOs might miss validation rules; discovered only in E2E tests
- Migration plan: Use `@ValidateIf` with proper typing; generate mock DTOs from real types; consider `ts-mockito` for type-safe mocks

## Missing Critical Features

**Quote to Order Conversion API:**
- Problem: Endpoint exists but returns `NotImplementedException`
- Blocks: Users can create quotes but cannot convert to orders through UI; manual workaround needed
- Priority: High (blocks core business process)

**Production File Storage:**
- Problem: File service needs COS SDK integration
- Blocks: Cannot deploy to production; MVP file upload feature unusable in production
- Priority: Critical (blocking Phase 6 deployment)

## Test Coverage Gaps

**Quote to Order Conversion Logic:**
- What's not tested: Complete conversion flow including timeline entry creation, quote status transition
- Files: `backend/src/quote/quote.service.spec.ts` (569 lines - no test for `convertQuoteToOrder`)
- Risk: Hidden bugs in state machine logic; rollback behavior on partial failure
- Priority: High (core business process)

**File Service Production Scenario:**
- What's not tested: COS upload/download (only local fs mocked); signed URL generation; large file handling
- Files: `backend/src/file/file.service.spec.ts` (436 lines - mocks fs, not COS)
- Risk: Upload fails silently in production; no cleanup on partial upload
- Priority: Critical (blocking deployment)

**Path Traversal Edge Cases:**
- What's not tested: URL-encoded traversal (`%2e%2e%2f`), unicode normalization attacks, double-URL encoding
- Files: `backend/src/file/file.service.ts` (path validation function); no comprehensive edge case tests
- Risk: Security bypass in file handling
- Priority: High (security)

**Import Service Malformed Data:**
- What's not tested: Excel files with merged cells, hidden columns, encoding edge cases (non-UTF8)
- Files: `backend/src/import/import.service.spec.ts` (577 lines); likely covers normal paths only
- Risk: Unexpected crash or silent data corruption
- Priority: Medium (data quality)

**Type-Safe Error Handling in Frontend:**
- What's not tested: API error responses with unexpected structure; how mutation `onError` handles various error formats
- Files: `frontend/src` (multiple files using TanStack Query mutations)
- Risk: User-facing errors might fail silently; error messages might be `undefined`
- Priority: Medium (UX)

---

*Concerns audit: 2026-03-17*
