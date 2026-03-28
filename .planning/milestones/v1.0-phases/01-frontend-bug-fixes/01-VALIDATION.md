---
phase: 1
slug: frontend-bug-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Jest 29.x + SuperTest; Frontend: Vitest + React Testing Library |
| **Config file** | `backend/jest.config.ts`, `frontend/vite.config.ts` |
| **Quick run command** | `cd backend && pnpm test -- --bail && cd ../frontend && pnpm test -- --bail` |
| **Full suite command** | `cd backend && pnpm build && pnpm test && pnpm lint && cd ../frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command (test --bail)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01 | 1 | BUGF-05, BUGF-06 | document audit | `test -f .planning/phases/01-frontend-bug-fixes/01-AUDIT.md && grep -q '## Summary' .planning/phases/01-frontend-bug-fixes/01-AUDIT.md && [ $(grep -c 'BUG-' .planning/phases/01-frontend-bug-fixes/01-AUDIT.md) -ge 5 ]` | N/A | ⬜ pending |
| 01-01-T2 | 01 | 1 | BUGF-06 | unit | `cd frontend && pnpm test -- --run src/utils/__tests__/errorMessages.test.ts` | ❌ (to create) | ⬜ pending |
| 01-02-T1 | 02 | 2 | BUGF-01~06 | unit + integration | `cd frontend && pnpm test -- --run src/pages/suppliers/__tests__/` | ✅ | ⬜ pending |
| 01-02-T2 | 02 | 2 | BUGF-01~06 | unit + integration | `cd frontend && pnpm test -- --run src/pages/customers/__tests__/` | ✅ | ⬜ pending |
| 01-03-T1 | 03 | 2 | BUGF-01~06 | unit + integration | `cd frontend && pnpm test -- --run src/pages/fabrics/__tests__/` | ✅ | ⬜ pending |
| 01-03-T2 | 03 | 2 | BUGF-01~06 | unit + integration | `cd frontend && pnpm test -- --run src/pages/quotes/__tests__/` | ❌ (to create) | ⬜ pending |
| 01-04-T1 | 04 | 2 | BUGF-01~06 | unit + integration | `cd backend && pnpm test -- --testPathPattern import && cd ../frontend && pnpm test -- --run src/pages/import/__tests__/` | ✅ | ⬜ pending |
| 01-04-T2 | 04 | 2 | BUGF-01~06 | unit + integration | `cd frontend && pnpm test -- --run src/pages/orders/__tests__/` | ❌ (to create) | ⬜ pending |
| 01-04-T3 | 04 | 2 | BUGF-01~06 | manual | Full business flow verification in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Both frontend and backend test frameworks are already configured and running (608 backend + 753 frontend tests passing).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Button clicks produce expected visual result | BUGF-01 | Visual verification requires browser | Click each button, verify UI response |
| Form submissions persist to database | BUGF-02 | End-to-end data flow requires running services | Submit form, check DB via API |
| List page pagination/search/filter | BUGF-03 | UX flow requires browser interaction | Navigate pages, use search, apply filters |
| Detail pages display all fields | BUGF-04 | Visual completeness check | Open each detail page, verify all fields |
| Error messages show Chinese text | BUGF-06 | UX verification | Trigger errors, verify Chinese messages |
| Inline field validation errors display on form fields | BUGF-06 | Form UX requires visual verification | Submit invalid form data, verify inline errors on fields |

*User will perform manual frontend verification after each module per CONTEXT.md decision.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
