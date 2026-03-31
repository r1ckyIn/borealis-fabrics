---
phase: 13-data-safety-audit
plan: 06
subsystem: api, testing
tags: [auth, guard, rbac, soft-delete, ci, typescript, buffer, e2e]

# Dependency graph
requires:
  - phase: 13-05
    provides: soft-delete RBAC bypass fix via raw PrismaClient
  - phase: 12
    provides: ClsService integration, AllExceptionsFilter with ClsService constructor
provides:
  - OptionalJwtAuthGuard for public endpoints with optional auth
  - RBAC enforcement on findAll includeDeleted parameter
  - CI tsc --noEmit passes with 0 errors (was 18 errors)
affects: [14-containerization, 15-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OptionalJwtAuthGuard: silently pass on missing/invalid token, populate user on valid token"
    - "@ts-expect-error for Node 22 Buffer<ArrayBufferLike> vs ExcelJS Buffer type mismatch"
    - "Mock ClsService with getId() stub for E2E AllExceptionsFilter instantiation"

key-files:
  created:
    - backend/src/auth/guards/optional-jwt-auth.guard.ts
    - backend/src/auth/guards/index.ts
  modified:
    - backend/src/auth/auth.module.ts
    - backend/src/supplier/supplier.controller.ts
    - backend/src/customer/customer.controller.ts
    - backend/src/fabric/fabric.controller.ts
    - backend/src/product/product.controller.ts
    - backend/src/export/export.service.ts
    - backend/src/export/export.service.spec.ts
    - backend/src/system/system.controller.spec.ts
    - backend/src/supplier/supplier.controller.spec.ts
    - backend/src/customer/customer.controller.spec.ts
    - backend/src/fabric/fabric.controller.spec.ts
    - backend/src/product/product.controller.spec.ts
    - backend/test/app.e2e-spec.ts
    - backend/test/auth.e2e-spec.ts
    - backend/test/customer.e2e-spec.ts
    - backend/test/fabric.e2e-spec.ts
    - backend/test/file.e2e-spec.ts
    - backend/test/import.e2e-spec.ts
    - backend/test/logistics.e2e-spec.ts
    - backend/test/order.e2e-spec.ts
    - backend/test/quote.e2e-spec.ts
    - backend/test/supplier.e2e-spec.ts

key-decisions:
  - "OptionalJwtAuthGuard as separate guard (not extending JwtAuthGuard) for clean separation of concerns"
  - "@ts-expect-error over as-cast for Node 22 Buffer generic mismatch with ExcelJS (as Buffer / as unknown as Buffer both fail)"
  - "Mock ClsService inline in E2E specs rather than importing ClsModule (simpler, less invasive)"

patterns-established:
  - "OptionalJwtAuthGuard pattern: use on public endpoints that need optional auth for RBAC checks"
  - "Controller spec pattern: override OptionalJwtAuthGuard alongside JwtAuthGuard and RolesGuard"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-03-31
---

# Plan 13-06: Fix includeDeleted RBAC + CI Failures Summary

**OptionalJwtAuthGuard for RBAC on public findAll endpoints, plus 18 CI TypeScript errors resolved across unit and E2E specs**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-31T10:49:50Z
- **Completed:** 2026-03-31T11:05:00Z
- **Tasks:** 4
- **Files modified:** 24

## Accomplishments

- Created OptionalJwtAuthGuard that silently passes on missing/invalid tokens but populates request.user on valid ones
- Applied guard to findAll on Supplier, Customer, Fabric, Product controllers for includeDeleted RBAC enforcement
- Fixed 7 Buffer type errors in export.service.spec.ts (Node 22 Buffer<ArrayBufferLike> vs ExcelJS)
- Fixed 1 stale mock in system.controller.spec.ts (missing productCategory/productSubCategory)
- Fixed 10 AllExceptionsFilter constructor errors in E2E specs (missing ClsService argument since Phase 12)
- All 905 unit tests pass, tsc --noEmit 0 errors, build passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OptionalJwtAuthGuard** - `d76e1a7` (feat)
2. **Task 2: Apply OptionalJwtAuthGuard to findAll endpoints** - `fe3efb8` (feat)
3. **Task 3: Fix Buffer type and stale mock in unit tests** - `bf6dca2` (fix)
4. **Task 4: Fix AllExceptionsFilter constructor in E2E tests** - `bf65005` (fix)

## Files Created/Modified

- `backend/src/auth/guards/optional-jwt-auth.guard.ts` - New guard: optional JWT auth, never throws
- `backend/src/auth/guards/index.ts` - Guards barrel export
- `backend/src/auth/auth.module.ts` - Register OptionalJwtAuthGuard as provider + export
- `backend/src/supplier/supplier.controller.ts` - @UseGuards(OptionalJwtAuthGuard) on findAll
- `backend/src/customer/customer.controller.ts` - @UseGuards(OptionalJwtAuthGuard) on findAll
- `backend/src/fabric/fabric.controller.ts` - @UseGuards(OptionalJwtAuthGuard) on findAll
- `backend/src/product/product.controller.ts` - @UseGuards(OptionalJwtAuthGuard) on findAll
- `backend/src/export/export.service.ts` - Cast Buffer.from() as Buffer for Node 22
- `backend/src/export/export.service.spec.ts` - @ts-expect-error for ExcelJS load() calls
- `backend/src/system/system.controller.spec.ts` - Add productCategory/productSubCategory to mock
- `backend/src/{supplier,customer,fabric,product}/controller.spec.ts` - Override OptionalJwtAuthGuard
- `backend/test/*.e2e-spec.ts` (10 files) - Pass mock ClsService to AllExceptionsFilter

## Decisions Made

1. **OptionalJwtAuthGuard as separate class** -- Not extending JwtAuthGuard to keep try/catch-only-on-failure behavior clean. Same token extraction logic but never throws.
2. **@ts-expect-error for Buffer mismatch** -- Both `as Buffer` and `as unknown as Buffer` casts fail against Node 22's `Buffer<ArrayBufferLike>` when passed to ExcelJS `load()`. `@ts-expect-error` is the correct TypeScript idiom here.
3. **Inline mock ClsService** -- `{ getId: () => 'test-correlation-id' } as unknown as ClsService` in each E2E spec rather than importing ClsModule. Simpler and avoids adding module dependencies to minimal E2E test setups.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Controller specs missing OptionalJwtAuthGuard override**
- **Found during:** Task 2 verification (pnpm test)
- **Issue:** Adding @UseGuards(OptionalJwtAuthGuard) to controllers caused 4 controller specs to fail because OptionalJwtAuthGuard requires ConfigService, JwtService, and RedisService via DI
- **Fix:** Added `.overrideGuard(OptionalJwtAuthGuard).useValue({ canActivate: () => true })` to all 4 controller spec test modules
- **Files modified:** supplier.controller.spec.ts, customer.controller.spec.ts, fabric.controller.spec.ts, product.controller.spec.ts
- **Verification:** All 905 unit tests pass
- **Committed in:** bf6dca2 (Task 3 commit, batched with other test fixes)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Necessary fix for correctness. Controller specs must mock all guards used on controller methods.

## Issues Encountered

- `as unknown as Buffer` cast does not resolve Node 22 `Buffer<ArrayBufferLike>` type incompatibility with ExcelJS's `load(buffer: Buffer)` signature. This is a known TypeScript limitation where the `Buffer` type alias resolves differently in user code vs library .d.ts files. Resolved with `@ts-expect-error` directive, which is the idiomatic TypeScript solution.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all functionality fully wired.

## Next Phase Readiness

- Phase 13 gap closure complete: all 6 plans executed
- CI should now pass tsc --noEmit with 0 errors
- Ready for PR cycle to merge Phase 13 into main, then proceed to Phase 14

## Self-Check: PASSED

All key files verified present on disk. All 4 task commits verified in git log.

---
*Phase: 13-data-safety-audit*
*Completed: 2026-03-31*
