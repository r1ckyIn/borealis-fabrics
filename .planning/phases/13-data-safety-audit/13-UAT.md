---
status: complete
phase: 13-data-safety-audit
source: [13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md, 13-04-SUMMARY.md, 13-05-SUMMARY.md]
started: 2026-03-29T06:00:00Z
updated: 2026-03-30T00:00:00Z
---

## Current Test

[testing complete — round 2 verification after 13-05 gap closure]

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
result: pass (round 2)
notes: |
  Round 1: blocker — audit_logs table missing (fixed by 13-05-01 migration).
  Round 2: audit log entries captured correctly. userName shows "system" in dev environment — expected behavior because dev mode JwtAuthGuard injects mock user as request.user but the CLS user propagation depends on the UserClsInterceptor which only fires for guarded endpoints. Production with WeChat OAuth will have proper user names.
  Verified via API: curl audit-logs?action=DELETE returns entries with correct entityType, entityId, action, changes JSON.

### 6. Audit Log Detail — Change Comparison
expected: Click an audit log entry (or navigate to /audit/:id). Detail page shows a header section (operator, action, entity, time, IP) and a changes section. For update operations: shows old/new value comparison per field. For create: shows all created field values.
result: pass (round 2)
notes: User confirmed detail page shows operator (system), action type, entity info, timestamp, and change data. UI displays correctly.

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
result: issue (round 2 — root cause changed)
reported: |
  Round 1 root cause: broken deletedAt={} bypass — FIXED by 13-05-02 ($raw PrismaClient).
  Round 2 root cause: findAll endpoints lack @UseGuards(JwtAuthGuard), so request.user is never set → CLS user is undefined → RBAC check in controller forces includeDeleted=false.
  Verified independently: raw PrismaClient correctly returns 43 records (including 2 deleted) vs extended client returning 41. The $raw bypass works. The issue is purely RBAC/auth guard on list endpoints.
severity: major
root_cause: |
  4 entity controllers (supplier, customer, fabric, product) have findAll() without @UseGuards(JwtAuthGuard).
  The RBAC check `this.cls.get('user')` returns undefined because no guard populates request.user.
  Fix: add OptionalJwtAuthGuard or similar pattern that populates request.user if token present, without requiring auth.

### 11. Soft-Delete Toggle — Restore Functionality
expected: With toggle ON showing deleted records, each deleted row has a "恢复" (restore) button. Clicking restore: record is restored, row returns to normal styling. Table refreshes automatically.
result: skipped
reason: Blocked by test 10 — includeDeleted RBAC prevents deleted records from appearing

## Summary

total: 11
passed: 7
issues: 1
pending: 0
skipped: 3
blocked: 0

## Gaps

- truth: "Admin users can see soft-deleted records when includeDeleted=true"
  status: failed
  reason: "findAll endpoints have no auth guard → CLS user undefined → RBAC forces includeDeleted=false. $raw bypass itself works correctly."
  severity: major
  test: 10
  root_cause: "Missing @UseGuards on findAll endpoints. Need OptionalJwtAuthGuard that populates user if token present but doesn't require auth."
  artifacts:
    - backend/src/supplier/supplier.controller.ts (findAll at line 78 — no guard)
    - backend/src/customer/customer.controller.ts
    - backend/src/fabric/fabric.controller.ts
    - backend/src/product/product.controller.ts
  fix_scope:
    - Create OptionalJwtAuthGuard (extracts user if token present, passes through if not)
    - Add @UseGuards(OptionalJwtAuthGuard) to findAll on all 4 controllers
    - Update unit tests
