# Phase 1: Frontend Bug Fixes - Audit Report

**Audited:** 2026-03-19
**Auditor:** Claude (automated scan)
**Scope:** All 7 modules (Supplier, Customer, Fabric, Quote, Order, Logistics, Import), 3 page types per module (List, Form, Detail)

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| P0 (Completely Broken) | 1 | Import controller missing `api/v1` prefix -- all import operations 404 |
| P1 (Feature Abnormal) | 8 | Search not filtering, error handling broken, convert-to-order 501, logistics search limited |
| P2 (UX Issue) | 5 | Missing empty states, generic error messages on forms, generic delete error on fabrics/orders |
| **Total** | **14** | |

## API Contract Specification

### Paginated Response Format

All paginated endpoints return:
```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

Frontend `apiClient` response interceptor unwraps `response.data.data`, so consumers receive `{ items, pagination }` directly.

### Error Response Format

All error responses follow:
```json
{
  "code": 409,
  "message": "Cannot delete supplier with active orders",
  "data": null
}
```

Frontend error interceptor transforms `AxiosError` into `ApiError { code, message, data: null }` and rejects with it. Pages must check `error.code`, NOT `error.response?.status`.

### Delete Response Format

All delete endpoints return `204 No Content` with empty body. The response interceptor handles this via `response.data.data` which evaluates to `undefined` -- functionally correct since delete mutations don't use the return value.

## Bug List

### BUG-001: Import Controller Missing `api/v1` Prefix

| Field | Value |
|-------|-------|
| Severity | P0 |
| Module | Import |
| Page | ImportPage |
| Description | All import API calls return 404. Frontend `apiClient` has `baseURL: '/api/v1'`, so requests go to `/api/v1/import/*`. But backend `ImportController` uses `@Controller('import')`, meaning it only responds to `/import/*`. |
| Root Cause | `ImportController` was not given the `api/v1` prefix that all other controllers have. |
| Affected Files | `backend/src/import/import.controller.ts` |
| Fix Approach | Change `@Controller('import')` to `@Controller('api/v1/import')`. Update any backend tests that reference the old path. |
| Fix Direction | backend |

### BUG-002: Supplier Search Sends `keyword` But Backend Expects `companyName`

| Field | Value |
|-------|-------|
| Severity | P1 |
| Module | Supplier |
| Page | SupplierListPage |
| Description | Search form sends `keyword` parameter but `QuerySupplierDto` only accepts `companyName`, `status`, `settleType`. The `keyword` param is silently stripped by NestJS `whitelist: true` ValidationPipe, so search always returns all results. |
| Root Cause | Frontend `SearchForm` field name is `keyword` (generic search concept) while backend DTO has field-specific `companyName` filter. |
| Affected Files | `frontend/src/pages/suppliers/SupplierListPage.tsx`, `frontend/src/types/forms.types.ts` (QuerySupplierParams), `backend/src/supplier/dto/query-supplier.dto.ts` |
| Fix Approach | Add `keyword` field to `QuerySupplierDto` that performs fuzzy search across `companyName`, `contactName`, and `phone`. Update `SupplierService.findAll()` to build OR conditions when `keyword` is provided. Or rename frontend field to `companyName` (less user-friendly). Recommended: add `keyword` to backend. |
| Fix Direction | backend (add keyword support) |

### BUG-003: Customer Search Sends `keyword` But Backend Expects `companyName`

| Field | Value |
|-------|-------|
| Severity | P1 |
| Module | Customer |
| Page | CustomerListPage |
| Description | Same pattern as BUG-002. Search form sends `keyword` but `QueryCustomerDto` only accepts `companyName`, `creditType`. Search always returns all results. |
| Root Cause | Same as BUG-002: frontend uses generic `keyword`, backend expects field-specific `companyName`. |
| Affected Files | `frontend/src/pages/customers/CustomerListPage.tsx`, `frontend/src/types/forms.types.ts` (QueryCustomerParams), `backend/src/customer/dto/query-customer.dto.ts` |
| Fix Approach | Add `keyword` field to `QueryCustomerDto` that fuzzy-searches `companyName`, `contactName`, `phone`. Update `CustomerService.findAll()`. |
| Fix Direction | backend (add keyword support) |

### BUG-004: Fabric Search Sends `keyword` But Backend Expects `fabricCode`/`name`/`color`

| Field | Value |
|-------|-------|
| Severity | P1 |
| Module | Fabric |
| Page | FabricListPage |
| Description | Search form sends `keyword` but `QueryFabricDto` expects separate `fabricCode`, `name`, `color` fields. The `keyword` param is silently stripped. Frontend also has `supplierId` in `QueryFabricParams` type but no UI for it. |
| Root Cause | Frontend designed with unified search; backend has field-specific filters. |
| Affected Files | `frontend/src/pages/fabrics/FabricListPage.tsx`, `frontend/src/types/forms.types.ts` (QueryFabricParams), `backend/src/fabric/dto/query-fabric.dto.ts` |
| Fix Approach | Add `keyword` field to `QueryFabricDto` that fuzzy-searches `fabricCode`, `name`, `color`. Update `FabricService.findAll()`. |
| Fix Direction | backend (add keyword support) |

### BUG-005: Supplier Delete Error Handling Checks `error.response?.status` (Never Matches)

| Field | Value |
|-------|-------|
| Severity | P1 |
| Module | Supplier |
| Page | SupplierListPage |
| Description | Delete error handler checks `axiosError.response?.status === 409` but the API client interceptor transforms errors into `ApiError { code, message, data: null }`. The `.response` property does not exist on the rejected error, so the 409 branch is unreachable. Delete failures always show generic "删除失败，请重试" instead of "该供应商有关联的活跃订单，无法删除". |
| Root Cause | Error handling code assumes raw AxiosError shape, but the interceptor rewrites it to ApiError. |
| Affected Files | `frontend/src/pages/suppliers/SupplierListPage.tsx` (lines 128-136) |
| Fix Approach | Change `const axiosError = error as { response?: { status?: number } }` to `const apiError = error as ApiError` and check `apiError.code === 409`. Use `getErrorMessage()` utility from error mapping. |
| Fix Direction | frontend |

### BUG-006: Customer Delete Error Handling Checks `error.response?.status` (Never Matches)

| Field | Value |
|-------|-------|
| Severity | P1 |
| Module | Customer |
| Page | CustomerListPage |
| Description | Same broken pattern as BUG-005. Delete 409 errors show generic message. |
| Root Cause | Same as BUG-005. |
| Affected Files | `frontend/src/pages/customers/CustomerListPage.tsx` (lines 109-117) |
| Fix Approach | Same fix as BUG-005. Use `ApiError` type and `getErrorMessage()`. |
| Fix Direction | frontend |

### BUG-007: Quote Delete Error Handling Checks `error.response?.status` (Never Matches)

| Field | Value |
|-------|-------|
| Severity | P1 |
| Module | Quote |
| Page | QuoteListPage, QuoteDetailPage |
| Description | Same broken pattern as BUG-005, in both list page and detail page delete handlers. Delete 409 errors show generic message in both places. |
| Root Cause | Same as BUG-005. |
| Affected Files | `frontend/src/pages/quotes/QuoteListPage.tsx` (lines 150-158), `frontend/src/pages/quotes/QuoteDetailPage.tsx` (lines 87-95) |
| Fix Approach | Same fix as BUG-005 in both files. Use `ApiError` type and `getErrorMessage()`. |
| Fix Direction | frontend |

### BUG-008: Quote Convert-to-Order Returns 501 Not Implemented

| Field | Value |
|-------|-------|
| Severity | P1 |
| Module | Quote |
| Page | QuoteListPage, QuoteDetailPage |
| Description | The "转订单" button calls `POST /quotes/:id/convert-to-order` but the backend `QuoteService.convertToOrder()` throws `NotImplementedException` (HTTP 501). Frontend shows generic "转换失败，请重试" instead of a clear "该功能暂未实现" message. |
| Root Cause | Feature was stubbed during Phase 2 development. Frontend has no special handling for 501 status. |
| Affected Files | `frontend/src/pages/quotes/QuoteListPage.tsx` (lines 174-186), `frontend/src/pages/quotes/QuoteDetailPage.tsx` (lines 98-111) |
| Fix Approach | Add 501 handling to convert error catch blocks. Show "该功能暂未实现" message. This is a Phase 1 UX fix; the actual implementation is Phase 2 scope (FEAT-01). |
| Fix Direction | frontend |

### BUG-009: Logistics Frontend Search Limited to `orderItemId` Only

| Field | Value |
|-------|-------|
| Severity | P1 |
| Module | Logistics |
| Page | (No standalone logistics list page exists in frontend) |
| Description | Frontend `QueryLogisticsParams` type only has `orderItemId` field, but backend `QueryLogisticsDto` supports `orderId`, `orderItemId`, `trackingNo`, `carrier`. Frontend cannot use the full backend search capability. Note: logistics is currently only accessed via OrderDetailPage's logistics tab, which correctly filters by order context. No standalone list page exists. |
| Root Cause | Frontend type definition was created with minimal fields. |
| Affected Files | `frontend/src/types/forms.types.ts` (QueryLogisticsParams) |
| Fix Approach | Add `orderId`, `trackingNo`, `carrier` to `QueryLogisticsParams` type. This is a type completeness fix -- no UI change needed until a standalone logistics page is created. |
| Fix Direction | frontend (type only) |

### BUG-010: Fabric Delete Shows Generic Error Message

| Field | Value |
|-------|-------|
| Severity | P2 |
| Module | Fabric |
| Page | FabricListPage |
| Description | Delete error handler catches all errors with generic "删除失败，请重试". No differentiation between 409 (fabric has related orders) and other errors. |
| Root Cause | Error handler doesn't check error code, just shows generic message. |
| Affected Files | `frontend/src/pages/fabrics/FabricListPage.tsx` (lines 102-113) |
| Fix Approach | Add `ApiError` type check with `getErrorMessage()` utility for specific error feedback. |
| Fix Direction | frontend |

### BUG-011: Order Delete Shows Generic Error Message

| Field | Value |
|-------|-------|
| Severity | P2 |
| Module | Order |
| Page | OrderListPage |
| Description | Delete error handler shows generic "删除失败，请重试" without checking error code. |
| Root Cause | No error code differentiation. |
| Affected Files | `frontend/src/pages/orders/OrderListPage.tsx` (lines 158-169) |
| Fix Approach | Add `ApiError` type check with `getErrorMessage()` utility. |
| Fix Direction | frontend |

### BUG-012: Form Pages Show Generic Submit Error Messages

| Field | Value |
|-------|-------|
| Severity | P2 |
| Module | All (Supplier, Customer, Fabric, Quote, Order) |
| Page | SupplierFormPage, CustomerFormPage, FabricFormPage, QuoteFormPage, OrderFormPage |
| Description | All form page submit error handlers show generic messages like "创建失败，请重试" or "更新失败，请重试" without displaying the backend error details (e.g., "公司名称已存在", "面料编码已存在"). |
| Root Cause | Catch blocks log the error but show hardcoded generic message. |
| Affected Files | `frontend/src/pages/suppliers/SupplierFormPage.tsx`, `frontend/src/pages/customers/CustomerFormPage.tsx`, `frontend/src/pages/fabrics/FabricFormPage.tsx`, `frontend/src/pages/quotes/QuoteFormPage.tsx`, `frontend/src/pages/orders/OrderFormPage.tsx` |
| Fix Approach | Use `getErrorMessage()` utility to display specific backend error info in `message.error()`. For validation errors (400), could additionally use `form.setFields()` for inline display. |
| Fix Direction | frontend |

### BUG-013: List Pages Missing Empty State Components

| Field | Value |
|-------|-------|
| Severity | P2 |
| Module | Supplier, Customer, Fabric, Quote, Order |
| Page | SupplierListPage, CustomerListPage, FabricListPage, QuoteListPage, OrderListPage |
| Description | When no data exists, tables show Ant Design's default empty text. No action guidance button (e.g., "新建供应商") is provided. CONTEXT.md decision requires: "Ant Design Empty component + action guidance button". |
| Root Cause | Table components don't set `locale.emptyText` with custom Empty component. |
| Affected Files | All 5 list page files |
| Fix Approach | Add `locale={{ emptyText: <Empty description="暂无数据"><Button>新建XX</Button></Empty> }}` to each list Table component. |
| Fix Direction | frontend |

### BUG-014: Auth Controller Missing `api/v1` Prefix

| Field | Value |
|-------|-------|
| Severity | P2 |
| Module | Auth |
| Page | LoginPage (indirectly) |
| Description | `AuthController` uses `@Controller('auth')` without `api/v1` prefix. However, auth works correctly because the Vite proxy config likely proxies `/auth/*` directly. This is a consistency issue, not a functional break. Auth was verified working in Phase 5. |
| Root Cause | Auth controller predates the `api/v1` prefix convention. |
| Affected Files | `backend/src/auth/auth.controller.ts` |
| Fix Approach | Low priority. Can be fixed in Phase 1 for consistency, but requires updating frontend auth API calls and Vite proxy config. Verify auth still works after change. |
| Fix Direction | both (backend controller + frontend auth API + vite proxy) |

## Discrepancy Matrix

### API Path Alignment

| Module | Frontend API Path | Backend Controller Path | Match | Notes |
|--------|-------------------|-------------------------|-------|-------|
| Supplier | `/suppliers` | `api/v1/suppliers` | YES | apiClient baseURL `/api/v1` + relative path = correct |
| Customer | `/customers` | `api/v1/customers` | YES | |
| Fabric | `/fabrics` | `api/v1/fabrics` | YES | |
| Quote | `/quotes` | `api/v1/quotes` | YES | |
| Order | `/orders` | `api/v1/orders` | YES | |
| Logistics | `/logistics` | `api/v1/logistics` | YES | |
| Import | `/import/*` | `import/*` (NO api/v1) | **NO** | BUG-001: All import calls 404 |
| Auth | Uses separate paths | `auth/*` (NO api/v1) | SPECIAL | Works via Vite proxy; BUG-014 |
| File | `/files` | `api/v1/files` | YES | |
| System | (not directly called) | `api/v1/system` | YES | |

### Search Parameter Alignment

| Module | Frontend Search Field | Backend DTO Field | Match | Notes |
|--------|----------------------|-------------------|-------|-------|
| Supplier | `keyword` | `companyName` | **NO** | BUG-002 |
| Customer | `keyword` | `companyName` | **NO** | BUG-003 |
| Fabric | `keyword` | `fabricCode`, `name`, `color` | **NO** | BUG-004 |
| Quote | `status`, `createdDateRange` | `status`, `createdFrom`, `createdTo` | YES | Date range converted correctly |
| Order | `keyword`, `status`, `customerPayStatus`, `createdDateRange` | `keyword`, `status`, `customerPayStatus`, `createdFrom`, `createdTo` | YES | Backend has `keyword` support |
| Logistics | `orderItemId` | `orderId`, `orderItemId`, `trackingNo`, `carrier` | PARTIAL | BUG-009: frontend type incomplete |

### Error Handling Pattern

| Module | Page | Error Pattern | Correct? | Notes |
|--------|------|---------------|----------|-------|
| Supplier | ListPage (delete) | `error.response?.status` | **NO** | BUG-005 |
| Customer | ListPage (delete) | `error.response?.status` | **NO** | BUG-006 |
| Fabric | ListPage (delete) | Generic catch | PARTIAL | BUG-010: no error code check |
| Quote | ListPage (delete) | `error.response?.status` | **NO** | BUG-007 |
| Quote | DetailPage (delete) | `error.response?.status` | **NO** | BUG-007 |
| Quote | ListPage (convert) | Generic catch | PARTIAL | BUG-008: no 501 handling |
| Quote | DetailPage (convert) | Generic catch | PARTIAL | BUG-008: no 501 handling |
| Order | ListPage (delete) | Generic catch | PARTIAL | BUG-011: no error code check |
| All | FormPages (submit) | Generic catch | PARTIAL | BUG-012: no backend error details |
| Fabric | DetailPage (all ops) | Generic catch | PARTIAL | No specific error codes |
| Customer | DetailPage (pricing) | Generic catch | PARTIAL | No specific error codes |
| Import | ImportPage | `error.code` check | YES | Correctly uses ApiError pattern |

### Loading & Empty States

| Module | Page | Loading State | Empty State | Notes |
|--------|------|---------------|-------------|-------|
| Supplier | ListPage | YES (table loading) | **NO** | BUG-013 |
| Supplier | FormPage | YES (edit mode Spin) | N/A | |
| Supplier | DetailPage | YES (Spin + tabs) | YES (fabrics tab) | |
| Customer | ListPage | YES (table loading) | **NO** | BUG-013 |
| Customer | FormPage | YES (edit mode Spin) | N/A | |
| Customer | DetailPage | YES (Spin + tabs) | YES (addresses, pricing, orders) | |
| Fabric | ListPage | YES (table loading) | **NO** | BUG-013 |
| Fabric | FormPage | YES (edit mode Spin) | N/A | |
| Fabric | DetailPage | YES (Spin + tabs) | YES (images) | |
| Quote | ListPage | YES (table loading) | **NO** | BUG-013 |
| Quote | FormPage | YES (edit mode Spin) | N/A | |
| Quote | DetailPage | YES (Spin) | N/A | |
| Order | ListPage | YES (table loading) | **NO** | BUG-013 |
| Order | FormPage | YES (edit mode Spin) | N/A | |
| Order | DetailPage | YES (Spin + tabs) | Partial | |
| Import | ImportPage | YES (upload progress) | N/A | |

### Detail Page Completeness

| Module | Page | Fields Rendered | Complete? | Notes |
|--------|------|----------------|-----------|-------|
| Supplier | DetailPage | companyName, contactName, phone, wechat, email, status, address, billReceiveType, settleType, creditDays, notes, createdAt, updatedAt + fabrics tab | YES | All fields covered |
| Customer | DetailPage | companyName, contactName, phone, wechat, email, creditType, creditDays, notes, createdAt, updatedAt + addresses, pricing, orders tabs | YES | All fields covered |
| Fabric | DetailPage | fabricCode, name, color, material, composition, weight, width, thickness, handFeel, glossLevel, application, defaultPrice, defaultLeadTime, tags, description, notes, createdAt, updatedAt + images, suppliers, pricing tabs | YES | All fields covered |
| Quote | DetailPage | quoteCode, status, customer, fabric, quantity, unitPrice, totalPrice, validUntil, createdAt, updatedAt, notes | YES | All fields covered |
| Order | DetailPage | Sub-components: OrderInfoSection, OrderItemsSection, PaymentSection, LogisticsSection | YES | Delegated to sub-components |

## Fix Priority Order

Following business flow: Supplier -> Customer -> Fabric -> Quote -> Order -> Logistics -> Import

### Wave 1: Infrastructure (Plan 01)

| Priority | Bug ID | Fix |
|----------|--------|-----|
| 1 | N/A | Create error message mapping utility (`errorMessages.ts`) |

### Wave 2: Supplier + Customer Module (Plan 02)

| Priority | Bug ID | Fix |
|----------|--------|-----|
| 2 | BUG-002 | Add `keyword` to backend `QuerySupplierDto` |
| 3 | BUG-005 | Fix supplier delete error handling (use ApiError) |
| 4 | BUG-013 | Add supplier list empty state |
| 5 | BUG-012 | Fix supplier form generic error message |
| 6 | BUG-003 | Add `keyword` to backend `QueryCustomerDto` |
| 7 | BUG-006 | Fix customer delete error handling (use ApiError) |
| 8 | BUG-013 | Add customer list empty state |
| 9 | BUG-012 | Fix customer form generic error message |

### Wave 3: Fabric + Quote Module (Plan 03)

| Priority | Bug ID | Fix |
|----------|--------|-----|
| 10 | BUG-004 | Add `keyword` to backend `QueryFabricDto` |
| 11 | BUG-010 | Fix fabric delete error handling (add error code check) |
| 12 | BUG-013 | Add fabric list empty state |
| 13 | BUG-012 | Fix fabric form generic error message |
| 14 | BUG-007 | Fix quote delete error handling in list + detail pages |
| 15 | BUG-008 | Fix quote convert 501 error handling |
| 16 | BUG-013 | Add quote list empty state |
| 17 | BUG-012 | Fix quote form generic error message |

### Wave 4: Order + Logistics + Import (Plan 04)

| Priority | Bug ID | Fix |
|----------|--------|-----|
| 18 | BUG-011 | Fix order delete error handling |
| 19 | BUG-013 | Add order list empty state |
| 20 | BUG-012 | Fix order form generic error message |
| 21 | BUG-009 | Expand `QueryLogisticsParams` type |
| 22 | BUG-001 | Fix import controller `api/v1` prefix (P0) |
| 23 | BUG-014 | (Optional) Fix auth controller prefix for consistency |

---

*Audit completed: 2026-03-19*
*Next step: Create error message utility (Plan 01, Task 2), then fix bugs module-by-module (Plans 02-04)*
