# Roadmap: Borealis Supply Chain Management

**Created:** 2026-03-17
**Phases:** 10
**Granularity:** Fine
**Milestones:** M1 (Phases 1-4), M2 (Phases 5-10)

## Phase Overview

| # | Phase | Milestone | Goal | Requirements |
|---|-------|-----------|------|--------------|
| 1 | Frontend Bug Fixes | M1 | 4/4 Complete | BUGF-01~06 |
| 2 | Core Feature Implementation | M1 | Quote-to-order + COS file storage end-to-end | FEAT-01~05, TEST-01~03 |
| 3 | Backend Service Decomposition | M1 | 4/4 Complete | QUAL-01~02, QUAL-06, TEST-04~05 |
| 4 | Frontend Component Decomposition | M1 | 4/4 Complete | QUAL-03~09, TEST-06~07 |
| 4.1 | Payment Voucher Upload | M1+ | Mandatory voucher upload for all payment operations | PVOU-01~08 |
| 5 | Multi-Category Schema + Product CRUD | M2 | Product data model + CRUD for all categories | MCAT-01~04, MCAT-09 |
| 6 | Import Strategy Refactor | M2 | Extensible import + new category templates | MCAT-05~06, DATA-08~09 |
| 7 | Order/Quote Multi-Category Extension | M2 | Orders/quotes support non-fabric products | MCAT-07~08 |
| 8 | Frontend Multi-Category Pages | M2 | Frontend manages all product categories | MCAT-10~12 |
| 9 | Contract OCR Skill | M2 | Chinese PDFs converted to importable Excel | DATA-01~02 |
| 10 | Real Data Testing | M2 | System validated with real company documents | DATA-03~07 |

## Phase Details

### Phase 1: Frontend Bug Fixes

**Goal:** Every existing UI feature works correctly — buttons respond, forms submit, pages load, errors display properly.

**Requirements:** BUGF-01, BUGF-02, BUGF-03, BUGF-04, BUGF-05, BUGF-06

**Plans:** 4/4 plans executed (COMPLETE)

Plans:
- [x] 01-01-PLAN.md — Audit all frontend-backend mismatches + create error message utility
- [x] 01-02-PLAN.md — Fix Supplier + Customer modules (search, errors, loading, empty states)
- [x] 01-03-PLAN.md — Fix Fabric + Quote modules (search, 501 handling, errors, loading)
- [x] 01-04-PLAN.md — Fix Order + Logistics + Import modules (P0 import fix, sub-components)

**Success Criteria:**
1. User clicks any button on any page and sees expected result without console errors
2. User fills and submits any form and data persists to database
3. User browses any list page with working pagination, search, and filtering
4. User opens any detail page and sees all entity fields populated correctly
5. User triggers an error condition and sees user-friendly Chinese message

**Dependencies:** None (standalone)

---

### Phase 2: Core Feature Implementation

**Goal:** Quote-to-order conversion and COS file storage work end-to-end with transaction safety and data migration.

**Requirements:** FEAT-01, FEAT-02, FEAT-03, FEAT-04, FEAT-05, TEST-01, TEST-02, TEST-03

**Plans:** 3 plans

Plans:
- [ ] 02-01-PLAN.md — Quote-to-order conversion backend (Redis lock + Prisma transaction + batch convert)
- [ ] 02-02-PLAN.md — COS storage abstraction layer (StorageProvider interface + dual-mode + FileService refactor)
- [ ] 02-03-PLAN.md — Frontend conversion flow + FabricService URL resolution + migration script

**Success Criteria:**
1. User converts a quote to an order with all items transferred correctly
2. User attempts duplicate conversion and gets clear rejection (409)
3. User uploads a file and it is stored in Tencent COS; download URL works
4. All previously uploaded files still display correctly after COS migration
5. Tests cover quote-to-order (happy + failure + concurrent) and COS upload/download

**Dependencies:** Phase 1 (needs working UI to verify)

---

### Phase 3: Backend Service Decomposition

**Goal:** Backend services decomposed into focused units, test any types eliminated with mock builders, edge case tests added.

**Requirements:** QUAL-01, QUAL-02, QUAL-06, TEST-04, TEST-05

**Plans:** 4/4 plans executed (COMPLETE)

Plans:
- [x] 03-01-PLAN.md — Mock builders + test any elimination + ESLint config (QUAL-06)
- [x] 03-02-PLAN.md — OrderService decomposition into 3 focused services (QUAL-01)
- [x] 03-03-PLAN.md — ImportService strategy pattern refactor (QUAL-02)
- [x] 03-04-PLAN.md — Path traversal + malformed Excel edge case tests (TEST-04, TEST-05)

**Success Criteria:**
1. OrderService decomposed into OrderService + OrderItemService + OrderPaymentService
2. ImportService uses FabricImportStrategy and SupplierImportStrategy via DI
3. ESLint no-explicit-any on backend test files produces zero violations
4. Path traversal edge case tests pass (URL-encoded, unicode normalization, double-encoding)
5. Malformed Excel import tests pass (merged cells, blank rows, encoding edge cases)

**Dependencies:** Phase 2 (needs core features stable)

---

### Phase 4: Frontend Component Decomposition

**Goal:** Frontend components decomposed with custom hooks, test any types eliminated, all existing tests continue passing.

**Requirements:** QUAL-03, QUAL-04, QUAL-05, QUAL-07, QUAL-08, QUAL-09, TEST-06, TEST-07

**Plans:** 4/4 plans executed (COMPLETE)

Plans:
- [x] 04-01-PLAN.md — FabricDetailPage decomposition (useFabricDetail hook + 4 sub-components)
- [x] 04-02-PLAN.md — CustomerDetailPage decomposition (useCustomerDetail hook + 4 sub-components)
- [x] 04-03-PLAN.md — OrderItemsSection decomposition (useOrderItems hook + 3 sub-components)
- [x] 04-04-PLAN.md — Frontend test any elimination + error handling tests

**Success Criteria:**
1. FabricDetailPage, CustomerDetailPage, OrderItemsSection decomposed with max 5 props per sub-component
2. Refactored page components have zero useState calls (all state in custom hooks)
3. Frontend test any types eliminated (2 remaining instances)
4. Frontend error handling tests exist for unexpected API response formats
5. All 608 backend + 808+ frontend tests continue passing

**Dependencies:** Phase 3 (needs backend decomposed first)

---

### Phase 04.1: Mandatory Payment Voucher Upload (INSERTED - URGENT)

**Goal:** Every payment status change (customer and supplier) requires mandatory voucher file upload with audit trail, supporting images/PDF/Office documents, drag-and-drop upload, and file-type-aware preview/download.

**Requirements:** PVOU-01, PVOU-02, PVOU-03, PVOU-04, PVOU-05, PVOU-06, PVOU-07, PVOU-08

**Plans:** 1/3 plans executed

Plans:
- [ ] 04.1-01-PLAN.md — Backend schema (PaymentVoucher) + file constants + DTOs + service + tests
- [ ] 04.1-02-PLAN.md — Frontend types + VoucherUploader + VoucherList components + unit tests
- [ ] 04.1-03-PLAN.md — Frontend integration (OrderPaymentSection wiring + API + hooks + visual checkpoint)

**Success Criteria:**
1. PaymentVoucher table exists with migration, linking PaymentRecord to File
2. All payment status updates require non-empty voucherFileIds (backend 400 + frontend disabled button)
3. PaymentRecord created for every payment operation with voucher association in a single transaction
4. VoucherUploader supports images, PDF, Word, Excel via Upload.Dragger with file validation
5. VoucherList displays historical vouchers with type-aware actions (preview/open/download)
6. Vouchers are append-only (no delete or replace)
7. Customer and supplier vouchers displayed separately in their respective tabs

**Dependencies:** Phase 4 (needs component decomposition complete)

---

### Phase 5: Multi-Category Schema + Product CRUD

**Goal:** Product abstraction schema with CRUD for iron frames, motors, and hardware.

**Requirements:** MCAT-01, MCAT-02, MCAT-03, MCAT-04, MCAT-09

**Success Criteria:**
1. Products table with category enum + specs JSON column, migrated without affecting existing fabrics
2. Iron frame CRUD works with model numbers, specifications, pricing
3. Motor CRUD works with channel configurations and pricing
4. Hardware/accessories CRUD works with specifications and pricing
5. Product codes auto-generated with category-specific prefixes (via CodeGeneratorService)

**Dependencies:** Phase 4 (M1 must be complete before M2 starts)

---

### Phase 6: Import Strategy Refactor

**Goal:** Extensible import system with product category templates, dry-run mode, and per-row error reporting.

**Requirements:** MCAT-05, MCAT-06, DATA-08, DATA-09

**Success Criteria:**
1. Excel import templates exist for each new product category (iron frame, motor, hardware)
2. ProductImportStrategy processes new-category Excel files correctly
3. Import failure shows per-row details (row number + reason for each failure)
4. Dry-run mode validates without writing to DB

**Dependencies:** Phase 5 (needs ProductModule for import strategy)

---

### Phase 7: Order/Quote Multi-Category Extension

**Goal:** Orders and quotes support non-fabric products alongside existing fabric items.

**Requirements:** MCAT-07, MCAT-08

**Success Criteria:**
1. User can add non-fabric products as order items alongside fabric items
2. OrderItem enforces exactly-one product reference (fabricId XOR productId)
3. Quotes support non-fabric products with correct pricing and units

**Dependencies:** Phase 5 (needs products table for FK)

---

### Phase 8: Frontend Multi-Category Pages

**Goal:** Frontend displays and manages all product categories with category-specific UI.

**Requirements:** MCAT-10, MCAT-11, MCAT-12

**Success Criteria:**
1. Product list page with category filter shows all products
2. Product detail/edit pages render category-specific form fields
3. Order form supports selecting products from any category

**Dependencies:** Phase 7 (needs all backend endpoints ready)

---

### Phase 9: Contract OCR Skill

**Goal:** Claude Code skill that reads Chinese business PDFs and outputs importable Excel.

**Requirements:** DATA-01, DATA-02

**Success Criteria:**
1. `/contract-ocr` on a Chinese PI/PO/contract PDF produces Excel matching import template format
2. OCR handles Chinese business document formats (stamps, merged cells, mixed fonts, tables)

**Dependencies:** Phase 6 (needs finalized import templates)

---

### Phase 10: Real Data Testing

**Goal:** System validated end-to-end with real company documents from `/Users/qinyuan/Desktop/铂润测试资料/`.

**Requirements:** DATA-03, DATA-04, DATA-05, DATA-06, DATA-07

**Success Criteria:**
1. Manual entry of complete supplier-customer-product-quote-order chain with real data succeeds
2. Real fabric price list (面料价格明细2025.8.15.xlsx) imports with correct data
3. Real iron frame/motor price list (铁架电机价格2025.xlsx) imports correctly
4. Real purchase order (海宁优途-采购单) imports with correct order items
5. All pages load correctly after bulk data import — no broken links, no missing data

**Dependencies:** Phases 8 + 9 (needs everything working)

---

## Dependency Graph

```
Phase 1 (standalone — M1 start)
  └→ Phase 2 (needs working UI)
      └→ Phase 3 (needs core features stable)
          └→ Phase 4 (needs backend decomposed) — M1 complete
              ├→ Phase 04.1 (urgent: payment voucher upload)
              └→ Phase 5 (M2 start — schema + CRUD)
                  ├→ Phase 6 (import strategy — can parallel with 7)
                  │   └→ Phase 9 (OCR needs import templates)
                  └→ Phase 7 (order/quote extension)
                      └→ Phase 8 (frontend pages)
                          └→ Phase 10 (real data testing — needs all)
```

## Coverage

| Category | Count | Mapped |
|----------|-------|--------|
| Bug Fix (BUGF) | 6 | 6 |
| Core Feature (FEAT) | 5 | 5 |
| Code Quality (QUAL) | 9 | 9 |
| Test Coverage (TEST) | 7 | 7 |
| Payment Voucher (PVOU) | 8 | 8 |
| Multi-Category (MCAT) | 12 | 12 |
| OCR & Data (DATA) | 9 | 9 |
| **Total** | **56** | **56** |

Unmapped: 0

---
*Roadmap created: 2026-03-17*
*Last updated: 2026-03-24 (Phase 04.1 planned — 3 plans, 2 waves)*
