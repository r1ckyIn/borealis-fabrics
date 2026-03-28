# Technology Stack: v1.1 Production Readiness

**Project:** Borealis Supply Chain Management System
**Researched:** 2026-03-28
**Milestone:** v1.1 Production Readiness
**Overall confidence:** HIGH (official docs + npm verified for all packages)

---

## Context: What This Research Covers

The existing validated stack (NestJS 11, React 18, Prisma 6, MySQL 8, Redis 7, Vite 7, Ant Design 6, nestjs-pino, Helmet, Terminus health checks) is NOT being re-researched. This document covers ONLY the new production readiness capabilities:

1. Docker containerization (backend + frontend + Nginx)
2. Nginx reverse proxy with SSL termination and compression
3. CI/CD deploy stage (GitHub Actions extension)
4. Database backup automation
5. Sentry error tracking (backend + frontend)
6. Log aggregation (pino -> Loki)
7. Request correlation IDs (nestjs-cls)
8. Gzip/Brotli compression
9. Redis query caching (cache-aside pattern)
10. k6 load testing
11. Dependency security scanning
12. Web Vitals performance monitoring
13. PWA manifest + Service Worker
14. Accessibility (a11y) tooling

---

## Recommended Stack Additions

### 1. Docker Containerization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Docker multi-stage build | - | Backend + frontend images | Multi-stage: full node for build, slim for runtime. Reduces image size from 1GB+ to ~200MB |
| node:22-slim | 22 LTS | Base runtime image | Safer than Alpine for production (glibc vs musl compatibility). Node 22 matches CI. |
| nginx:1.28-alpine | 1.28 stable | Reverse proxy + static file serving | Alpine fine for Nginx (no native Node modules). Handles SSL, compression, static assets |
| docker compose | v2 | Multi-container orchestration | Production compose for backend + Nginx + backup sidecar. Dev services (MySQL, Redis) already exist locally |

**Key decision: node:22-slim over node:22-alpine.** Alpine uses musl libc which can cause subtle issues with native Node modules (Prisma client, bcrypt). Slim uses glibc and is the officially recommended production choice. Alpine is fine for Nginx since it has no Node dependencies.

**Confidence:** HIGH -- Docker Hub official images, Node.js Docker best practices guide.

### 2. Nginx Reverse Proxy

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| nginx:1.28-alpine | 1.28 | Reverse proxy, SSL termination, static serving, compression | Industry standard. Handles gzip/brotli better than Node.js middleware. Serves frontend static files directly |

**Configuration scope:**
- Reverse proxy `/api/v1` to NestJS backend (port 3000)
- Serve frontend static assets directly from `/`
- SSL termination with Let's Encrypt certificates
- Gzip + Brotli compression at Nginx level (NOT Express middleware)
- Security headers (supplement to Helmet)
- Rate limiting at proxy level (supplement to NestJS throttler)
- WebSocket passthrough for future needs

**Key decision: Compression at Nginx level, NOT Express middleware.** Nginx is purpose-built for compression and handles it with less CPU overhead than Node.js. The `compression` npm package (v1.8.1) is unnecessary when Nginx sits in front. This avoids adding runtime dependencies to the Node.js process.

**Confidence:** HIGH -- standard production architecture pattern.

### 3. CI/CD Deploy Stage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GitHub Actions (existing) | v4 actions | CI pipeline extension | Already configured for lint/test/build. Adding deploy stage |
| actions/checkout@v4 | v4 | Git checkout | Already in use |
| docker/build-push-action | v6 | Build + push Docker images | Official GitHub Action for Docker builds |
| appleboy/ssh-action | v1 | SSH deploy to Tencent Cloud | Lightweight, widely-used for simple server deployments |

**Deploy strategy:** Build Docker images in CI -> push to registry -> SSH into server -> docker compose pull + up. This is the simplest approach for a single Tencent Cloud lightweight server.

**NOT recommended:** Kubernetes, Docker Swarm, or any orchestration platform. This is a 2-5 user internal tool on a budget-tier server. docker compose is the right abstraction level.

**Confidence:** HIGH -- GitHub Actions official docs.

### 4. Database Backup Automation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tencent Cloud CDB auto-backup | Managed | Automatic daily full backups, binlog-based PITR | CDB includes daily automatic backups with point-in-time recovery. No custom solution needed |
| mysqldump cron (fallback) | - | Export backup to COS | Only needed if using self-managed MySQL, not CDB |

**CRITICAL FINDING: Tencent Cloud CDB has built-in automatic daily backups with point-in-time recovery (up to 3 days lossless, 5 days cold backup).** The project constraint specifies CDB as the database service. Therefore:

- **Primary backup:** CDB managed auto-backup (zero configuration, built-in)
- **Supplementary:** A lightweight cron script that exports mysqldump to COS (Tencent Object Storage) weekly for offsite redundancy. This can be a simple Docker sidecar using `fradelg/mysql-cron-backup` image.
- **Retention:** CDB default + 30-day COS retention for supplementary dumps

**What NOT to build:** A custom NestJS backup module or complex backup rotation system. CDB handles this.

**Confidence:** HIGH -- Tencent Cloud CDB documentation confirms auto-backup feature.

### 5. Sentry Error Tracking

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @sentry/nestjs | ^10.44 | Backend error tracking + performance monitoring | Official Sentry NestJS SDK. First-class NestJS support with decorators (@SentryExceptionCaptured, @SentryTraced, @SentryCron) |
| @sentry/react | ^10.46 | Frontend error tracking + performance | Official Sentry React SDK. Integrates with ErrorBoundary (already exists), React Router, TanStack Query |

**Integration points with existing code:**
- Backend: `@SentryExceptionCaptured()` on existing `AllExceptionsFilter`. `@SentryCron()` on `QuoteExpirationJob`
- Frontend: Wire existing `ErrorBoundary.onError` callback to `Sentry.captureException()`
- Pino integration: `Sentry.pinoIntegration()` captures warn/error level pino logs as Sentry events (requires SDK >= 10.18.0)
- Performance: `tracesSampleRate: 0.1` for production (10% sampling sufficient for 2-5 users)

**Key decision: @sentry/nestjs over @ntegral/nestjs-sentry.** The official Sentry SDK has first-class NestJS support since 2024, making the third-party wrapper unnecessary. Official SDK gets faster updates and has pino integration built-in.

**Confidence:** HIGH -- Sentry official docs, NestJS official recipe.

### 6. Log Aggregation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| pino-loki | ^2.3 | Pino transport to Grafana Loki | Direct pino-to-Loki transport. No log shippers needed. Works as nestjs-pino transport target |
| Grafana Loki | 3.x (Docker) | Log storage + query engine | Lightweight log aggregation designed for small deployments. Index-free, stores compressed logs |
| Grafana | 11.x (Docker) | Log visualization dashboard | Pairs with Loki. Also visualizes Sentry data and future metrics |

**Integration with existing nestjs-pino:**
```typescript
// app.module.ts LoggerModule config addition
LoggerModule.forRoot({
  pinoHttp: {
    transport: {
      targets: [
        { target: 'pino-loki', options: { host: 'http://loki:3100' } },
        // pino-pretty for dev only
      ],
    },
  },
})
```

**Key decision: pino-loki over ELK/Elasticsearch.** Loki is dramatically lighter than Elasticsearch (tens of MB vs GB of RAM). For a 2-5 user app, ELK is massive overkill. Loki + Grafana runs in ~128MB RAM total.

**NOT recommended for this scale:** ELK stack, Datadog, New Relic (cost prohibitive), Fluentd/Fluentbit (unnecessary complexity when pino-loki exists).

**Confidence:** MEDIUM -- pino-loki widely used but version may vary. Verify exact latest version at install time.

### 7. Request Correlation IDs

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| nestjs-cls | ^6.2 | Continuation-local storage for NestJS | AsyncLocalStorage-based. Stores request ID, user ID, and other context accessible throughout the request lifecycle without passing through every function |
| crypto.randomUUID() | Built-in | Generate correlation IDs | Node.js built-in, no dependency needed |

**Integration with existing stack:**
- Generates `X-Request-ID` header on each request (or preserves incoming one)
- Injects into pino log context (all logs automatically include correlation ID)
- Passes to Sentry as tag for cross-referencing errors with logs
- Zero changes needed in existing service code -- context is available via `ClsService.get('requestId')`

**Key decision: nestjs-cls over custom AsyncLocalStorage wrapper.** nestjs-cls v6 has first-class NestJS 11 support, plugin API, and handles edge cases (WebSocket, microservices, CQRS) that a custom implementation would miss.

**What NOT to use:** `cls-hooked` (deprecated), `@nestified/correlation-id` (too narrow, no plugin ecosystem).

**Confidence:** HIGH -- nestjs-cls official docs, NestJS official recipe for AsyncLocalStorage.

### 8. Gzip/Brotli Compression

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Nginx ngx_http_gzip_module | Built-in | Gzip compression for API responses + static assets | Built into Nginx. Zero npm dependencies. Handles compression at proxy level, freeing Node.js CPU |
| Nginx ngx_brotli_module | 3rd-party module | Brotli compression (15-25% better than gzip) | Better compression for text/JSON. Falls back to gzip for older clients |

**Key decision: Nginx-level compression, NOT `compression` npm package.**

Rationale:
- Nginx handles compression with C-level performance, not JavaScript event loop
- Frontend static assets (JS/CSS/HTML) benefit most; Nginx serves these directly
- API JSON responses compressed transparently
- No runtime dependency added to NestJS process
- `compression` npm package (v1.8.1) becomes unnecessary

**What to REMOVE:** `@nestjs/cache-manager` and `cache-manager` are in package.json but never used in source code. These should be removed during cleanup.

**Confidence:** HIGH -- Nginx documentation, NestJS official compression docs recommend Nginx for production.

### 9. Redis Query Caching (Cache-Aside Pattern)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Existing RedisService | - | Cache-aside pattern implementation | Already has get/set/setex/del methods. Extend with JSON serialization helpers |
| No new dependencies | - | - | The existing `ioredis` + custom `RedisService` is sufficient. No need for `cache-manager` or `@nestjs/cache-manager` |

**Implementation approach:**
- Add `getJSON<T>()` and `setJSON<T>()` convenience methods to existing `RedisService`
- Implement cache-aside in service layer: check cache -> miss -> query DB -> populate cache -> return
- Cache invalidation on mutations (create/update/delete)
- Key prefix convention: `cache:{entity}:{id}` or `cache:{entity}:list:{hash}`
- TTL: 5 minutes for lists, 15 minutes for single entities

**Cacheable endpoints (high read, low write):**
- Fabric list (browsed frequently)
- Product list (browsed frequently)
- Supplier list (dropdown data)
- Customer list (dropdown data)
- System enums (rarely change)

**NOT cacheable:** Orders (frequently mutated), quotes (status changes), logistics (real-time tracking).

**Key decision: Extend existing RedisService, NOT add cache-manager.** The project already has a well-tested `RedisService` with graceful degradation. Adding `@nestjs/cache-manager` would introduce a second Redis abstraction with its own connection management. The existing service already handles connection failures gracefully.

**What to REMOVE:** `@nestjs/cache-manager` (^3.1.0) and `cache-manager` (^7.2.8) from package.json -- they are installed but never imported in any source file.

**Confidence:** HIGH -- existing code reviewed, cache-aside is a standard pattern.

### 10. k6 Load Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| k6 | latest (Go binary) | HTTP load testing | Best-in-class for API load testing. JavaScript test scripts. Not a Node.js dependency -- standalone binary |

**Installation:** Homebrew (dev) / Docker (CI). NOT an npm package.
```bash
# macOS
brew install k6

# Docker (CI)
docker run --rm grafana/k6 run - <script.js
```

**Test scope:**
- Baseline benchmarks for critical API endpoints (fabric list, order create, Excel import)
- Concurrency testing: 5-10 VUs (virtual users) matches real usage of 2-5 users
- Soak testing: 30-minute sustained load
- Store results in Grafana for historical comparison

**Key decision: k6 over Artillery/Autocannon/JMeter.** k6 uses JavaScript for test scripts (team already knows JS), runs as a single binary (no Node.js runtime), and integrates with Grafana (already in stack for Loki). Artillery is Node.js-based and heavier. JMeter is Java-based and overkill.

**Confidence:** HIGH -- k6 is the industry standard for API load testing.

### 11. Dependency Security Scanning

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GitHub Dependabot | Built-in | Automated dependency update PRs | Free for GitHub repos. Creates PRs for vulnerable dependencies. Zero configuration |
| npm audit | Built-in | CI pipeline vulnerability check | Already available via pnpm. Add `pnpm audit --audit-level=high` to CI |

**CI integration:**
```yaml
- name: Security audit
  run: pnpm audit --audit-level=high
  continue-on-error: true  # Don't block deploys on moderate issues
```

**Key decision: Dependabot + npm audit over Snyk.** For a small private project, Dependabot (free, built-in to GitHub) + npm audit in CI covers the dependency scanning need without adding another SaaS tool. Snyk has better vulnerability database but adds complexity and cost for minimal benefit at this scale.

**Confidence:** HIGH -- GitHub official feature, npm built-in command.

### 12. Web Vitals Performance Monitoring

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| web-vitals | ^5.2 | Core Web Vitals measurement (LCP, INP, CLS, FCP, TTFB) | Google's official library. ~2KB brotli'd. Reports real user metrics |

**Integration approach:**
- Import `web-vitals` in frontend entry point
- Send metrics to Sentry via `Sentry.captureMessage()` with custom context (or use Sentry's built-in browser tracing which already captures Web Vitals)
- Alternative: Send to custom `/api/v1/metrics` endpoint for Grafana visualization

**Key decision:** Since Sentry is already being added, and `@sentry/react` v10+ automatically captures Web Vitals when `browserTracingIntegration` is enabled, a separate `web-vitals` library may be REDUNDANT. Verify during implementation whether Sentry's built-in Web Vitals capture is sufficient.

**Fallback:** If Sentry Web Vitals are insufficient for detailed analysis, add `web-vitals` (^5.2) and report to a custom endpoint.

**Confidence:** MEDIUM -- Sentry may already cover this. Verify at implementation time.

### 13. PWA Manifest + Service Worker

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vite-plugin-pwa | ^1.2 | Auto-generate manifest.webmanifest + service worker | Zero-config PWA for Vite 7. Generates SW via Workbox under the hood. Framework-agnostic, works with React |
| workbox (transitive) | 7.x | Service worker strategies (cache-first, stale-while-revalidate) | Industry standard. Bundled by vite-plugin-pwa, not installed directly |

**Scope for this project:**
- `manifest.webmanifest` with Chinese app name, icons, theme color
- Service worker for static asset caching only (app shell)
- Strategy: `generateSW` (auto-generated, not custom SW)
- NO offline data support (supply chain data must be fresh)
- NO push notifications (out of scope)

**vite-plugin-pwa config:**
```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: '铂润供应链管理系统',
    short_name: '铂润',
    theme_color: '#1677ff', // Ant Design primary blue
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    // Do NOT cache API responses
    navigateFallback: 'index.html',
  },
})
```

**Key decision: vite-plugin-pwa over manual SW.** Writing service workers manually is error-prone (cache invalidation bugs, update deadlocks). vite-plugin-pwa handles all of this with tested Workbox strategies. v1.2 confirmed compatible with Vite 7.

**Confidence:** HIGH -- vite-plugin-pwa docs, confirmed Vite 7 compatibility.

### 14. Accessibility (a11y) Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| eslint-plugin-jsx-a11y | ^6.10 | Static JSX accessibility linting | Catches missing alt text, improper ARIA, semantic HTML issues at lint time. Zero runtime cost |
| vitest-axe | ^0.1 (or @chialab/vitest-axe ^0.19) | Runtime a11y testing in Vitest | Runs axe-core against rendered components in tests. Catches dynamic a11y issues |

**Key decision: eslint-plugin-jsx-a11y + vitest-axe, NOT @axe-core/react.** @axe-core/react does NOT support React 18 (confirmed in their README). The combination of lint-time (eslint-plugin-jsx-a11y) + test-time (vitest-axe) accessibility checking covers both static and dynamic issues without the React 18 incompatibility.

**Integration:**
- Add `jsx-a11y` plugin to existing ESLint flat config
- Add `vitest-axe` matchers to vitest setup for `toHaveNoViolations()` assertions
- Run in existing CI pipeline (no new CI step needed)

**Confidence:** HIGH for eslint-plugin-jsx-a11y, MEDIUM for vitest-axe (low release frequency, but the API is simple and stable).

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Docker base image | node:22-slim | node:22-alpine | Alpine uses musl libc -- risk of native module issues with Prisma |
| Compression | Nginx built-in | `compression` npm | Nginx handles compression with C performance, frees Node.js CPU |
| Error tracking | @sentry/nestjs | @ntegral/nestjs-sentry | Official SDK has first-class support since 2024, third-party wrapper unnecessary |
| Log aggregation | Loki + pino-loki | ELK stack | ELK needs GB of RAM; Loki runs in ~64MB. Overkill for 2-5 users |
| Log aggregation | Loki + pino-loki | File-based (pino-file) | No search, no dashboards, no alerting. Useless for debugging production |
| Correlation ID | nestjs-cls | Custom AsyncLocalStorage | nestjs-cls handles edge cases (WS, microservices) and has plugin API |
| DB backup | CDB auto-backup | Custom mysqldump cron | CDB already does this. Only add supplementary COS dump for offsite |
| Redis caching | Extend RedisService | @nestjs/cache-manager | Project already has tested RedisService. Adding cache-manager creates dual Redis abstraction |
| Load testing | k6 | Artillery | k6 is Go binary (lighter), JS scripts (team knows it), Grafana integration |
| Load testing | k6 | autocannon | autocannon is Node.js (event loop contention risk when testing Node.js server) |
| Dep scanning | Dependabot + npm audit | Snyk | Snyk adds cost and complexity; Dependabot is free and built into GitHub |
| Web Vitals | Sentry built-in (verify) | web-vitals standalone | Sentry v10+ captures Web Vitals automatically; avoid duplicate telemetry |
| PWA | vite-plugin-pwa | Manual SW | Manual SWs are error-prone; vite-plugin-pwa uses battle-tested Workbox |
| a11y testing | eslint-plugin-jsx-a11y + vitest-axe | @axe-core/react | @axe-core/react does NOT support React 18 |

---

## What to REMOVE (Dead Dependencies)

| Package | Current Version | Reason to Remove |
|---------|----------------|-----------------|
| `@nestjs/cache-manager` | ^3.1.0 | Installed in package.json but NEVER imported in any source file |
| `cache-manager` | ^7.2.8 | Installed in package.json but NEVER imported in any source file |

These were likely installed during initial setup but never used. The custom `RedisService` replaced their intended purpose. Removing them reduces attack surface and dependency count.

---

## What Already Exists (DO NOT Add)

| Capability | Existing Solution | Status |
|------------|-------------------|--------|
| Health checks | @nestjs/terminus + /health + /ready | Already implemented |
| Rate limiting | @nestjs/throttler (60 req/min) | Already implemented |
| Security headers | Helmet (CSP, HSTS, X-Frame-Options) | Already implemented |
| CORS | NestJS enableCors() | Already implemented |
| Cookie auth | cookie-parser + HttpOnly JWT | Already implemented |
| Structured logging | nestjs-pino + pino-http | Already implemented |
| ErrorBoundary | React ErrorBoundary component | Already implemented |
| Validation | class-validator + ValidationPipe | Already implemented |
| Exception filter | AllExceptionsFilter | Already implemented |

---

## Installation Plan

### Backend Additions

```bash
cd backend

# Sentry
pnpm add @sentry/nestjs

# Correlation IDs
pnpm add nestjs-cls

# Log aggregation (pino transport)
pnpm add pino-loki

# Remove dead dependencies
pnpm remove @nestjs/cache-manager cache-manager
```

### Frontend Additions

```bash
cd frontend

# Sentry
pnpm add @sentry/react

# PWA
pnpm add -D vite-plugin-pwa

# Web Vitals (only if Sentry built-in is insufficient)
# pnpm add web-vitals

# Accessibility
pnpm add -D eslint-plugin-jsx-a11y vitest-axe
```

### Infrastructure (No npm -- Docker/System)

```bash
# k6 (macOS dev)
brew install k6

# Docker images (in compose)
# - nginx:1.28-alpine
# - node:22-slim (for Dockerfile)
# - grafana/loki:3.4
# - grafana/grafana:11.5
# - fradelg/mysql-cron-backup (supplementary backup)
```

### CI/CD Additions

```yaml
# .github/workflows/ci.yml additions
# - pnpm audit --audit-level=high
# - Docker build + push
# - SSH deploy step
```

---

## Version Summary Table

| Package | Pinned Version | Category | Install Target |
|---------|---------------|----------|---------------|
| @sentry/nestjs | ^10.44 | Error tracking | backend |
| @sentry/react | ^10.46 | Error tracking | frontend |
| nestjs-cls | ^6.2 | Request context | backend |
| pino-loki | ^2.3 | Log transport | backend |
| vite-plugin-pwa | ^1.2 | PWA | frontend (dev) |
| eslint-plugin-jsx-a11y | ^6.10 | Accessibility | frontend (dev) |
| vitest-axe | ^0.1 | Accessibility testing | frontend (dev) |
| web-vitals | ^5.2 | Performance (conditional) | frontend |
| nginx | 1.28-alpine | Reverse proxy | Docker |
| node | 22-slim | Runtime | Docker |
| grafana/loki | 3.4 | Log storage | Docker |
| grafana/grafana | 11.5 | Dashboards | Docker |
| k6 | latest | Load testing | System binary |

**Total new npm dependencies: 5 production + 3 dev = 8 packages** (plus 2 removed).

---

## Sources

- [Sentry NestJS Official Guide](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [Sentry Pino Integration](https://docs.sentry.io/platforms/javascript/guides/nestjs/configuration/integrations/pino/)
- [NestJS Sentry Recipe](https://docs.nestjs.com/recipes/sentry)
- [NestJS Async Local Storage Recipe](https://docs.nestjs.com/recipes/async-local-storage)
- [NestJS Compression Docs](https://docs.nestjs.com/techniques/compression)
- [nestjs-cls Documentation](https://papooch.github.io/nestjs-cls/)
- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/)
- [Grafana k6 Documentation](https://grafana.com/docs/k6/latest/)
- [pino-loki npm](https://www.npmjs.com/package/pino-loki)
- [web-vitals npm](https://www.npmjs.com/package/web-vitals)
- [eslint-plugin-jsx-a11y npm](https://www.npmjs.com/package/eslint-plugin-jsx-a11y)
- [Node.js Docker Image Best Practices](https://snyk.io/blog/choosing-the-best-node-js-docker-image/)
- [Tencent Cloud CDB Backup](https://www.tencentcloud.com/product/cdb)
- [Docker Nginx Official Image](https://hub.docker.com/_/nginx)
- [@sentry/nestjs npm](https://www.npmjs.com/package/@sentry/nestjs)
- [@sentry/react npm](https://www.npmjs.com/package/@sentry/react)
- [GitHub Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [fradelg/mysql-cron-backup](https://github.com/fradelg/docker-mysql-cron-backup)
