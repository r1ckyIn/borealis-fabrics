# Feature Research

**Domain:** Supply chain trading management system (brownfield remediation + multi-category expansion)
**Researched:** 2026-03-17
**Confidence:** HIGH (based on direct codebase inspection + real business documents review)

---

## Context: Two-Milestone Scope

This feature research covers two sequential milestones:

- **M1: Code Remediation** — Fix what is broken before adding new capabilities
- **M2: Feature Expansion** — Add multi-category product support and real data testing

The distinction matters for feature categorization: some "table stakes" items are already partially
implemented but broken, while others are genuinely absent.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume work. Missing or broken = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Status | Notes |
|---------|--------------|------------|--------|-------|
| Quote-to-order conversion | Core business workflow: quote → approve → order | MEDIUM | Broken (NotImplementedException in quote.service.ts:374) | Frontend button exists, backend throws 501. OrderModule is complete. Fix = implement the 3-step TODO. |
| Working frontend action buttons | Every button on detail pages must work | LOW | Broken (scope TBD from audit) | QuoteDetailPage has convert button wired to a 501 endpoint; other broken buttons need systematic audit |
| Frontend-backend API contract alignment | API response shapes must match frontend expectations | MEDIUM | Broken (inconsistencies identified) | Frontend error handling fails on unexpected response formats; needs systematic comparison |
| File upload via Tencent COS | Production file storage | MEDIUM | Broken (local storage only, TODO comment in file.service.ts:138) | COS SDK integration needed before deployment; local storage blocks production |
| Paginated search across all modules | Basic data retrieval | LOW | Working | All paginated list endpoints exist and pass tests |
| Multi-category product CRUD | Manage iron frames, motors, hardware | HIGH | Missing (only fabric exists) | Zero backend models/tables for the 3 new categories; requires schema + service + controller + frontend |
| Category-aware order items | Orders must reference any product category | HIGH | Missing | Current OrderItem only references Fabric; needs polymorphic product reference |
| Excel import for new categories | Bulk data entry for price lists | MEDIUM | Missing | Import service only handles fabric + supplier; 铁架电机价格2025.xlsx and 面料价格明细2025.xlsx show different column shapes |
| Category-specific pricing units | Fabric=per meter, frame/motor/hardware=per set/piece | LOW | Missing | Pricing unit must be stored per product category; current FabricPricing assumes meters |
| Supplier-product associations for new categories | Link suppliers to frames/motors/hardware | MEDIUM | Missing | FabricSupplier junction table is fabric-specific; needs generalization or parallel tables |

### Differentiators (Competitive Advantage)

Features that give this system its specific value over generic spreadsheets.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Contract OCR skill (PDF → Excel) | Eliminates manual re-entry of PO/PI/IN documents; ~30 real documents on desktop show mixed PDF+Excel formats | MEDIUM | Implemented as Claude Code skill (`/contract-ocr`), not in-system parser; reads PDFs like PI36658.pdf, IN36849.pdf, PO36906.pdf → extracts to importable Excel |
| 9-state order item workflow with timeline | Granular tracking of INQUIRY→COMPLETED per item, with status history | HIGH | Already implemented and working; provides visibility that Excel spreadsheets cannot |
| Automatic quote expiration | Quotes invalidate after validUntil date, preventing stale orders | LOW | Already implemented; small teams forget to expire manually |
| Cross-document order linking | 5-digit order IDs appear across PO/PI/IN/delivery notes (e.g., 36658, 77947); system can link them | MEDIUM | Real documents show this pattern (77947 U19-156 U18-111铁架.xlsx, PO36658.pdf, IN36658.pdf). Implement as document reference field on orders. |
| Mixed-category order support | Parent company sends single POs mixing fabric + iron frame + motor (e.g., 海宁优途-采购单 2026.03.06.xlsx) | HIGH | Critical differentiator for this specific business; pure fabric systems cannot handle this |
| Customer-specific pricing per product | Per-customer price overrides on top of default prices | MEDIUM | Already exists for fabric (CustomerPricing table); needs extending to new categories |
| Numbering system by category | Category-prefixed codes (BF-, IRF-, MOT-, HW-) enable cross-reference queries | LOW | BF-YYMM-NNNN exists for fabric; new prefixes needed for expansion; company must confirm codes |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but add complexity without proportionate value for this team size and use case.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-system PDF generation (PI/PO/contracts) | Automate document creation | Existing Excel/Word templates already work; building equivalent formatting is weeks of effort for 2-5 users; documents have logo, seals, custom formatting | Import-only approach: use Claude Code OCR skill to go PDF → data; generate remains manual |
| Real-time inventory management | Know stock levels | Business model is on-demand procurement (no warehouse, no pre-stock); confirmed in ARCHITECTURE.md "铂润没有自己的仓库" | Track order quantities and shipment status instead |
| Automated payment reconciliation | Auto-match payments to invoices | MVPs need the basic matching; automated bank reconciliation requires bank API integration not worth building for small team | Manual payment status tracking with reminder alerts (already scoped in PROJECT.md) |
| Multi-tenant / parent-company separation | 铂润 vs 海宁优途 U2Living appear as different entities on documents | They are the same entity; confirmed in PROJECT.md "Same entity, no need for parent-subsidiary data model" | Single system with "company alias" display field on documents |
| Mobile app / responsive layout | Access from phone | Team is 2-5 people, desktop-only workflow, no mobile use case identified | Desktop-first React layout is sufficient |
| AI-powered demand forecasting | Predict fabric/frame needs | Insufficient historical data for a small trading intermediary; adds infrastructure complexity | Use order history reports for manual planning |
| Barcode/QR scanning for inventory | Track physical items | No warehouse; products ship supplier→customer directly | Logistics tracking numbers suffice |
| In-system chat / messaging | Replace WeChat messages | WeChat Work is already the communication platform; competing with it is unnecessary | WeChat Work OAuth is the auth mechanism; keep communication there |

---

## Feature Dependencies

```
[Quote-to-order conversion]
    └──requires──> [OrderModule working] (already done)
    └──requires──> [Quote status state machine] (already done)

[Multi-category product CRUD (iron frame / motor / hardware)]
    └──requires──> [Category system / product type enum in schema]
                       └──requires──> [Prisma migration for new tables]

[Category-aware order items]
    └──requires──> [Multi-category product CRUD]
    └──requires──> [Schema: OrderItem.productType + polymorphic productId]

[Excel import for new categories]
    └──requires──> [Multi-category product CRUD] (tables must exist before import)

[Cross-document order linking]
    └──requires──> [Order management working] (already done)
    └──enhances──> [Document import tracking]

[Contract OCR skill]
    └──requires──> [Excel import for new categories] (OCR output must match import templates)
    └──enhances──> [Real data testing] (OCR → import → verify)

[Real data testing]
    └──requires──> [All M1 remediation complete] (broken features give false failures)
    └──requires──> [Multi-category product CRUD] (test materials include iron frame + motor data)
    └──requires──> [COS file upload working] (file uploads needed for complete end-to-end test)

[Tencent COS file upload]
    └──requires──> [COS SDK configuration] (bucket, secret key, region)
    └──blocks──> [Production deployment]

[Frontend buttons working]
    └──requires──> [Systematic API audit] (identify all broken call sites)
    └──requires──> [Quote-to-order backend implementation]
```

### Dependency Notes

- **Multi-category CRUD requires schema first:** All three new product modules (iron frame, motor, hardware) share the same prerequisite of Prisma schema changes. They can be designed in parallel but must migrate together.
- **Real data testing requires M1 complete:** Testing with real documents against a partially broken system creates misleading signal. Remediation must be confirmed passing before real data import.
- **COS blocks production deployment:** The file service has an explicit TODO (file.service.ts:138) saying "Replace with COS SDK in production." Local storage is non-starter for Tencent Cloud deployment.
- **Quote-to-order is self-contained:** The backend TODO (quote.service.ts:370-374) lists exactly 3 steps; OrderModule is complete. This is the lowest-risk broken feature to fix.

---

## MVP Definition

### M1: Launch With (Remediation Complete)

These are the minimum fixes needed before any new features are usable.

- [ ] **Quote-to-order conversion** — Core workflow that currently throws 501; all other quote→order paths depend on this
- [ ] **Frontend button audit and fix** — Systematically identify all broken buttons/forms; fix API call mismatches
- [ ] **Frontend error handling for unexpected API responses** — Prevents silent failures when response shape is wrong
- [ ] **Tencent COS file service** — Required for deployment; currently local-only with explicit TODO
- [ ] **Eliminate `any` types in test files** — 332 instances in backend spec files; blocks reliable type-checking in CI
- [ ] **Refactor oversized components** — FabricDetailPage (769L), CustomerDetailPage (658L), OrderService (1121L); not blocking functionality but create maintenance debt that slows M2 work
- [ ] **Missing test coverage** — quote-to-order flow, COS upload, path traversal edge cases, malformed Excel import

### M2: Add After Remediation (Feature Expansion)

Features to add once the foundation is stable.

- [ ] **Product category system** — `ProductType` enum + per-category tables in Prisma schema
- [ ] **Iron frame module** — Model numbers (U18-111, U19-156, 5618-0), specifications, set pricing, supplier links
- [ ] **Motor module** — Feature-based (一拖一, 一拖二), set pricing, supplier links
- [ ] **Hardware module** — Accessory items (底框, 遥控器, 电源), piece/set pricing
- [ ] **Category-aware order items** — OrderItem references any product type, not just fabric
- [ ] **Excel import for new categories** — Templates matching real price list formats (铁架电机价格2025.xlsx column structure)
- [ ] **Contract OCR Claude Code skill** — PDF → Excel extraction for PO/PI/IN/delivery notes
- [ ] **Numbering system for new categories** — Confirm codes with company, implement BF-/IRF-/MOT-/HW- prefixes
- [ ] **Real data testing** — Manual entry + bulk import using the 36 documents in `/Users/qinyuan/Desktop/铂润测试资料/`
- [ ] **System stability verification** — Load test after bulk import; confirm search/pagination performance

### Future Consideration (v2+)

Defer until after successful deployment and real-world validation.

- [ ] **Cross-document reference linking** — Link order IDs across PO/PI/IN/delivery notes; useful but requires document metadata schema work
- [ ] **Mixed-category order display** — Unified view of orders spanning fabric + frames + motors; depends on category-aware orders working well first
- [ ] **Inventory concept (light)** — Small amount of pre-stock noted in architecture; only add when business actually needs it
- [ ] **Reporting dashboard** — Revenue by category, supplier performance; valuable but needs 6+ months of real data first

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Quote-to-order conversion | HIGH | LOW (3 steps in existing TODO) | P1 |
| Frontend button audit and fix | HIGH | MEDIUM (systematic, not complex) | P1 |
| Tencent COS file service | HIGH (blocks deploy) | MEDIUM (SDK integration) | P1 |
| `any` type elimination in tests | MEDIUM | MEDIUM (332 instances) | P1 |
| Component refactor (769L, 658L, 1121L) | MEDIUM | MEDIUM | P1 |
| Iron frame / motor / hardware CRUD | HIGH | HIGH (3 new modules + schema) | P1 |
| Category-aware order items | HIGH | HIGH (schema change + migration) | P1 |
| Excel import for new categories | HIGH | MEDIUM (extend existing import service) | P1 |
| Contract OCR skill | HIGH | MEDIUM (Claude Code skill, not in-system) | P2 |
| Real data testing + stability | HIGH | LOW (process work, not code) | P2 |
| Numbering system for new categories | MEDIUM | LOW (config change) | P2 |
| Cross-document reference linking | MEDIUM | MEDIUM | P3 |
| Reporting dashboard | MEDIUM | HIGH | P3 |

---

## Domain-Specific Notes

### M1 Audit Approach (NestJS + React Brownfield)

From research and direct codebase inspection, the recommended audit sequence for this specific codebase:

1. **API contract audit first:** Compare each frontend `*.api.ts` file's request/response types against the corresponding backend controller DTOs. The system has 9 API modules; a systematic diff reveals mismatches faster than chasing broken UI.

2. **`any` types in spec files are a coverage risk, not a type safety risk:** The 332 instances in backend spec files mean tests may silently accept wrong shapes. Fix by looking at what each `any` is being used for — most should resolve to the already-typed DTO classes.

3. **Component refactoring before M2:** FabricDetailPage at 769 lines will become even larger if fabric gets category-aware changes. Extract sub-components (image gallery, pricing section, supplier section) before adding category fields.

4. **OrderService (1121L) decomposition:** Extract into focused service units: `OrderStatusService` (state machine logic), `OrderItemService` (item CRUD), `OrderAggregateService` (status aggregation). The existing state machine logic in `order-status.enum.ts` is clean — that pattern should be preserved.

### Multi-Category Product Schema Strategy

From database design research and the real test documents, the recommended approach is **separate tables per category** (not a single polymorphic `products` table):

- **Why:** Each category has fundamentally different attributes. Iron frames have model numbers and mattress sub-items. Motors have channel configurations (一拖一/一拖二). Hardware are accessories. A single table with nullable columns creates maintenance confusion.
- **Pattern:** Shared `ProductCategory` enum, category-specific tables (`IronFrame`, `Motor`, `Hardware`), each with its own supplier junction table and pricing table mirroring the existing `Fabric` model.
- **OrderItem change:** Add `productType: ProductCategory` and make `fabricId` optional, add `ironFrameId?`, `motorId?`, `hardwareId?`. Only one will be non-null per item (enforced at service layer).

### Real Test Materials Analysis

The 36 documents in `/Users/qinyuan/Desktop/铂润测试资料/` reveal the actual data shapes:

| Document Type | Examples | Key Fields |
|---------------|---------|------------|
| Excel price lists — fabric | 面料价格明细2025.8.15.xlsx, 77947...面料.xlsx | Fabric code, name, price per meter |
| Excel price lists — iron frame + motor | 铁架电机价格2025.xlsx, 77947...铁架.xlsx | Model number, spec, price per set |
| Procurement orders (Excel) | 海宁优途-采购单 2026.03.06.xlsx | Mix of fabric + iron frame in same order |
| Sales contracts (Excel) | 购销合同SH20260129-03...xlsx | SH-YYMMDD-NN format, category-separated |
| PO/PI/IN (PDF) | PI36658.pdf, IN36849.pdf, PO36906.pdf | 5-digit order IDs linking documents |
| Delivery notes (XLS) | JZD送货单36849.xls, 铂润 送货单.xls | Supplier-specific formats vary significantly |

The delivery note format varies by supplier — this means the OCR skill must handle multiple input formats, not a single template.

---

## Sources

- Direct codebase inspection: `backend/src/quote/quote.service.ts:370-376` (NotImplementedException)
- Direct codebase inspection: `backend/src/file/file.service.ts:138` (COS TODO comment)
- Direct codebase inspection: `backend/src/order/enums/order-status.enum.ts` (9-state machine)
- Direct codebase inspection: `backend/src/import/import.service.ts` (FABRIC_COLUMNS, SUPPLIER_COLUMNS only)
- Real business documents: `/Users/qinyuan/Desktop/铂润测试资料/` (36 files, all document types)
- Project context: `.planning/PROJECT.md` (validated requirements, out-of-scope list, numbering systems)
- Architecture: `docs/ARCHITECTURE.md` (business model, no-warehouse confirmation)
- NestJS refactoring patterns: [Code Refactoring Best Practices 2025](https://marutitech.medium.com/best-practices-code-refactoring-19c81263ac43) (MEDIUM confidence — WebSearch)
- Multi-category DB design: [Database Schema for Multiple Types of Products](https://www.codingblocks.net/programming/database-schema-for-multiple-types-of-products/) (MEDIUM confidence — WebSearch)
- Trading document management: [VISCO Software Global Trade ERP](https://viscosoftware.com/) (MEDIUM confidence — WebSearch)

---

*Feature research for: Borealis Fabrics supply chain management system (brownfield remediation + multi-category expansion)*
*Researched: 2026-03-17*
