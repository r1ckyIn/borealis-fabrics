---
phase: 01-frontend-bug-fixes
plan: 03
subsystem: ui, api
tags: [error-handling, search, chinese-messages, react, typescript, antd, empty-state, 501-handling]

requires:
  - phase: 01-frontend-bug-fixes
    provides: "Error code mapping utility (errorMessages.ts) with getErrorMessage() and getDeleteErrorMessage()"
provides:
  - "Fixed fabric search with backend keyword support across fabricCode/name/color"
  - "Fixed fabric delete error handling with Chinese error messages via getDeleteErrorMessage()"
  - "Fixed fabric form inline field validation via form.setFields() for 400/422 errors"
  - "Fixed quote delete error handling replacing broken error.response?.status pattern"
  - "Graceful 501 Not Implemented handling for quote convert-to-order with message.warning()"
  - "Empty states with action buttons on fabric and quote list pages"
  - "New test suite for quote module (3 test files, 22 tests)"
affects: [01-04-PLAN]

tech-stack:
  added: []
  patterns:
    - "501 handling: check apiError.code === 501, use message.warning() instead of message.error()"
    - "Inline field validation: form.setFields([{ name, errors }]) for 400/422 with field-specific error codes"
    - "Empty state: Table locale={{ emptyText: <Empty><Button>action</Button></Empty> }}"

key-files:
  created:
    - "frontend/src/pages/quotes/__tests__/QuoteListPage.test.tsx"
    - "frontend/src/pages/quotes/__tests__/QuoteDetailPage.test.tsx"
    - "frontend/src/pages/quotes/__tests__/QuoteFormPage.test.tsx"
  modified:
    - "frontend/src/pages/fabrics/FabricListPage.tsx"
    - "frontend/src/pages/fabrics/FabricFormPage.tsx"
    - "frontend/src/pages/fabrics/FabricDetailPage.tsx"
    - "frontend/src/pages/quotes/QuoteListPage.tsx"
    - "frontend/src/pages/quotes/QuoteFormPage.tsx"
    - "frontend/src/pages/quotes/QuoteDetailPage.tsx"
    - "backend/src/fabric/dto/query-fabric.dto.ts"
    - "backend/src/fabric/fabric.service.ts"

key-decisions:
  - "Added keyword field to QueryFabricDto (backend) rather than changing frontend search field names"
  - "501 convert-to-order uses message.warning() (not message.error()) for better UX"
  - "Form page inline validation passes form instance via props to child form component"

patterns-established:
  - "501 handling pattern: if (apiError.code === 501) message.warning(getErrorMessage(apiError)) else message.error()"
  - "Form page field validation: Form.useForm() at page level, pass to child form, form.setFields() in catch"
  - "Empty state pattern: locale={{ emptyText: <Empty description={text}><Button type='primary'>action</Button></Empty> }}"

requirements-completed: [BUGF-01, BUGF-02, BUGF-03, BUGF-04, BUGF-05, BUGF-06]

duration: 41min
completed: 2026-03-19
---

# Phase 1 Plan 03: Fabric + Quote Bug Fixes Summary

**Fixed fabric search (keyword support via backend DTO), quote convert-to-order 501 graceful handling, Chinese error messages via getErrorMessage/getDeleteErrorMessage on all 6 pages, inline field validation for forms, and empty states with action buttons -- plus 22 new quote tests**

## Performance

- **Duration:** 41 min
- **Started:** 2026-03-18T23:36:00Z
- **Completed:** 2026-03-19T00:17:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Fixed fabric search by adding `keyword` field to backend `QueryFabricDto` with OR logic across fabricCode/name/color in `FabricService.findAll()`
- Fixed all error handling in 6 pages (3 fabric + 3 quote), replacing broken `error.response?.status` patterns and generic error messages with `getErrorMessage()`/`getDeleteErrorMessage()` from errorMessages utility
- Added graceful 501 Not Implemented handling for quote convert-to-order using `message.warning()` instead of error toast
- Added inline field validation via `form.setFields()` for 400/422 errors in FabricFormPage and QuoteFormPage
- Added Empty state components with action buttons to FabricListPage and QuoteListPage
- Created 3 new test files for Quote module (previously had 0 tests), totaling 22 new tests
- Fixed 3 pre-existing integration tests that used old error patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Fabric Module** - `6f87517` (fix)
2. **Task 2: Fix Quote Module** - `bae349e` (fix)

## Files Created/Modified

- `backend/src/fabric/dto/query-fabric.dto.ts` - Added `keyword` field for unified search
- `backend/src/fabric/fabric.service.ts` - Added OR conditions for keyword search in findAll()
- `frontend/src/pages/fabrics/FabricListPage.tsx` - Fixed delete error handling, added empty state
- `frontend/src/pages/fabrics/FabricFormPage.tsx` - Added getErrorMessage + inline field validation
- `frontend/src/pages/fabrics/FabricDetailPage.tsx` - Fixed all 6 catch blocks with getErrorMessage
- `frontend/src/pages/fabrics/__tests__/FabricListPage.test.tsx` - Added empty state + delete error tests
- `frontend/src/pages/fabrics/__tests__/FabricFormPage.test.tsx` - Added submit error test
- `frontend/src/pages/quotes/QuoteListPage.tsx` - Fixed delete + convert errors, added empty state
- `frontend/src/pages/quotes/QuoteFormPage.tsx` - Added getErrorMessage + inline field validation
- `frontend/src/pages/quotes/QuoteDetailPage.tsx` - Fixed delete + convert errors with 501 handling
- `frontend/src/pages/quotes/__tests__/QuoteListPage.test.tsx` - New: 8 tests
- `frontend/src/pages/quotes/__tests__/QuoteDetailPage.test.tsx` - New: 7 tests
- `frontend/src/pages/quotes/__tests__/QuoteFormPage.test.tsx` - New: 7 tests
- `frontend/src/test/integration/quote-convert.integration.test.tsx` - Fixed to use ApiError format
- `frontend/src/test/integration/fabric-crud.integration.test.tsx` - Fixed getAllByRole for empty state

## Decisions Made

- Added `keyword` to backend `QueryFabricDto` (not renaming frontend field) for better UX with unified search
- Used `message.warning()` (not `message.error()`) for 501 responses to indicate "not yet available" vs "something broke"
- Passed Form instance from page to child form component via props to enable `form.setFields()` for inline validation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed integration tests using old error patterns**
- **Found during:** Task 2 (Quote module fixes)
- **Issue:** Pre-existing integration tests in `quote-convert.integration.test.tsx` and `fabric-crud.integration.test.tsx` used old error format (`error.response?.status`, `new Error()`) that no longer matches the fixed code
- **Fix:** Updated mock error objects to use ApiError format `{ code, message, data: null }` and adjusted assertions for new error messages. Fixed `getByRole` to `getAllByRole` for fabric list page due to new empty state button.
- **Files modified:** `frontend/src/test/integration/quote-convert.integration.test.tsx`, `frontend/src/test/integration/fabric-crud.integration.test.tsx`
- **Verification:** All 829 tests pass
- **Committed in:** bae349e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary to maintain test suite integrity after error handling changes. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Fabric and Quote modules fully fixed with correct error handling, search, and UX
- Plan 04 (Order + Logistics + Import) can proceed -- same patterns established here apply
- Error handling pattern (getErrorMessage/getDeleteErrorMessage) proven across 4 modules (Supplier, Customer, Fabric, Quote)

## Self-Check: PASSED

All files created:
- QuoteListPage.test.tsx: FOUND
- QuoteDetailPage.test.tsx: FOUND
- QuoteFormPage.test.tsx: FOUND
- 01-03-SUMMARY.md: FOUND

All commits verified:
- 6f87517: FOUND
- bae349e: FOUND

---
*Phase: 01-frontend-bug-fixes*
*Completed: 2026-03-19*
