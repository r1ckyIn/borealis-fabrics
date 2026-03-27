---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Executing Phase 09
last_updated: "2026-03-27T07:00:25.618Z"
progress:
  total_phases: 10
  completed_phases: 8
  total_plans: 36
  completed_plans: 33
---

# Project State: Borealis Supply Chain Management

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** All business documents importable, trackable, and queryable in one place
**Current focus:** Phase 09 — real-data-testing

## Current Phase

| Field | Value |
|-------|-------|
| Phase | 09 |
| Name | Real Data Testing |
| Status | In Progress |
| Current Plan | 3 of 3 |
| Branch | main |

## Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1 — Frontend Bug Fixes | ● Complete | 4/4 |
| 2 — Core Feature Implementation | ● Complete | 3/3 |
| 3 — Backend Service Decomposition | ● Complete | 4/4 |
| 4 — Frontend Component Decomposition | ● Complete | 4/4 |
| 5 — Multi-Category Schema + Product CRUD | ● Complete | 2/2 |
| 6 — Import Strategy Refactor | ● Complete | 2/2 |
| 7 — Order/Quote Multi-Category Extension | ● Complete | 3/3 |
| 8 — Frontend Multi-Category Pages | ● Complete | 5/5 |
| 9 — Real Data Testing | ◆ In Progress | 2/3 |

## Milestone Tracking

| Milestone | Phases | Status |
|-----------|--------|--------|
| M1: Code Remediation | 1-4 | ● Complete (4/4 phases) |
| M2: Feature Expansion + Real Data Testing | 5-10 | ◆ In Progress (3/6 phases) |

## Key Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-17 | Fine granularity (10 phases) | Complex brownfield remediation + multi-category expansion |
| 2026-03-17 | M1 before M2 | Fix broken features before adding new ones |
| 2026-03-17 | PDF via Claude Code skill | /contract-ocr, not in-system PDF parser |
| 2026-03-17 | Documents import-only | No PI/PO generation |
| 2026-03-19 | Error code resolution: ERROR_CODE_MESSAGES > HTTP_STATUS > raw message > fallback | Standard pattern for all error display |
| 2026-03-19 | Add keyword to backend DTOs (not rename frontend fields) | Better UX with unified search |
| 2026-03-19 | Auth controller prefix fix = P2 | Works via Vite proxy, consistency only |
| 2026-03-19 | Form.useForm() at page level, pass to form component | Enables setFields() for inline validation from error handler |
| 2026-03-19 | parseFieldError via prefix matching of field names | Simple but effective for NestJS class-validator messages |
| 2026-03-19 | Backend keyword OR-based search (not LIKE concat) | Better readability and maintainability with Prisma |
| 2026-03-19 | 501 uses message.warning() not message.error() | Indicates "not yet available" vs "something broke" |
| 2026-03-22 | Controller prefix: @Controller('entity') + setGlobalPrefix | Double-prefix bug found during user verification |
| 2026-03-22 | List pages view-only: no edit/delete buttons | Simplify UX, operations via detail page |
| 2026-03-22 | Pre-existing quote.service.spec.ts date failure is out of scope | Hardcoded date now in the past, not caused by plan 04 |
| 2026-03-23 | Redis SET NX EX via call() not set() | Avoid ioredis TypeScript overload issue #1811 |
| 2026-03-23 | Order items from quotes use PENDING status (not INQUIRY) | Conversion implies customer intent beyond inquiry |
| 2026-03-23 | Sorted lock acquisition to prevent deadlocks | Standard distributed locking pattern |
| 2026-03-23 | Supplier auto-fill from FabricSupplier cheapest price | Nullable when no supplier relationship exists |
| 2026-03-23 | StorageProvider 3-method interface (upload/getUrl/delete) | Minimal contract for dual-mode storage |
| 2026-03-23 | Key-only DB storage, URL at read-time | Enables storage mode switching without data migration |
| 2026-03-23 | STORAGE_MODE defaults to 'local' | Dev-friendly, no COS credentials needed in dev |
| 2026-03-23 | FabricImage.url stores key-only, resolved at read-time | Consistent with File table pattern from Plan 02 |
| 2026-03-23 | findOne includes images with resolved URLs | Frontend FabricDetailPage expects images on fabric object |
| 2026-03-23 | Migration script uses DRY_RUN + per-image error recovery | Safe one-time data migration pattern |
| 2026-03-23 | createMockAuthRequest returns AuthenticatedRequest via internal cast | Centralizes type cast in builder, eliminates any from test call sites |
| 2026-03-23 | ESLint no-explicit-any warn on *.spec.ts | Prevents future any regression in test files |
| 2026-03-23 | Strategy auto-detected from Excel column headers, not user-specified | Simplifies orchestrator, both import methods become thin wrappers |
| 2026-03-23 | Direct DI injection for strategies (concrete class, not token-based) | Simpler for 2-strategy setup, sufficient until more strategies added |
| 2026-03-23 | Sub-services module-internal (not exported from OrderModule) | Only controller needs them; QuoteModule still imports OrderService |
| 2026-03-23 | Controller delegates to sub-services, public API unchanged | Zero-impact decomposition, E2E compatibility preserved |
| 2026-03-23 | Hook named useOrderItemsSection (not useOrderItems) | Avoids collision with existing TanStack Query data-fetching hook |
| 2026-03-23 | StatusActionControl grouped interface for status/cancel/restore | Clean prop passing pattern for complex modal state |
| 2026-03-23 | Declaration merging for ResizeObserver polyfill (not globalThis as any) | Type-safe jsdom polyfill pattern |
| 2026-03-23 | PaginatedResult<never> for empty collections (not <any>) | never[] assignable to any T[] |
| 2026-03-23 | ModalControl includes searchFn + contextual data | searchSuppliers in SupplierModalControl, searchCustomers + defaultPrice in PricingModalControl keeps sub-component props at max 5 |
| 2026-03-23 | useFabricDetail takes navigate as parameter (not useNavigate internally) | Keeps hook testable without router context |
| 2026-03-23 | PricingModalControl typed interface for pricing modal state | Avoids 10+ individual props, groups form + handlers + searchFabrics |
| 2026-03-23 | CustomerBasicInfo single prop (customer) | Edit/delete buttons in page header, not in info tab |
| 2026-03-23 | Address tab read-only display (not AddressManager wrap) | Addresses are inline JSON on Customer entity, not separate CRUD |
| 2026-03-24 | voucherFileIds optional in frontend form types | Backward compatible with existing OrderPaymentSection until Plan 03 wires it |
| 2026-03-24 | Ant Design Image: open/onOpenChange (not visible/onVisibleChange) | Use current API, avoid deprecation warnings |
| 2026-03-24 | PaymentVoucher atomic audit trail in $transaction | PaymentRecord + PaymentVouchers created atomically for all payment ops |
| 2026-03-24 | FileController shared constants from file.constants.ts | Deduplicated local MIME types to use centralized constants |
| 2026-03-24 | VoucherUploader state via external useState (not Form.Item name) | Enables save button disable logic outside Ant Design form validation |
| 2026-03-24 | PaymentVoucher type exported from barrel index | Consumer convenience for type imports |
| 2026-03-24 | String columns for category/subCategory (not Prisma enum) | Consistent with project convention, avoids DDL per enum change |
| 2026-03-24 | Non-null assertion on fabricId in FabricPricingItem | Fabric pricing always has fabricId; nullable change only affects product pricing rows |
| 2026-03-24 | ProductModule uses global CommonModule (no explicit import) | CommonModule is @Global, CodeGeneratorService available via DI without module import |
| 2026-03-24 | Bundle routes before :id routes in ProductController | Prevents NestJS parsing "bundles" as numeric ID parameter |
| 2026-03-25 | Composite key separator :: for modelNumber+name dedup | Avoids collision with common characters in product names |
| 2026-03-25 | DB duplicates reported as failures (not skips) for product import | Per user decision — products should fail, not silently skip |
| 2026-03-25 | Supplier map pre-loaded in getExistingKeys() lifecycle | Follows existing call pattern; getExistingKeys() called once before validateRow() |
| 2026-03-25 | Dry-run at importData level with single !dryRun conditional | All strategies benefit automatically, minimal code change |
| 2026-03-25 | dryRun defaults to false via DefaultValuePipe | Backward compatible, no breaking changes to existing API consumers |
| 2026-03-25 | NoAction FK for fabricId/productId on OrderItem/QuoteItem | MySQL CHECK constraint incompatible with SET NULL/CASCADE FK action |
| 2026-03-25 | IsIntegerWhenFieldPresent custom decorator (not dual @ValidateIf) | class-validator AND-logic on same property prevents dual validation groups |
| 2026-03-25 | Single migration with inline data migration SQL for quote restructure | Move existing quote fabricId/quantity/unitPrice to QuoteItem before dropping columns |
| 2026-03-25 | IsIntegerWhenFieldPresent reused for quote item validation | Consistent with OrderItem pattern, avoids dual @ValidateIf issue |
| 2026-03-25 | Quote update allows only validUntil + notes; items via dedicated endpoints | Separation of header vs item management |
| 2026-03-25 | PARTIALLY_CONVERTED status allowed for update and delete operations | Partially converted quotes still editable |
| 2026-03-25 | OrderWithItems local type alias for strict TS typing of included relations | Order + items relation from Prisma create/findUniqueOrThrow |
| 2026-03-25 | Validations before Redis lock in convertQuoteItems | Fail fast, avoid unnecessary lock acquisition |
| 2026-03-25 | Timeline remark 'Converted from quote item' | Distinguishes from direct order creation |
| 2026-03-25 | Sidebar SubMenu computed openKeys via useMemo (not useEffect+setState) | Satisfies React Compiler lint rule against synchronous setState in effects |
| 2026-03-25 | All /fabrics/ routes moved to /products/fabrics/ with redirects | Clean URL structure, backward compatible |
| 2026-03-25 | Placeholder product pages as stubs for Plan 02 | Routes resolve immediately, no build errors |
| 2026-03-25 | Temporary type casts on existing quote pages for Quote model migration | Pages will be rewritten in Plan 03-04, no point fixing now |
| 2026-03-25 | Composite value format (fabric:N/product:N) for unified selector | Avoids ID collisions between fabric and product entities |
| 2026-03-25 | PaginationParams sortBy+sortOrder to fetch cheapest supplier in single API call | Efficient lowest-price supplier resolution per item |
| 2026-03-25 | Hidden Form.Items pattern for derived form values (fabricId, productId, unit) | Ensures derived values included in form submission |
| 2026-03-25 | Self-contained tab components with inline TanStack Query hooks (not monolith hook) | Simpler for products without image gallery tab |
| 2026-03-25 | Config-driven SPEC_FIELDS record per subCategory for dynamic form rendering | Adding new product category only requires new config entry |
| 2026-03-25 | Column composition: BASE + CATEGORY_COLUMNS[subCategory] + TAIL concatenated | Clean column switching without per-category JSX |
| 2026-03-25 | Quote edit mode header-only; items managed on detail page | Matches OrderForm pattern, avoids complex item sync on edit |
| 2026-03-25 | Conversion UI shown for ACTIVE and PARTIALLY_CONVERTED only | Fully CONVERTED quotes hide checkboxes and convert button |
| 2026-03-25 | Modal.confirm for conversion action (not ConfirmModal) | Supports async onOk pattern for mutation + navigation |
| 2026-03-27 | RichText header extraction via richText.map(rt.text).join('') in detectStrategy | Real business Excel files use bold/formatted headers |
| 2026-03-27 | Supplier abbreviation mapping hardcoded in scripts (not DB lookup) | One-time conversion, no need for dynamic resolution |
| 2026-03-27 | Product subCategory inferred from name keywords | Avoids manual classification for 172 products |
| 2026-03-27 | Self-customer pattern for PO import (铂润面料 as customerId) | Order requires customerId but POs are TO suppliers |
| 2026-03-27 | Single SalesContractImportStrategy for 8 files (购销合同+客户订单) | Same template layout per RESEARCH.md analysis |
| 2026-03-27 | importNonStandardData() with headerRowNumber parameter | Reusable for any non-standard Excel layout |

## Accumulated Context

### Roadmap Evolution

- Phase 04.1 inserted after Phase 04: 付款凭证强制上传 — 所有付款状态变更必须上传凭证文件（图片/PDF），支持多文件、拖拽上传、预览/下载/重新上传 (URGENT)

## Session Log

| Date | Session | Stopped At | Resume |
|------|---------|------------|--------|
| 2026-03-17 | Phase 1 discuss | Context gathered | `.planning/phases/01-frontend-bug-fixes/01-CONTEXT.md` |
| 2026-03-19 | Phase 1 Plan 01 | Completed 01-01-PLAN.md | `.planning/phases/01-frontend-bug-fixes/01-01-SUMMARY.md` |
| 2026-03-19 | Phase 1 Plan 02 | Completed 01-02-PLAN.md | `.planning/phases/01-frontend-bug-fixes/01-02-SUMMARY.md` |
| 2026-03-19 | Phase 1 Plan 03 | Completed 01-03-PLAN.md | `.planning/phases/01-frontend-bug-fixes/01-03-SUMMARY.md` |
| 2026-03-22 | Phase 1 Plan 04 | Completed 01-04-PLAN.md | `.planning/phases/01-frontend-bug-fixes/01-04-SUMMARY.md` |
| 2026-03-23 | Phase 2 Plan 01 | Completed 02-01-PLAN.md | `.planning/phases/02-core-feature-implementation/02-01-SUMMARY.md` |
| 2026-03-23 | Phase 2 Plan 02 | Completed 02-02-PLAN.md | `.planning/phases/02-core-feature-implementation/02-02-SUMMARY.md` |
| 2026-03-23 | Phase 2 Plan 03 | Complete | `.planning/phases/02-core-feature-implementation/` |
| 2026-03-23 | Phase 3 Plan 01 | Completed 03-01-PLAN.md | `.planning/phases/03-backend-service-decomposition/03-01-SUMMARY.md` |
| 2026-03-23 | Phase 3 Plan 02 | Completed 03-02-PLAN.md | `.planning/phases/03-backend-service-decomposition/03-02-SUMMARY.md` |
| 2026-03-23 | Phase 3 Plan 03 | Completed 03-03-PLAN.md | `.planning/phases/03-backend-service-decomposition/03-03-SUMMARY.md` |
| 2026-03-23 | Phase 3 Plan 04 | Completed 03-04-PLAN.md | `.planning/phases/03-backend-service-decomposition/03-04-SUMMARY.md` |
| 2026-03-23 | Phase 4 Plan 03 | Completed 04-03-PLAN.md | `.planning/phases/04-frontend-component-decomposition/04-03-SUMMARY.md` |
| 2026-03-23 | Phase 4 Plan 04 | Completed 04-04-PLAN.md | `.planning/phases/04-frontend-component-decomposition/04-04-SUMMARY.md` |
| 2026-03-23 | Phase 4 Plan 01 | Completed 04-01-PLAN.md | `.planning/phases/04-frontend-component-decomposition/04-01-SUMMARY.md` |
| 2026-03-23 | Phase 4 Plan 02 | Completed 04-02-PLAN.md | `.planning/phases/04-frontend-component-decomposition/04-02-SUMMARY.md` |
| 2026-03-24 | Phase 04.1 Plan 01 | Completed 04.1-01-PLAN.md | `.planning/phases/04.1-pdf/04.1-01-SUMMARY.md` |
| 2026-03-24 | Phase 04.1 Plan 02 | Completed 04.1-02-PLAN.md | `.planning/phases/04.1-pdf/04.1-02-SUMMARY.md` |
| 2026-03-24 | Phase 04.1 Plan 03 | Completed 04.1-03-PLAN.md | `.planning/phases/04.1-pdf/04.1-03-SUMMARY.md` |
| 2026-03-24 | Phase 05 Plan 01 | Completed 05-01-PLAN.md | `.planning/phases/05-multi-category-schema-product-crud/05-01-SUMMARY.md` |
| 2026-03-24 | Phase 05 Plan 02 | Completed 05-02-PLAN.md | `.planning/phases/05-multi-category-schema-product-crud/05-02-SUMMARY.md` |
| 2026-03-25 | Phase 06 Plan 01 | Completed 06-01-PLAN.md | `.planning/phases/06-import-strategy-refactor/06-01-SUMMARY.md` |
| 2026-03-25 | Phase 06 Plan 02 | Completed 06-02-PLAN.md | `.planning/phases/06-import-strategy-refactor/06-02-SUMMARY.md` |
| 2026-03-25 | Phase 07 Plan 01 | Completed 07-01-PLAN.md | `.planning/phases/07-order-quote-multi-category-extension/07-01-SUMMARY.md` |
| 2026-03-25 | Phase 07 Plan 02 | Completed 07-02-PLAN.md | `.planning/phases/07-order-quote-multi-category-extension/07-02-SUMMARY.md` |
| 2026-03-25 | Phase 07 Plan 03 | Completed 07-03-PLAN.md | `.planning/phases/07-order-quote-multi-category-extension/07-03-SUMMARY.md` |
| 2026-03-25 | Phase 08 Plan 01 | Completed 08-01-PLAN.md | `.planning/phases/08-frontend-multi-category-pages/08-01-SUMMARY.md` |
| 2026-03-25 | Phase 08 Plan 02 | Completed 08-02-PLAN.md | `.planning/phases/08-frontend-multi-category-pages/08-02-SUMMARY.md` |
| 2026-03-25 | Phase 08 Plan 03 | Completed 08-03-PLAN.md | `.planning/phases/08-frontend-multi-category-pages/08-03-SUMMARY.md` |
| 2026-03-25 | Phase 08 Plan 04 | Completed 08-04-PLAN.md | `.planning/phases/08-frontend-multi-category-pages/08-04-SUMMARY.md` |
| 2026-03-27 | Phase 09 Plan 01 | Completed 09-01-PLAN.md | `.planning/phases/09-real-data-testing/09-01-SUMMARY.md` |
| 2026-03-27 | Phase 09 Plan 02 | Completed 09-02-PLAN.md | `.planning/phases/09-real-data-testing/09-02-SUMMARY.md` |
| 2026-03-27 | Phase 09 Plan 03 | Checkpoint: Task 3 (user verify imported data) | Tasks 1-2 complete: 60f2ed4, b3e263f |

---
*State initialized: 2026-03-17*
*Last updated: 2026-03-27 (Phase 09 Plan 03 Tasks 1-2 complete — 13 xlsx files imported, 12/12 page stability checks pass, awaiting user UI verification)*
