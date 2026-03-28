---
phase: 12-foundation-observability-quick-wins
plan: 02
subsystem: backend-data
tags: [soft-delete, prisma, migration, rbac]
dependency_graph:
  requires: []
  provides: [deletedAt-soft-delete, roles-guard, restore-endpoints]
  affects: [all-backend-services, all-backend-tests]
tech_stack:
  added: [prisma-extension-soft-delete]
  patterns: [prisma-client-extension-delegate, mysql-generated-columns, raw-sql-restore]
key_files:
  created:
    - backend/prisma/migrations/20260328090000_soft_delete_migration/migration.sql
    - backend/src/common/guards/roles.guard.ts
    - backend/src/common/decorators/roles.decorator.ts
  modified:
    - backend/prisma/schema.prisma
    - backend/src/prisma/prisma.service.ts
    - backend/src/supplier/supplier.service.ts
    - backend/src/customer/customer.service.ts
    - backend/src/fabric/fabric.service.ts
    - backend/src/product/product.service.ts
    - backend/src/order/order.validators.ts
    - backend/src/order/order.service.ts
    - backend/src/quote/quote.service.ts
    - backend/src/import/strategies/sales-contract-import.strategy.ts
    - backend/src/import/strategies/purchase-order-import.strategy.ts
    - backend/src/import/strategies/product-import.strategy.ts
decisions:
  - "Prisma extension via model delegate patching (not internal property) to preserve PrismaClient type compatibility"
  - "Raw SQL for restore operations to bypass soft-delete auto-filtering"
  - "Boss role via BOSS_WEWORK_IDS env var (MVP approach, no User.role field needed)"
  - "Removed requireActive param from validateEntityIds since extension handles filtering"
metrics:
  duration: "34 minutes"
  completed: "2026-03-28T09:22:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 47
  tests_passing: 832
---

# Phase 12 Plan 02: Soft Delete Migration Summary

Migrated all 6 business entities from isActive boolean to deletedAt timestamp soft-delete using Prisma Client Extensions with MySQL generated columns for unique constraint compatibility, plus boss-only restore endpoints.

## What Changed

### Task 1: Prisma Schema Migration + Soft-Delete Extension
- **Schema**: Replaced `isActive Boolean` with `deletedAt DateTime?` on User, Fabric, Supplier, Customer, Product, ProductBundle
- **Migration**: Created SQL migration with data migration (`isActive=false` -> `deletedAt=NOW()`), MySQL generated columns (`unarchived BOOLEAN GENERATED ALWAYS AS`) for unique constraint compatibility on Fabric/Supplier/Product/ProductBundle, and `deleted_at` indexes
- **PrismaService**: Applied `prisma-extension-soft-delete` via model delegate patching pattern -- the extended client's model delegates are assigned to `this` via `Object.defineProperty` getters, preserving PrismaClient type compatibility for all 32+ consuming services
- **Commit**: `b66b7f0`

### Task 2a: Remove isActive from Supplier/Customer/Fabric/Product Modules
- Removed all `isActive: true` explicit filters from service where clauses (auto-filtered by extension)
- Changed `update({ data: { isActive: false } })` to `delete()` in all service remove methods (extension intercepts)
- Removed `isActive` from query DTOs and `@ApiQuery` decorators
- Updated all unit tests: mock objects use `deletedAt: null`, where clause expectations updated
- **Commit**: `a22dee7`

### Task 2b: Remove isActive from Order/Quote/Import/Auth + Restore Endpoints
- Removed all remaining isActive references across order validators, quote service, import strategies, auth tests
- Created `RolesGuard` using `BOSS_WEWORK_IDS` env var for MVP role-based access control
- Created `Roles` decorator for specifying required roles on endpoints
- Added `PATCH /:id/restore` endpoints to all 4 entity controllers, protected with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('boss')`
- Restore methods use raw SQL (`$queryRawUnsafe`/`$executeRawUnsafe`) to bypass soft-delete auto-filtering
- **Commit**: `b1d7d9e`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PrismaService $extends type incompatibility**
- **Found during:** Task 1
- **Issue:** `$extends()` returns a new client type incompatible with `PrismaClient`. Services using `Prisma.TransactionClient` type would break if PrismaService no longer extends PrismaClient.
- **Fix:** Used model delegate patching pattern -- PrismaService still extends PrismaClient, but model accessor getters return the extended client's delegates. This preserves type compatibility with all 32+ consuming services.
- **Files modified:** backend/src/prisma/prisma.service.ts

**2. [Rule 3 - Blocking] Prisma migrate dev non-interactive mode**
- **Found during:** Task 1
- **Issue:** `prisma migrate dev --create-only` fails in non-interactive terminal (CI/agent environment)
- **Fix:** Created migration directory and SQL file manually, applied via `prisma migrate deploy`
- **Files modified:** backend/prisma/migrations/20260328090000_soft_delete_migration/

**3. [Rule 1 - Bug] Controller spec DI resolution failures**
- **Found during:** Task 2b
- **Issue:** Adding `@UseGuards(JwtAuthGuard, RolesGuard)` to controllers caused all controller spec tests to fail because NestJS tries to resolve guard dependencies during module compilation
- **Fix:** Added `.overrideGuard(JwtAuthGuard).useValue({canActivate: () => true})` and same for RolesGuard in all 4 controller specs
- **Files modified:** 4 controller spec files

**4. [Rule 1 - Bug] Unused requireActive parameter lint error**
- **Found during:** Task 2b
- **Issue:** After removing isActive logic from `validateEntityIds`, the `requireActive` parameter became unused, causing a lint error
- **Fix:** Removed the parameter entirely and removed the `false` argument from callers
- **Files modified:** backend/src/order/order.validators.ts, backend/src/order/order.service.ts

## Decisions Made

1. **Prisma extension approach**: Model delegate patching (keep PrismaService extends PrismaClient, patch getters) over property delegation (which would require changing `this.prisma.xxx` to `this.prisma.client.xxx` in 32+ files)
2. **Restore via raw SQL**: Used `$queryRawUnsafe`/`$executeRawUnsafe` to bypass soft-delete auto-filtering for restore operations, avoiding the need for a separate "include deleted" query mechanism
3. **Boss role MVP**: Used `BOSS_WEWORK_IDS` env var (comma-separated weworkIds) instead of adding a `role` field to User model -- simplest approach for small team

## Verification Results

| Check | Result |
|-------|--------|
| `grep -r "isActive" backend/src/ backend/prisma/schema.prisma` | 0 matches |
| `pnpm build` | Pass |
| `pnpm test` | 832 passed, 0 failed |
| `pnpm lint` | 0 errors, 2 pre-existing warnings |
| Schema has deletedAt on 6 models | Verified |
| Migration SQL has data migration | Verified (6 UPDATE statements) |
| Migration SQL has generated columns | Verified (4 tables) |
| Restore endpoints exist | Verified (4 controllers) |
| RolesGuard exists with boss check | Verified |
| BOSS_WEWORK_IDS in .env.example | Verified |

## Known Stubs

None -- all functionality is fully wired.

## Self-Check: PASSED

- All key files exist (migration SQL, roles guard, roles decorator, prisma service, SUMMARY)
- All 3 task commits verified (b66b7f0, a22dee7, b1d7d9e)
- Build, test (832 pass), lint all clean
