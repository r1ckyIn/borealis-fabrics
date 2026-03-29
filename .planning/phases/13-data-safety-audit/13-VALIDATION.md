---
phase: 13
slug: data-safety-audit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | Jest 30.0.0 |
| **Framework (Frontend)** | Vitest 4.0.18 |
| **Config file (Backend)** | `backend/package.json` jest section |
| **Config file (Frontend)** | `frontend/vite.config.ts` test section |
| **Quick run command (Backend)** | `cd backend && pnpm test -- --testPathPattern=audit` |
| **Quick run command (Frontend)** | `cd frontend && pnpm test -- --testPathPattern=audit` |
| **Full suite command (Backend)** | `cd backend && pnpm build && pnpm test && pnpm lint` |
| **Full suite command (Frontend)** | `cd frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck` |
| **Estimated runtime** | ~45 seconds (backend) + ~30 seconds (frontend) |

---

## Sampling Rate

- **After every task commit:** Run quick command for the changed module (backend or frontend)
- **After every plan wave:** Run full suite for both backend and frontend
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 75 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | DATA-04, DATA-05 | unit | `cd backend && pnpm test -- --testPathPattern=audit.interceptor` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | DATA-04, DATA-05 | unit | `cd backend && pnpm test -- --testPathPattern=audit.service` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | DATA-06 | unit | `cd backend && pnpm test -- --testPathPattern=audit.controller` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | DATA-07 | unit | `cd backend && pnpm test -- --testPathPattern=roles.guard` | ✅ Existing (extend) | ⬜ pending |
| 13-01-05 | 01 | 1 | DATA-08 | unit | `cd backend && pnpm test -- --testPathPattern=export.service` | ❌ W0 | ⬜ pending |
| 13-01-06 | 01 | 1 | DATA-08 | unit | `cd backend && pnpm test -- --testPathPattern=export.controller` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 2 | DATA-06, DATA-07 | unit | `cd frontend && pnpm test -- --testPathPattern=AuditLogPage` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 2 | DATA-08 | unit | `cd frontend && pnpm test -- --testPathPattern=ExportPage` | ❌ W0 | ⬜ pending |
| 13-02-03 | 02 | 2 | DATA-09 | manual-only | Verify script exists and is chmod +x | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/audit/audit.service.spec.ts` — stubs for DATA-04, DATA-05
- [ ] `backend/src/audit/audit.interceptor.spec.ts` — stubs for DATA-04, DATA-05
- [ ] `backend/src/audit/audit.controller.spec.ts` — stubs for DATA-06
- [ ] `backend/src/export/export.service.spec.ts` — stubs for DATA-08
- [ ] `backend/src/export/export.controller.spec.ts` — stubs for DATA-08
- [ ] `frontend/src/pages/audit/__tests__/AuditLogPage.test.tsx` — stubs for DATA-06, DATA-07
- [ ] `frontend/src/pages/export/__tests__/ExportPage.test.tsx` — stubs for DATA-08

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CDB automatic backup | DATA-09 | Cloud console verification | Check Tencent Cloud CDB console for backup schedule and history |
| mysqldump-to-COS script | DATA-09 | Requires COS credentials and cron | Run script manually, verify .sql.gz file appears in COS bucket |
| Soft-delete visual distinction | DATA-07 | Visual styling check | Toggle "显示已删除", verify deleted rows have distinct styling |
| Sidebar role-based menu visibility | DATA-07 | Requires different user accounts | Login as boss/developer: audit log visible; login as regular: hidden |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 75s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
