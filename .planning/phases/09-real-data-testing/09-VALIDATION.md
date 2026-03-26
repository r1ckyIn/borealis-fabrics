---
phase: 9
slug: real-data-testing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Jest 29, Frontend: Vitest |
| **Config file** | backend: jest config in package.json, frontend: vitest.config.ts |
| **Quick run command** | `cd backend && pnpm test -- --testPathPattern=import` |
| **Full suite command** | `cd backend && pnpm build && pnpm test && cd ../frontend && pnpm build && pnpm test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && pnpm test -- --testPathPattern=import`
- **After every plan wave:** Run `cd backend && pnpm build && pnpm test && pnpm lint && cd ../frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | DATA-04 | unit | `pnpm test -- --testPathPattern=import` | ✅ partial | ⬜ pending |
| 09-01-02 | 01 | 1 | DATA-05 | unit | `pnpm test -- --testPathPattern=import` | ✅ partial | ⬜ pending |
| 09-02-01 | 02 | 1 | DATA-06 | unit | `pnpm test -- --testPathPattern=purchase-order` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | DATA-06 | unit | `pnpm test -- --testPathPattern=sales-contract` | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 1 | DATA-06 | unit | `pnpm test -- --testPathPattern=customer-order` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | DATA-03 | manual | N/A (user-driven CRUD) | N/A | ⬜ pending |
| 09-04-01 | 04 | 2 | DATA-07 | smoke | Route traversal script | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/import/strategies/purchase-order-import.strategy.spec.ts` — unit tests for 采购单 parsing
- [ ] `backend/src/import/strategies/sales-contract-import.strategy.spec.ts` — unit tests for 购销合同/客户订单 parsing
- [ ] Smoke test script for page stability (DATA-07) — automated route traversal

*Existing infrastructure covers DATA-03 (manual), DATA-04, DATA-05 (existing import tests).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Manual CRUD entry with real data | DATA-03 | User-driven end-to-end walkthrough | Create supplier → customer → fabric → quote → order using real company data |
| Frontend page stability sampling | DATA-07 | Visual verification of UI rendering | Navigate all pages after bulk import, check for broken layouts |
| Imported data display in UI | DATA-04,05,06 | Visual verification of data quality | Open list/detail pages for imported records, confirm no garbled text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
