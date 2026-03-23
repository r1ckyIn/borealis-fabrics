---
status: resolved
phase: 02-core-feature-implementation
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md
started: 2026-03-23T03:00:00Z
updated: 2026-03-23T03:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Backend Build & Test Suite
expected: Backend builds without errors. All 24 test suites (615 tests) pass including batchConvertToOrder and StorageProvider tests.
result: pass

### 2. Frontend Build & Test Suite
expected: Frontend builds without errors. All 58 test suites (807 tests) pass including updated QuoteDetailPage conversion error handling tests.
result: pass

### 3. Quote-to-Order Single Conversion API
expected: POST /api/v1/quotes/:id/convert-to-order returns 201 with created order. Quote status changes to CONVERTED. Order items use PENDING status with supplier auto-filled from cheapest FabricSupplier.
result: pass

### 4. Quote Batch Conversion API
expected: POST /api/v1/quotes/batch-convert with {quoteIds: [...]} validates all quotes belong to same customer, are active, not expired. Returns 201 with single order containing items from all quotes.
result: pass

### 5. Concurrent Conversion Protection
expected: When two requests try to convert the same quote simultaneously, one succeeds (201) and the other gets 409 Conflict. Redis distributed lock prevents double-conversion.
result: pass

### 6. Storage Provider Abstraction
expected: FileService uses injected StorageProvider. In local mode (STORAGE_MODE=local), files stored to filesystem. DB stores key-only (not full URL). getFileUrl resolves key to full URL at read-time.
result: pass

### 7. Legacy URL Backward Compatibility
expected: getFileUrl returns existing http/https URLs as-is without modification. Only key-only values get resolved through the storage provider.
result: pass

### 8. Frontend Quote Conversion Flow
expected: On QuoteDetailPage for an active quote, clicking "转换为订单" opens confirmation modal. Confirming navigates to the new order page. 409 shows "该报价正在被其他请求转换" warning. 503 shows "系统暂时不可用" warning.
result: pass

### 9. Expired Quote Edit Behavior
expected: On QuoteDetailPage for an expired quote, the Edit button is enabled (not disabled). Clicking navigates to edit page. Convert button is not shown. This allows extending validUntil to reactivate expired quotes.
result: pass (after fix — 3 sub-issues resolved: Decimal string validation, InputNumber width, edit PATCH payload)

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Quote edit form should load with valid values and no validation errors"
  status: resolved
  reason: "User reported: Editing a quote shows '数量必须大于0' and '单价必须大于0' validation errors even though both fields have valid values (641.00 and 25.00). Also input field sizes for quantity and unitPrice are inconsistent."
  severity: major
  test: 9
  root_cause: "Prisma Decimal fields serialize as strings in JSON. form.setFieldsValue receives '641.00' (string) instead of 641 (number). Ant Design type:'number' validation rejects string values. Also unitPrice has both prefix and addonAfter causing inconsistent width."
  artifacts:
    - path: "frontend/src/components/forms/QuoteForm.tsx"
      issue: "setFieldsValue line 102-103 does not convert Decimal strings to numbers; unitPrice InputNumber has prefix+addonAfter causing width inconsistency"
  missing:
    - "Add Number() conversion for quantity and unitPrice in setFieldsValue"
    - "Normalize InputNumber styling between quantity and unitPrice"
