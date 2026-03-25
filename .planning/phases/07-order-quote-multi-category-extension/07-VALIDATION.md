---
phase: 7
slug: order-quote-multi-category-extension
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (backend), vitest (frontend) |
| **Config file** | `backend/jest.config.ts`, `backend/test/jest-e2e.json` |
| **Quick run command** | `cd backend && pnpm test -- --testPathPattern=<module>` |
| **Full suite command** | `cd backend && pnpm test && pnpm test:e2e` |
| **Estimated runtime** | ~45 seconds (unit), ~90 seconds (e2e) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && pnpm test -- --testPathPattern=<changed-module>`
- **After every plan wave:** Run `cd backend && pnpm test && pnpm test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | MCAT-07 | unit | `pnpm test -- --testPathPattern=order` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | MCAT-07 | e2e | `pnpm test:e2e -- --testPathPattern=order` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | MCAT-08 | unit | `pnpm test -- --testPathPattern=quote` | ✅ | ⬜ pending |
| 07-02-02 | 02 | 1 | MCAT-08 | e2e | `pnpm test:e2e -- --testPathPattern=quote` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Backend test setup (Jest + SuperTest) and E2E test helpers are already in place.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Frontend multi-category UI | Phase 8 | Deferred to Phase 8 | N/A |

*All Phase 7 behaviors (backend) have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
