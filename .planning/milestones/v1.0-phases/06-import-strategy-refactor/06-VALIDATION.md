---
phase: 6
slug: import-strategy-refactor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (backend) |
| **Config file** | `backend/jest.config.ts` |
| **Quick run command** | `cd backend && pnpm test -- --testPathPattern="import\|product"` |
| **Full suite command** | `cd backend && pnpm build && pnpm test && pnpm lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && pnpm test -- --testPathPattern="import\|product"`
- **After every plan wave:** Run `cd backend && pnpm build && pnpm test && pnpm lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | MCAT-05 | unit | `pnpm test -- --testPathPattern=product-import` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MCAT-06 | unit | `pnpm test -- --testPathPattern=product-import` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-08 | unit | `pnpm test -- --testPathPattern=import` | ✅ | ⬜ pending |
| TBD | TBD | TBD | DATA-09 | unit | `pnpm test -- --testPathPattern=import` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/import/strategies/__tests__/product-import.strategy.spec.ts` — stubs for MCAT-05, MCAT-06
- [ ] `backend/src/import/__tests__/import.service.dryrun.spec.ts` — stubs for DATA-09

*Existing infrastructure covers per-row error reporting (DATA-08) — ImportResultDto already has failure details.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Excel template download renders correctly | MCAT-05 | Visual verification of Excel formatting | Download template, open in Excel, verify headers and sample data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
