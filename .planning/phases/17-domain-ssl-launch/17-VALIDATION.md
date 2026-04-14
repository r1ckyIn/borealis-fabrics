---
phase: 17
slug: domain-ssl-launch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | Jest 29.x |
| **Framework (frontend)** | Vitest |
| **Config file (backend)** | `backend/jest.config.ts` |
| **Config file (frontend)** | `frontend/vitest.config.ts` |
| **Quick run command (backend)** | `cd backend && pnpm test -- --testPathPattern=auth` |
| **Quick run command (frontend)** | `cd frontend && pnpm test -- --testPathPattern=LoginPage` |
| **Full suite command (backend)** | `cd backend && pnpm build && pnpm test && pnpm lint && npx tsc --noEmit` |
| **Full suite command (frontend)** | `cd frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck` |
| **Estimated runtime** | ~45 seconds (backend auth tests) + ~20 seconds (frontend LoginPage tests) |

---

## Sampling Rate

- **After every task commit:** `cd backend && pnpm test -- --testPathPattern=auth && cd ../frontend && pnpm test -- --testPathPattern="LoginPage|auth-flow"`
- **After every plan wave:** `cd backend && pnpm build && pnpm test && pnpm lint && npx tsc --noEmit && cd ../frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green + manual SSL/OAuth verification on production server
- **Max feedback latency:** ~65 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | DEV-CLEANUP-01 | unit | `cd backend && pnpm test -- --testPathPattern=auth.controller` | Yes (needs update) | ⬜ pending |
| 17-01-02 | 01 | 1 | DEV-CLEANUP-02 | unit | `cd backend && pnpm test -- --testPathPattern=auth.service` | Yes (needs update) | ⬜ pending |
| 17-01-03 | 01 | 1 | DEV-CLEANUP-03 | unit | `cd frontend && pnpm test -- --testPathPattern=LoginPage` | Yes (needs update) | ⬜ pending |
| 17-01-04 | 01 | 1 | DEV-CLEANUP-04 | unit | `cd frontend && pnpm test -- --testPathPattern=auth-flow` | Yes (needs update) | ⬜ pending |
| 17-01-05 | 01 | 1 | DEV-CLEANUP-05 | unit | `cd backend && pnpm test -- --testPathPattern=auth` | Needs verification | ⬜ pending |
| 17-02-01 | 02 | 2 | SSL-01 | smoke | `docker compose exec nginx nginx -t` | Manual | ⬜ pending |
| 17-02-02 | 02 | 2 | SSL-02 | smoke | `curl -sv https://<domain>/` | Manual (post-deploy) | ⬜ pending |
| 17-02-03 | 02 | 2 | SSL-03 | smoke | `curl -sv http://<domain>/` | Manual (post-deploy) | ⬜ pending |
| 17-03-01 | 03 | 3 | OAUTH-01 | e2e | Manual -- QR scan required | Manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- Backend: Jest + auth test suites exist (`auth.controller.spec.ts`, `auth.service.spec.ts`, `auth.e2e-spec.ts`)
- Frontend: Vitest + LoginPage test suite exists (`LoginPage.test.tsx`, `auth-flow.integration.test.tsx`)
- SSL and OAuth verification are inherently manual (server-side operations)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTTPS responds with valid cert | SSL-02 | Requires deployed SSL certificate on production server | `curl -sv https://<domain>/ 2>&1 \| grep "SSL certificate verify ok"` |
| HTTP redirects to HTTPS | SSL-03 | Requires Nginx config deployed on production | `curl -sv http://<domain>/ 2>&1 \| grep "301"` |
| WeChat Work OAuth flow | OAUTH-01 | Requires QR scan from WeChat Work mobile app | Open `https://<domain>` in browser, click login, scan QR code with WeChat Work, verify redirect and JWT cookie |
| IP direct access redirects to domain | D-08 | Requires DNS + Nginx deployed | `curl -sv http://<IP>/ 2>&1 \| grep "301"` + verify redirect to `https://<domain>` |
| HSTS header present | D-11 | Requires SSL verified working first | `curl -sI https://<domain>/ \| grep -i strict-transport-security` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 65s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
