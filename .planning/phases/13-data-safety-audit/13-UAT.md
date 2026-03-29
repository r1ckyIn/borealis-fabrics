---
status: complete
phase: 13-data-safety-audit
source: [13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md, 13-04-SUMMARY.md]
started: 2026-03-29T06:00:00Z
updated: 2026-03-29T07:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Start backend from scratch. Server boots without errors. Prisma connects, AuditModule and ExportModule initialize. Health check returns 200.
result: skipped
reason: User did not test

### 2. Sidebar — Admin Sees Audit Log Menu
expected: Login as admin (boss or developer weworkId). Sidebar shows "审计日志" menu item. Clicking it navigates to /audit.
result: pass

### 3. Sidebar — Non-Admin Does NOT See Audit Log
expected: Login as a regular user (non-boss, non-developer). Sidebar does NOT show "审计日志". "数据导出" is still visible to all users.
result: pass

### 4. Audit Log List Page
expected: Navigate to /audit. Page shows a table with columns: time, operator, action, entity type, entity ID. Above the table: 5 filter controls (operator name input, action type select, entity type select, date range picker, keyword search). Pagination at bottom.
result: pass

### 5. Audit Log Auto-Capture
expected: Perform a CUD operation (e.g., create or edit a supplier). Navigate to /audit. The operation appears as a new audit log entry with correct operator name, action, entity type, and entity ID.
result: issue
reported: "audit_logs table does not exist in database. Prisma migration for AuditLog model was created in worktree but migration file was not merged back to main branch."
severity: blocker

### 6. Audit Log Detail — Change Comparison
expected: Click an audit log entry (or navigate to /audit/:id). Detail page shows a header section (operator, action, entity, time, IP) and a changes section. For update operations: shows old/new value comparison per field. For create: shows all created field values.
result: skipped
reason: Blocked by test 5 — audit_logs table does not exist

### 7. Export Page — Entity and Field Selection
expected: Navigate to /export. Page shows entity type radio buttons (supplier, customer, fabric, product, order, quote). Selecting an entity loads its available fields as checkboxes. A "select all" toggle exists. An export/download button is visible.
result: pass

### 8. Export Page — Excel Download
expected: On /export, select an entity type, check some fields, click download/export. Browser downloads an .xlsx file. Opening the file shows only the selected fields as columns, with data rows from the database.
result: pass

### 9. Soft-Delete Toggle — Admin Visibility
expected: Login as admin. Navigate to supplier/customer/fabric/product list pages. Each page shows a "显示已删除" toggle switch (visible only to admin). Quote and Order pages do NOT show the toggle.
result: pass

### 10. Soft-Delete Toggle — Deleted Row Styling
expected: On a list page (e.g., suppliers), toggle "显示已删除" ON. If any soft-deleted records exist, they appear in the table with a red-tinted background (different from active rows). Active rows look normal.
result: issue
reported: "includeDeleted=true does not return soft-deleted records. The empty object bypass trick (where.deletedAt = {} as Prisma.DateTimeNullableFilter) does not work with the Prisma soft-delete extension. Database has a deleted supplier (id=43 Sydney Test, deletedAt=2026-03-29) but API returns 42 records, all with deletedAt=None."
severity: blocker

### 11. Soft-Delete Toggle — Restore Functionality
expected: With toggle ON showing deleted records, each deleted row has a "恢复" (restore) button. Clicking restore: record is restored, row returns to normal styling. Table refreshes automatically.
result: skipped
reason: Blocked by test 10 — includeDeleted does not return deleted records

## Summary

total: 11
passed: 6
issues: 2
pending: 0
skipped: 3
blocked: 0

## Gaps

- truth: "Every CUD operation on business entities creates an AuditLog record"
  status: failed
  reason: "User reported: audit_logs table does not exist in database. Prisma migration file was created in worktree but not merged to main branch."
  severity: blocker
  test: 5
  artifacts:
    - backend/prisma/schema.prisma (AuditLog model exists)
  missing:
    - backend/prisma/migrations/*_add_audit_log_table/migration.sql

- truth: "Backend returns deleted records alongside active records when includeDeleted=true query param is set"
  status: failed
  reason: "User reported: includeDeleted=true does not return soft-deleted records. Empty object bypass (where.deletedAt={}) does not work with Prisma soft-delete extension."
  severity: blocker
  test: 10
  artifacts:
    - backend/src/supplier/supplier.service.ts (includeDeleted logic at line ~78)
    - backend/src/customer/customer.service.ts
    - backend/src/fabric/fabric.service.ts
    - backend/src/product/product.service.ts
  missing: []
