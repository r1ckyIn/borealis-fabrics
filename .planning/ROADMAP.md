# Roadmap: Borealis Supply Chain Management

## Milestones

- ✅ **v1.0 Supply Chain MVP** — Phases 1-11 (shipped 2026-03-28) — [Archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Production Readiness** — Phases 12-16 (in progress)

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

### 🚧 v1.1 Production Readiness

**Milestone Goal:** Close all engineering gaps and deploy to Tencent Cloud production.

- [ ] **Phase 12: Foundation & Observability Quick Wins** - Correlation ID, soft delete, Sentry integration, ErrorBoundary, tech debt cleanup
- [ ] **Phase 13: Data Safety & Audit** - Audit logging (backend + frontend), RBAC, data export, DB backup
- [ ] **Phase 14: Observability & Performance** - Log aggregation, Redis caching, load testing, Web Vitals, dependency scanning
- [ ] **Phase 15: Containerization & Quality** - Docker, Nginx, CI/CD, PWA, accessibility
- [ ] **Phase 16: Production Deployment** - Tencent Cloud setup, COS migration, SSL, OAuth, UAT

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
**Plans**: TBD

Plans:
- [x] 12-01: Correlation ID middleware + soft delete schema migration
- [ ] 12-02: Sentry integration (backend + frontend) + ErrorBoundary + tech debt fixes

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
- [ ] 13-01: Audit logging backend (interceptor, decorator, model, correlation ID consumption)
- [ ] 13-02: Audit log frontend page + RBAC + data export module + DB backup verification

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
**Plans**: TBD

Plans:
- [ ] 14-01: Log aggregation (Loki + Grafana) + slow query logging
- [ ] 14-02: Redis caching (cache-aside) + cache invalidation
- [ ] 14-03: k6 load testing + Web Vitals + dependency scanning

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
- [ ] 15-01: Docker multi-stage builds (backend + frontend/Nginx) + docker-compose.prod.yml
- [ ] 15-02: CI/CD deploy stage + environment variable management
- [ ] 15-03: PWA manifest + Service Worker + accessibility baseline

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
- [ ] 16-01: Tencent Cloud provisioning (server + CDB + Redis + COS + SSL)
- [ ] 16-02: COS file migration + WeChat Work OAuth + production UAT

## Progress

**Execution Order:** Phases execute sequentially: 12 → 13 → 14 → 15 → 16

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. Foundation & Observability Quick Wins | v1.1 | 0/2 | Not started | - |
| 13. Data Safety & Audit | v1.1 | 0/2 | Not started | - |
| 14. Observability & Performance | v1.1 | 0/3 | Not started | - |
| 15. Containerization & Quality | v1.1 | 0/3 | Not started | - |
| 16. Production Deployment | v1.1 | 0/2 | Not started | - |

---
*Roadmap created: 2026-03-17*
*Last updated: 2026-03-28 (v1.1 roadmap added — 5 phases, 12 plans, 38 requirements)*
