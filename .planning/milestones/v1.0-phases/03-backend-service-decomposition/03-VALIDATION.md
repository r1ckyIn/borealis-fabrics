---
phase: 3
slug: backend-service-decomposition
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.x + SuperTest (backend) |
| **Config file** | `backend/jest.config.ts` / `backend/test/jest-e2e.json` |
| **Quick run command** | `cd backend && pnpm test -- --testPathPattern=<module>` |
| **Full suite command** | `cd backend && pnpm build && pnpm test && pnpm lint` |
| **Estimated runtime** | ~45 seconds (unit) / ~90 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && pnpm test -- --testPathPattern=<changed-module>`
- **After every plan wave:** Run `cd backend && pnpm build && pnpm test && pnpm lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | QUAL-01 | unit | `pnpm test -- --testPathPattern=order` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | QUAL-01 | unit | `pnpm test -- --testPathPattern=order` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 1 | QUAL-02 | unit | `pnpm test -- --testPathPattern=import` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 2 | QUAL-06 | lint | `pnpm lint` | ✅ | ⬜ pending |
| 03-04-01 | 04 | 2 | TEST-04 | unit+e2e | `pnpm test -- --testPathPattern=file` | ✅ | ⬜ pending |
| 03-05-01 | 05 | 2 | TEST-05 | unit | `pnpm test -- --testPathPattern=import` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- Jest 30.x already configured with SuperTest
- ESLint with TypeScript plugin already installed
- ExcelJS already in dependencies for test fixture generation
- All test files exist for modules being modified

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
