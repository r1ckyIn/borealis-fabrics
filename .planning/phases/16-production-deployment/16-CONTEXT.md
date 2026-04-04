# Phase 16: Production Deployment - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

System is live on Tencent Cloud with all infrastructure provisioned, data migrated, and core business flows validated by users. This phase covers: Tencent Cloud provisioning (server + CDB + Redis + COS + SSL), WeChat Work OAuth production config, and full UAT.

Requirements: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06

</domain>

<decisions>
## Implementation Decisions

### Server & Infrastructure (DEPLOY-01, DEPLOY-02)
- **D-01:** Tencent Cloud lightweight server: **2C4G** (2 vCPU, 4GB RAM, 4Mbps bandwidth). Must run business stack (NestJS + Redis + Nginx + Docker) AND monitoring stack (Grafana + Loki + Prometheus) on the same machine.
- **D-02:** **No domain yet.** Initial deployment uses IP address + HTTP access. Domain will be purchased and ICP-filed later. System must work without a domain initially.
- **D-03:** CDB MySQL instance **not yet provisioned.** Will be created during Phase 16 execution.
- **D-04:** Monitoring stack (Grafana + Loki + Prometheus from `docker-compose.monitoring.yml`) **runs in production.** Consider limiting Loki retention days and Prometheus scrape interval to stay within 4GB memory.

### Data Migration (DEPLOY-03)
- **D-05:** **Fresh start with empty database.** No existing production data to migrate. Run `prisma migrate deploy` to create schema, then users populate via Excel import or manual entry.
- **D-06:** **No file migration needed.** No existing files to migrate to COS. Set `STORAGE_MODE=cos` from day one in production; skip running `migrate-to-cos.ts` script entirely.
- **D-07:** COS bucket needs to be created and configured. No data migration — just infrastructure setup.

### SSL & Security (DEPLOY-04)
- **D-08:** **Let's Encrypt** with certbot auto-renewal. Configure after domain + ICP filing is complete.
- **D-09:** **Two-phase deployment strategy:**
  - Phase A (no domain): HTTP + IP access, development WeChat Work credentials for testing, no SSL
  - Phase B (after domain + ICP): HTTPS via Let's Encrypt, production WeChat Work OAuth callback URL, HSTS headers
- **D-10:** WeChat Work OAuth won't work without domain. During Phase A, use development/test accounts to bypass OAuth login flow.

### WeChat Work OAuth (DEPLOY-05)
- **D-11:** OAuth callback URL (`WEWORK_REDIRECT_URI`) will be updated to production domain when domain is available. Until then, authentication works with dev credentials on IP access.

### UAT (DEPLOY-06)
- **D-12:** UAT is **two-round**: (1) developer self-test all flows first, (2) 铂润 team members validate with real-world scenarios.
- **D-13:** UAT scope: **full coverage** — every feature must be tested, not just core flows. Includes: supplier/customer CRUD, fabric/product management, quote creation + partial conversion, order lifecycle (all 9 states), payment voucher upload, Excel import/export, audit log, data export, soft delete + restore, file upload (COS), permissions (boss vs normal user).
- **D-14:** UAT is performed on the production environment with production infrastructure (CDB, COS, Redis).

### Claude's Discretion
- Rollback strategy (Docker image tag rollback vs fix-forward based on severity)
- Loki retention days and Prometheus memory tuning for 4GB constraint
- Docker image registry choice (Tencent TCR vs Docker Hub)
- Nginx SSL configuration details and security headers
- CDB instance tier selection (smallest available for 2-5 user load)
- Redis instance configuration (standalone, memory allocation)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Infrastructure
- `backend/.env.production.example` — All required production environment variables with placeholder values
- `backend/.env.example` — Development env vars for comparison (STORAGE_MODE, SENTRY_DSN, etc.)
- `docker-compose.monitoring.yml` — Monitoring stack (Loki + Prometheus + Grafana) compose config
- `backend/docker-compose.yml` — Development MySQL + Redis compose (reference for service config)

### File Storage
- `backend/src/file/storage/cos.storage.ts` — COS storage provider implementation
- `backend/src/file/storage/index.ts` — Storage provider exports and interface
- `backend/src/scripts/migrate-to-cos.ts` — COS migration script (not needed for this phase, but exists for reference)
- `backend/src/config/configuration.ts` — App configuration including COS and storage mode

### Authentication
- `backend/src/auth/auth.controller.ts` — WeChat Work OAuth flow endpoints
- `backend/src/auth/constants.ts` — Auth cookie configuration

### CI/CD
- `.github/workflows/ci.yml` — Current CI pipeline (build/test/lint/security, no deploy stage)

### Architecture
- `docs/ARCHITECTURE.md` — Business and technical architecture overview
- `.planning/codebase/STACK.md` — Technology stack analysis

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **COS Storage Provider** (`cos.storage.ts`): Fully implemented with upload/getUrl/delete — just needs COS env vars
- **Storage mode switching** (`configuration.ts`): `STORAGE_MODE=cos` automatically selects COS provider
- **WeChat Work OAuth** (`auth.controller.ts`): Complete OAuth flow — only needs `WEWORK_REDIRECT_URI` update for production domain
- **Monitoring compose** (`docker-compose.monitoring.yml`): Loki + Prometheus + Grafana ready to deploy
- **Production env template** (`.env.production.example`): All production vars documented

### Established Patterns
- **Environment-driven configuration**: All secrets via env vars, ConfigService injection
- **Storage abstraction**: `StorageProvider` interface allows seamless local↔COS switching
- **Auth cookie-based**: HttpOnly JWT cookies, no frontend token storage
- **Health checks**: `@nestjs/terminus` health endpoints available for Docker healthcheck

### Integration Points
- CI/CD pipeline (`.github/workflows/ci.yml`): Needs deploy stage added
- Nginx: Needs to be created — reverse proxy to NestJS :3000, serve frontend static assets, SSL termination
- Dockerfile(s): **Not found in codebase** — need to be created (backend multi-stage + frontend/Nginx)
- `docker-compose.prod.yml`: **Not found** — needs to be created to orchestrate NestJS + Redis + Nginx

### Critical Dependency Gap
Phase 15 (Containerization & Quality) is marked complete in ROADMAP.md but **no Dockerfile, docker-compose.prod.yml, or nginx.conf files exist on main branch.** Phase 16 planning must either:
1. Include containerization tasks (create Dockerfiles + compose + Nginx config), OR
2. Verify Phase 15 work exists elsewhere (different branch, uncommitted)

</code_context>

<specifics>
## Specific Ideas

- Two-phase deployment (IP-first, domain-later) is the user's explicit preference — don't block on domain availability
- Full UAT coverage required — every feature, not just core flows
- Monitoring stack must run on same server despite 4GB RAM constraint — plan memory budgets carefully
- User is a university student deploying for a real company (铂润/U2Living) — first production deployment

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-production-deployment*
*Context gathered: 2026-04-04*
