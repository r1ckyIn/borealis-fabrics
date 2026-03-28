# Project Research Summary

**Project:** Borealis Fabrics — v1.1 Production Readiness
**Domain:** Production infrastructure hardening for existing NestJS + React supply chain management system
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

Borealis Fabrics v1.1 is a production readiness milestone — not a feature milestone. The system already has 73K+ LOC, 1000+ passing tests, and a validated modular monolith architecture (NestJS + React + Prisma + MySQL + Redis). The goal is to bring this to a state that can be deployed on Tencent Cloud, monitored in production, and trusted with real business data. The recommended approach is "wrap, don't rewrite": every new capability integrates as a thin layer around existing components with no changes to business service logic.

The stack requires only 8 new npm packages (5 production, 3 dev) and removes 2 dead dependencies. The critical infrastructure decisions are already resolved: Nginx handles compression (not Express middleware), Tencent CDB provides auto-backup (no custom solution needed), and Redis caching reuses the existing `RedisService` (no `@nestjs/cache-manager`). The build order is driven by dependency chains: correlation ID and soft delete go first as foundational concerns, then Sentry and audit logging which reference correlation context, then caching and export as independent features, then containerization after all features stabilize.

The highest-risk area is soft delete. The schema has 14 unique constraints that will silently break when soft-deleted records are recreated — MySQL does not support partial unique indexes, so the `@@unique([field, deletedAt])` composite approach is required and must be planned before writing any code. An additional user requirement confirmed during synthesis: audit logging needs a dedicated frontend page in the sidebar, accessible only to boss and developer roles via WeChat Work RBAC — this adds a Phase 2 frontend component not covered in the original feature research.

## Key Findings

### Recommended Stack

The existing stack (NestJS 11, React 18, Prisma 6, MySQL 8, Redis 7, Vite 7, Ant Design 6) requires minimal additions. All new packages are verified against official documentation. The infrastructure layer (Nginx, Docker, Grafana Loki, k6) runs as system binaries or Docker images — zero new npm dependencies in that layer.

**Core new technologies:**
- `nestjs-cls ^6.2`: Continuation-local storage — AsyncLocalStorage-based, NestJS 11 first-class support; the foundational cross-cutting context carrier for audit logging and Sentry tags
- `@sentry/nestjs ^10.44` + `@sentry/react ^10.46`: Official Sentry SDKs — one decorator on `AllExceptionsFilter`, one wrapper in `App.tsx`; pino integration via `Sentry.pinoIntegration()` built-in
- `pino-loki ^2.3`: Pino transport to Grafana Loki — extends existing `nestjs-pino` config, no new logging abstraction needed
- `vite-plugin-pwa ^1.2`: Auto-generates PWA manifest + service worker via Workbox — confirmed compatible with Vite 7
- `eslint-plugin-jsx-a11y ^6.10` + `vitest-axe ^0.1` (dev): Accessibility linting + test assertions — `@axe-core/react` does NOT support React 18; this combination does
- `node:22-slim` (Docker base): Preferred over Alpine for backend — Alpine's musl libc causes Prisma engine binary incompatibility at startup
- `nginx:1.28-alpine` (Docker): Reverse proxy, SSL termination, gzip/brotli compression, static file serving; compression at Nginx level removes it from the Node.js process entirely
- `grafana/loki:3.4` + `grafana/grafana:11.5` (Docker): Lightweight log aggregation (~128MB total RAM vs ELK's GB-scale requirement)

**Remove (dead dependencies):** `@nestjs/cache-manager ^3.1.0` and `cache-manager ^7.2.8` — installed but never imported anywhere in the codebase; the custom `RedisService` replaced their intended purpose.

### Expected Features

**Must have (table stakes — cannot go live without):**
- Docker containerization with multi-stage builds (backend + Nginx+frontend images)
- Nginx reverse proxy with SSL termination and gzip/brotli compression
- Sentry error tracking backend + frontend with pino bridge
- Request correlation IDs via `nestjs-cls` — foundational for all observability
- CI/CD deploy stage extending existing GitHub Actions
- CDB backup verification — built-in, just confirm configuration
- Dependency security scanning — Dependabot + `pnpm audit --audit-level=high` in CI

**Should have (production quality differentiators):**
- Soft delete with `deletedAt` — recover accidentally deleted records; replaces `isActive` as the soft-delete mechanism
- Audit logging with `@Audited()` decorator on all mutation endpoints — track who changed what, when
- **Audit log frontend page** (user requirement): sidebar navigation item with entity/action/user/date filters; RBAC restricted to boss and developer WeChat Work roles only
- Redis query caching (cache-aside) — extend `RedisService` with `getOrSet<T>()`; cache reference data only (fabrics, products, suppliers, customers, system enums)
- Log aggregation (Loki + Grafana) — centralized log search, Grafana dashboards
- Data export to Excel — reuse existing `exceljs` from ImportModule via new centralized ExportModule
- PWA manifest + service worker — installable app shell, static asset caching only
- a11y tooling — lint-time and test-time accessibility checks
- k6 baseline load benchmarks

**Defer (not in v1.1):**
- Kubernetes / Docker Swarm — overkill for 2-5 users on a single server
- ELK stack — 2-4GB RAM vs Loki's 128MB for the same scale
- Custom backup rotation — CDB handles this automatically
- APM / Prometheus / custom metrics — Sentry + Loki coverage is sufficient at this scale
- Mobile PWA optimization — desktop-first internal tool
- Offline data sync — dangerous for supply chain data consistency

### Architecture Approach

The architecture follows a strict layering principle: new cross-cutting concerns (soft delete, audit, caching, correlation ID) are implemented as extension points around existing components, never embedded in business service code. Existing services change only to add `@Audited()` decorators on mutation endpoints and optional cache calls — no business logic changes. The ExportModule is centralized (not distributed across every module) to avoid duplicating Excel formatting logic. Nginx sits in front of the entire application, owning compression and static file serving, so the Node.js process handles only application logic.

**Major components:**

1. **CorrelationIdMiddleware** — generates/propagates `X-Request-Id` per request; injected into pino log context via `genReqId`, Sentry tags, and audit log `requestId` field
2. **PrismaService `$extends()` soft-delete extension** — auto-filters `deletedAt: null` on all `findMany`/`findFirst`/`findUnique` for business entities; `delete()` operations rewritten to set `deletedAt`; requires composite unique index strategy (`@@unique([field, deletedAt])`) to handle the 14 existing unique constraints
3. **AuditInterceptor + `@Audited()` decorator** — applied per-endpoint on mutations only (not globally to avoid flooding the table); reads `req.user` directly from ExecutionContext (no AuthModule import to avoid circular dependency); async `tap()` write so failures do not block API responses
4. **CacheService** — wraps `RedisService` with `getOrSet<T>()` and `invalidateByPrefix()`; cache-aside pattern for reference data only; orders, quotes, and payments are never cached
5. **ExportModule** — centralized Excel export via existing `exceljs`; injects existing business services for data queries; endpoints at `/api/v1/export/:entity`; audit-logged with `@Audited({ action: 'EXPORT' })`
6. **Sentry `instrument.ts` (x2)** — loaded first in `main.ts` and `main.tsx` before any other imports; `@SentryExceptionCaptured` on `AllExceptionsFilter`; `beforeSend` filters all `HttpException` with status < 500 to prevent 404/400/409 noise; `beforeBreadcrumb` scrubs PII
7. **Nginx + docker-compose.prod.yml** — `nginx:1.28-alpine` fronts all traffic; backend on `node:22-slim`; MySQL stays on Tencent CDB (not in compose); only Redis runs locally as a container
8. **Audit log frontend page** — sidebar navigation item; data table with entity/action/user/date filters; RBAC: visible only to users with boss or developer WeChat Work role

**Build order (dependency-driven):**
```
Phase 1: Correlation ID + Soft Delete   (no upstream dependencies)
Phase 2: Sentry + Audit Logging         (depends on correlation ID context)
Phase 3: Redis Caching + Data Export    (independent, can parallelize)
Phase 4: Docker + Nginx + CI/CD         (depends on all features being stable)
Phase 5: Production Deployment          (depends on containerization)
```

### Critical Pitfalls

1. **Soft delete breaks 14 unique constraints** — MySQL does not support partial unique indexes (unlike PostgreSQL's `WHERE deletedAt IS NULL` approach). Must use `@@unique([field, deletedAt])` composite: MySQL treats `NULL != NULL` so active `(FC-001, NULL)` and deleted `(FC-001, 2026-03-28T...)` are distinct. The migration adding `deletedAt` columns AND updating all 14 unique constraints must be one atomic Prisma migration. Verify with: create entity, soft-delete, create same entity again — must succeed without conflict error.

2. **205 `isActive: true` locations create ambiguous double-filtering** — Adding Prisma client extension to auto-filter `deletedAt IS NULL` while 205 service queries still have `isActive: true` creates double filtering AND semantic ambiguity. The decision must be made before any code: keep `isActive` as soft-delete (no extension needed) OR replace `isActive` with `deletedAt` extension AND systematically remove soft-delete `isActive` checks from all 24 files. Recommended: use `deletedAt` extension as the sole soft-delete mechanism; retain `isActive` only where it carries distinct business semantics (not soft delete).

3. **Sentry captures every 404/400/409 as an error** — Without `beforeSend` filtering, every `NotFoundException` and `BadRequestException` floods Sentry. The project has hundreds of these across all services. Prevention: `beforeSend` drops all `HttpException` with status < 500. Also: `beforeBreadcrumb` to scrub PII (customer phone numbers, WeChat IDs, Chinese address strings). Verify after integration: if >90% of events are 4xx, filtering is not working.

4. **Prisma engine binary mismatch in multi-stage Docker build** — `prisma generate` in a Debian/glibc stage produces binaries that crash on Alpine/musl at startup. Use `node:22-slim` for both build and production stages to keep the same glibc base throughout. Do NOT use Alpine for the backend Node.js stage (Alpine is fine for Nginx only).

5. **E2E test mocks bypass Prisma client extension** — All 11 E2E test suites mock `PrismaService` with plain `jest.fn()` objects that do not execute the `$extends()` soft-delete extension. After adding the extension, tests pass against mocks (returning all records) but production queries auto-filter soft-deleted records. Require a mock wrapper that simulates extension behavior, or explicit `deletedAt` handling in each mock setup.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation — Correlation ID + Soft Delete

**Rationale:** Both are foundational with no upstream dependencies. Correlation ID must exist before Sentry and audit logging can reference it. Soft delete is a destructive schema migration that must be done early — discovering a unique constraint flaw during Phase 4 containerization would require re-running migrations and potentially rewriting service code across 24 files.
**Delivers:** `CorrelationIdMiddleware` registered in `AppModule.configure()`; pino `genReqId` updated to read `X-Request-Id` header; `deletedAt DateTime?` added to all 6 business entity models with composite unique indexes replacing 14 existing `@unique` constraints; Prisma client extension auto-filtering `deletedAt: null`; data backfill migration (`isActive: false` rows get `deletedAt = updatedAt`); updated E2E test helpers to simulate extension behavior
**Avoids:** Pitfall 1 (unique constraint collision), Pitfall 2 (isActive ambiguity), Pitfall 11 (E2E mock divergence)
**Research flag:** Pre-work required — run `grep -rn "isActive" backend/src --include="*.ts"` and classify each of the 205 occurrences as "soft-delete check to remove" vs "business-status check to keep." This categorization determines the scope of service file changes and must happen before planning is finalized.

### Phase 2: Observability — Sentry + Audit Logging

**Rationale:** Depends on Phase 1 correlation ID. Both Sentry tags and audit log `requestId` reference the correlation context established in Phase 1. Grouping them together avoids building Sentry and then immediately retrofitting correlation ID integration.
**Delivers:** `@sentry/nestjs` + `@sentry/react` with `beforeSend` 4xx filtering and PII scrubbing; `@SentryExceptionCaptured` on `AllExceptionsFilter`; `@SentryCron` on `QuoteExpirationJob`; `AuditInterceptor` + `@Audited()` decorator applied to all POST/PUT/PATCH/DELETE controller methods; `AuditLogService` writing async to `audit_logs` table; `AuditLog` Prisma model with indexes on `(entity, entityId)`, `userId`, `createdAt`, `action`; **audit log frontend page** in sidebar (table with filters, RBAC gated to boss + developer WeChat Work roles)
**Stack elements:** `@sentry/nestjs ^10.44`, `@sentry/react ^10.46`
**Avoids:** Pitfall 5 (Sentry 404 noise), Pitfall 7 (audit circular dependency — read `req.user` directly, never import AuthModule into interceptor), Pitfall 15 (PII in breadcrumbs), Pitfall 9 (source maps in production image — upload then delete via `@sentry/vite-plugin`)
**Research flag:** Audit log frontend RBAC requires confirming how WeChat Work role data flows from existing auth to frontend. Verify: (1) does `req.user` include a role field, (2) what values represent boss/developer, (3) how the frontend currently reads role for any existing role-based visibility.

### Phase 3: Features — Redis Caching + Data Export

**Rationale:** Both are independent of each other and of Phase 2. Both depend on Phase 1 schema stability. Export reuses existing `exceljs` (already installed for ImportModule). Caching extends the existing `RedisService`. Neither requires the observability layer from Phase 2.
**Delivers:** `CacheService` with `getOrSet<T>()` and `invalidateByPrefix()` wrapping existing `RedisService`; cache-aside applied to fabric list, product list, supplier dropdown, customer dropdown, system enums (TTL 5-30 min per entity type); `@nestjs/cache-manager` and `cache-manager` removed; `ExportModule` with `ExportController` at `/api/v1/export/:entity`, `ExportService` injecting existing business services, per-entity column definition configs; export endpoints decorated with `@Audited({ action: 'EXPORT' })`
**Avoids:** Pitfall 6 (cache invalidation desync — use short TTLs + invalidate after confirmed transaction commit; never cache inside `$transaction` callback), Anti-Pattern 2 (never cache orders/quotes/payments), Anti-Pattern 6 (remove dual Redis abstraction)
**Research flag:** Standard well-documented patterns. No research phase needed.

### Phase 4: Containerization — Docker + Nginx + CI/CD

**Rationale:** Depends on all features (Phases 1-3) being stable. Docker builds lock the codebase state. Nginx config depends on knowing all routes and the final auth/API structure. CI/CD depends on well-defined Docker images.
**Delivers:** Multi-stage `Dockerfile` for backend (`node:22-slim` build + prod stages, `prisma generate` in build stage); multi-stage `Dockerfile` for frontend+nginx (`node:22-slim` build -> `nginx:1.28-alpine` serve); `docker-compose.prod.yml` (backend + nginx + redis; no MySQL — on CDB); `nginx.conf` (SSL termination, gzip, SPA `try_files` fallback, `/api/` reverse proxy, `X-Request-Id: $request_id` injection); `.dockerignore` for both services (targets <400MB backend, <100MB frontend image); GitHub Actions CD job (build + push Docker images, SSH deploy, `prisma migrate deploy && node dist/main.js` sequential start, health check); `pnpm audit --audit-level=high` in CI; Dependabot config; `pino-loki ^2.3` transport in `LoggerModule`; Loki + Grafana in monitoring compose file
**Stack elements:** `nginx:1.28-alpine`, `node:22-slim`, `pino-loki ^2.3`, `grafana/loki:3.4`, `grafana/grafana:11.5`
**Avoids:** Pitfall 3 (Prisma engine binary — same `node:22-slim` base for both stages), Pitfall 4 (migration race — sequential `migrate deploy && node dist/main.js`), Pitfall 8 (image size >1GB — multi-stage + `.dockerignore` + prod-only deps), Anti-Pattern 7 (no compression in Node.js — Nginx only), Anti-Pattern 8 (log to stdout not files — pino default)
**Research flag:** Tencent Cloud CI/CD specifics. The `appleboy/ssh-action` SSH deploy pattern is standard but the exact Tencent Cloud Container Registry endpoint, Docker Hub vs TCR decision, and server SSH key setup need project-specific validation during planning.

### Phase 5: Production Deployment

**Rationale:** Final phase after everything is containerized and tested. Requires coordinated execution: Tencent Cloud server setup, CDB schema migration, SSL certificate, first CI/CD-triggered production deploy.
**Delivers:** Working production environment on Tencent Cloud; CDB schema migration executed (with maintenance window sized from dry-run timing); SSL certificate installed (Let's Encrypt or Tencent SSL); production `.env` configured; first CI/CD-triggered deploy verified via health checks; CDB auto-backup confirmed; `vite-plugin-pwa ^1.2` PWA manifest + service worker (static asset caching only, `/api` excluded from workbox); `eslint-plugin-jsx-a11y` + `vitest-axe` a11y tooling; k6 baseline benchmarks for critical endpoints; web-vitals decision (verify Sentry `browserTracingIntegration` coverage first, add `web-vitals ^5.2` only if insufficient)
**Avoids:** Pitfall 10 (PWA caches API — exclude `/api` from workbox `navigateFallbackDenylist`), Pitfall 12 (CDB restrictions — test migrations against CDB before deploy day), Pitfall 13 (k6 auth — use k6 cookie jar for HttpOnly cookie auth)
**Research flag:** CDB migration timing. The soft-delete migration from Phase 1 adds `deletedAt` columns + drops and recreates 14 unique indexes. Do a dry-run against a CDB-sized dataset before scheduling the production maintenance window — this could take 10-30 seconds depending on row counts.

### Phase Ordering Rationale

- **Correlation ID before Sentry and audit** — both reference correlation context. Building it first means Sentry events and audit records automatically include `requestId` without retrofitting.
- **Soft delete in Phase 1, not later** — discovering Pitfall 1 (unique constraint collision) during Phase 4 or 5 would require a schema redesign while dealing with containerization and deployment concerns simultaneously. Early discovery is cheap.
- **Export in Phase 3, not Phase 5** — export endpoints should be present when load testing in Phase 5. Excel export is CPU-heavy and benefits from k6 benchmarking against a baseline.
- **Docker after all features** — multi-stage builds bake in a specific code state. Feature churn inside Docker makes rebuilds expensive and obscures whether issues are code bugs or Docker configuration bugs.
- **PWA + a11y deferred to Phase 5** — both are pure config additions with no upstream dependencies and no impact on any other phase. They can be safely added at the end.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1:** The `isActive` vs `deletedAt` semantic audit is mandatory pre-work, not optional research. Run `grep -rn "isActive" backend/src` and categorize all 205 occurrences before planning the phase. The unique constraint strategy (`@@unique([field, deletedAt])`) is already confirmed — the risk is in the execution of the 24-file migration.
- **Phase 2:** Audit log frontend RBAC requires confirming the WeChat Work role field name and values in the existing JWT/session user object. Check the existing frontend for any role-based UI gating to find the reference pattern.
- **Phase 4:** Tencent Cloud Container Registry (TCR) endpoint and credentials for the GitHub Actions `docker/build-push-action` step. Standard SSH deploy pattern is documented but Tencent-specific registry details need validation.

Phases with standard patterns (skip research-phase):
- **Phase 3:** Redis cache-aside and ExportModule are standard NestJS patterns. ARCHITECTURE.md already contains working code snippets. Implementation is direct.
- **Phase 5:** Production deployment is a deterministic checklist. CDB is managed MySQL with no novel integration. PWA and a11y are config-level additions with official documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified against official docs + npm. Version numbers confirmed. `nestjs-cls v6` confirmed NestJS 11 compatible. `vite-plugin-pwa v1.2` confirmed Vite 7 compatible. `@axe-core/react` React 18 incompatibility confirmed in official README. |
| Features | HIGH | Feature list derived from direct codebase analysis (14 unique constraints identified by name, 205 `isActive` locations counted across 24 files, 11 E2E test suites examined). Audit log frontend + RBAC requirement incorporated from user requirement. |
| Architecture | HIGH | Based on direct codebase analysis of existing module graph, bootstrap chain, and data access patterns. Prisma v6 client extension API confirmed (middleware removed in v4.16). All code snippets in ARCHITECTURE.md are verified against official docs. |
| Pitfalls | HIGH | Critical pitfalls verified with specific MySQL behavior documentation (NULL uniqueness in composite unique indexes, musl/glibc incompatibility with Prisma). Codebase-specific numbers verified by direct file analysis. |

**Overall confidence:** HIGH

### Gaps to Address

- **`isActive` semantic audit:** Before Phase 1 planning, run `grep -rn "isActive" backend/src --include="*.ts"` and classify each of the 205 occurrences. The classification determines whether soft-delete checks are purely removable or whether some `isActive` fields carry distinct business semantics that must be preserved alongside `deletedAt`.
- **Audit log frontend RBAC:** Confirm the exact field name and values in the JWT/session user object for WeChat Work roles before Phase 2 planning. Find the reference pattern from any existing role-based UI gating in the frontend.
- **Web Vitals deduplication:** During Phase 5, verify whether `@sentry/react v10` with `browserTracingIntegration` already captures LCP, INP, CLS, FCP, TTFB automatically. If yes, skip `web-vitals ^5.2`. If Sentry coverage is insufficient, add it.
- **Tencent Cloud Container Registry vs Docker Hub:** Decide during Phase 4 planning whether to push Docker images to TCR (better pull latency from Tencent Cloud server) or Docker Hub (simpler credentials setup). Cost and latency implications differ.
- **CDB migration timing:** Before Phase 5, do a dry-run of the Phase 1 soft-delete migration against a CDB-sized dataset snapshot. The migration adds `deletedAt` columns + drops and recreates 14 unique indexes. On production-scale tables, this could take 10-30 seconds. Schedule maintenance window accordingly.

## Sources

### Primary (HIGH confidence)

- [Prisma Client Extensions — Soft Delete](https://www.prisma.io/docs/orm/prisma-client/client-extensions/middleware/soft-delete-middleware) — confirmed middleware removed in v6, extensions are current API
- [NestJS Official Sentry Recipe](https://docs.nestjs.com/recipes/sentry) — `@SentryExceptionCaptured` on `AllExceptionsFilter`
- [Sentry NestJS Guide](https://docs.sentry.io/platforms/javascript/guides/nestjs/) — `beforeSend`, pino integration, cron isolation
- [Sentry Filtering Docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/configuration/filtering/) — `beforeSend` pattern for 4xx filtering
- [nestjs-cls Documentation](https://papooch.github.io/nestjs-cls/) — v6 NestJS 11 compatibility confirmed
- [NestJS Compression Docs](https://docs.nestjs.com/techniques/compression) — explicitly recommends Nginx for production over `compression` npm
- [NestJS Async Local Storage Recipe](https://docs.nestjs.com/recipes/async-local-storage) — official AsyncLocalStorage guidance
- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/) — Vite 7 compatibility confirmed
- [Tencent Cloud CDB Backup](https://www.tencentcloud.com/product/cdb) — auto-backup with PITR confirmed
- [Node.js Docker Image Best Practices](https://snyk.io/blog/choosing-the-best-node-js-docker-image/) — `node:22-slim` over Alpine for Prisma native modules
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/docker) — engine binary targets for multi-stage builds
- [ZenStack: Soft Delete Unique Constraint](https://zenstack.dev/blog/soft-delete-real) — MySQL NULL uniqueness in composite unique indexes
- [MySQL NULL uniqueness](https://www.aleksandra.codes/mysql-nulls) — `NULL != NULL` in unique index confirmed
- [Grafana k6 Cookies Documentation](https://grafana.com/docs/k6/latest/using-k6/cookies/) — cookie jar for HttpOnly cookie auth in load tests
- [GitHub Dependabot Documentation](https://docs.github.com/en/code-security/dependabot) — built-in, free for GitHub repos
- [Prisma Deploy Migrations Docs](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate) — `migrate deploy` vs `migrate dev` in production

### Secondary (MEDIUM confidence)

- [pino-loki npm](https://www.npmjs.com/package/pino-loki) — widely used; exact latest version should be verified at install time
- [vitest-axe](https://www.npmjs.com/package/vitest-axe) — low release frequency but stable API; confirmed React 18 compatible alternative to `@axe-core/react`
- [NestJS + exceljs Export](https://medium.com/@ggluopeihai/nestjs-export-excel-file-697e3891ea8f) — ExportModule pattern with streaming Excel response
- [Sentry PII Scrubbing Docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/data-management/sensitive-data/) — `beforeBreadcrumb` PII filtering

### Tertiary (LOW confidence)

- Tencent Cloud Container Registry endpoint and `appleboy/ssh-action` Tencent-specific integration — general SSH deploy pattern is documented; Tencent-specific registry details need project-level validation at implementation time

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
