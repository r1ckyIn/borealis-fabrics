---
phase: 12-foundation-observability-quick-wins
plan: 03
subsystem: api, ui
tags: [nestjs-cls, antd-form, validation, tech-debt, payment, import]

# Dependency graph
requires:
  - phase: 12-01
    provides: ClsModule registration and nestjs-cls middleware for request-scoped CLS storage
provides:
  - UserClsInterceptor that stores request.user into CLS for any service
  - getOperatorId() pattern for services needing authenticated user without constructor changes
  - mapApiErrorsToFormFields utility for mapping backend 400/422 errors to Ant Design form.setFields()
  - normalizeHeaderValue utility for resilient Excel header matching
  - Hardened SalesContractImportStrategy with whitespace/case/alias tolerance
affects: [13-audit-log, future-form-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [CLS-based operator resolution, form.setFields inline validation, header normalization]

key-files:
  created:
    - backend/src/common/interceptors/user-cls.interceptor.ts
  modified:
    - backend/src/app.module.ts
    - backend/src/order/order-payment.service.ts
    - backend/src/order/order-payment.service.spec.ts
    - backend/src/import/strategies/sales-contract-import.strategy.ts
    - backend/src/import/strategies/sales-contract-import.strategy.spec.ts
    - backend/src/import/utils/excel.utils.ts
    - frontend/src/utils/errorMessages.ts
    - frontend/src/utils/__tests__/errorMessages.test.ts
    - frontend/src/pages/orders/OrderFormPage.tsx
    - frontend/src/components/forms/OrderForm.tsx

key-decisions:
  - "Use ClsService.get<RequestUser>() with typed generic instead of any cast for operator ID"
  - "Define FieldData interface locally in errorMessages.ts to avoid antd internal import path dependency"
  - "OrderForm accepts optional external form prop for parent-controlled field errors"

patterns-established:
  - "CLS operator pattern: services use this.cls.get<RequestUser>('user')?.id for operator audit trail"
  - "Inline validation pattern: mapApiErrorsToFormFields + form.setFields for 400/422 form errors"
  - "Header normalization: trim + lowercase before matching in import strategies"

requirements-completed: [DEBT-01, DEBT-02, DEBT-03]

# Metrics
duration: 14min
completed: 2026-03-28
---

# Phase 12 Plan 03: Tech Debt Fixes Summary

**Fix operatorId via CLS user resolution, add inline form validation via mapApiErrorsToFormFields, and harden import header matching with whitespace/case tolerance**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-28T09:31:19Z
- **Completed:** 2026-03-28T09:45:29Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- PaymentRecord.operatorId now populated from authenticated user via CLS (was always undefined)
- OrderFormPage displays inline field errors next to form fields for 400/422 responses instead of toast-only
- SalesContractImportStrategy tolerates whitespace, casing variants, and English aliases in header matching
- Reusable mapApiErrorsToFormFields utility available for any form page needing inline validation
- UserClsInterceptor registered globally, making request.user available in any service via CLS

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix operatorId via CLS + UserClsInterceptor + harden SalesContractImportStrategy** - `bb35dd3` (feat)
2. **Task 2: OrderFormPage inline field validation via mapApiErrorsToFormFields** - `c9a314d` (feat)

## Files Created/Modified
- `backend/src/common/interceptors/user-cls.interceptor.ts` - Global interceptor storing request.user in CLS
- `backend/src/app.module.ts` - Added UserClsInterceptor as APP_INTERCEPTOR
- `backend/src/order/order-payment.service.ts` - Replaced operatorId: undefined with CLS-based getOperatorId()
- `backend/src/order/order-payment.service.spec.ts` - Added ClsService mock, tests for operatorId from CLS
- `backend/src/import/strategies/sales-contract-import.strategy.ts` - Normalized header matching with trim/lowercase/aliases
- `backend/src/import/strategies/sales-contract-import.strategy.spec.ts` - Added header normalization tests
- `backend/src/import/utils/excel.utils.ts` - Added normalizeHeaderValue utility for RichText/whitespace
- `frontend/src/utils/errorMessages.ts` - Added mapApiErrorsToFormFields utility
- `frontend/src/utils/__tests__/errorMessages.test.ts` - Added 6 tests for mapApiErrorsToFormFields
- `frontend/src/pages/orders/OrderFormPage.tsx` - Replaced toast-only with form.setFields inline errors
- `frontend/src/components/forms/OrderForm.tsx` - Added optional form prop for parent-controlled errors

## Decisions Made
- Used `ClsService.get<RequestUser | undefined>('user')` with typed generic to satisfy strict ESLint rules (no-unsafe-assignment, no-unsafe-member-access)
- Created private `getOperatorId()` helper in OrderPaymentService to encapsulate CLS access pattern
- Defined `FieldData` interface locally in errorMessages.ts rather than importing from `antd/es/form/interface` to avoid internal path dependency
- OrderForm accepts optional external `form` prop, uses internal form as default -- minimal API change

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed ESLint strict mode violations in new code**
- **Found during:** Task 1 (UserClsInterceptor and OrderPaymentService)
- **Issue:** `context.switchToHttp().getRequest()` returns `any`, and `cls.get('user')` returns `any`, causing no-unsafe-assignment/member-access errors
- **Fix:** Added proper type annotations: `getRequest<Request & { user?: RequestUser }>()` and `cls.get<RequestUser | undefined>('user')`
- **Files modified:** user-cls.interceptor.ts, order-payment.service.ts
- **Verification:** `pnpm lint` passes with 0 errors
- **Committed in:** bb35dd3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type annotations required for ESLint strict mode. No scope creep.

## Issues Encountered
- Jest 30+ uses `--testPathPatterns` (plural) not `--testPathPattern` (singular) -- adjusted test commands accordingly
- ESLint `--fix` was stripping `as RequestUser` casts from `cls.get()` -- resolved by using generic `cls.get<RequestUser | undefined>()` instead

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is fully wired with real data sources.

## Next Phase Readiness
- Phase 12 is now complete (all 3 plans executed)
- CLS user context, soft delete, and Sentry are all in place
- Ready for Phase 13 (audit logging) which can leverage the UserClsInterceptor for operator context

## Self-Check: PASSED

- All 11 files verified present on disk
- Both task commits (bb35dd3, c9a314d) verified in git log
- All 12 acceptance criteria content patterns verified
- Backend: 34 suites, 838 tests, build clean, lint 0 errors
- Frontend: 78 suites, 1007 tests, build clean, lint clean, typecheck clean

---
*Phase: 12-foundation-observability-quick-wins*
*Completed: 2026-03-28*
