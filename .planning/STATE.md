---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-24T03:48:51.024Z"
progress:
  total_phases: 11
  completed_phases: 3
  total_plans: 19
  completed_plans: 17
---

# Project State: Borealis Supply Chain Management

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** All business documents importable, trackable, and queryable in one place
**Current focus:** Phase 04.1 — pdf

## Current Phase

| Field | Value |
|-------|-------|
| Phase | 04.1 |
| Name | Payment Voucher Upload |
| Status | In Progress |
| Current Plan | 2 of 3 |
| Branch | feature/gsd-04.1-payment-voucher-upload |

## Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1 — Frontend Bug Fixes | ● Complete | 4/4 |
| 2 — Core Feature Implementation | ● Complete | 3/3 |
| 3 — Backend Service Decomposition | ● Complete | 4/4 |
| 4 — Frontend Component Decomposition | ● Complete | 4/4 |
| 5 — Multi-Category Schema + Product CRUD | ○ Not Started | — |
| 6 — Import Strategy Refactor | ○ Not Started | — |
| 7 — Order/Quote Multi-Category Extension | ○ Not Started | — |
| 8 — Frontend Multi-Category Pages | ○ Not Started | — |
| 9 — Contract OCR Skill | ○ Not Started | — |
| 10 — Real Data Testing | ○ Not Started | — |

## Milestone Tracking

| Milestone | Phases | Status |
|-----------|--------|--------|
| M1: Code Remediation | 1-4 | ● Complete (4/4 phases) |
| M2: Feature Expansion + Real Data Testing | 5-10 | ○ Not Started |

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

---
*State initialized: 2026-03-17*
*Last updated: 2026-03-24 (Phase 04.1 Plan 01 complete — PaymentVoucher schema + transactional audit trail + mandatory voucher DTOs, 27 new tests)*
