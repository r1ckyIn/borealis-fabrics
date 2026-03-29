# Phase 13: Data Safety & Audit - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

All data mutations are auditable, exportable, and backed up — operators know who changed what and when. Includes soft-delete recovery UI deferred from Phase 12.

Requirements: DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09

</domain>

<decisions>
## Implementation Decisions

### RBAC Role Extension (DATA-07)
- **D-01:** Add `DEV_WEWORK_IDS` environment variable alongside existing `BOSS_WEWORK_IDS`. RolesGuard checks both sets for admin-level roles.
- **D-02:** Developer role has identical permissions to boss (audit log access, soft-delete restore, all admin operations).
- **D-03:** Extend `@Roles('boss')` guard to accept `@Roles('boss', 'developer')` — both check their respective env var ID sets.

### Audit Logging (DATA-04, DATA-05)
- **D-04:** NestJS interceptor captures all CUD operations automatically. Store: userId, action (create/update/delete), entityType, entityId, changes diff, IP, correlationId, timestamp.
- **D-05:** Changes diff format: field-level comparison — `{ field: { old: value, new: value } }` for updates. Create operations store all initial field values. Delete operations store entity summary.
- **D-06:** Consume correlation ID from nestjs-cls (already available from Phase 12).

### Audit Log Frontend (DATA-06)
- **D-07:** New sidebar menu item "审计日志" — accessible only to boss/developer roles. Hidden from other users.
- **D-08:** List view with 5 filters: operator (dropdown), action type (create/update/delete), entity type (dropdown), time range (date picker), keyword search (text input searching changes content and entity names).
- **D-09:** Detail view: field-level change comparison table (field name + old value → new value). Create shows all fields, delete shows entity summary.

### Data Export (DATA-08)
- **D-10:** Centralized export page in sidebar ("数据导出") — all users can access.
- **D-11:** User selects entity type, then chooses which fields to include in the export via checkbox list.
- **D-12:** Export uses ExcelJS (already available from import module). Backend generates Excel file, frontend triggers download.

### Soft-Delete Recovery UI (deferred from Phase 12 D-08)
- **D-13:** All 6 entity list pages (fabric, product, supplier, customer, order, quote) get a "显示已删除" toggle switch, visible only to boss/developer roles.
- **D-14:** Deleted items shown with visual distinction (e.g., row styling). Each deleted item has a "恢复" (restore) button.
- **D-15:** Restore calls existing backend `PATCH /:id/restore` endpoints (already implemented in Phase 12).

### DB Backup (DATA-09)
- **D-16:** Verify CDB automatic backup is working. Create supplementary mysqldump-to-COS shell script with cron schedule and retention policy.

### Claude's Discretion
- Audit log Prisma model design and indexing strategy
- NestJS interceptor vs decorator implementation approach (or hybrid)
- ExcelJS export template and formatting
- Backup script scheduling and retention period
- Frontend component architecture for audit log page
- Keyword search implementation (SQL LIKE vs full-text index)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & API
- `docs/ARCHITECTURE.md` — Full system architecture, API specs, business rules
- `docs/SECURITY.md` — Authentication, CSP, rate limiting, input validation

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — v1.1 requirements (DATA-04..09)
- `.planning/ROADMAP.md` — Phase 13 success criteria and plan breakdown

### Prior Phase Context
- `.planning/phases/12-foundation-observability-quick-wins/12-CONTEXT.md` — Phase 12 decisions (correlation ID, soft delete, RBAC, CLS patterns)

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — Naming, error handling, logging patterns
- `.planning/codebase/CONCERNS.md` — Known tech debt and fragile areas
- `.planning/codebase/STACK.md` — Full dependency list and versions
- `.planning/codebase/STRUCTURE.md` — Project directory structure

### Key Implementation Files
- `backend/src/common/guards/roles.guard.ts` — Existing RolesGuard (extend for developer role)
- `backend/src/common/decorators/roles.decorator.ts` — Existing @Roles decorator
- `backend/src/common/interceptors/user-cls.interceptor.ts` — CLS user storage interceptor
- `backend/src/common/filters/http-exception.filter.ts` — AllExceptionsFilter with correlation ID
- `frontend/src/components/layout/Sidebar.tsx` — Sidebar menu (add audit log + export entries)
- `backend/src/import/utils/excel.utils.ts` — Existing ExcelJS utilities (reuse for export)
- `backend/prisma/schema.prisma` — Add AuditLog model

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RolesGuard` + `@Roles()` decorator — RBAC infrastructure, extend for developer role
- `UserClsInterceptor` — Stores `request.user` in CLS, already available for audit user extraction
- `nestjs-cls` — Correlation ID generation and propagation already working
- `ExcelJS` — Already used in import strategies (`excel.utils.ts`), reuse for export
- `AllExceptionsFilter` — Correlation ID in error responses, pattern for interceptor design
- Backend restore endpoints (`PATCH /:id/restore`) — Already exist for all soft-deleted entities

### Established Patterns
- RBAC: `BOSS_WEWORK_IDS` env var → `Set<string>` in guard constructor → weworkId check
- CLS: `cls.get<RequestUser>('user')` for operator context in services
- Sidebar: Static `menuItems` array in `Sidebar.tsx`, route-based navigation
- List pages: Ant Design Table + pagination + filters pattern across all entity pages
- Error handling: NestJS built-in exceptions, standardized error response format

### Integration Points
- `RolesGuard` — Add developer ID check alongside boss check
- `Sidebar.tsx` — Add "审计日志" and "数据导出" menu items (conditionally for audit log)
- `App.tsx` — Add routes for audit log and export pages
- `prisma/schema.prisma` — New AuditLog model
- `app.module.ts` — Register AuditModule, ExportModule
- Entity list pages (6 pages) — Add "显示已删除" toggle for boss/developer

</code_context>

<specifics>
## Specific Ideas

- Audit log detail view uses table format: field name | old value → new value (not JSON diff)
- Export page provides field checkbox selection per entity type
- Soft-delete recovery toggle is a Switch component in list page toolbar, visually distinct
- Developer role = system developer/maintainer, same permissions as boss, configured via env var

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-data-safety-audit*
*Context gathered: 2026-03-29*
