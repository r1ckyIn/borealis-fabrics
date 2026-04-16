# Codebase Concerns

**Analysis Date:** 2026-04-16
**Production Status:** Live since Phase A (2026-04-14). Phase 17 (domain+HTTPS) Wave 1 merged; Phase B (domain purchase + SSL cert) pending ICP approval.

---

## Legend

| Severity | Meaning |
|----------|---------|
| CRITICAL | Production-blocking risk or active security hole |
| HIGH | Functional gap or significant security surface |
| MEDIUM | Reliability/observability gap, will cause pain |
| LOW | Cleanup, polish, nice-to-have |

---

## Security

### [HIGH] HSTS header not yet active in production nginx

- **Files:** `nginx/conf.d/default.conf` lines 49–53
- **Risk:** Without HSTS, browsers do not enforce HTTPS on repeat visits. An attacker on a shared network could strip TLS on first contact after the cookie is set.
- **Current state:** Both `max-age=86400` and `max-age=63072000` headers are commented out pending Phase B SSL verification.
- **Fix:** After `curl -sv https://<domain>/health` passes, uncomment the short `max-age=86400` line, then graduate to `63072000` after one day of confirmed SSL stability.

### [HIGH] Monitoring ports publicly bound (9090, 3100, 3001)

- **Files:** `docker-compose.monitoring.yml` lines 15–16 (Loki 3100), 30–31 (Prometheus 9090), 44 (Grafana 3001)
- **Risk:** All three monitoring services bind to `0.0.0.0` via Docker's default port mapping, making them accessible from the internet if the Tencent Cloud Lighthouse firewall allows those ports. Prometheus exposes internal route labels, request rates, and error counts. Loki exposes raw application logs. Grafana exposes business data dashboards.
- **Current mitigation:** Firewall rules not audited in code. No authentication on Loki or Prometheus endpoints.
- **Fix:** Change port bindings to `127.0.0.1:9090:9090` / `127.0.0.1:3100:3100` / `127.0.0.1:3001:3000` in `docker-compose.monitoring.yml`. Verify Lighthouse firewall only allows 80 and 443.

### [HIGH] Grafana default admin password fallback in production

- **Files:** `docker-compose.monitoring.yml` line 45: `GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}`
- **Risk:** If `GRAFANA_ADMIN_PASSWORD` is not set in the environment, Grafana starts with password `admin`. Combined with the public port binding concern above, this is an unauthenticated admin access path.
- **Fix:** Set `GRAFANA_ADMIN_PASSWORD` to a strong random password in the server environment before starting the monitoring stack. Remove the `:-admin` fallback from the compose file.

### [MEDIUM] `/metrics`, `/health`, `/ready` endpoints are unauthenticated and publicly accessible

- **Files:** `backend/src/main.ts` lines 72–74 (excluded from global prefix), `backend/src/metrics/metrics.controller.ts`, `nginx/conf.d/default.conf` lines 82–85
- **Risk:** `/metrics` returns Prometheus format with full route cardinality, request durations, and error rates — useful for an attacker mapping the API surface. `/ready` reveals Redis and MySQL connectivity status.
- **Current state:** Reachable at `https://<domain>/metrics` and `https://<domain>/ready` with no auth.
- **Fix:** Restrict via Nginx `allow/deny` directives to internal IPs, or add IP allowlist in the Nginx `location` block.

### [MEDIUM] `/api/v1/import/*` endpoints have no authentication guard

- **Files:** `backend/src/import/import.controller.ts` — class-level `@UseGuards` is absent; no `@UseGuards` anywhere in the file
- **Risk:** All import routes (fabric import, supplier import, product import, sales contract import) are accessible without a valid JWT cookie. An unauthenticated POST to `/api/v1/import/fabrics` can upload and parse Excel files and attempt DB writes. The only protection is the ThrottlerGuard (60 req/min global).
- **Fix:** Add `@UseGuards(JwtAuthGuard)` at the class level of `ImportController`.

### [MEDIUM] CSP `imgSrc` does not include Tencent COS domain

- **Files:** `backend/src/main.ts` line 34: `imgSrc: ["'self'", 'data:']`
- **Risk:** When running with COS storage (production), fabric images are served from `*.cos.ap-<region>.myqcloud.com` presigned URLs. The current CSP blocks these, causing image load failures for all uploaded fabric images in production.
- **Fix:** Append the COS bucket domain to `imgSrc`: `["'self'", 'data:', 'https://<bucket>.cos.ap-shanghai.myqcloud.com']`. Source from `ConfigService`.

### [MEDIUM] Cookie `secure` flag controlled by optional env var, not NODE_ENV

- **Files:** `backend/src/auth/constants/auth.constants.ts`, `backend/src/auth/auth.controller.ts` lines 54–56
- **Risk:** The `bf_auth_token` cookie is sent without `secure: true` until `FORCE_HTTPS_COOKIES=true` is present in `.env`. `validateProductionConfig()` checks that `FORCE_HTTPS_COOKIES` is set but not that its value is `'true'`.
- **Fix:** Derive secure flag from `NODE_ENV === 'production'` as the primary signal, with `FORCE_HTTPS_COOKIES` as an override for edge cases.

### [MEDIUM] `BOSS_WEWORK_IDS` not validated in production config check

- **Files:** `backend/src/config/configuration.ts` `validateProductionConfig()` function
- **Risk:** If `BOSS_WEWORK_IDS` is empty in production, all "boss-only" restore endpoints (`/suppliers/:id/restore`, `/fabrics/:id/restore`, `/customers/:id/restore`, `/products/:id/restore`) become permanently inaccessible with no clear error signal.
- **Fix:** Add `BOSS_WEWORK_IDS` to the required vars list in `validateProductionConfig()` with a non-empty check.

### [LOW] Auth guard dev-mode bypass depends on `nodeEnv` defaulting to `'development'`

- **Files:** `backend/src/auth/guards/jwt-auth.guard.ts` lines 37–46, `backend/src/config/configuration.ts` line 44
- **Risk:** `nodeEnv` defaults to `'development'` when `NODE_ENV` is absent. A misconfigured production server with `NODE_ENV` unset would bypass all authentication, injecting `mock-dev-001` as the user for every request.
- **Fix:** Change the default in `configuration.ts` from `process.env.NODE_ENV || 'development'` to `process.env.NODE_ENV || 'production'`.

---

## Known Bugs / Active Gaps

### [HIGH] Supplier payment tab always empty — no UI or API to create initial SupplierPayment record

- **Files:** `frontend/src/pages/orders/components/OrderPaymentSection.tsx`, `backend/src/order/order.controller.ts` lines 358 and 383
- **Problem:** Backend only exposes `GET :id/supplier-payments` and `PATCH :id/supplier-payments/:supplierId`. No `POST` endpoint exists. A `SupplierPayment` is auto-created only during quote-to-order conversion via `order-payment.service.ts` upsert. For orders created directly (not via quote conversion), the supplier payment tab in the frontend is permanently empty with no way to add records.
- **Impact:** Operators cannot track supplier payment status for manually created orders.
- **Fix:** Add `POST /orders/:id/supplier-payments` endpoint in `backend/src/order/order.controller.ts` + `backend/src/order/order-payment.service.ts`, plus a frontend "Add supplier payment" button in `OrderPaymentSection.tsx`.

### [MEDIUM] Phase 15 Human UAT blocked — 3 of 4 observability items never verified

- **Files:** `.planning/phases/15-observability-performance/15-HUMAN-UAT.md`
- **Blocked items:**
  - pino-loki log shipping to Loki (needs running backend + Docker)
  - Slow query warning in logs (needs MySQL)
  - k6 load test execution (`brew install k6` required; `tests/load/fabric-crud.k6.js` never run)
- **Impact:** Unknown whether pino-loki transport actually ships logs to Loki in production. `LOKI_HOST` env var is absent from `backend/.env.production.example`.
- **Fix:** After Phase B (domain + SSL live), run on production server: check Grafana Explore for `{app="borealis-backend"}`, run with `SLOW_QUERY_THRESHOLD_MS=0`, install k6 and run load tests.

### [MEDIUM] SalesContractImportStrategy — customer resolution unreliable with real files

- **Files:** `backend/src/import/strategies/sales-contract-import.strategy.ts`
- **Problem:** Strategy tuned against unit test fixtures but produced 0 successful imports from real 购销合同/客户订单 files during Phase 09 real-data testing. Column offsets and customer name resolution from metadata rows (rows 1–8) have not been re-validated against actual company documents post-DEBT-03 fix.
- **Fix:** Test against actual 购销合同 files. Focus on `getCellValue()` logic for customer name extraction from rows 1–8 metadata area and variant detection in row 9 headers.

### [LOW] Phase B (domain + HTTPS) awaiting ICP approval — no login method in production

- **Files:** `.planning/STATE.md`, `.planning/phases/17-domain-ssl-launch/17-03-PLAN.md`
- **Status:** `ALLOW_DEV_LOGIN` was removed in Plan 17-01. WeChat Work OAuth requires a domain with ICP. Production on `119.29.82.146` HTTP is currently login-inaccessible.

---

## Tech Debt

### [MEDIUM] `product.service.ts` and `quote.service.ts` are monolithic (991 and 965 lines)

- **Files:** `backend/src/product/product.service.ts` (991 lines), `backend/src/quote/quote.service.ts` (965 lines)
- **Issue:** Both services handle too many concerns. `product.service.ts` mixes Product CRUD, ProductSupplier management, CustomerPricing management, and ProductBundle management in one class. The test files reflect the complexity accumulation: `fabric.service.spec.ts` is 2056 lines, `quote.service.spec.ts` is 1195 lines.
- **Fix approach:** Extract sub-entity services (e.g., `ProductSupplierService`, `ProductPricingService`, `ProductBundleService`) following the pattern in `backend/src/order/order-item.service.ts`.

### [MEDIUM] `order-item.service.ts` manages items, timelines, and status transitions in 653 lines

- **Files:** `backend/src/order/order-item.service.ts` (653 lines)
- **Issue:** Cancel/restore cycle atomically modifies `SupplierPayment` amounts — high-risk surface area with no isolation. Timeline queries are mixed with status mutation methods.
- **Fix approach:** Extract `OrderTimelineService` for timeline queries. Add inline state machine documentation for cancel/restore cycle.

### [MEDIUM] Frontend coverage thresholds only enforce 5 utility files

- **Files:** `frontend/vite.config.ts` lines 44–56
- **Issue:** `coverage.include` contains only `[statusHelpers.ts, format.ts, validation.ts, client.ts, authStore.ts]`. Large hooks (`useFabricDetail.ts` 443 lines, `useOrderItemsSection.ts` 335 lines, `useOrders.ts` 408 lines) and page components have no coverage floor.
- **Fix approach:** Add `src/hooks/` to coverage include with a 60% threshold starting point.

### [MEDIUM] Backend Jest has no coverage thresholds configured

- **Files:** `backend/package.json` — `test:cov` runs `jest --coverage` but no `coverageThreshold` in jest config (line 103: `"coverageDirectory": "../coverage"` with no thresholds)
- **Impact:** Coverage can regress to 0% without CI failing.
- **Fix:** Add `"coverageThreshold": { "global": { "branches": 70, "functions": 75, "lines": 75 } }` to the jest config in `package.json`.

### [LOW] `import.controller.ts` has heavy duplication across 5 upload routes (480 lines)

- **Files:** `backend/src/import/import.controller.ts` (480 lines)
- **Issue:** `ParseFilePipe` + `MaxFileSizeValidator` + `ExcelFileValidator` setup is repeated across 5 upload endpoints. `ExcelFileValidator` class defined inline at line 47 rather than in a shared validators location.
- **Fix:** Extract `createExcelUploadPipe()` factory helper; move `ExcelFileValidator` to `backend/src/common/validators/excel-file.validator.ts`.

### [LOW] `useLocalStorage.ts` uses `console.warn` directly

- **Files:** `frontend/src/hooks/useLocalStorage.ts` lines 72, 83, 105, 116
- **Issue:** `console.warn()` calls bypass the `logger.ts` utility. In production with Sentry configured, these warnings are invisible.
- **Fix:** Import and use `logger.warn()` from `frontend/src/utils/logger.ts`.

### [LOW] `prom/prometheus:latest` is unpinned

- **Files:** `docker-compose.monitoring.yml` line 29
- **Risk:** `docker compose pull` can silently upgrade Prometheus to a breaking version. Loki is correctly pinned to `3.4.3`.
- **Fix:** Pin to a specific version, e.g., `prom/prometheus:v2.51.2`.

---

## Performance

### [MEDIUM] Quote conversion fetches all supplier rows for cheapest-price resolution in application code

- **Files:** `backend/src/quote/quote.service.ts` lines 714–732
- **Issue:** `tx.fabricSupplier.findMany({ where: { fabricId: { in: fabricIds } } })` returns all supplier associations for all fabrics in the quote, sorted by price, then builds a `Map` in JS to find cheapest per fabric. At scale (many fabrics, many suppliers per fabric), this loads large result sets into memory inside a transaction.
- **Current state:** Low risk at <100 records in early production.
- **Fix approach:** Use `GROUP BY fabricId` with `MIN(purchasePrice)` via `prisma.$queryRaw`, or add a `defaultSupplierId` denormalization field to `Fabric`.

### [MEDIUM] k6 load tests have never been run against production

- **Files:** `tests/load/fabric-crud.k6.js`, `tests/load/order-list.k6.js`, `tests/load/auth.k6.js`
- **Issue:** p95 < 500ms SLO is unverified. CDB adds ~2ms network latency vs local MySQL. Phase 15 UAT blocked k6 execution.
- **Fix:** After Phase B live, run `k6 run tests/load/fabric-crud.k6.js` against `https://<domain>/api/v1`.

### [LOW] AuditLog table will grow unboundedly

- **Files:** `backend/prisma/schema.prisma` lines 541–560 (AuditLog model)
- **Issue:** No TTL or archival policy. Every create/update/delete on audited entities appends a row. Indexes support queries but table will grow indefinitely.
- **Fix approach:** Add a `CleanupScheduler` job that deletes `auditLog` records older than 90 days, scheduled weekly.

---

## Fragile Areas

### [HIGH] Quote-to-order conversion unavailable if Redis is down

- **Files:** `backend/src/quote/quote.service.ts` lines 632–636
- **Current behavior:** `convertQuoteItems()` throws `ServiceUnavailableException` when `redisService.isAvailable()` is false. Entire conversion feature becomes unavailable during Redis downtime (e.g., Docker restart cycle).
- **Risk:** Redis on a single server with `restart: unless-stopped` has a brief unavailability window during container restarts.
- **Fix approach:** Replace Redis lock with MySQL advisory lock (`SELECT GET_LOCK(...)`) via `prisma.$queryRaw` for resilience, or implement a retry with exponential backoff.

### [MEDIUM] QuoteScheduler uses in-memory `isRunning` flag — not restart-safe

- **Files:** `backend/src/quote/quote.scheduler.ts` lines 16, 29–34
- **Issue:** Execution lock is an instance-level boolean. `consecutiveFailures` counter resets to 0 on any container restart, silently clearing alert state after up to 2 failures. In multi-instance deployments, two instances could run `handleExpiredQuotes()` simultaneously.
- **Current mitigation:** Single-instance deployment makes this safe today.
- **Fix approach:** Replace `isRunning` with Redis lock (`acquireLock('quote:expiration:lock', 120)`). Persist failure count to Redis for durability.

### [MEDIUM] Observability stack network name assumes project directory name

- **Files:** `docker-compose.monitoring.yml` lines 56–59: `networks.default.external: true, name: borealis-fabrics_default`
- **Issue:** The monitoring compose file assumes the business stack's Docker network is named `borealis-fabrics_default`. This is derived from the working directory name at `docker compose up` time. If the server uses a different directory name or `--project-name` flag, pino-loki log shipping silently fails.
- **Fix:** Explicitly name the network in `docker-compose.prod.yml` with `networks: borealis-net: name: borealis-net`, and reference the same name in `docker-compose.monitoring.yml`.

### [MEDIUM] Presigned COS URLs expire after 3600 seconds

- **Files:** `backend/src/file/storage/cos.storage.ts` line 65: `expiresInSeconds = 3600`
- **Issue:** Fabric images loaded via presigned URLs expire after 1 hour. Users who leave a detail page open or revisit a cached page will see 403 errors on images. No client-side refresh mechanism exists.
- **Fix approach:** Increase expiry to 86400 (24 hours) or 604800 (7 days) for internal use, or add `img.onerror` handler that calls `/api/v1/files/:id` to re-fetch a fresh URL.

### [LOW] E2E tests manually recreate global pipes from comments

- **Files:** `backend/test/supplier.e2e-spec.ts` line 130, `backend/test/fabric.e2e-spec.ts` line 304, `backend/test/customer.e2e-spec.ts` line 228, `backend/test/auth.e2e-spec.ts` line 107, `backend/test/file.e2e-spec.ts` line 91
- **Issue:** All E2E tests have a comment `// Apply global pipes and filters as in AppModule` followed by manual pipe setup. Any new global interceptor or pipe must be added to all 5+ E2E files.
- **Fix approach:** Extract a shared `createTestApp(moduleRef)` helper in `backend/test/test-helpers.ts`.

---

## Observability Gaps

### [MEDIUM] `LOKI_HOST` env var absent from `backend/.env.production.example`

- **Files:** `backend/src/app.module.ts` lines 64–91, `backend/.env.production.example`
- **Issue:** Log shipping to Loki is conditional on `LOKI_HOST` being set. It is missing from the production env example. If absent on the server, pino logs go to stdout only and Grafana Loki queries return empty with no visible error.
- **Fix:** Add `LOKI_HOST=http://loki:3100` to `backend/.env.production.example` with a comment explaining the monitoring stack dependency.

### [MEDIUM] Neither backend nor frontend Sentry DSN is configured in production

- **Files:** `backend/.env.example` line 27 (`SENTRY_DSN=`), `frontend/.env.example` line 5 (`VITE_SENTRY_DSN=`)
- **Issue:** Both Sentry integrations are disabled when DSN is empty. Production errors surface only in pino logs and browser console. No alerting, no error grouping, no production visibility for frontend crashes.
- **Fix:** Create Sentry project (free tier), set DSN in production `.env` files.

### [LOW] Grafana provisioned dashboards never validated against production traffic

- **Files:** `grafana/provisioning/` directory
- **Issue:** Dashboards created during Phase 15 observability work, provisioned at startup. Panel queries tied to metric labels (`app='borealis-backend'`, route patterns) that could differ between dev fixtures and production behavior. Never tested with real traffic.
- **Fix:** After Phase B live and pino-loki confirmed, open Grafana and validate all dashboard panels return data.

---

## Missing Tests for Critical Paths

### [MEDIUM] `ImportController` has no unit tests

- **Files:** `backend/src/import/import.controller.ts` (480 lines) — no `.controller.spec.ts` exists
- **Issue:** File upload path (Excel magic bytes validation, `ExcelFileValidator`, `MaxFileSizeValidator`, dry-run toggle) in the controller is not unit tested. `backend/test/import.e2e-spec.ts` covers service-level logic but controller-level guard and pipe validation is untested.
- **Risk:** Changes to `ExcelFileValidator` or `ParseFilePipe` setup could silently break upload validation.

### [MEDIUM] No tests for `RolesGuard` with real `BOSS_WEWORK_IDS` env var parsing

- **Files:** `backend/src/common/guards/roles.guard.ts`
- **Issue:** `RolesGuard` reads `process.env.BOSS_WEWORK_IDS` directly at constructor time. Tests that mock the guard bypass actual env-var-based role resolution. Edge cases (empty string, trailing comma in IDs list) are untested.

### [LOW] `QuoteScheduler` failure escalation threshold not verified in tests

- **Files:** `backend/src/quote/quote.scheduler.spec.ts`
- **Issue:** Spec tests consecutive failure counting but does not assert that the `CRITICAL` logger.error message appears after exactly 3 failures. A change to `MAX_CONSECUTIVE_FAILURES` value would not break tests.

---

## CI/TypeScript Pitfalls (Recurring)

### [MEDIUM] Local `pnpm build` ≠ CI `tsc --noEmit`

- **Files:** All backend `.ts` files, `backend/.claude/rules/01-workflow/verification-commands.md`
- **Known patterns that pass locally but fail CI:**
  1. `Buffer.from(arrayBuffer)` returns `Buffer<ArrayBufferLike>` in Node 22 — needs `as Buffer` cast
  2. Modifying a constructor signature without grep-searching all `new ClassName(...)` callsites in controllers and spec files
  3. Adding DTO fields without updating all mock objects in spec files — run `grep -r "MockDto\|: DtoName ="` after DTO changes
- **Mitigation:** Pre-commit hook runs `tsc --noEmit`. Always run `npx tsc --noEmit` after any DTO or constructor change.

### [LOW] Ant Design 6 jsdom testing gotchas (established traps)

- **Files:** Various `*.test.tsx` and `*.integration.test.tsx` files in `frontend/src/`
- **Known traps:**
  1. 2-character Chinese button text gets a space inserted in jsdom — use `document.querySelector('.ant-modal-footer .ant-btn-primary')` not text matching
  2. `Tabs` renders all panels to DOM simultaneously — use `within()` or `getByTestId` to scope queries
  3. Integration tests need `testTimeout: 15000` (already set in `frontend/vite.config.ts` line 40)

---

*Concerns audit: 2026-04-16*
