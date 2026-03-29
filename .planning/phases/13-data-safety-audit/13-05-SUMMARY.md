---
phase: 13-data-safety-audit
plan: 05
subsystem: database, api
tags: [prisma, migration, soft-delete, mysql]

requires:
  - phase: 13-01
    provides: AuditLog Prisma model in schema.prisma
  - phase: 13-04
    provides: includeDeleted query parameter in 4 entity services
provides:
  - audit_logs table migration applied to database
  - working includeDeleted bypass via raw PrismaClient
affects: [13-data-safety-audit]

tech-stack:
  added: []
  patterns:
    - "Raw PrismaClient ($raw) for bypassing soft-delete extension on admin queries"

key-files:
  created:
    - backend/prisma/migrations/20260329084006_add_audit_log_table/migration.sql
  modified:
    - backend/src/prisma/prisma.service.ts
    - backend/src/supplier/supplier.service.ts
    - backend/src/customer/customer.service.ts
    - backend/src/fabric/fabric.service.ts
    - backend/src/product/product.service.ts
    - backend/src/supplier/supplier.service.spec.ts

key-decisions:
  - "Use raw PrismaClient ($raw) instead of empty object trick for includeDeleted — empty object bypass does not work with prisma-extension-soft-delete"
  - "Include unarchived column drops in migration to resolve schema drift from soft_delete_migration"

patterns-established:
  - "Raw client pattern: this.prisma.$raw for queries that need to bypass soft-delete extension"

requirements-completed: [DATA-04, DATA-05, DATA-07]

duration: 15min
completed: 2026-03-29
---

# Plan 13-05: Gap Closure Summary

**audit_logs table migration + raw PrismaClient bypass for includeDeleted soft-delete queries**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-29T08:30:00Z
- **Completed:** 2026-03-29T08:45:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created and applied audit_logs table migration with 4 indexes
- Resolved schema drift (dropped orphaned `unarchived` columns from soft_delete_migration)
- Replaced broken empty-object bypass (`where.deletedAt = {}`) with raw PrismaClient pattern across 4 entity services
- Updated unit tests to verify $raw client usage

## Task Commits

Each task was committed atomically:

1. **Task 13-05-01: Create AuditLog Prisma Migration** - `25f9a1c` (fix)
2. **Task 13-05-02: Fix includeDeleted Soft-Delete Bypass** - `8412808` (fix)

## Files Created/Modified
- `backend/prisma/migrations/20260329084006_add_audit_log_table/migration.sql` - CREATE TABLE audit_logs + DROP unarchived columns
- `backend/src/prisma/prisma.service.ts` - Added $raw PrismaClient property
- `backend/src/supplier/supplier.service.ts` - Use $raw for includeDeleted queries
- `backend/src/customer/customer.service.ts` - Use $raw for includeDeleted queries
- `backend/src/fabric/fabric.service.ts` - Use $raw for includeDeleted queries
- `backend/src/product/product.service.ts` - Use $raw for includeDeleted queries
- `backend/src/supplier/supplier.service.spec.ts` - Updated tests for $raw mock

## Decisions Made
- Used raw PrismaClient ($raw) instead of fixing the empty object trick. Root cause: Prisma query engine treats `{}` as no-op filter, so the extension's `deletedAt: null` override still applies. Raw client completely bypasses the extension.
- Included `unarchived` column drops in the migration to resolve pre-existing schema drift, avoiding future migration conflicts.

## Deviations from Plan
- Added `unarchived` column drops to migration SQL (not in original plan) — necessary to resolve schema drift that blocked `prisma migrate dev`.
- Used manually-written migration SQL instead of `prisma migrate dev` — Prisma detected non-interactive environment.

## Issues Encountered
- `prisma migrate dev` failed in non-interactive environment — resolved by manually writing migration SQL and using `prisma migrate deploy`.
- Schema drift detected (orphaned `unarchived` columns) — included DROP statements in migration.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 13 gap closure complete — both UAT blockers resolved
- Ready for phase verification and PR cycle

---
*Phase: 13-data-safety-audit*
*Completed: 2026-03-29*
