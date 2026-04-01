---
phase: 15-observability-performance
plan: 02
subsystem: backend-caching
tags: [redis, cache-aside, performance, caching]
dependency_graph:
  requires: [RedisService, CommonModule]
  provides: [CacheService, cache-aside-pattern]
  affects: [FabricService, ProductService, SupplierService, CustomerService, SystemService]
tech_stack:
  added: [CacheService]
  patterns: [cache-aside, SCAN-based-invalidation, graceful-degradation]
key_files:
  created:
    - backend/src/common/services/cache.service.ts
    - backend/src/common/services/cache.service.spec.ts
  modified:
    - backend/src/common/common.module.ts
    - backend/src/fabric/fabric.service.ts
    - backend/src/fabric/fabric.service.spec.ts
    - backend/src/product/product.service.ts
    - backend/src/product/product.service.spec.ts
    - backend/src/supplier/supplier.service.ts
    - backend/src/supplier/supplier.service.spec.ts
    - backend/src/customer/customer.service.ts
    - backend/src/customer/customer.service.spec.ts
    - backend/src/system/system.service.ts
    - backend/src/system/system.service.spec.ts
    - backend/src/system/system.controller.ts
    - backend/src/system/system.controller.spec.ts
decisions:
  - Cache-aside passthrough mock pattern for service tests (factory called directly, no actual caching)
  - SystemService.getAllEnums changed from sync to async to support cache wrapper
  - SCAN-based invalidation (not KEYS) for production safety on large keyspaces
metrics:
  duration: 13m
  completed: 2026-04-01
  tasks: 2
  files_created: 2
  files_modified: 13
---

# Phase 15 Plan 02: Redis Cache-Aside for Reference Data Summary

CacheService with getOrSet + invalidateByPrefix applied to 5 read-heavy services; entity lists cached 5min, system enums cached 24h, CUD operations invalidate by prefix using cursor-based SCAN

## What Was Built

### Task 1: CacheService (TDD)

Created `CacheService` in `backend/src/common/services/cache.service.ts`:
- `getOrSet<T>(key, ttlSeconds, factory)`: Cache-aside read-through with JSON serialization
- `invalidateByPrefix(prefix)`: Cursor-based SCAN loop deleting matching keys in batches of 100
- All keys prefixed with `cache:` namespace to avoid collision with `seq:` and `lock:` key patterns
- Graceful degradation: Redis unavailability falls through to factory call (no errors thrown)
- Parse errors on cached values log warning and fall through to factory
- Registered and exported from `CommonModule` (globally available)
- 8 unit tests covering: cache hit, cache miss, Redis down, invalid JSON, SCAN deletion, null client, multi-iteration SCAN

### Task 2: Cache-Aside Applied to 5 Services

| Service | Method | Cache Key Pattern | TTL | CUD Invalidation |
|---------|--------|-------------------|-----|------------------|
| FabricService | findAll | `fabric:list:${JSON.stringify(query)}` | 300s (5min) | create, update, remove, restore |
| ProductService | findAll | `product:list:${JSON.stringify(query)}` | 300s (5min) | create, update, remove, restore |
| SupplierService | findAll | `supplier:list:${JSON.stringify(query)}` | 300s (5min) | create, update, remove, restore |
| CustomerService | findAll | `customer:list:${JSON.stringify(query)}` | 300s (5min) | create, update, remove, restore |
| SystemService | getAllEnums | `system:enums` | 86400s (24h) | None (read-only enums) |

All existing 913 tests pass with CacheService mocked as passthrough (factory always called in tests).

## Commits

| Hash | Message |
|------|---------|
| 53643b1 | feat(15-02): add CacheService with getOrSet and invalidateByPrefix |
| 93b20fc | feat(15-02): apply cache-aside to 5 reference data services |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test file location convention**
- **Found during:** Task 1
- **Issue:** Plan specified `backend/src/common/services/__tests__/cache.service.spec.ts` but project convention is co-located tests (e.g., `redis.service.spec.ts` alongside `redis.service.ts`)
- **Fix:** Created test file at `backend/src/common/services/cache.service.spec.ts` (co-located)
- **Files modified:** `backend/src/common/services/cache.service.spec.ts`

**2. [Rule 3 - Blocking] SystemService.getAllEnums sync-to-async change**
- **Found during:** Task 2
- **Issue:** `getAllEnums()` was synchronous but cache wrapper `getOrSet` requires async factory. Controller and all tests needed updating.
- **Fix:** Made `getAllEnums()` async with `Promise.resolve()` wrapper, updated controller signature to `async`, updated 14 test assertions from sync to `await`
- **Files modified:** `system.service.ts`, `system.controller.ts`, `system.service.spec.ts`, `system.controller.spec.ts`

**3. [Rule 3 - Blocking] Lint error on async arrow without await**
- **Found during:** Task 2 verification
- **Issue:** `@typescript-eslint/require-await` flagged `async () => ({...})` factory in SystemService
- **Fix:** Changed to `() => Promise.resolve({...})` to avoid unnecessary async
- **Files modified:** `system.service.ts`

**4. [Rule 3 - Blocking] CacheService mock needed in 4 service test suites**
- **Found during:** Task 2
- **Issue:** Adding CacheService as constructor dependency broke 4 test suites that didn't provide the mock
- **Fix:** Added passthrough CacheService mock to fabric, product, supplier, customer service specs
- **Files modified:** 4 `.spec.ts` files

## Verification Results

- `pnpm build`: PASS
- `pnpm test`: PASS (42 suites, 913 tests, 0 failures)
- `pnpm lint`: PASS (0 errors, 2 pre-existing warnings in unrelated file)
- `grep cacheService.getOrSet` found in all 5 service files
- `grep cacheService.invalidateByPrefix` found in all 4 entity service files

## Known Stubs

None - all cache integration is fully wired.
