---
phase: 11
name: v1.0 Final Gap Closure
source: v1.0-MILESTONE-AUDIT.md
audited: 2026-03-27
---

# Phase 11 Context: v1.0 Final Gap Closure

## Origin

This phase closes integration gaps identified by `/gsd:audit-milestone` on 2026-03-27. The audit scored 51/56 requirements satisfied (91%). Phase 11 targets 3 actionable gaps that can be closed with surgical code changes.

## Gaps to Close

### Gap 1: Product Import Tab Missing (MCAT-05/MCAT-06 frontend surface)

**Audit finding:** Backend `POST /api/v1/import/products` and `GET /api/v1/import/templates/products` exist (Phase 6), but ImportPage has no product tab. `import.api.ts` has no `importProducts`/`downloadProductTemplate` functions.

**Broken E2E flow:** "Product Excel Import" — breaks at ImportPage (no product tab in TAB_CONFIG).

**Scope:** Frontend only — add API functions + tab config + tab UI entry.

### Gap 2: Hardcoded Error Strings in useCustomerDetail (BUGF-06 partial)

**Audit finding:** `useCustomerDetail.ts` lines 216 and 253 use hardcoded Chinese strings (`'更新失败，请重试'`, `'删除失败，请重试'`) instead of `getErrorMessage()`. All other modules are compliant.

**Scope:** Replace 2 hardcoded strings with `getErrorMessage(error as ApiError)`.

### Gap 3: Stale JSDoc in order.service.ts (tech debt)

**Audit finding:** `order.service.ts` line 57 JSDoc says "Initial status: INQUIRY" but code uses `OrderItemStatus.PENDING`.

**Scope:** Update 1 comment line.

## Out of Scope

- **FEAT-04** (File URL migration) — deferred to deployment phase
- **DATA-01/DATA-02** (OCR/AI features) — user confirmed system does not use AI, moved to v2
- **DATA-03/DATA-07** (REQUIREMENTS.md checkbox updates) — documentation-only, no code change needed
- **Phase 02 VERIFICATION.md** — historical gap, not actionable

## Success Criteria

1. ImportPage has a product tab that downloads template and imports product Excel files
2. All error messages in useCustomerDetail.ts use `getErrorMessage()` utility
3. order.service.ts JSDoc matches actual code behavior (PENDING, not INQUIRY)
4. Frontend build + typecheck pass
5. Backend build passes
