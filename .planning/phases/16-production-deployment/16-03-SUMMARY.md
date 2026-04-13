---
phase: 16-production-deployment
plan: 03
subsystem: infra
tags: [deploy-script, rollback, deployment-guide, uat-checklist, tencent-cloud, ccn, cos, certbot, bilingual]

# Dependency graph
requires:
  - phase: 16-production-deployment
    provides: Dockerfile, docker-compose.prod.yml, nginx.conf, .env.production.example, ALLOW_DEV_LOGIN + FORCE_HTTPS_COOKIES auth controls
provides:
  - Automated deployment script (deploy/deploy.sh) with pull + build + migrate + health check
  - Automated rollback script (deploy/rollback.sh) with git revert + rebuild
  - Comprehensive bilingual deployment guide (docs/DEPLOY.md) covering Phase A (IP+HTTP) and Phase B (domain+HTTPS+OAuth)
  - Full UAT checklist with 52 test items across 15 categories
affects: [production-deployment, ongoing-maintenance]

# Tech tracking
tech-stack:
  added: [certbot, ccn]
  patterns: [two-phase deployment strategy, git-commit-based rollback, health-check retry loop]

key-files:
  created:
    - deploy/deploy.sh
    - deploy/rollback.sh
    - docs/DEPLOY.md
  modified: []

key-decisions:
  - "Git commit SHA-based rollback instead of Docker image tag rollback (simpler for small team)"
  - "Frontend built separately from Docker build (can build locally and scp, avoiding high memory usage on 4GB server)"
  - "Monitoring stack optional and started after business stack verified (memory safety)"
  - "Placeholder WEWORK_* values for Phase A with ALLOW_DEV_LOGIN=true"

patterns-established:
  - "Deploy script: pull -> build frontend -> build docker -> stop -> start -> migrate -> health check"
  - "Rollback: git checkout specific commit -> rebuild -> restart -> health check"
  - "Two-phase deployment: Phase A (IP+HTTP+dev login) -> Phase B (domain+HTTPS+OAuth)"

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06]

# Metrics
duration: 7min
completed: 2026-04-04
---

# Phase 16 Plan 03: Deploy Scripts + Deployment Guide Summary

**Automated deploy/rollback scripts and comprehensive bilingual deployment guide covering Tencent Cloud provisioning, two-phase deployment (IP+HTTP / domain+HTTPS+OAuth), and 52-item UAT checklist**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-04T07:21:16Z
- **Completed:** 2026-04-04T07:28:42Z
- **Tasks:** 2 of 3 (Task 3 is a human verification checkpoint)
- **Files created:** 3

## Accomplishments
- deploy.sh automates the full deployment lifecycle with --skip-build and --skip-migrate flags
- rollback.sh enables quick revert to any previous git commit with automatic rebuild and health check
- docs/DEPLOY.md provides step-by-step bilingual guide covering Lighthouse, CDB + CCN, COS provisioning and full Phase A/B deployment
- UAT checklist covers 52 test items across 15 categories matching D-13 full coverage requirement

## Task Commits

Each task was committed atomically:

1. **Task 1: Deploy and rollback scripts** - `2a36f46` (feat)
2. **Task 2: Comprehensive deployment guide** - `1a8bb85` (docs)
3. **Task 3: Checkpoint -- User provisions cloud and deploys Phase A** - pending (human verification)

## Files Created/Modified
- `deploy/deploy.sh` - Automated deployment script (pull, build, migrate, health check)
- `deploy/rollback.sh` - Rollback to previous git commit with rebuild
- `docs/DEPLOY.md` - Bilingual deployment guide (English + Chinese) with Phase A/B, UAT, troubleshooting

## Decisions Made
- Git commit SHA-based rollback over Docker image tags -- simpler for a team without container registry
- Frontend build separated from Docker build to save server memory (scp option for 4GB server)
- Monitoring stack documented as optional, started only after business stack verified
- Placeholder WEWORK_* values used for Phase A since WeChat OAuth requires a domain

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Phase A Deployment (2026-04-14)

Task 3 completed — application deployed to Tencent Cloud and verified by user.

**Infrastructure:**
- Lighthouse server: 119.29.82.146 (Ubuntu 22.04, 2C4G, Docker 26.1.3)
- Lighthouse DB: 10.1.0.9:3306 (MySQL 5.7)
- COS: borealis-files-1421178041 (ap-guangzhou)
- Node.js 22.22.2 + pnpm 10.33.0 installed on server

**Deployment fixes applied:**
1. Prisma + pnpm Docker: install all deps → prisma generate → pnpm prune --prod
2. auth.service.ts: added ALLOW_DEV_LOGIN check (was missing, only controller had it)
3. LoginPage.tsx: VITE_ALLOW_DEV_LOGIN env var to show Dev Login in production build
4. BOSS_WEWORK_IDS=dev-user for admin access in Phase A

**Verified:**
- Health API, Frontend, Dev Login, Auth /me, Suppliers API, System Enums
- 9/9 Prisma migrations applied
- User confirmed all 8 sidebar menu items visible (including audit log)

## Known Stubs

None - all scripts and documentation are complete and functional.

## Phase B Remaining
- Domain + DNS + SSL (Let's Encrypt or Tencent Cloud)
- WeChat Work OAuth with production domain
- Remove ALLOW_DEV_LOGIN / VITE_ALLOW_DEV_LOGIN
- FORCE_HTTPS_COOKIES=true

---
*Phase: 16-production-deployment*
*Plan 03 completed: 2026-04-04 (scripts/docs), Task 3 deployed: 2026-04-14*
