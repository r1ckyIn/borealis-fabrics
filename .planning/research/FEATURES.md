# Feature Landscape: v1.1 Production Readiness

**Domain:** Supply chain management system -- production deployment infrastructure
**Researched:** 2026-03-28

## Table Stakes

Features that are non-negotiable for production deployment. Missing = system cannot go live.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Docker containerization | Cannot deploy without it. Dev/prod parity | Medium | Multi-stage Dockerfile for backend + Nginx for frontend |
| Nginx reverse proxy + SSL | HTTPS required for enterprise WeChat OAuth callback | Medium | SSL termination, static serving, API proxy |
| Gzip/Brotli compression | Without compression, pages load 3-5x slower on Chinese networks | Low | Nginx built-in config, no code changes |
| Database backup | Data loss = business loss. Non-negotiable | Low | Tencent CDB auto-backup is built-in. Just verify configuration |
| Error tracking (Sentry) | Production errors invisible without tracking | Medium | Backend + frontend integration, pino bridge |
| CI/CD deploy stage | Manual deployment is error-prone and unsustainable | Medium | Extend existing GitHub Actions with deploy step |
| Request correlation IDs | Cannot debug production issues without tracing | Low | nestjs-cls, 1 module registration + middleware |
| Dependency security scanning | Required for any production system handling business data | Low | Dependabot + npm audit in CI |

## Differentiators

Features that improve production quality but are not strict blockers for going live.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Log aggregation (Loki) | Centralized log search across requests. Grafana dashboards for team | Medium | pino-loki transport + Loki/Grafana Docker containers |
| Redis query caching | Faster page loads for frequently browsed lists (fabrics, products) | Medium | Extend existing RedisService with cache-aside pattern |
| k6 load testing | Baseline benchmarks prove system handles expected load | Low | Write test scripts, run once, store results |
| Web Vitals monitoring | Quantify frontend performance, track regressions | Low | Likely covered by Sentry browser tracing already |
| PWA manifest + Service Worker | Installable app icon, faster repeat loads via cached app shell | Low | vite-plugin-pwa, ~20 lines of config |
| a11y tooling | Catches accessibility issues at lint/test time | Low | ESLint plugin + vitest matcher |
| Soft delete (deletedAt) | Recover accidentally deleted records | Medium | Prisma middleware + schema change on all business entities |
| Audit logging | Track who changed what, when. Compliance requirement | Medium | Decorator-based with nestjs-cls user context |
| Data export to Excel | Users can extract data for offline analysis | Medium | Reuse existing exceljs for export (import already works) |

## Anti-Features

Features to explicitly NOT build for v1.1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Kubernetes deployment | Massive overkill for 2-5 users on a single server. Adds operational complexity | Use docker compose on single Tencent Cloud server |
| ELK stack for logging | Elasticsearch alone needs 2-4GB RAM. Server budget is lightweight tier | Use Loki (64MB) + Grafana (64MB) |
| Custom backup rotation system | CDB handles this automatically. Custom code = custom bugs | Rely on CDB auto-backup + supplementary COS dump |
| Real-time log streaming (WebSocket) | 2-5 users don't need real-time dashboards. Loki query is sufficient | Use Grafana Loki query interface |
| Automated rollback on deploy failure | Over-engineering for single server. Manual rollback via docker compose is fine | Document rollback procedure in runbook |
| Canary/blue-green deployment | Single server, 2-5 users. Zero-downtime deploy is nice-to-have, not needed | Simple docker compose pull + restart (seconds of downtime is acceptable) |
| APM (Application Performance Monitoring) | Sentry performance tracing covers this at basic level | Use Sentry tracesSampleRate for critical paths |
| Custom metrics/Prometheus | Overkill for this scale. Sentry + Loki + Grafana cover monitoring needs | Defer to future milestone if growth demands it |
| Mobile PWA optimization | Desktop-first for office workers. PWA is for installability, not mobile | PWA provides cached app shell only, no offline data |

## Feature Dependencies

```
Docker containerization
  -> Nginx reverse proxy (runs in Docker)
  -> CI/CD deploy stage (deploys Docker containers)
  -> Log aggregation (Loki runs in Docker)
  -> Database backup verification (CDB accessible from Docker network)

Sentry integration
  -> Request correlation IDs (passes to Sentry as tag)
  -> Web Vitals monitoring (may be built into Sentry)

nestjs-cls (correlation IDs)
  -> Log aggregation (correlation ID in every log line)
  -> Sentry integration (correlation ID as Sentry tag)
  -> Audit logging (user context from CLS)

Redis query caching
  -> k6 load testing (test with and without cache to measure impact)
```

## MVP Recommendation

**Must deploy with (Phase 1-2):**
1. Docker + Nginx + SSL + compression
2. Sentry error tracking (backend + frontend)
3. Request correlation IDs
4. CI/CD deploy stage
5. Dependabot + npm audit
6. CDB backup verification

**Deploy soon after (Phase 3-4):**
7. Redis query caching
8. Log aggregation (Loki + Grafana)
9. k6 baseline benchmarks
10. PWA manifest
11. a11y ESLint plugin

**Defer to later (Phase 5+):**
12. Soft delete migration (schema change on all entities)
13. Full audit logging
14. Data export to Excel
15. Web Vitals detailed analysis (if Sentry insufficient)

## Sources

- [Sentry NestJS Guide](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [nestjs-cls Documentation](https://papooch.github.io/nestjs-cls/)
- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/)
- [Tencent Cloud CDB Features](https://www.tencentcloud.com/product/cdb)
- [Grafana Loki Documentation](https://grafana.com/docs/loki/latest/)
