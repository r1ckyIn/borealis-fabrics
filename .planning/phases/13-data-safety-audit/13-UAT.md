---
status: partial
phase: 13-data-safety-audit
source: [13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md, 13-04-SUMMARY.md]
started: 2026-03-29T06:00:00Z
updated: 2026-03-29T06:35:00Z
---

## Current Test

[testing paused — backend server not running]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Start backend from scratch. Server boots without errors. Prisma connects, AuditModule and ExportModule initialize. Health check returns 200.
result: skipped
reason: User did not test

### 2. Sidebar — Admin Sees Audit Log Menu
expected: Login as admin (boss or developer weworkId). Sidebar shows "审计日志" menu item under a management section. Clicking it navigates to /audit.
result: blocked
blocked_by: server
reason: "Dev login failed — backend server not running, curl to localhost:3000 returns connection refused"

### 3. Sidebar — Non-Admin Does NOT See Audit Log
expected: Login as a regular user (non-boss, non-developer). Sidebar does NOT show "审计日志". "数据导出" is still visible to all users.
result: blocked
blocked_by: server
reason: "Cannot login — backend server not running"

### 4. Audit Log List Page
expected: Navigate to /audit. Page shows a table with columns: time, operator, action, entity type, entity ID. Above the table: 5 filter controls (operator name input, action type select, entity type select, date range picker, keyword search). Pagination at bottom.
result: blocked
blocked_by: server
reason: "Cannot login — backend server not running"

### 5. Audit Log Auto-Capture
expected: Perform a CUD operation (e.g., create or edit a supplier). Navigate to /audit. The operation appears as a new audit log entry with correct operator name, action, entity type, and entity ID.
result: blocked
blocked_by: server
reason: "Cannot login — backend server not running"

### 6. Audit Log Detail — Change Comparison
expected: Click an audit log entry (or navigate to /audit/:id). Detail page shows a header section (operator, action, entity, time, IP) and a changes section. For update operations: shows old/new value comparison per field. For create: shows all created field values.
result: blocked
blocked_by: server
reason: "Cannot login — backend server not running"

### 7. Export Page — Entity and Field Selection
expected: Navigate to /export. Page shows entity type radio buttons (supplier, customer, fabric, product, order, quote). Selecting an entity loads its available fields as checkboxes. A "select all" toggle exists. An export/download button is visible.
result: blocked
blocked_by: server
reason: "Cannot login — backend server not running"

### 8. Export Page — Excel Download
expected: On /export, select an entity type, check some fields, click download/export. Browser downloads an .xlsx file. Opening the file shows only the selected fields as columns, with data rows from the database.
result: blocked
blocked_by: server
reason: "Cannot login — backend server not running"

### 9. Soft-Delete Toggle — Admin Visibility
expected: Login as admin. Navigate to supplier/customer/fabric/product list pages. Each page shows a "显示已删除" toggle switch (visible only to admin). Quote and Order pages do NOT show the toggle.
result: blocked
blocked_by: server
reason: "Cannot login — backend server not running"

### 10. Soft-Delete Toggle — Deleted Row Styling
expected: On a list page (e.g., suppliers), toggle "显示已删除" ON. If any soft-deleted records exist, they appear in the table with a red-tinted background (different from active rows). Active rows look normal.
result: blocked
blocked_by: server
reason: "Cannot login — backend server not running"

### 11. Soft-Delete Toggle — Restore Functionality
expected: With toggle ON showing deleted records, each deleted row has a "恢复" (restore) button. Clicking restore: confirmation prompt appears. After confirming, the record is restored (deletedAt becomes null), row returns to normal styling. Table refreshes automatically.
result: blocked
blocked_by: server
reason: "Cannot login — backend server not running"

## Summary

total: 11
passed: 0
issues: 0
pending: 0
skipped: 1
blocked: 10

## Gaps

[none yet — all failures are blocked by server, not code issues]
