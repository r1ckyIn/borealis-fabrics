---
phase: 04
slug: frontend-component-decomposition
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (frontend), jest 29.x (backend regression) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && pnpm test -- --reporter=verbose` |
| **Full suite command** | `cd frontend && pnpm test && pnpm build && pnpm lint && pnpm typecheck` |
| **Estimated runtime** | ~45 seconds (frontend full suite) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm test -- --reporter=verbose`
- **After every plan wave:** Run `cd frontend && pnpm test && pnpm build && pnpm lint && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite (frontend + backend) must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | QUAL-03 | unit | `cd frontend && pnpm test -- FabricDetailPage` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | QUAL-08, QUAL-09 | unit | `cd frontend && pnpm test -- useFabricDetail` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | QUAL-04 | unit | `cd frontend && pnpm test -- CustomerDetailPage` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 1 | QUAL-08, QUAL-09 | unit | `cd frontend && pnpm test -- useCustomerDetail` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | QUAL-05 | unit | `cd frontend && pnpm test -- OrderItemsSection` | ✅ | ⬜ pending |
| 04-03-02 | 03 | 1 | QUAL-08, QUAL-09 | unit | `cd frontend && pnpm test -- useOrderItems` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | QUAL-07 | unit | `cd frontend && pnpm test -- setup integrationTestUtils` | ✅ | ⬜ pending |
| 04-05-01 | 05 | 2 | TEST-06 | integration | `cd frontend && pnpm test -- errorHandling` | ❌ W0 | ⬜ pending |
| 04-06-01 | 06 | 3 | TEST-07 | full suite | `cd frontend && pnpm test && cd ../backend && pnpm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Custom hook test files created as stubs for useFabricDetail, useCustomerDetail, useOrderItems
- [ ] Error handling test file stubs for unexpected API response formats
- [ ] No new framework install needed — vitest already configured

*Existing infrastructure covers most phase requirements. Wave 0 only adds test stubs for new hooks and error handling scenarios.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification — this is a pure refactoring + test phase with no visual changes.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
