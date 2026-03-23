---
phase: 02-core-feature-implementation
plan: 02
subsystem: file-storage
tags: [cos, tencent-cloud, storage-abstraction, presigned-url, nestjs-di]

requires:
  - phase: 01-frontend-bug-fixes
    provides: stable codebase with passing tests
provides:
  - StorageProvider interface with upload/getUrl/delete contract
  - LocalStorageProvider for development filesystem storage
  - CosStorageProvider wrapping cos-nodejs-sdk-v5
  - Refactored FileService with key-only DB storage and read-time URL generation
  - FileModule conditional DI factory switching on STORAGE_MODE env
  - getFileUrl method with legacy URL backward compatibility
affects: [02-03-migration, frontend-file-display, deployment]

tech-stack:
  added: [cos-nodejs-sdk-v5]
  patterns: [storage-provider-interface, conditional-di-factory, key-only-db-storage, read-time-url-generation]

key-files:
  created:
    - backend/src/file/storage/storage.interface.ts
    - backend/src/file/storage/local.storage.ts
    - backend/src/file/storage/cos.storage.ts
    - backend/src/file/storage/index.ts
  modified:
    - backend/src/file/file.service.ts
    - backend/src/file/file.module.ts
    - backend/src/file/file.service.spec.ts
    - backend/.env.example
    - backend/package.json

key-decisions:
  - "StorageProvider interface with 3 methods (upload/getUrl/delete) — minimal contract"
  - "Key-only DB storage: url field stores key, not full URL"
  - "Legacy URL passthrough: getFileUrl returns http URLs as-is for backward compatibility"
  - "STORAGE_MODE env var defaults to 'local' for dev-friendly setup"
  - "COS SDK callback-style methods wrapped in Promises for async/await"

patterns-established:
  - "StorageProvider injection: @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider"
  - "Conditional DI factory: useFactory in module based on env var"
  - "Key-only storage: DB stores key, URL generated at read-time via provider"

requirements-completed: [FEAT-03, FEAT-05, TEST-03]

duration: 8min
completed: 2026-03-23
---

# Phase 02 Plan 02: Storage Abstraction Summary

**StorageProvider interface with dual-mode local/COS implementations, FileService refactored to key-only DB storage with read-time URL generation via injected provider**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-23T01:15:43Z
- **Completed:** 2026-03-23T01:23:34Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Created StorageProvider interface defining upload/getUrl/delete contract
- Implemented LocalStorageProvider for development filesystem and CosStorageProvider wrapping cos-nodejs-sdk-v5
- Refactored FileService to use injected StorageProvider — database now stores key-only, URLs generated at read-time
- Added FileModule conditional DI factory switching provider based on STORAGE_MODE env var
- 19 unit tests covering upload key-only storage, URL generation delegation, legacy URL passthrough, remove via provider

## Task Commits

Each task was committed atomically:

1. **Task 1: StorageProvider interface + implementations + SDK install** - `3674129` (feat)
2. **Task 2 RED: Failing tests for StorageProvider-based FileService** - `0355795` (test)
3. **Task 2 GREEN: FileService refactor + FileModule + passing tests** - `a408a83` (feat)

_Task 2 followed TDD: RED (8 tests fail) -> GREEN (19 tests pass)_

## Files Created/Modified
- `backend/src/file/storage/storage.interface.ts` - StorageProvider interface + STORAGE_PROVIDER injection token
- `backend/src/file/storage/local.storage.ts` - Local filesystem implementation with path validation
- `backend/src/file/storage/cos.storage.ts` - Tencent COS implementation with Promise-wrapped callbacks
- `backend/src/file/storage/index.ts` - Barrel export for storage module
- `backend/src/file/file.service.ts` - Refactored to use StorageProvider, key-only DB, getFileUrl method
- `backend/src/file/file.module.ts` - Conditional DI factory based on STORAGE_MODE
- `backend/src/file/file.service.spec.ts` - 19 unit tests with mocked StorageProvider
- `backend/.env.example` - Added STORAGE_MODE, UPLOAD_DIR, BASE_URL
- `backend/package.json` - Added cos-nodejs-sdk-v5 dependency

## Decisions Made
- StorageProvider uses 3-method interface (upload, getUrl, delete) -- minimal contract sufficient for all storage needs
- Database url field stores key-only (same value as key field) per FEAT-05 requirement
- getFileUrl detects legacy full URLs (starting with http/https) and returns them as-is for backward compatibility
- STORAGE_MODE defaults to 'local' so dev environment works without COS credentials
- COS SDK callback methods wrapped in Promises with proper Error instance rejection for eslint compliance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing NotImplementedException import in quote.service.ts**
- **Found during:** Task 1 (build verification)
- **Issue:** `NotImplementedException` was used on line 378 but not imported, causing TypeScript build failure
- **Fix:** Added `NotImplementedException` to the imports from `@nestjs/common`
- **Files modified:** backend/src/quote/quote.service.ts
- **Verification:** `pnpm build` exits 0
- **Committed in:** 3674129 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed isolatedModules type import error in file.service.ts**
- **Found during:** Task 2 GREEN (build verification)
- **Issue:** `StorageProvider` imported as regular import but used as type annotation with `emitDecoratorMetadata`, causing TS1272 error
- **Fix:** Split into separate `import type { StorageProvider }` and `import { STORAGE_PROVIDER }`
- **Files modified:** backend/src/file/file.service.ts
- **Verification:** `pnpm build` exits 0
- **Committed in:** a408a83 (Task 2 GREEN commit)

**3. [Rule 1 - Bug] Fixed lint errors in new storage files**
- **Found during:** Task 2 GREEN (lint verification)
- **Issue:** `prefer-promise-reject-errors`, `no-unused-vars`, `require-await`, `unbound-method` lint errors
- **Fix:** Error wrapping in COS reject calls, eslint-disable comments for interface-mandated unused params and test unbound-method
- **Files modified:** backend/src/file/storage/cos.storage.ts, backend/src/file/storage/local.storage.ts, backend/src/file/file.service.spec.ts
- **Verification:** `pnpm lint` shows 0 errors (only pre-existing warnings remain)
- **Committed in:** a408a83 (Task 2 GREEN commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All auto-fixes necessary for build/lint compliance. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. STORAGE_MODE defaults to 'local' for development.

## Next Phase Readiness
- Storage abstraction complete, ready for migration script in Plan 03
- Plan 03 can run migration to convert existing full-URL records to key-only format
- Frontend file display will need to call getFileUrl for URL resolution (or backend can resolve before sending to client)

## Self-Check: PASSED

All 9 key files verified present. All 3 commits verified in git log.

---
*Phase: 02-core-feature-implementation*
*Completed: 2026-03-23*
