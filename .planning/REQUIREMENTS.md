# Requirements: Borealis Supply Chain Management

**Defined:** 2026-03-28
**Core Value:** All business documents importable, trackable, and queryable in one place — now production-ready and safely deployed.

## v1.1 Requirements

Requirements for production readiness milestone. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Backend runs in multi-stage Docker container with Prisma engine binary compatibility
- [ ] **INFRA-02**: Frontend builds as static assets served by Nginx
- [ ] **INFRA-03**: docker-compose.prod.yml orchestrates NestJS + Redis + Nginx (MySQL via CDB, not in compose)
- [ ] **INFRA-04**: Nginx reverse proxy handles SSL termination, gzip/brotli compression, and SPA routing
- [ ] **INFRA-05**: CI/CD deploy stage automates build, push, SSH deploy, and Prisma migrate deploy
- [ ] **INFRA-06**: Environment variable management with dev/production separation (.env.production validated)

### Data Safety

- [x] **DATA-01**: Soft delete (deletedAt) on all business entities via Prisma Client Extensions
- [x] **DATA-02**: Existing unique constraints updated to handle soft-deleted records (MySQL NULL != NULL pattern)
- [x] **DATA-03**: All existing queries automatically filter deleted records; explicit includeDeleted option available
- [ ] **DATA-04**: Audit log records all CUD operations with userId, action, entityType, entityId, changes, IP, timestamp
- [ ] **DATA-05**: Audit log consumes correlation ID from request context
- [x] **DATA-06**: Audit log frontend page in sidebar with list, filtering (by operator/action/entity/time), and detail view
- [x] **DATA-07**: RBAC via WeChat Work roles — audit log page accessible only to boss and developer roles
- [x] **DATA-08**: Data export to Excel for all entities (fabric, product, supplier, customer, order, quote) via centralized ExportModule
- [ ] **DATA-09**: CDB automatic backup verified + supplementary mysqldump-to-COS script for extended retention

### Observability

- [x] **OBS-01**: Sentry error tracking integrated on backend (NestJS exception filter + @SentryExceptionCaptured)
- [x] **OBS-02**: Sentry error tracking integrated on frontend (Sentry.ErrorBoundary + React Router integration)
- [x] **OBS-03**: Sentry beforeSend filters out expected errors (400/401/403/404) and scrubs PII
- [x] **OBS-04**: Request correlation ID via nestjs-cls, propagated through pino logs, Sentry context, and response headers
- [x] **OBS-05**: React ErrorBoundary with graceful fallback UI and Sentry error reporting
- [x] **OBS-06**: Log aggregation via Loki + Grafana sidecar with pino-loki transport
- [x] **OBS-07**: Slow query logging via Prisma query event timing with threshold alerting

### Performance

- [ ] **PERF-01**: Redis query caching with cache-aside pattern on reference data (fabric, product, supplier, customer)
- [ ] **PERF-02**: Cache invalidation on CUD operations for cached entities
- [ ] **PERF-03**: k6 load testing scripts for critical API endpoints with baseline benchmarks documented
- [ ] **PERF-04**: Web Vitals monitoring (LCP, FID, CLS) with reporting to console/Sentry

### Quality

- [ ] **QUAL-01**: Dependency security scanning integrated in CI/CD pipeline
- [ ] **QUAL-02**: PWA manifest + Service Worker for basic offline shell and asset caching
- [ ] **QUAL-03**: Accessibility (a11y) baseline: eslint-plugin-jsx-a11y enabled, vitest-axe on key pages, aria-labels on interactive elements

### Deployment

- [ ] **DEPLOY-01**: Tencent Cloud lightweight server provisioned with Docker, Nginx, Redis
- [ ] **DEPLOY-02**: Tencent CDB MySQL instance configured and connected
- [ ] **DEPLOY-03**: Tencent COS configured for file storage, existing local file URLs migrated
- [ ] **DEPLOY-04**: SSL certificate provisioned and auto-renewed (Let's Encrypt or Tencent managed)
- [ ] **DEPLOY-05**: WeChat Work OAuth callback URL updated to production domain
- [ ] **DEPLOY-06**: Production UAT validation — all core business flows verified on production

### Tech Debt (carried from v1.0)

- [x] **DEBT-01**: OrderFormPage inline field validation for 400/422 responses (currently toast-only)
- [x] **DEBT-02**: Fix operatorId: undefined in OrderPaymentService
- [x] **DEBT-03**: Tune SalesContractImportStrategy for real file formats

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Per-user/per-IP rate limiting (currently global only)
- **ADV-02**: Field-level encryption for PII (customer addresses, phone numbers)
- **ADV-03**: Data retention/archival policy with automatic cold storage
- **ADV-04**: API documentation published (Swagger UI in production)
- **ADV-05**: Infinite scroll as pagination alternative
- **ADV-06**: Dark mode theme

## Out of Scope

| Feature | Reason |
|---------|--------|
| ELK stack for logging | Too heavy for lightweight server; Loki+Grafana is sufficient |
| @nestjs/cache-manager | Conflicts with existing RedisService; custom cache-aside preferred |
| @axe-core/react | Does not support React 18; use eslint-plugin-jsx-a11y + vitest-axe |
| Express compression middleware | Nginx handles compression more efficiently at C level |
| Multi-region/read replicas | Single lightweight server, 2-5 users, not needed |
| Kubernetes/container orchestration | Overkill for single-server deployment |
| Full WCAG 2.1 AA compliance | a11y baseline only; full compliance deferred |
| Automated E2E UI testing (Playwright) | v2 scope; manual UAT sufficient for v1.1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 15 | Pending |
| INFRA-02 | Phase 15 | Pending |
| INFRA-03 | Phase 15 | Pending |
| INFRA-04 | Phase 15 | Pending |
| INFRA-05 | Phase 15 | Pending |
| INFRA-06 | Phase 15 | Pending |
| DATA-01 | Phase 12 | Complete |
| DATA-02 | Phase 12 | Complete |
| DATA-03 | Phase 12 | Complete |
| DATA-04 | Phase 13 | Pending |
| DATA-05 | Phase 13 | Pending |
| DATA-06 | Phase 13 | Complete |
| DATA-07 | Phase 13 | Complete |
| DATA-08 | Phase 13 | Complete |
| DATA-09 | Phase 13 | Pending |
| OBS-01 | Phase 12 | Complete |
| OBS-02 | Phase 12 | Complete |
| OBS-03 | Phase 12 | Complete |
| OBS-04 | Phase 12 | Complete |
| OBS-05 | Phase 12 | Complete |
| OBS-06 | Phase 14 | Complete |
| OBS-07 | Phase 14 | Complete |
| PERF-01 | Phase 14 | Pending |
| PERF-02 | Phase 14 | Pending |
| PERF-03 | Phase 14 | Pending |
| PERF-04 | Phase 14 | Pending |
| QUAL-01 | Phase 14 | Pending |
| QUAL-02 | Phase 15 | Pending |
| QUAL-03 | Phase 15 | Pending |
| DEPLOY-01 | Phase 16 | Pending |
| DEPLOY-02 | Phase 16 | Pending |
| DEPLOY-03 | Phase 16 | Pending |
| DEPLOY-04 | Phase 16 | Pending |
| DEPLOY-05 | Phase 16 | Pending |
| DEPLOY-06 | Phase 16 | Pending |
| DEBT-01 | Phase 12 | Complete |
| DEBT-02 | Phase 12 | Complete |
| DEBT-03 | Phase 12 | Complete |

**Coverage:**
- v1.1 requirements: 38 total (6 INFRA + 9 DATA + 7 OBS + 4 PERF + 3 QUAL + 6 DEPLOY + 3 DEBT)
- Mapped to phases: 38/38 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 — traceability populated after roadmap creation*
