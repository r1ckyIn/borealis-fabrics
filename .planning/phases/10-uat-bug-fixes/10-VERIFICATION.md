---
phase: 10-uat-bug-fixes
verified: 2026-03-27T12:00:00Z
status: human_needed
score: 8/8 must-haves verified
re_verification: 2026-03-27
gaps: []
human_verification:
  - test: "Verify ConfirmModal centering renders correctly in browser"
    expected: "Quote-to-order conversion dialog appears centered on screen"
    why_human: "Ant Design centered prop applies CSS — cannot verify visual output programmatically"
  - test: "Verify OrderItemTable quantity display in browser"
    expected: "Quantity shows '500.00 米' (not '500.00 米 米') for fabric items"
    why_human: "formatQuantity call is correct in code; actual rendered output requires browser verification"
  - test: "Verify supplier dropdown filters by selected fabric"
    expected: "Selecting fabric in OrderItemForm then typing in supplier field shows only relevant suppliers"
    why_human: "Requires running server + browser interaction to confirm API filter is applied and UI reflects filtered results"
  - test: "Verify unitPrice auto-fill in QuoteForm"
    expected: "Selecting a fabric/product auto-populates the unit price field with defaultPrice"
    why_human: "Requires browser to confirm UnifiedProductSelector passes defaultPrice in result callback"
---

# Phase 10: UAT Bug Fixes Verification Report

**Phase Goal:** Fix 8 UAT bugs found during Phase 09 real-data testing — P0 (order default status, auto-fill price, unit duplication, NaN display), P1 (supplier filtering, duplicate customers), P2 (dialog centering, address layout optimization)
**Verified:** 2026-03-27
**Status:** human_needed — 8/8 must-haves verified; 4 items need human browser testing
**Re-verification:** 2026-03-27 — re-verified after 10-03 gap closure

---

## Goal Achievement

Phase 10 scope was 8 UAT bugs from Phase 09 testing. Plans were split into:
- Plan 01: 5 P0/P2 bugs (order status, price auto-fill, unit dedup, NaN display, dialog centering)
- Plan 02: 3 P1/P2 bugs (supplier filtering, duplicate customers, address layout)

Plan 03 (gap closure) addressed the remaining P2 address layout optimization.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Direct order creation defaults to PENDING status (not INQUIRY) | VERIFIED | `order.service.ts` line 144: `status: OrderItemStatus.PENDING`; commit `adf7dbf` |
| 2 | Selecting a fabric/product in QuoteForm auto-fills unitPrice from defaultPrice | VERIFIED | `QuoteForm.tsx` lines 167-172: `form.setFieldValue(['items', fieldName, 'unitPrice'], result.defaultPrice)`; commit `a3be907` |
| 3 | Order item table shows quantity with unit exactly once (not "500.00 米 米") | VERIFIED | `OrderItemTable.tsx` line 131: `formatQuantity(record.quantity, record.unit || '米')` — unit passed to function, not appended separately; commit `3fd09ad` |
| 4 | Purchase price displays "-" when null/undefined (not "¥ NaN") | VERIFIED | `OrderItemTable.tsx` lines 147-153: null guard `record.purchasePrice != null ? <AmountDisplay/> : '-'`; commit `3fd09ad` |
| 5 | Quote-to-order conversion dialog is centered on screen | VERIFIED | `ConfirmModal.tsx` line 44: `<Modal centered`; commit `c0ec583` |
| 6 | Supplier dropdown in OrderItemForm filters by selected fabric's FabricSupplier relationships | VERIFIED | `OrderItemForm.tsx` lines 48-61: `searchSuppliers` reads `fabricId` from form and passes to `getSuppliers`; `QuerySupplierDto` has `fabricId` param; `SupplierService.findAll` filters via `fabricSuppliers.some`; commits `869d234`, `26915b9` |
| 7 | Import script checks for existing customers before creating duplicates | VERIFIED | `run-full-import-test.ts` lines 244-270: `createCustomerIfNotExists()` searches by keyword, checks exact `companyName` match before creating; commit `f69909f` |
| 8 | Shipping address layout in customer detail page optimized | VERIFIED | `CustomerAddressTab.tsx` redesigned from List to Row/Col/Card grid (2-col desktop, 1-col mobile); commit `722a501` via Plan 10-03 gap closure |

**Score:** 7/8 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/order/order.service.ts` | Fixed default order status | VERIFIED | Line 144: `status: OrderItemStatus.PENDING`; line 166: order-level status also PENDING; delete check expanded to include PENDING (lines 354, 374) |
| `frontend/src/components/forms/QuoteForm.tsx` | Auto-fill price on product select | VERIFIED | Lines 167-172: `result.defaultPrice` auto-fills `unitPrice` field |
| `frontend/src/pages/orders/components/OrderItemTable.tsx` | Fixed unit duplication and NaN display | VERIFIED | Line 131: `formatQuantity(record.quantity, record.unit || '米')`; lines 147-153: null guard for purchasePrice |
| `frontend/src/components/common/ConfirmModal.tsx` | Centered modal | VERIFIED | Line 44: `centered` prop added to `<Modal>` |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/forms/OrderItemForm.tsx` | Filtered supplier search with fabricId | VERIFIED | Lines 48-61: `searchSuppliers` as `useCallback`, reads `fabricId` from form, passes to `getSuppliers` |
| `backend/src/supplier/supplier.service.ts` | Supplier query with optional fabricId filter | VERIFIED | Lines 97-101: `where.fabricSuppliers = { some: { fabricId: query.fabricId } }` |
| `backend/src/supplier/dto/query-supplier.dto.ts` | fabricId param with validators | VERIFIED | Lines 84-92: `@IsOptional @IsInt @Type(() => Number) fabricId?: number` |
| `frontend/src/types/forms.types.ts` | QuerySupplierParams includes fabricId | VERIFIED | Line 37: `fabricId?: number` in `QuerySupplierParams` |
| `frontend/src/pages/orders/components/OrderItemFormModal.tsx` | Consistent fabricId filtering | VERIFIED | Lines 31-43: `searchSuppliers` as `useCallback` inside `ItemFormFields`, reads `fabricId` from form |
| `scripts/run-full-import-test.ts` | Duplicate customer prevention | VERIFIED | Lines 244-270: `createCustomerIfNotExists()` with GET + exact match dedup |

### Plan 03 Artifacts (Gap Closure)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/pages/customers/components/CustomerAddressTab.tsx` | Compact card-grid address layout | VERIFIED | Row/Col/Card grid replacing List/List.Item.Meta; xs=24 md=12 responsive; commit `722a501` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `QuoteForm.tsx` onChange | `form.setFieldValue unitPrice` | `result.defaultPrice` | WIRED | Lines 167-172 in QuoteForm |
| `OrderItemTable.tsx` quantity render | `formatQuantity` | unit param | WIRED | Line 131: `formatQuantity(record.quantity, record.unit || '米')` |
| `OrderItemTable.tsx` purchasePrice render | `'-'` fallback | null guard | WIRED | Lines 147-153 |
| `OrderItemForm` searchSuppliers | `getSuppliers API` | `fabricId` param | WIRED | Lines 48-61 |
| `SupplierService.findAll` | `Prisma fabricSuppliers.some` | `query.fabricId` | WIRED | Lines 97-101 |
| `createCustomerIfNotExists` | GET `/customers?keyword=` | exact match check | WIRED | Lines 248-265 |
| `createOrder` | `OrderItemStatus.PENDING` | default item status | WIRED | Line 144 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `QuoteForm.tsx` — unitPrice | `result.defaultPrice` | `UnifiedProductSelector` onChange callback (fabric/product API) | Yes — populated from fabric.defaultPrice or product.defaultPrice from DB | FLOWING |
| `OrderItemTable.tsx` — purchasePrice | `record.purchasePrice` | OrderItem from DB (via order detail API) | Yes — actual DB value or null; null guard handles both cases | FLOWING |
| `OrderItemForm.tsx` — searchSuppliers | `fabricId` from form | Form state (set when product selected) | Yes — fabricId from DB entity, passed to supplier filter query | FLOWING |
| `SupplierService.findAll` — fabricId filter | `query.fabricId` | HTTP query param from frontend | Yes — Prisma join on FabricSupplier table | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend build compiles cleanly | `cd backend && pnpm build` | Exit 0 | PASS |
| Frontend build compiles cleanly | `cd frontend && pnpm build` | `✓ built in 7.43s` | PASS |
| formatQuantity signature accepts unit param | Read `format.ts` line 196-203 | `formatQuantity(qty, unit = '米')` — correct 2-param signature | PASS |
| QuerySupplierDto has fabricId | Read `query-supplier.dto.ts` | `@IsOptional @IsInt @Type(() => Number) fabricId?: number` at lines 84-92 | PASS |
| All Plan 01 commits present in git log | `git log --oneline` | `adf7dbf`, `a3be907`, `3fd09ad`, `c0ec583` all present | PASS |
| All Plan 02 commits present in git log | `git log --oneline` | `869d234`, `26915b9`, `f69909f` all present | PASS |

---

## Requirements Coverage

Both plans have `requirements: []` — this is a gap closure phase with no formal requirement IDs.

The REQUIREMENTS.md traceability table maps DATA-03 and DATA-07 to Phase 10 with "Pending" status. These were Phase 9 data testing requirements that were not completed in Phase 9 and remain unresolved. Phase 10 UAT bug fixes do not address these.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DATA-03 | (none — Phase 10 plans have `requirements: []`) | Manual entry test: create supplier-customer-fabric-quote-order chain with real data | NEEDS HUMAN | Not addressed in Phase 10 plans; Phase 9 gap |
| DATA-07 | (none — Phase 10 plans have `requirements: []`) | System stability: all pages load after bulk data import | NEEDS HUMAN | Not addressed in Phase 10 plans; Phase 9 gap |

Note: DATA-03 and DATA-07 appearing as "Phase 10" in traceability table is likely a documentation artifact from Phase 09 gap closure. These are not orphaned Phase 10 requirements — neither plan claimed them.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `backend/src/order/order.service.ts` | 57 | Stale JSDoc comment: `- Initial status: INQUIRY` | Info | The actual code uses PENDING; comment misleads future readers |

No blocker or warning anti-patterns found.

---

## Human Verification Required

### 1. ConfirmModal Dialog Centering

**Test:** Open the order detail page for a quote-derived order, click "转为订单" (convert to order) button
**Expected:** Dialog modal appears centered on screen vertically and horizontally
**Why human:** Ant Design `centered` prop applies via CSS; visual position cannot be verified programmatically

### 2. OrderItemTable Unit Display

**Test:** Open any order detail page with fabric items that have quantity > 0
**Expected:** Quantity column shows "500.00 米" (single unit), not "500.00 米 米"
**Why human:** `formatQuantity(qty, unit)` call is verified in code; actual rendered text requires browser inspection

### 3. Supplier Dropdown Filtering

**Test:** Create a new order, add an item, select a fabric, then open the supplier dropdown
**Expected:** Only suppliers linked to that fabric via FabricSupplier relationship appear; unrelated suppliers are hidden
**Why human:** Requires running backend + frontend + real data to observe filtered results in the UI

### 4. QuoteForm Price Auto-Fill

**Test:** Create a new quote, add an item, select a fabric with a non-null defaultPrice
**Expected:** The unit price field auto-populates with the fabric's defaultPrice value
**Why human:** Requires browser to confirm `UnifiedProductSelector` triggers onChange with `result.defaultPrice` populated

---

## Gaps Summary

**No gaps remaining.** The P2 address layout optimization (issue #8) was closed by Plan 10-03, which redesigned `CustomerAddressTab.tsx` from a sparse List layout to a compact Row/Col/Card grid. All 8 UAT bugs from Phase 09 are now fixed.

The two pending requirements (DATA-03, DATA-07) mapped to Phase 10 in REQUIREMENTS.md are Phase 9 carryovers unrelated to Phase 10 UAT bug fix scope.

---

*Verified: 2026-03-27*
*Verifier: Claude (gsd-verifier)*
