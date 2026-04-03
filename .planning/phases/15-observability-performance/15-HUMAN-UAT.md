---
status: partial
phase: 15-observability-performance
source: [15-VERIFICATION.md]
started: 2026-04-03T10:00:00Z
updated: 2026-04-03T12:00:00Z
---

## Current Test

[partial verification completed — Docker daemon unavailable for remaining items]

## Tests

### 1. Grafana connects to Loki and Prometheus datasources
expected: Grafana UI at http://localhost:3001 shows Prometheus and Loki as available datasources; Prometheus /metrics scrape target shows backend as 'UP'
result: PARTIAL PASS — Grafana API confirmed Loki + Prometheus datasources provisioned. Prometheus scrape target configured but blocked by /metrics JSON wrapping bug (TransformInterceptor wraps response, Prometheus needs plaintext).

### 2. pino-loki ships logs to Loki
expected: Backend logs appear in Grafana Loki's Explore view when queried by {app='borealis-backend'}
result: BLOCKED — Docker daemon went offline during testing. Code review confirms pino-loki transport is correctly configured in app.module.ts (conditional on LOKI_HOST env var).

### 3. Slow query warning in logs
expected: Logger.warn 'Slow query (Xms): ...' appears in pino log output when SLOW_QUERY_THRESHOLD_MS is lowered to 0
result: BLOCKED — Backend needs MySQL (Docker offline). Code review confirms implementation in prisma.service.ts: $on('query') with configurable threshold, Logger.warn on exceeded.

### 4. k6 load test execution
expected: k6 run tests/load/fabric-crud.k6.js completes with p95 < 500ms
result: BLOCKED — k6 not installed on this machine. Requires `brew install k6` + running backend with DB.

## Summary

total: 4
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 3

## Bugs Found During Verification

### BUG-1: MetricsInterceptor DI error (FIXED)
- useClass → useExisting in app.module.ts
- Committed: 8747973

### BUG-2: Loki image 3.0 does not exist (FIXED)
- grafana/loki:3.0 → grafana/loki:3.4.3 in docker-compose.monitoring.yml
- Committed: 8747973

### BUG-3: /metrics wrapped in JSON (NOT FIXED — separate task)
- TransformInterceptor wraps /metrics response in `{"code":200,"data":"..."}` JSON
- Prometheus expects plaintext metrics format
- Fix: MetricsController needs to bypass TransformInterceptor (e.g., @Res() or decorator)

## Gaps
