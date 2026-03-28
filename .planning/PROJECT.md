# Borealis Supply Chain Management System

## What This Is

Borealis Fabrics (铂润) is a multi-category supply chain management system for a fabric and hardware trading intermediary. Borealis (a subsidiary of Haining U2Living) buys fabrics, iron frames, motors, and hardware from upstream suppliers and sells to downstream furniture manufacturers/brands. The system manages suppliers, customers, products (4 categories), quotes (multi-item with partial conversion), orders, logistics, payment vouchers, and Excel document imports.

## Core Value

All business documents (PO, PI, contracts, delivery notes) can be imported, tracked, and queried in one place, giving the small team (2-5 people) a single source of truth for their trading operations.

## Requirements

### Validated

- ✓ User authentication via WeChat Work OAuth + JWT HttpOnly cookies — v1.0
- ✓ Supplier CRUD with keyword search and pagination — v1.0
- ✓ Customer CRUD with address management (JSON + AddressVO) — v1.0
- ✓ Fabric CRUD with specifications, pricing, and image upload — v1.0
- ✓ Product CRUD (iron frame/motor/hardware/mattress) with auto code generation — v1.0
- ✓ Product-supplier associations, customer-specific pricing, product bundles — v1.0
- ✓ Quote creation with multi-item model (header + QuoteItem[]) — v1.0
- ✓ Quote partial conversion: select specific items to convert to order — v1.0
- ✓ Order management with 9-state machine, item-level tracking, and timelines — v1.0
- ✓ OrderItem supports fabricId XOR productId (multi-category) — v1.0
- ✓ Logistics tracking management — v1.0
- ✓ Mandatory payment voucher upload with append-only audit trail — v1.0
- ✓ File upload with dual-mode storage (local/COS) and key-only DB storage — v1.0
- ✓ Excel import: 5 strategies (fabric, supplier, product, purchase order, sales contract) — v1.0
- ✓ Import dry-run mode validates without writing to DB — v1.0
- ✓ Per-row import error reporting (row number + reason) — v1.0
- ✓ Frontend: React 18 + Ant Design + TanStack Query + Zustand — v1.0
- ✓ Backend: NestJS 11 + Prisma + MySQL + Redis — v1.0
- ✓ Security: rate limiting, CSP headers, HSTS, input validation — v1.0
- ✓ Chinese error messages via getErrorMessage/getDeleteErrorMessage — v1.0
- ✓ Component decomposition: all oversized pages/services refactored — v1.0
- ✓ Test any types eliminated across all test files — v1.0
- ✓ Real data testing: validated with company documents — v1.0

### Active

#### Current Milestone: v1.1 Production Readiness

**Goal:** Close all engineering gaps and deploy to Tencent Cloud production.

**Infrastructure & Containerization:**
- [ ] Backend + frontend Dockerfiles with production compose
- [ ] Nginx reverse proxy with SSL termination
- [ ] Gzip/Brotli response compression
- [ ] CI/CD deploy stage with automated database migrations

**Data Safety & Integrity:**
- [ ] Database backup/restore automation with retention policy
- [ ] Soft delete (deletedAt) on all business entities
- [ ] Full operation audit logging (who/what/when)
- [ ] Data export to Excel for all entities (fabric, product, supplier, customer, order, quote)

**Observability & Error Handling:**
- [ ] Sentry error tracking integration (backend + frontend)
- [ ] Centralized log aggregation
- [ ] Request correlation ID (tracing across requests)
- [ ] React ErrorBoundary with graceful degradation
- [ ] Slow query logging and profiling

**Performance & Quality:**
- [ ] Redis query result caching with cache-aside pattern
- [ ] Load testing (k6) with baseline benchmarks
- [ ] Dependency security scanning (CI/CD integrated)
- [ ] Web Vitals performance monitoring
- [ ] PWA manifest + Service Worker for basic offline support
- [ ] Accessibility (a11y) baseline improvements

**Production Deployment:**
- [ ] Tencent Cloud deployment (lightweight server + CDB + Redis + COS)
- [ ] COS file migration from localhost URLs
- [ ] Production UAT validation

**Carried from v1.0 (tech debt):**
- [ ] OrderFormPage inline field validation for 400/422 (DEBT-01)
- [ ] Fix operatorId: undefined in OrderPaymentService (DEBT-02)
- [ ] Tune SalesContractImportStrategy for real file formats (DEBT-03)

### Out of Scope

- Document generation (PI/PO/delivery notes) — only import and manage, not auto-generate
- Coating/processing as separate category — stored as remarks field
- Mobile app — desktop-first for small team
- Multi-tenant — single company (铂润/U2Living same entity)
- Real-time chat/messaging — not needed for trading workflow
- Automated payment reconciliation — MVP tracks manually, only reminders
- OCR/AI document reading — user confirmed system does not use AI; all data entered manually via Excel
- Multi-language i18n — Chinese-only for domestic team

## Context

**Shipped v1.0** on 2026-03-28 with 73,271 LOC TypeScript across 12 phases, 40 plans, 306 commits in 58 days.

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

**Test Coverage:**
- Backend: 27+ unit test suites, 11 E2E test suites (434 tests)
- Frontend: 78+ test files, 1000+ tests
- All build / lint / typecheck passing

**Tech Debt (from v1.0 audit):**
- OrderFormPage missing inline field validation (toast-only errors)
- operatorId: undefined in payment service (awaiting auth enhancement)
- SalesContractImportStrategy needs real-file format tuning
- Supplier/Customer entity-level delete has no UI path (intentional MVP decision)

## Constraints

- **Tech Stack**: NestJS + React + TypeScript + Prisma + MySQL + Redis — existing, no migration
- **Deployment**: Tencent Cloud (lightweight server + CDB + Redis + COS) — next milestone
- **Users**: Small team (2-5 people), desktop-only
- **Auth**: Enterprise WeChat OAuth 2.0 — existing, no change
- **Budget**: Tencent Cloud lightweight server tier
- **Backward Compatibility**: Existing test suites must continue passing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix first, expand second (M1 → M2) | Broken features must work before adding new ones | ✓ Good — enabled stable M2 expansion |
| System rename to supply chain management | Adding iron frame/motor/hardware makes "fabric management" inaccurate | ✓ Good |
| Documents import-only, no generation | PI/PO generated by existing tools; system focuses on tracking and querying | ✓ Good |
| Coating/processing as remarks | Not a separate product category, just a fabric attribute/note | ✓ Good |
| U2Living = 铂润 in system | Same entity, no need for parent-subsidiary data model | ✓ Good |
| Strategy pattern for imports | Auto-detect from Excel headers, extensible for new categories | ✓ Good — 5 strategies working |
| OrderService decomposition into 3 services | 1121-line monolith unsustainable, sub-services module-internal | ✓ Good — clean API surface |
| Key-only DB storage with read-time URL generation | Enables storage mode switching without data migration | ✓ Good — ready for COS migration |
| fabricId XOR productId on OrderItem/QuoteItem | DB CHECK + DTO + service-level enforcement | ✓ Good — clean multi-category support |
| Quote multi-item restructure | Header + QuoteItem[] with item-level partial conversion | ✓ Good — flexible conversion workflow |
| Config-driven form fields per product subCategory | Adding new product category only requires new config entry | ✓ Good — extensible |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after v1.1 milestone started*
