---
phase: 16
slug: production-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | Jest 30.0.0 |
| **Framework (frontend)** | Vitest 4.0.18 |
| **Config file (backend)** | backend/package.json (jest config section) |
| **Config file (frontend)** | frontend/vite.config.ts (test section) |
| **Quick run command** | `cd backend && pnpm build && pnpm test && pnpm lint` |
| **Full suite command** | `cd backend && pnpm build && pnpm test && pnpm lint && npx tsc --noEmit && cd ../frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && pnpm build && pnpm test && pnpm lint`
- **After every plan wave:** Run full suite (both backend + frontend)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | Server runs Docker stack with Redis | smoke | `docker compose -f docker-compose.prod.yml up -d && curl http://localhost/health` | N/A (infra) |
| DEPLOY-02 | CDB connected, schema migrated | smoke | `docker compose exec nestjs npx prisma migrate status` | N/A (infra) |
| DEPLOY-03 | COS configured for file storage | manual | Upload a file via UI, verify COS signed URL works | N/A (infra) |
| DEPLOY-04 | SSL active and auto-renews | manual | `curl -I https://domain.com` (Phase B only) | N/A (infra) |
| DEPLOY-05 | WeChat Work OAuth works | manual | Full OAuth login flow on production domain (Phase B only) | N/A (infra) |
| DEPLOY-06 | All business flows pass UAT | manual | Developer self-test checklist + team validation | N/A (manual UAT) |

*Status: all ⬜ pending*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed. Existing test suites must remain green throughout.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker stack runs on Tencent Cloud | DEPLOY-01 | Remote server infrastructure | SSH into server, run `docker compose ps`, verify all containers healthy |
| CDB MySQL connected | DEPLOY-02 | External managed database | Run `docker compose exec nestjs npx prisma migrate status` on server |
| COS file upload/download | DEPLOY-03 | External cloud storage | Upload file via UI, verify COS URL loads in browser |
| SSL certificate active | DEPLOY-04 | Requires domain + ICP filing | `curl -I https://domain.com` shows valid cert (Phase B only) |
| WeChat Work OAuth login | DEPLOY-05 | Requires production domain | Complete OAuth login flow in browser (Phase B only) |
| Full UAT coverage | DEPLOY-06 | Manual user workflow testing | Execute full UAT checklist (see RESEARCH.md UAT section) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
