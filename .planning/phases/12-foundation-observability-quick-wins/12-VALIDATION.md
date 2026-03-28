---
phase: 12
slug: foundation-observability-quick-wins
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.x (backend) / Vitest 3.x (frontend) |
| **Config file** | `backend/jest.config.ts` / `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && pnpm test -- --testPathPattern=<module>` / `cd frontend && pnpm test -- --testPathPattern=<component>` |
| **Full suite command** | `cd backend && pnpm build && pnpm test && pnpm lint` / `cd frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck` |
| **Estimated runtime** | ~120 seconds (backend) / ~90 seconds (frontend) |

---

## Sampling Rate

- **After every task commit:** Run targeted test for modified module
- **After every plan wave:** Run full suite command for affected layer (backend/frontend)
- **Before `/gsd:verify-work`:** Both full suites must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | OBS-04 | unit | `cd backend && pnpm test -- --testPathPattern=correlation` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | DATA-01,02,03 | unit+integration | `cd backend && pnpm test -- --testPathPattern=soft-delete\|prisma` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 2 | OBS-01,02,03 | unit | `cd backend && pnpm test -- --testPathPattern=sentry\|exception` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | OBS-05 | unit | `cd frontend && pnpm test -- --testPathPattern=ErrorBoundary` | ✅ | ⬜ pending |
| 12-02-03 | 02 | 2 | DEBT-01 | unit | `cd frontend && pnpm test -- --testPathPattern=OrderFormPage` | ✅ | ⬜ pending |
| 12-02-04 | 02 | 2 | DEBT-02 | unit | `cd backend && pnpm test -- --testPathPattern=order-payment` | ✅ | ⬜ pending |
| 12-02-05 | 02 | 2 | DEBT-03 | unit | `cd backend && pnpm test -- --testPathPattern=sales-contract` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Correlation ID middleware test stubs for OBS-04
- [ ] Soft delete extension/migration test stubs for DATA-01,02,03
- [ ] Sentry integration test stubs for OBS-01,02,03

*Existing test infrastructure covers DEBT-01, DEBT-02, DEBT-03, OBS-05 — test files already exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sentry dashboard event appearance | OBS-01 | Requires live Sentry project | Trigger 500 error, verify event in Sentry UI within 5s |
| Correlation ID in browser DevTools | OBS-04 | Response header inspection | Make API call, check `X-Correlation-ID` header in Network tab |
| ErrorBoundary crash fallback UI | OBS-05 | Visual verification | Inject throw in component, verify fallback renders with retry button |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
