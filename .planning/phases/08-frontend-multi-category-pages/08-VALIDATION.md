---
phase: 8
slug: frontend-multi-category-pages
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-25
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `frontend/vite.config.ts` |
| **Quick run command** | `cd frontend && pnpm test --run` |
| **Full suite command** | `cd frontend && pnpm build && pnpm test --run && pnpm lint && pnpm typecheck` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm test --run`
- **After every plan wave:** Run `cd frontend && pnpm build && pnpm test --run && pnpm lint && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-T1 | 08-01 | 1 | MCAT-10,11,12 | typecheck | `cd frontend && npx tsc --noEmit 2>&1 \| head -30` | entities.types.ts, enums.types.ts, forms.types.ts | ⬜ pending |
| 01-T2 | 08-01 | 1 | MCAT-10,11,12 | typecheck | `cd frontend && npx tsc --noEmit 2>&1 \| head -30` | product.api.ts, useProducts.ts, product-constants.ts | ⬜ pending |
| 01-T3 | 08-01 | 1 | MCAT-10,12 | typecheck | `cd frontend && npx tsc --noEmit 2>&1 \| head -30` | Sidebar.tsx, routes/index.tsx | ⬜ pending |
| 02-T1 | 08-02 | 2 | MCAT-10 | unit | `cd frontend && pnpm vitest run src/pages/products/__tests__/ProductListPage.test.tsx --reporter=verbose 2>&1 \| tail -20` | ProductListPage.tsx, ProductListPage.test.tsx | ⬜ pending |
| 02-T2 | 08-02 | 2 | MCAT-11 | unit | `cd frontend && pnpm vitest run src/pages/products/__tests__/ProductDetailPage.test.tsx --reporter=verbose 2>&1 \| tail -20` | ProductDetailPage.tsx, ProductBasicInfo.tsx, ProductSupplierTab.tsx, ProductPricingTab.tsx | ⬜ pending |
| 02-T3 | 08-02 | 2 | MCAT-11 | unit | `cd frontend && pnpm vitest run src/pages/products/__tests__/ProductFormPage.test.tsx --reporter=verbose 2>&1 \| tail -20` | ProductFormPage.tsx, ProductFormPage.test.tsx | ⬜ pending |
| 03-T1 | 08-03 | 2 | MCAT-12 | unit | `cd frontend && pnpm vitest run src/components/business/__tests__/UnifiedProductSelector.test.tsx --reporter=verbose 2>&1 \| tail -20` | UnifiedProductSelector.tsx, UnifiedProductSelector.test.tsx | ⬜ pending |
| 03-T2 | 08-03 | 2 | MCAT-12 | unit | `cd frontend && pnpm vitest run src/components/forms/__tests__/OrderItemForm.test.tsx --reporter=verbose 2>&1 \| tail -20` | OrderItemForm.tsx, OrderItemForm.test.tsx | ⬜ pending |
| 04-T1 | 08-04 | 3 | MCAT-12 | unit | `cd frontend && pnpm vitest run src/pages/quotes/__tests__/QuoteListPage.test.tsx --reporter=verbose 2>&1 \| tail -20` | QuoteListPage.tsx, QuoteListPage.test.tsx | ⬜ pending |
| 04-T2 | 08-04 | 3 | MCAT-12 | unit | `cd frontend && pnpm vitest run src/pages/quotes/__tests__/QuoteFormPage.test.tsx --reporter=verbose 2>&1 \| tail -20` | QuoteForm.tsx, QuoteFormPage.tsx, QuoteFormPage.test.tsx | ⬜ pending |
| 04-T3 | 08-04 | 3 | MCAT-12 | unit | `cd frontend && pnpm vitest run src/pages/quotes/__tests__/QuoteDetailPage.test.tsx --reporter=verbose 2>&1 \| tail -20` | QuoteDetailPage.tsx, QuoteDetailPage.test.tsx | ⬜ pending |
| 05-T1 | 08-05 | 4 | MCAT-10,11,12 | full suite | `cd frontend && pnpm vitest run src/components/layout/__tests__/Sidebar.test.tsx --reporter=verbose 2>&1 \| tail -20 && pnpm build && pnpm test --run && pnpm lint && pnpm typecheck 2>&1 \| tail -30` | Sidebar.test.tsx updated, fabric pages updated, OrderDetailPage updated | ⬜ pending |
| 05-T2 | 08-05 | 4 | MCAT-10,11,12 | manual | User visual verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing test infrastructure covers all phase requirements (vitest + @testing-library/react already configured)
- No new test framework or fixture setup needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar navigation renders SubMenu correctly | MCAT-10 | Visual layout verification | Open app, verify 产品管理 SubMenu with 5 sub-items |
| Category-specific form fields render correctly | MCAT-11 | Dynamic form visual verification | Create product for each subCategory, verify correct fields shown |
| Quote expandable rows display items inline | MCAT-12 | Complex table interaction | View quote list, expand row, verify QuoteItem details visible |
| Unified search shows category tags | MCAT-12 | Dropdown visual styling | Open OrderItemForm, search product, verify category tags |
| Supplier auto-populate on product selection | MCAT-12 | Multi-field auto-populate flow | Select product in OrderItemForm, verify supplierId and purchasePrice auto-set |
| Partial quote conversion UI | MCAT-12 | Multi-step interaction flow | Select QuoteItems via checkbox, click 转化为订单, verify conversion |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
