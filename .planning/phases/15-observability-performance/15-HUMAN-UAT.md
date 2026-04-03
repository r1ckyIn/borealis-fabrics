---
status: partial
phase: 15-observability-performance
source: [15-VERIFICATION.md]
started: 2026-04-03T10:00:00Z
updated: 2026-04-03T10:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Grafana connects to Loki and Prometheus datasources
expected: Grafana UI at http://localhost:3001 shows Prometheus and Loki as available datasources; Prometheus /metrics scrape target shows backend as 'UP'
result: [pending]

### 2. pino-loki ships logs to Loki
expected: Backend logs appear in Grafana Loki's Explore view when queried by {app='borealis-backend'}
result: [pending]

### 3. Slow query warning in logs
expected: Logger.warn 'Slow query (Xms): ...' appears in pino log output when SLOW_QUERY_THRESHOLD_MS is lowered to 0
result: [pending]

### 4. k6 load test execution
expected: k6 run tests/load/fabric-crud.k6.js completes with p95 < 500ms
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
