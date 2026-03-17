# Project Research Summary

**Project:** Borealis Fabrics — 铂润面料数字化管理系统
**Domain:** Brownfield supply chain trading management system — multi-category product expansion + code remediation
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

Borealis Fabrics is an existing NestJS 11 + React 18 + Prisma 6 + MySQL 8 supply chain management system for a fabric trading intermediary that is expanding to manage three new product categories (iron frames, motors, hardware) alongside the existing fabric module. The system has a solid foundation but carries specific technical debt that must be cleared before new capabilities can be added reliably: a quote-to-order conversion endpoint that throws 501, a file service wired to local storage instead of Tencent COS, 97 `any` types in backend test files that mask incorrect mock shapes, and three oversized components (OrderService at 1121L, FabricDetailPage at 769L, OrderService has already been split) that will become blockers when M2 features are added to them.

The recommended approach is a strict two-milestone sequence: M1 (code remediation) must complete and pass all tests before M2 (multi-category expansion) begins. Within M2, the architecture recommendation is to keep FabricModule intact and add a separate ProductModule with a single `products` table using a `category` enum + `specs` JSON column for category-specific attributes — this avoids the 3x module duplication that full Class Table Inheritance would require, while keeping fabric domain logic free of contamination. The OrderItem polymorphic FK pattern (nullable `fabricId` and nullable `productId`, exactly one set per row) is the clean way to support multi-category orders without a schema rewrite mid-feature.

The primary risk is starting M2 before M1 is proven stable. Real business documents (36 files including Chinese PDFs, mixed Excel formats, and multi-category purchase orders) will expose remaining gaps in the import service that synthetic tests cannot catch. The Contract OCR skill (Claude API native PDF support via `@anthropic-ai/sdk`) is the correct technology for processing these documents — Tesseract.js has unacceptable accuracy on Chinese business PDFs and requires image preprocessing that Claude handles natively. COS migration must include a data migration strategy for existing localhost URL records, not just SDK integration.

---

## Key Findings

### Recommended Stack

The existing stack requires only two new production dependencies. `cos-nodejs-sdk-v5@2.15.4` is needed in the NestJS backend to replace the local file storage stub. `@anthropic-ai/sdk@0.79.0` is needed as a standalone Claude Code skill dependency (not in the NestJS backend) for the contract OCR feature. All other M1 and M2 work uses libraries already installed.

**Core technologies:**
- **Prisma MTI via `product` + `specs` JSON** — multi-category product storage — avoids 3x module duplication; JSON specs acceptable for 2-5 user system with no analytics query requirements
- **NestJS Strategy Pattern (DI)** — import service extensibility — each product category gets an isolated, independently testable import strategy class; `ImportService` becomes an orchestrator
- **Claude API native PDF (`@anthropic-ai/sdk`)** — contract OCR — visual PDF understanding handles Chinese stamps, merged cells, and mixed fonts that Tesseract.js cannot
- **`cos-nodejs-sdk-v5`** — Tencent COS file storage — the only remaining production blocker before deployment; env vars already defined in `.env.example`
- **ESLint `@typescript-eslint/no-explicit-any` + `tsc --noEmit`** — code audit tooling — no new tool needed; targeted ESLint run produces full inventory of 97+13 `any` instances

**No new libraries** are needed for multi-table schema changes (Prisma 6 MTI is native), component refactoring (NestJS Strategy Pattern), or `any` type elimination (existing ESLint config). CQRS, SonarQube, Tesseract.js, ZenStack, and typeorm-polymorphic are explicitly out of scope.

### Expected Features

**Must have (table stakes) — M1 remediation:**
- Quote-to-order conversion — backend stub throws 501; frontend button exists; 3-step fix in `quote.service.ts:370-374`
- Frontend button audit and fix — systematic API contract alignment across all 9 modules
- Tencent COS file upload — blocks production deployment; explicit TODO in `file.service.ts:138`
- `any` type elimination in test files — 97 backend + 13 frontend instances mask incorrect mock shapes
- OrderService decomposition (1121L → `OrderItemService` + `OrderPaymentService` + thin facade)
- FabricDetailPage decomposition (769L → 4 sub-components + 2 custom hooks)

**Must have (table stakes) — M2 expansion:**
- Iron frame / motor / hardware CRUD — zero backend models exist; real price lists show distinct column shapes
- Category-aware order items — current OrderItem only references Fabric; mixed-category orders are core business need
- Excel import for new product categories — `ImportService` only handles fabric + supplier today
- Category-specific pricing units — fabric = per meter, frame/motor/hardware = per set/piece

**Should have (competitive differentiators):**
- Contract OCR Claude Code skill — eliminates manual re-entry of Chinese PDF purchase orders/invoices
- Mixed-category order support — parent company sends single POs mixing fabric + iron frame + motor (confirmed from real documents)
- Numbering system for new categories — company must confirm IRF-/MOT-/HW- prefixes
- Real data testing with 36 documents from `/Users/qinyuan/Desktop/铂润测试资料/`

**Defer (v2+):**
- Cross-document reference linking (PO/PI/IN/delivery note linkage by 5-digit order ID)
- Reporting dashboard — needs 6+ months of real data first
- Mixed-category order unified display — depends on category-aware orders working well first
- Inventory concept (light) — only add if business actually pre-stocks

**Anti-features (explicitly out of scope):**
- In-system PDF generation — existing Excel/Word templates work; rebuilding formatting is weeks of effort for 2-5 users
- Real-time inventory — business is on-demand procurement with no warehouse
- Automated payment reconciliation — requires bank API not worth building at this scale
- Multi-tenant model — 铂润 and 海宁优途 are the same entity per PROJECT.md

### Architecture Approach

The target architecture keeps `FabricModule` completely unchanged and adds a new `ProductModule` alongside it — both modules feed into `OrderModule` and `QuoteModule` via separate nullable FKs on `OrderItem`. The `ImportModule` is refactored from a 607L god service to an orchestrator that delegates to per-category strategy classes. `OrderService` is decomposed into `OrderItemService` (item CRUD/status) and `OrderPaymentService` (payment tracking), with `OrderService` retaining order lifecycle and `recalculateOrderTotals` as genuinely shared logic. Frontend oversized components are decomposed by extracting custom hooks first, then splitting visual sections.

**Major components:**
1. **ProductModule (new)** — CRUD for iron frame/motor/hardware via single `products` table with `category` enum + `specs` JSON; one module handles all three non-fabric categories
2. **ImportModule (refactored)** — Strategy pattern orchestrator; `FabricImportStrategy`, `SupplierImportStrategy`, `ProductImportStrategy` as independent injectable classes
3. **OrderModule (extended)** — OrderItem gains nullable `productId` FK alongside existing `fabricId`; state machine logic unchanged; `OrderItemService` + `OrderPaymentService` extracted
4. **FileModule (fixed)** — COS SDK integration replacing local storage stub; key-only storage pattern; migration script for existing localhost URLs
5. **Contract OCR skill (standalone)** — Claude Code skill using `@anthropic-ai/sdk`; not part of NestJS backend; handles Chinese PDF → structured JSON → importable Excel

**Build order within M2:** Database schema migration first → ProductModule → ImportModule strategy refactor (concurrent) → Order/Quote extension → Frontend.

### Critical Pitfalls

1. **OrderItem FK jungle** — Adding iron frames/motors/hardware as `ironFrameId?`, `motorId?`, `hardwareId?` creates nullable FK sprawl enforced only in application code. Avoid by deciding on the `products` abstraction table first, then using single nullable `productId` FK on `OrderItem`.

2. **COS migration breaks existing file URL records** — Current `File.url` stores `http://localhost:3000/uploads/{uuid}.jpg`. After COS migration, existing records become stale broken links. Avoid by storing only the object key (not full URL), generating URLs at read time, and running a one-time migration script.

3. **Quote-to-order partial failure** — The 3-step conversion (create Order, create OrderItems, update Quote.status) without `prisma.$transaction` leaves inconsistent state on partial failure. Concurrent double-clicks create duplicate orders. Wrap in `$transaction`, add unique constraint, write failure tests RED first.

4. **Component refactoring creates prop-drilling** — Splitting JSX without extracting business logic first produces sub-components with 8+ props. Extract custom hooks first (zero `useState` in page component), then split visual sections.

5. **`any` removal reveals real type errors** — The 97 `any` instances hide incomplete mock objects. Create typed mock builder helpers before removing `any`; do not use bulk `fixToUnknown` auto-fix as it breaks test assertions.

6. **Real data exposes import assumptions** — Real Chinese documents use merged cells, Chinese unit strings ("150米"), and supplier-specific formats. Silent row skips produce corrupt data. Test against real documents; add per-row error reporting with row number and reason; add dry-run mode.

---

## Implications for Roadmap

Based on research, the two-milestone structure is mandatory. Research confirms M1 and M2 are not parallelizable — broken features produce false signal during real data testing.

### Phase 1: Code Remediation Foundation (M1)

**Rationale:** Three P1 broken features (501 endpoint, local-only file storage, `any`-masked test failures) will corrupt M2 development signal if not fixed first. The oversized components become exponentially harder to extend during M2 if not decomposed now.
**Delivers:** A fully working system at its current feature scope, passing all tests, deployable to Tencent Cloud
**Addresses:** Quote-to-order conversion, COS file service, `any` type elimination, component decomposition
**Avoids:** COS URL breakage pitfall (migration strategy required), quote-to-order partial failure pitfall (transaction + concurrent test), `any` removal build break pitfall (mock builders first)

**Sub-phases:**
- 1a: Quote-to-order implementation (lowest risk, self-contained, 3-step TODO)
- 1b: COS file service migration (includes data migration for localhost URLs)
- 1c: `any` type elimination with mock builder helpers
- 1d: OrderService decomposition (1121L → 3 services)
- 1e: Frontend component decomposition (FabricDetailPage 769L, OrderItemsSection 652L)
- 1f: Frontend API contract audit and fix (systematic, not complex)

### Phase 2: Multi-Category Schema + ProductModule (M2 Start)

**Rationale:** All downstream M2 work (order extension, import extension, frontend) depends on the `products` table existing. Schema migration must be backward-compatible (all existing `OrderItem` rows have NULL `productId`). This phase has no UI deliverable — it is pure backend foundation.
**Delivers:** `products` table in MySQL, `ProductModule` with full CRUD + code generation, `productId` nullable FK on `order_items`
**Uses:** Prisma 6 MTI pattern (no new library), `cos-nodejs-sdk-v5` already configured from Phase 1
**Implements:** ProductModule architecture pattern, CTI with `specs` JSON, CodePrefix extension
**Avoids:** OrderItem FK jungle pitfall (single `productId` FK, not category-specific FKs)

### Phase 3: ImportModule Strategy Refactor + Product Import (M2 Concurrent)

**Rationale:** ImportModule refactor is independent of Order/Quote extension and can run in parallel with Phase 2. Strategy extraction is a prerequisite for adding product import templates. Real document testing (Phase 5) depends on working import.
**Delivers:** `ImportStrategy` interface, `FabricImportStrategy` + `SupplierImportStrategy` extracted, `ProductImportStrategy` added, Excel templates for iron frame/motor/hardware
**Implements:** Strategy Pattern for ImportService architecture
**Avoids:** One giant ImportService with if/else branches anti-pattern

### Phase 4: Order/Quote Extension for Multi-Category

**Rationale:** Depends on Phase 2 (ProductModule must exist for validation). `OrderItem` already has nullable `productId` FK from Phase 2 migration — this phase adds service-layer enforcement, quote-to-order conversion for non-fabric products, and DTO changes.
**Delivers:** Mixed-category orders and quotes, category-aware order item validation, full state machine working for non-fabric items
**Implements:** OrderItem polymorphic product reference pattern, extended quote-to-order conversion
**Avoids:** Quote/Order extension logic landing in FabricModule anti-pattern

### Phase 5: Frontend Product Pages + API Contract Alignment

**Rationale:** All backend endpoints must exist before frontend can be built. Frontend comes last in the M2 build order.
**Delivers:** `ProductListPage`, `ProductDetailPage`, `ProductFormPage`; Order and Quote forms extended for product selection; category-aware display
**Addresses:** Mixed-category order display, numbering system for new categories

### Phase 6: Contract OCR Skill + Real Data Testing

**Rationale:** OCR skill output must match import templates (Phase 3 prerequisite). Real data testing requires all M1 remediation and M2 feature work to be complete — testing against broken system creates misleading signal.
**Delivers:** `/contract-ocr` Claude Code skill, verified import of 36 real business documents, system stability confirmation
**Uses:** `@anthropic-ai/sdk@0.79.0` (standalone skill), real documents from `/Users/qinyuan/Desktop/铂润测试资料/`
**Avoids:** Import edge cases pitfall (test against real merged-cell Chinese documents, not synthetic data)

### Phase 7: Deployment (Phase 6 = Tencent Cloud)

**Rationale:** COS is working (Phase 1), all features are tested with real data (Phase 6). Deployment is unblocked.
**Delivers:** Production deployment on Tencent Cloud (lightweight server + CDB + COS)

---

### Phase Ordering Rationale

- M1 before M2 is mandatory: broken features produce false signal; real data tests require working foundation
- Schema migration first within M2: all other M2 work depends on `products` table existing
- Import strategy refactor concurrent with ProductModule: independent change, allows parallelism
- Order/Quote extension after ProductModule: validators need Product model to exist for FK validation
- Frontend last: all API endpoints must exist before UI is built
- OCR skill last: output format must match finalized import templates
- This order prevents the #1 risk: discovering mid-M2 that a foundational schema decision was wrong

### Research Flags

Phases with well-documented patterns (skip `research-phase`):
- **Phase 1** — all fixes are identified with exact file + line references; no research needed
- **Phase 2** — Prisma MTI pattern is documented and verified; schema design decision is made
- **Phase 3** — NestJS Strategy Pattern is standard; ImportService structure is known
- **Phase 4** — polymorphic FK pattern is designed; validator pattern is established

Phases that may benefit from deeper research during planning:
- **Phase 6 (OCR skill)** — delivery note formats vary by supplier; OCR prompt engineering for Chinese business documents may need iteration; recommend prototyping against 2-3 real PDFs before committing to extraction schema
- **Phase 7 (deployment)** — Tencent Cloud CDB + COS configuration specifics; `cos-nodejs-sdk-v5` production configuration for bucket policies; recommend `/gsd:research-phase` before execution

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official docs and npm registry; two new packages identified with exact versions |
| Features | HIGH | Based on direct codebase inspection (file:line references) + real business documents review; not inferred |
| Architecture | HIGH | Based on direct codebase analysis of actual file sizes and structures; patterns verified from established sources |
| Pitfalls | HIGH | All critical pitfalls derived from direct codebase inspection, not generic advice |

**Overall confidence:** HIGH

### Gaps to Address

- **Product numbering codes** — IRF-/MOT-/HW- prefixes need company confirmation before implementation; do not hard-code in Phase 2 without user sign-off
- **OCR extraction schema** — The exact JSON schema for `extract_contract_data` tool needs validation against real documents before finalizing; delivery note formats vary by supplier and cannot be fully specified from document inspection alone
- **COS bucket policy** — Production COS configuration (public-read vs signed URLs for product images) not researched; determine before Phase 7
- **`specs` JSON field shape per category** — The spec fields listed in ARCHITECTURE.md are derived from document inspection; confirm with business owner before migrating schema

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `backend/src/quote/quote.service.ts:370-376` — NotImplementedException confirmed
- Direct codebase inspection: `backend/src/file/file.service.ts:138` — COS TODO confirmed
- Direct codebase inspection: `backend/src/order/order.service.ts` — 1121L confirmed
- Direct codebase inspection: `frontend/src/pages/fabrics/FabricDetailPage.tsx` — 769L confirmed
- Real business documents: `/Users/qinyuan/Desktop/铂润测试资料/` — 36 files analyzed
- [Prisma Table Inheritance Docs](https://www.prisma.io/docs/orm/prisma-schema/data-model/table-inheritance) — MTI/STI patterns
- [Anthropic PDF Support Docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support) — PDF API capabilities, token costs
- [anthropics/anthropic-sdk-typescript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) — version 0.79.0 confirmed
- [cos-nodejs-sdk-v5 npm](https://www.npmjs.com/package/cos-nodejs-sdk-v5) — version 2.15.4 confirmed
- [typescript-eslint no-explicit-any](https://typescript-eslint.io/rules/no-explicit-any/) — fixToUnknown option

### Secondary (MEDIUM confidence)
- [Polymorphic Associations with Prisma (wanago.io, Feb 2024)](https://wanago.io/2024/02/19/api-nestjs-postgresql-prisma-polymorphic-associations/) — separate nullable FK columns recommendation
- [Strategy Pattern in NestJS (Medium)](https://medium.com/@dineshbyte/embracing-the-strategy-pattern-in-nestjs-391715d49c4f) — modular service decomposition
- [Martin Fowler: Modularizing React Apps](https://martinfowler.com/articles/modularizing-react-apps.html) — extract hooks + sub-components pattern
- NestJS refactoring patterns WebSearch 2025 — service decomposition best practices
- Multi-category DB design WebSearch — separate tables vs single table tradeoffs

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
