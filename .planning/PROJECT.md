# Borealis Supply Chain Management System

## What This Is

Borealis Fabrics (铂润) is a supply chain management system for a fabric and hardware trading intermediary. Borealis (a subsidiary of Haining U2Living) buys fabrics, iron frames, motors, and hardware from upstream suppliers and sells to downstream furniture manufacturers/brands. The system manages suppliers, customers, quotes, orders, logistics, and document imports. Currently transitioning from a fabric-only system to a multi-category supply chain platform.

## Core Value

All business documents (PO, PI, contracts, delivery notes) can be imported, tracked, and queried in one place, giving the small team (2-5 people) a single source of truth for their trading operations.

## Requirements

### Validated

<!-- Shipped and confirmed working (from existing codebase). -->

- ✓ User authentication via WeChat Work OAuth + JWT HttpOnly cookies — existing
- ✓ Supplier CRUD with search and pagination — existing
- ✓ Customer CRUD with address management (JSON + AddressVO) — existing
- ✓ Fabric CRUD with specifications, pricing, and image upload — existing
- ✓ Quote creation, listing, detail view, and automatic expiration — existing
- ✓ Order management with 9-state machine, item-level tracking, and timelines — existing
- ✓ Logistics tracking management — existing
- ✓ File upload with path validation and MIME type checks — existing
- ✓ Excel import for fabric and supplier data — existing
- ✓ Paginated list endpoints across all modules — existing
- ✓ Security: rate limiting, CSP headers, HSTS, input validation — existing
- ✓ Health check endpoint — existing
- ✓ Frontend: React 18 + Ant Design + TanStack Query + Zustand — existing
- ✓ Backend: NestJS 11 + Prisma + MySQL + Redis — existing
- ✓ Unit tests: 608 backend + 753 frontend — existing
- ✓ E2E tests: 434 backend — existing
- ✓ Mandatory payment voucher upload with append-only audit trail — Validated in Phase 4.1
- ✓ Multi-category product schema (Product, ProductSupplier, ProductBundle, ProductBundleItem) — Validated in Phase 5
- ✓ Product CRUD endpoints with auto code generation (TJ/DJ/CD/PJ/BD prefixes) — Validated in Phase 5
- ✓ Product-supplier associations, customer-specific pricing, product bundles — Validated in Phase 5
- ✓ System enums for ProductCategory and ProductSubCategory with Chinese labels — Validated in Phase 5

### Active

<!-- Current scope: M1 (Code Remediation) + M2 (Feature Expansion + Real Data Testing) -->

**M1: Full Code Remediation**

- [ ] Fix all broken frontend buttons, forms, and API call failures
- [ ] Fix frontend-backend API inconsistencies
- [x] Implement quote-to-order conversion with item-level partial conversion — Validated in Phase 7
- [ ] Migrate file service from local storage to Tencent COS SDK
- [x] Refactor oversized components (FabricDetailPage 815→169L, CustomerDetailPage 703→190L, OrderItemsSection 654→78L) — Validated in Phase 4
- [ ] Refactor oversized services (OrderService 1121L)
- [x] Eliminate `any` types in test files (97 backend, 13 frontend → 0 frontend) — Validated in Phase 3+4
- [ ] Add missing test coverage (quote-to-order flow, COS upload, path traversal edge cases, malformed Excel)
- [x] Fix frontend error handling for unexpected API response formats — Validated in Phase 4 (27 error handling tests)
- [ ] Code quality: naming consistency, deduplication, pattern compliance

**M2: Feature Expansion + Real Data Testing**

- [x] Add product category system (fabric, iron frame, motor, hardware) — Validated in Phase 5
- [x] Iron frame/motor module with model numbers, specifications, and pricing — Validated in Phase 5
- [x] Hardware/accessories module — Validated in Phase 5
- [ ] Expand import templates for new product categories
- [ ] Create `/contract-ocr` Claude Code skill (PDF → Excel extraction)
- [ ] Real data testing: manual entry with actual company documents
- [ ] Real data testing: Excel import with real price lists and purchase orders
- [ ] Real data testing: system stability verification after bulk data import
- [x] Update numbering system for multi-category support (TJ/DJ/CD/PJ/BD prefixes) — Validated in Phase 5

### Out of Scope

- Document generation (PI/PO/delivery notes) — only import and manage, not auto-generate
- Coating/processing as separate category — stored as remarks field
- Mobile app — desktop-first for small team
- Multi-tenant — single company (铂润/U2Living same entity)
- Real-time chat/messaging — not needed for trading workflow
- Automated payment reconciliation — MVP tracks manually, only reminders

## Context

**Business Model:**
- Pure trading intermediary (no manufacturing)
- 铂润 = subsidiary of 海宁优途 U2Living (same entity, different names on documents)
- Trade chain: Upstream suppliers → 铂润 → Furniture manufacturers/brands
- Parent company sends mixed purchase orders (fabric + iron frame + motor), 铂润 manages by category

**Product Categories:**
- Fabrics (面料): Series-based (Lincoln, Point, Perfect Harmony), priced by meter
- Iron Frames (铁架): Model-based (5618-0, U18-111), priced by set
- Motors (电机): Feature-based (一拖一, 一拖二), priced by set
- Hardware (五金): Accessory items (底框, 遥控器, 电源), priced by piece/set
- Mattresses/pads are sub-items under iron frames

**Document Types:**
- PO (Purchase Order): Supplier procurement
- PI (Proforma Invoice): Customer quotation/billing
- IN (Commercial Invoice): Final settlement
- Delivery notes (送货单): Supplier-specific delivery records
- Sales contracts (购销合同): Separated by product category, SH-YYMMDD-NN format
- VAT invoices (增值税发票): Domestic tax records

**Numbering Systems:**
- BF-YYMM-NNNN: Current fabric codes
- ORD-YYMM-NNNN: Order codes
- QT-YYMM-NNNN: Quote codes
- SH-YYMMDD-NN: Sales contract numbers (from documents)
- U-NN-NNN: Factory model numbers (from parent company)
- 5-digit order IDs: Cross-document linking (36658, 77947, etc.)

**Test Materials:** `/Users/qinyuan/Desktop/铂润测试资料/` contains ~30 real business documents covering all document types and product categories.

**Current State:**
- GSD M1 Phase 1 (frontend bug fixes) complete
- GSD M1 Phase 2 (core features) complete
- GSD M1 Phase 3 (backend service decomposition) complete — OrderService split into 3, ImportService uses Strategy pattern, 657 backend tests passing
- GSD M1 Phase 4 (frontend component decomposition) complete — 3 oversized pages decomposed, 897 frontend tests, zero test any types
- M1 (Code Remediation) complete — next is M2 Phase 5
- GSD M2 Phase 5 (multi-category schema + product CRUD) complete — 4 new tables, ProductModule with 18 endpoints, 737 backend tests
- GSD M2 Phase 6 (import strategy refactor) complete — ProductImportStrategy, dry-run for all imports, 784 backend tests
- GSD M2 Phase 7 (order/quote multi-category extension) complete — OrderItem XOR fabric/product, Quote multi-item restructure, item-level partial conversion, 792 backend tests
- Pure local development, not deployed

## Constraints

- **Tech Stack**: NestJS + React + TypeScript + Prisma + MySQL + Redis — existing, no migration
- **Deployment**: Tencent Cloud (lightweight server + CDB + Redis + COS) — after M2 completion
- **Users**: Small team (2-5 people), desktop-only
- **Auth**: Enterprise WeChat OAuth 2.0 — existing, no change
- **Budget**: Tencent Cloud lightweight server tier
- **Backward Compatibility**: Existing test suites must continue passing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| System rename to supply chain management | Adding iron frame/motor/hardware makes "fabric management" inaccurate | — Pending |
| PDF handling via Claude Code skill | OCR → Excel → import is most practical for small team, avoids building complex in-system PDF parser | — Pending |
| Documents import-only, no generation | PI/PO generated by existing tools; system focuses on tracking and querying | — Pending |
| Fix first, expand second (M1 → M2) | Broken features must work before adding new ones | — Pending |
| Coating/processing as remarks | Not a separate product category, just a fabric attribute/note | ✓ Good |
| U2Living = 铂润 in system | Same entity, no need for parent-subsidiary data model | ✓ Good |

---
*Last updated: 2026-03-25 after Phase 7 completion (M2 Phase 7 complete — order/quote multi-category extension with item-level partial conversion)*
