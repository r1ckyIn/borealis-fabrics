# Roadmap: Borealis Supply Chain Management

## Milestones

- ✅ **v1.0 Supply Chain MVP** — Phases 1-11 (shipped 2026-03-28) — [Archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Production Readiness** — Phases 12-17 (Phase A shipped 2026-04-14, Phase B pending)

## Phases

<details>
<summary>✅ v1.0 Supply Chain MVP (Phases 1-11) — SHIPPED 2026-03-28</summary>

- [x] Phase 1: Frontend Bug Fixes (4/4 plans)
- [x] Phase 2: Core Feature Implementation (3/3 plans)
- [x] Phase 3: Backend Service Decomposition (4/4 plans)
- [x] Phase 4: Frontend Component Decomposition (4/4 plans)
- [x] Phase 04.1: Payment Voucher Upload (3/3 plans) — INSERTED
- [x] Phase 5: Multi-Category Schema + Product CRUD (2/2 plans)
- [x] Phase 6: Import Strategy Refactor (2/2 plans)
- [x] Phase 7: Order/Quote Multi-Category Extension (3/3 plans)
- [x] Phase 8: Frontend Multi-Category Pages (5/5 plans)
- [x] Phase 9: Real Data Testing (5/5 plans)
- [x] Phase 10: UAT Bug Fixes (3/3 plans)
- [x] Phase 11: v1.0 Final Gap Closure (2/2 plans)

**12 phases, 40 plans, 84 tasks, 53/53 requirements (100%)**

See [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full details.

</details>

### ✅ v1.1 Production Readiness (Phase A shipped 2026-04-14)

**Milestone Goal:** Close all engineering gaps and deploy to Tencent Cloud production.
**Outcome:** Phase A live at http://119.29.82.146. Phase B (domain+SSL+OAuth) deferred to v1.2.

- [x] **Phase 12: Foundation & Observability Quick Wins** - Correlation ID, soft delete, Sentry integration, ErrorBoundary, tech debt cleanup (completed 2026-03-28)
- [x] **Phase 13: Data Safety & Audit** - Audit logging (backend + frontend), RBAC, data export, DB backup (completed 2026-03-29)
- [ ] **Phase 14: Observability & Performance** - Log aggregation, Redis caching, load testing, Web Vitals, dependency scanning
- [x] **Phase 15: Containerization & Quality** - Docker, Nginx, CI/CD, PWA, accessibility (completed 2026-04-03)
- [x] **Phase 16: Production Deployment** - Tencent Cloud setup, Docker deploy, Phase A live (Phase A: 2026-04-14, Phase B: pending domain+SSL)

## Phase Details

### Phase 12: Foundation & Observability Quick Wins
**Goal**: System has cross-cutting infrastructure (correlation tracing, soft delete) and immediate error visibility (Sentry) before any feature work begins
**Depends on**: v1.0 (Phase 11)
**Requirements**: OBS-04, DATA-01, DATA-02, DATA-03, OBS-01, OBS-02, OBS-03, OBS-05, DEBT-01, DEBT-02, DEBT-03
**Success Criteria** (what must be TRUE):
  1. Every API request carries a unique correlation ID visible in response headers, pino logs, and Sentry context
  2. Soft-deleting a business entity (fabric, product, supplier, customer, order, quote) hides it from all list/detail queries; re-creating an entity with the same unique fields succeeds after soft delete
  3. Backend unhandled exceptions (500) appear in Sentry dashboard within seconds; 4xx errors are filtered out
  4. Frontend React crashes render a graceful fallback UI and report to Sentry
  5. OrderFormPage shows inline field validation errors for 400/422 responses; operatorId is populated correctly in payment operations; SalesContract import handles real file formats
**Plans**: 3 plans

Plans:
- [x] 12-01-PLAN.md — Correlation ID (nestjs-cls) + Sentry backend/frontend + ErrorBoundary enhancement
- [x] 12-02-PLAN.md — Soft delete schema migration (isActive -> deletedAt) + Prisma extension + isActive cleanup
- [x] 12-03-PLAN.md — Tech debt fixes (operatorId, OrderFormPage validation, SalesContract hardening)

### Phase 13: Data Safety & Audit
**Goal**: All data mutations are auditable, exportable, and backed up — operators know who changed what and when
**Depends on**: Phase 12 (correlation ID for audit requestId)
**Requirements**: DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09
**Success Criteria** (what must be TRUE):
  1. Every create/update/delete operation on business entities is recorded in an audit log with operator, action, entity, changes diff, IP, and correlation ID
  2. Boss and developer roles can view the audit log page in the sidebar with filtering by operator, action, entity type, and date range; other roles cannot see the page
  3. Users can export any entity type (fabric, product, supplier, customer, order, quote) to Excel from the list pages
  4. CDB automatic backup is verified working; supplementary mysqldump-to-COS script runs on schedule with retention policy
**Plans**: TBD
**UI hint**: yes

Plans:
- [x] 13-01: Audit logging backend (interceptor, decorator, model, correlation ID consumption)
- [x] 13-02: Export module + isAdmin + backup script
- [x] 13-03: Audit log frontend page + RBAC
- [x] 13-04: Soft-delete recovery UI (includeDeleted + SoftDeleteToggle + restore)

### Phase 14: Observability & Performance
**Goal**: System performance is measured, cached where appropriate, and observable through centralized logs and dashboards
**Depends on**: Phase 12 (pino logs for Loki transport), Phase 13 (audit log for export load testing)
**Requirements**: OBS-06, OBS-07, PERF-01, PERF-02, PERF-03, PERF-04, QUAL-01
**Success Criteria** (what must be TRUE):
  1. All backend logs are aggregated in Grafana Loki and searchable by correlation ID, log level, and time range
  2. Queries exceeding a configurable threshold are logged with execution time and query details
  3. Reference data endpoints (fabric list, product list, supplier dropdown, customer dropdown) return cached results from Redis; cache invalidates on CUD operations
  4. k6 load test scripts exist for critical API endpoints with documented baseline benchmarks
  5. Frontend reports Web Vitals (LCP, FID/INP, CLS) to console or Sentry; dependency security scanning runs in CI pipeline
**Plans**: 4 plans

Plans:
- [x] 15-01: Log aggregation (Loki + Grafana) + slow query logging
- [x] 15-02: Redis caching (cache-aside) + cache invalidation
- [x] 15-03: k6 load testing + Web Vitals + structured logging
- [x] 15-04-PLAN.md — Gap closure: CI dependency security scanning (audit-ci + Dependabot)

### Phase 15: Containerization & Quality
**Goal**: Application runs in production-grade Docker containers with Nginx, automated CI/CD, and frontend quality baselines
**Depends on**: Phase 14 (all features stable before containerizing)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. Backend runs in a multi-stage Docker container (node:22-slim) with Prisma engine binary compatibility verified
  2. Frontend serves as static assets through Nginx with gzip/brotli compression, SSL termination, and SPA routing
  3. docker-compose.prod.yml brings up the full stack (NestJS + Redis + Nginx) with a single command; MySQL connects to external CDB
  4. CI/CD pipeline builds Docker images, pushes to registry, deploys via SSH, and runs Prisma migrate deploy automatically
  5. PWA manifest enables app installation with basic offline shell; eslint-plugin-jsx-a11y and vitest-axe enforce accessibility baseline on key pages
**Plans**: TBD
**UI hint**: yes

Plans:
- [x] 15-01: Docker multi-stage builds (backend + frontend/Nginx) + docker-compose.prod.yml
- [x] 15-02: CI/CD deploy stage + environment variable management
- [x] 15-03: PWA manifest + Service Worker + accessibility baseline

### Phase 16: Production Deployment
**Goal**: System is live on Tencent Cloud with all infrastructure provisioned, data migrated, and core business flows validated by users
**Depends on**: Phase 15 (containerization complete)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06
**Success Criteria** (what must be TRUE):
  1. Tencent Cloud lightweight server runs the Docker stack with Redis; CDB MySQL instance is connected and schema-migrated
  2. COS is configured for file storage; existing local file URLs are migrated to COS paths
  3. SSL certificate is active and auto-renews; all traffic is HTTPS
  4. WeChat Work OAuth login works on the production domain
  5. All core business flows (supplier/customer CRUD, fabric/product management, quote creation, order lifecycle, payment voucher upload, Excel import/export) pass manual UAT on production
**Plans**: TBD

Plans:
- [x] 16-01: Backend Dockerfile + Nginx reverse proxy configuration
- [x] 16-02: docker-compose.prod.yml + Phase A auth (ALLOW_DEV_LOGIN)
- [x] 16-03: Deploy/rollback scripts + deployment guide + Phase A deployment

### Phase 17: Domain & SSL Launch (Phase B)
**Goal**: System accessible via domain with HTTPS, WeChat Work OAuth fully functional, dev login removed
**Depends on**: Phase 16 (Phase A deployed), user purchases domain + completes ICP filing
**Requirements**: DEPLOY-03, DEPLOY-04, DEPLOY-05
**Success Criteria** (what must be TRUE):
  1. System accessible via `https://<domain>`, HTTP redirects to HTTPS
  2. SSL certificate active and auto-renews
  3. WeChat Work OAuth login works: QR scan in browser → callback → JWT cookie → authenticated
  4. ALLOW_DEV_LOGIN and VITE_ALLOW_DEV_LOGIN removed, dev login button hidden
  5. FORCE_HTTPS_COOKIES=true, all auth cookies are Secure + HttpOnly
**Plans**: 3 plans

Plans:
- [ ] 17-01-PLAN.md — Dev login complete removal (backend + frontend code, tests, env templates)
- [ ] 17-02-PLAN.md — Nginx HTTPS config + docker-compose SSL volumes + DEPLOY.md Phase B guide
- [ ] 17-03-PLAN.md — Checkpoint: domain purchase + ICP + Phase B cutover deployment

## Progress

**Execution Order:** Phases execute sequentially: 12 -> 13 -> 14 -> 15 -> 16 -> 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. Foundation & Observability Quick Wins | v1.1 | 3/3 | Complete    | 2026-03-28 |
| 13. Data Safety & Audit | v1.1 | 6/6 | Complete    | 2026-03-31 |
| 14. Observability & Performance | v1.1 | 4/4 | Complete    | 2026-04-03 |
| 15. Containerization & Quality | v1.1 | 3/3 | Complete    | 2026-04-03 |
| 16. Production Deployment | v1.1 | 3/3 | Phase A live | 2026-04-14 |
| 17. Domain & SSL Launch | v1.1 | 0/3 | Planning complete | - |

---
*Roadmap created: 2026-03-17*
*Last updated: 2026-04-14 (Phase 17 planned: 3 plans in 2 waves)*
