---
phase: 11
type: research
researched: 2026-03-28
---

# Phase 11 Research: v1.0 Final Gap Closure

## Task 1: Product Import Tab

### Backend Endpoints (Already Implemented — Phase 6)

**Controller:** `backend/src/import/import.controller.ts`
- `GET /import/templates/products` (line ~138) — generates and downloads product import template
- `POST /import/products` (line ~290) — imports products from Excel with optional `dryRun` query param

**Service:** `backend/src/import/import.service.ts`
- `generateProductTemplate()` (line ~58) — creates template with example data
- `importProducts(file, dryRun)` (line ~97) — delegates to generic `importData()` with ProductImportStrategy

**Strategy:** `backend/src/import/strategies/product-import.strategy.ts` — complete implementation with columns, validation, composite key dedup, batch creation.

### Frontend Pattern to Follow

**API file:** `frontend/src/api/import.api.ts`

Existing pattern:
```typescript
// Template download helper (line ~30)
async function downloadTemplate(endpoint: string, filename: string): Promise<void>

// File upload helper (line ~43)
async function uploadImportFile(endpoint: string, file: File, onProgress?): Promise<ImportResult>

// Specialized wrappers
const downloadFabricTemplate = () => downloadTemplate('/import/templates/fabrics', 'fabric_import_template.xlsx');
const importFabrics = (file, onProgress?) => uploadImportFile('/import/fabrics', file, onProgress);
```

**To add:**
```typescript
const downloadProductTemplate = () => downloadTemplate('/import/templates/products', 'product_import_template.xlsx');
const importProducts = (file, onProgress?) => uploadImportFile('/import/products', file, onProgress);
// Add both to importApi export object
```

**Page file:** `frontend/src/pages/import/ImportPage.tsx`

Current structure:
- `ImportTab` type union: `'fabric' | 'supplier' | 'purchaseOrder' | 'salesContract'` (line ~28)
- `TEMPLATE_TABS` array: tabs that have downloadable templates (line ~31)
- `TAB_CONFIG` record: maps tab key → `{ download, import }` (line ~38)
- `tabItems` array: renders UI tabs with labels (line ~236)

**To add:**
1. Add `'product'` to `ImportTab` type
2. Add `'product'` to `TEMPLATE_TABS` array
3. Add `product` entry to `TAB_CONFIG` with download/import functions
4. Add product tab item to `tabItems` array with label `'产品导入'`

### Test Considerations

Existing test: `frontend/src/pages/import/__tests__/ImportPage.test.tsx`
- Tests tab rendering, file upload, template download
- New product tab should be covered by existing pattern tests (tabs render, config exists)
- May need to add a product tab test case if existing tests check specific tabs

---

## Task 2: useCustomerDetail Hardcoded Strings

**File:** `frontend/src/hooks/useCustomerDetail.ts`

**Line 216** — in `handlePricingSubmit()` catch block:
```typescript
message.error(editingPricing ? '更新失败，请重试' : '创建失败，请重试');
```

**Line 253** — in `handleDeletePricingConfirm()` catch block:
```typescript
message.error('删除失败，请重试');
```

**Fix pattern — from same file, line 146:**
```typescript
message.error(getDeleteErrorMessage(error as ApiError, '客户'));
```

**Utility location:** `frontend/src/utils/errorMessages.ts`
- `getErrorMessage(error: ApiError): string` — generic error → Chinese message
- `getDeleteErrorMessage(error: ApiError, entityName: string): string` — delete-specific with 409/404 handling

**Current import** in useCustomerDetail.ts (only `getDeleteErrorMessage`):
```typescript
import { getDeleteErrorMessage } from '@/utils/errorMessages';
```
**Must update import** to also include `getErrorMessage`:
```typescript
import { getDeleteErrorMessage, getErrorMessage } from '@/utils/errorMessages';
```

**Fix:**
- Line 216: `message.error(getErrorMessage(error as ApiError));`
- Line 253: `message.error(getDeleteErrorMessage(error as ApiError, '定价'));`

---

## Task 3: order.service.ts Stale JSDoc

**File:** `backend/src/order/order.service.ts`

**Line 57** — JSDoc for `create()` method:
```typescript
 * - Initial status: INQUIRY
```

**Line 166** — actual code:
```typescript
status: OrderItemStatus.PENDING,
```

**Fix:** Change line 57 from `INQUIRY` to `PENDING`.

---

## Complexity Assessment

| Task | Files Modified | Lines Changed | Risk |
|------|---------------|---------------|------|
| Product import tab | 2 frontend files | ~20 lines | Low — pattern copy |
| Error message fix | 1 frontend file | 2 lines | Trivial |
| JSDoc fix | 1 backend file | 1 line | Trivial |

**Total:** 4 files, ~23 lines. All are additive or surgical replacements with zero behavioral risk.
