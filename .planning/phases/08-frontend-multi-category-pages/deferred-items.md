# Phase 08 Deferred Items

## Pre-existing Test Failures

### quote-convert.integration.test.tsx (4 failures)

**Discovered during:** Plan 05, Task 1

**Issue:** 4 out of 7 tests in `frontend/src/test/integration/quote-convert.integration.test.tsx` fail. The tests assert on button disabled/enabled states and conversion flow for various quote statuses (ACTIVE, EXPIRED, CONVERTED). These tests were written for the old single-item quote model and were not updated during Plan 04 (which rebuilt the quote pages for multi-item model). The integration test mock setup uses a legacy `createMockQuote` helper with fabric-based overrides that no longer matches the QuoteDetailPage rendering expectations.

**Root cause:** Integration test mock factory creates quotes with old single-item structure, but QuoteDetailPage now expects multi-item QuoteItem array model.

**Impact:** Tests only, no production code issue.

**Recommendation:** Update `createMockQuote` in `frontend/src/test/helpers/mockQuoteFactory.ts` to generate QuoteItem-based mock data, and update assertions in `quote-convert.integration.test.tsx` to match the new UI structure.

### UnifiedProductSelector.tsx lint error (react-refresh/only-export-components)

**Discovered during:** Plan 05, Task 1

**Issue:** `frontend/src/components/business/UnifiedProductSelector.tsx` line 57 exports a non-component alongside the component, triggering `react-refresh/only-export-components` lint rule.

**Impact:** Lint only, no runtime issue. Fast refresh may not work optimally for this file during development.

**Recommendation:** Move the exported constant/function to a separate file (e.g., `unified-product-selector.utils.ts`).
