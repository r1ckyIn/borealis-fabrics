# Domain Pitfalls: v1.1 Production Readiness

**Domain:** Adding production infrastructure to existing NestJS + React supply chain management system (73K+ LOC, 1000+ tests)
**Researched:** 2026-03-28
**Confidence:** HIGH (based on direct codebase analysis + verified research)

---

## Critical Pitfalls

Mistakes that cause multi-day rewrites, data corruption, or production incidents.

### Pitfall 1: Soft Delete `deletedAt` Breaks 14 Existing Unique Constraints

**What goes wrong:** The schema has 14 `@unique` / `@@unique` constraints (e.g., `Supplier.companyName`, `Fabric.fabricCode`, `Product.productCode`, `Order.orderCode`, `@@unique([fabricId, supplierId])`, `@@unique([customerId, fabricId])`, etc.). Adding a `deletedAt DateTime?` field for soft delete means: if a supplier "ABC Textiles" is soft-deleted and a user creates a new "ABC Textiles," the unique constraint violation fires because the deleted row still occupies the unique slot.

**Why it happens:** Developers add `deletedAt` to models and Prisma middleware to filter `deletedAt IS NULL` on reads, but forget that MySQL unique indexes include soft-deleted rows.

**Consequences:**
- Business code names (fabricCode, productCode, companyName) become permanently "used" after soft delete
- Cannot re-import a supplier who was previously deleted and re-registered
- Compound uniques like `@@unique([customerId, fabricId])` break when re-associating a customer with a previously-deleted pricing entry

**Prevention:**
1. **MySQL does NOT support partial unique indexes** (unlike PostgreSQL). The PostgreSQL `WHERE deletedAt IS NULL` approach does not work.
2. **Use composite unique index with deletedAt**: Change `@unique fabricCode` to `@@unique([fabricCode, deletedAt])`. In MySQL, `NULL != NULL`, so active record `(FC-001, NULL)` and deleted record `(FC-001, 2026-03-28T...)` are treated as distinct by the unique constraint.
3. **Alternative: generated virtual column approach** in MySQL 8.0. Add a computed column `deletedToken` that is `0` when active and the Unix timestamp when deleted, then include it in the unique index. This is cleaner but requires raw SQL migrations.
4. **Migration must be atomic**: The migration that adds `deletedAt` + modifies unique constraints must be a single Prisma migration, not two separate ones. Between the two, the system is in an inconsistent state.

**Detection:** After migration, test: create supplier "Test Co" -> soft delete it -> create another "Test Co" -> must succeed. If ConflictException fires, the unique constraint is wrong.

**Phase to address:** Soft delete phase -- MUST be designed before any code.

**Severity if hit:** HIGH -- affects all 6 models with `isActive` flag, all import strategies that check for existing records, and all E2E tests that create unique test data.

**Sources:**
- [ZenStack: Soft Delete Unique Constraint](https://zenstack.dev/blog/soft-delete-real)
- [MySQL NULL uniqueness behavior](https://www.aleksandra.codes/mysql-nulls)
- [PHP Architect: Advanced Unique Index Patterns](https://www.phparch.com/2026/02/advanced-unique-index-patterns-for-soft-deletes-mysql-and-postgresql/)

---

### Pitfall 2: Soft Delete Middleware Breaks 205 Existing `isActive: true` Query Locations

**What goes wrong:** The codebase has 205 occurrences of `isActive: true` across 24 files as explicit where-clause filters. Adding Prisma middleware or client extension that auto-injects `deletedAt IS NULL` on every query creates **double filtering** -- queries now check both `isActive: true AND deletedAt IS NULL`. Worse, existing `findFirst({ where: { id, isActive: true } })` patterns still work but miss the semantic shift from "isActive is the soft delete flag" to "deletedAt is the soft delete flag and isActive is a separate business flag."

**Why it happens:** The current system uses `isActive` as a de-facto soft delete (6 models have it). The v1.1 plan adds `deletedAt` as the "real" soft delete. If both coexist, developers must decide: does `isActive: false` mean "soft-deleted" or "business-deactivated"? The answer differs per model.

**Consequences:**
- All 34 spec files with `isActive` assertions need review
- Import strategies (5 strategies) that check `isActive` during duplicate detection will behave differently
- The `findOne` pattern in every service (`where: { id, isActive: true }`) becomes ambiguous
- E2E tests that set `isActive: false` to simulate deletion now have different semantics

**Prevention:**
1. **Choose ONE soft delete mechanism**: Either keep `isActive` as the sole soft delete (simpler, no migration needed) or fully replace `isActive` with `deletedAt` on all 6 models.
2. **Recommended: Keep `isActive` as-is, add `deletedAt` only for audit trail purposes.** Use Prisma client extension to auto-filter `deletedAt IS NULL` on reads. Migrate existing "soft-deleted" rows (`isActive: false`) by setting their `deletedAt` to `updatedAt` timestamp.
3. **Do NOT use Prisma middleware** (deprecated since Prisma 4.16). Use **Prisma Client Extensions** (`$extends`) which are the current recommended approach.
4. **Global search-replace plan**: Before enabling the extension, grep for all `isActive` usages and categorize each as "soft delete check" vs "business status check." Only remove the "soft delete check" ones.

**Detection:** Run `pnpm test` after adding the extension. If test count drops (tests that were checking `isActive` now get filtered by middleware too), the double-filtering is happening.

**Phase to address:** Soft delete phase -- plan the `isActive` migration strategy BEFORE writing any code.

**Severity if hit:** HIGH -- touches every service file, every spec file, and all 5 import strategies. A wrong approach cascades across the entire codebase.

---

### Pitfall 3: Prisma `generate` in Docker Multi-Stage Build Produces Wrong Engine Binaries

**What goes wrong:** A common multi-stage Dockerfile pattern:
```dockerfile
# Stage 1: Build (debian)
FROM node:20 AS builder
RUN npx prisma generate
RUN npm run build

# Stage 2: Run (alpine)
FROM node:20-alpine
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
```
The Prisma engine binary generated in Stage 1 (Debian/glibc) does not work in Stage 2 (Alpine/musl). The app crashes at startup with "Unable to require `/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node`."

**Why it happens:** Prisma generates platform-specific engine binaries during `prisma generate`. The binary matches the OS where generate runs, not where the app executes.

**Consequences:** Production container crashes immediately on startup. Zero ability to serve traffic.

**Prevention:**
1. **Same base image for build and run stages**: Use `node:20-slim` for both stages (not Alpine for run). This is simplest.
2. **If Alpine is required**: Add `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` to `schema.prisma` generator block, OR run `prisma generate` in an Alpine intermediate stage.
3. **Do NOT install `glibc`/`libc6-compat` on Alpine** -- this breaks Prisma's musl detection and creates a worse failure mode.
4. **Verify with**: `docker run --rm <image> node -e "require('@prisma/client')"`

**Detection:** The container exits with code 1 within seconds of starting. Logs show Prisma engine binary not found.

**Phase to address:** Docker/containerization phase.

**Severity if hit:** HIGH -- production cannot start. But easy to fix once identified.

**Sources:**
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/docker)
- [Prisma Discussion #23383](https://github.com/prisma/prisma/discussions/23383)

---

### Pitfall 4: Prisma Migration Race Condition on CI/CD Deploy

**What goes wrong:** CI/CD pipeline runs `prisma migrate deploy` then starts the NestJS app. If the migration is slow (adding indexes on large tables, altering columns), the app starts before migration completes and crashes because the schema doesn't match the Prisma Client's expectations. On a single lightweight server with a single deployment slot, there's no separate migration orchestration.

**Why it happens:** `prisma migrate deploy` uses advisory locks (10-second timeout, not configurable) to prevent concurrent migrations. But the deployment script may not wait for the migration to finish before starting the app.

**Consequences:**
- App crashes on startup with Prisma schema mismatch errors
- If two deployments overlap (manual trigger during CI), both try to migrate simultaneously and one may fail
- Advisory lock timeout can cause migration to be partially applied (on very slow operations)

**Prevention:**
1. **Sequential deployment script**: `prisma migrate deploy && node dist/main.js` -- the `&&` ensures the app only starts after migration succeeds.
2. **For zero-downtime on single server**: Use a "blue-green" approach with process manager (PM2). Start new instance on different port, run health check, then swap. During migration window, the old instance serves traffic against the old schema.
3. **Never run `prisma migrate dev`** in production or CI/CD. Only `prisma migrate deploy`.
4. **Test migration speed locally**: Run the migration against a data-loaded database first. If it takes >5 seconds, plan for downtime window.
5. **For this project**: With 2-5 users on a lightweight server, a brief maintenance window (1-2 minutes) is acceptable. Don't over-engineer zero-downtime.

**Detection:** Deployment succeeds but app health check fails. Logs show "The table `X` does not exist in the current database" or column mismatch errors.

**Phase to address:** CI/CD phase.

**Severity if hit:** MEDIUM -- production downtime, but recoverable by re-running the deploy.

**Sources:**
- [Prisma Deploy Migrations Docs](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)
- [Prisma Issue #14454: Exclusive Migrations](https://github.com/prisma/prisma/issues/14454)

---

### Pitfall 5: Sentry Captures Every Expected HttpException as Error (404s, 400s, 409s)

**What goes wrong:** After integrating `@sentry/nestjs`, every `NotFoundException`, `BadRequestException`, and `ConflictException` thrown by the existing services is captured and sent to Sentry. The project has hundreds of these across all service methods (every `findOne` throws `NotFoundException`). Sentry fills up with noise, masking real 500-level errors.

**Why it happens:** The current `AllExceptionsFilter` catches everything. When Sentry's NestJS integration hooks into the exception pipeline, it captures all exceptions by default. The Sentry docs note that `HttpException` derivatives "aren't captured by default" in newer SDK versions, but custom exception filters like `AllExceptionsFilter` may re-throw or handle exceptions in ways that Sentry still captures.

**Consequences:**
- Sentry quota consumed by noise (pricing is event-based)
- Actual 500 errors buried under hundreds of expected 404s
- Alert fatigue -- team ignores all Sentry notifications
- PII leakage risk: request bodies with customer data (addresses, phone numbers, WeChat IDs) included in Sentry breadcrumbs

**Prevention:**
1. **Use `beforeSend` to filter by status code**:
   ```typescript
   Sentry.init({
     beforeSend(event, hint) {
       const error = hint?.originalException;
       if (error instanceof HttpException && error.getStatus() < 500) {
         return null; // Drop 4xx errors
       }
       return event;
     },
   });
   ```
2. **Use `beforeBreadcrumb` to scrub PII**: Filter out breadcrumbs containing customer data (addresses, phone numbers).
3. **Use `denyUrls` or `ignoreErrors`** for known noisy patterns.
4. **For the existing `AllExceptionsFilter`**: Integrate Sentry capture ONLY for non-HttpException errors (the `else if (exception instanceof Error)` branch), not for the `HttpException` branch.
5. **Background job isolation**: The `QuoteScheduler` cron job must be wrapped in `Sentry.withIsolationScope()` to prevent its breadcrumbs from leaking into unrelated HTTP error events.

**Detection:** After integration, check Sentry dashboard. If >90% of events are 4xx, filtering is missing.

**Phase to address:** Sentry integration phase.

**Severity if hit:** MEDIUM -- no data loss, but degrades monitoring usefulness and wastes Sentry quota.

**Sources:**
- [Sentry NestJS Filtering Docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/configuration/filtering/)
- [Sentry NestJS 404 Issue #12523](https://github.com/getsentry/sentry-javascript/issues/12523)
- [Sentry PII Scrubbing Docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/data-management/sensitive-data/)

---

## Moderate Pitfalls

### Pitfall 6: Redis Cache Invalidation Desync with Prisma Transactions

**What goes wrong:** The cache-aside pattern: read from Redis first, if miss, query Prisma, cache result. On write, invalidate the cache key. But many write operations use `this.prisma.$transaction()` (the `SupplierService.create` uses it, `OrderService` uses it heavily). If the transaction succeeds but the Redis `DEL` fails (network blip, Redis restart), stale data persists in cache indefinitely. Conversely, if cache is invalidated but the transaction rolls back, cache is empty and the next read caches the pre-transaction state -- which is correct, but the invalidation was wasted.

**Why it happens:** Redis and MySQL are separate data stores with no distributed transaction support. The order of operations matters: invalidate before commit = stale on rollback; invalidate after commit = stale window; invalidate inside transaction callback = Redis failure can't roll back the DB.

**Consequences:**
- User creates a supplier, but the list page still shows the old count (stale cache)
- User soft-deletes a record, but it still appears in list queries (cache hit returns deleted record)
- The `CodeGeneratorService` uses Redis INCR for sequence numbers -- cache invalidation on the code prefix could reset sequences

**Prevention:**
1. **Short TTLs over complex invalidation**: For a 2-5 user system, set cache TTL to 60-120 seconds. Stale data for 2 minutes is acceptable; complex invalidation logic is not.
2. **Cache only read-heavy, write-rare data**: Fabric catalog, product catalog, system enums. Do NOT cache orders, quotes, or payment records (frequently mutated).
3. **Never cache paginated list endpoints** -- the permutations of page/pageSize/filters make key management intractable. Cache individual `findOne` results only.
4. **Invalidation after transaction commit**: Use Prisma's `$transaction` return value to confirm success, THEN invalidate. Accept the brief stale window.
5. **Do NOT cache in the existing `CodeGeneratorService`** -- it already uses Redis INCR directly, and adding a cache layer would create a dangerous sequence duplication risk.

**Detection:** After enabling caching, create a record via the UI, immediately navigate to the list page. If the new record doesn't appear, cache invalidation is broken.

**Phase to address:** Redis caching phase.

**Severity if hit:** MEDIUM -- causes stale data but not data loss. For 2-5 users, impact is limited.

---

### Pitfall 7: Audit Logging Interceptor Creates Circular Dependency with Auth Module

**What goes wrong:** An audit logging interceptor needs the authenticated user's identity (`req.user.id`, `req.user.name`) to record "who did what." If the interceptor is a global provider that depends on `AuthModule` or `JwtService`, and `AuthModule` already imports `CommonModule` (where the interceptor lives), a circular dependency is created. NestJS throws "Nest cannot resolve dependencies" at startup.

**Why it happens:** The current module dependency chain: `CommonModule -> PrismaModule`, and `AuthModule` imports from `CommonModule`. Adding an audit interceptor to `CommonModule` that needs auth context creates `CommonModule -> AuthModule -> CommonModule`.

**Consequences:**
- Application fails to bootstrap
- Attempted fix with `forwardRef()` masks the real design issue and creates fragile startup ordering

**Prevention:**
1. **Interceptor should NOT inject AuthService or JwtService**. The user is already on `req.user` after the JWT guard runs. The interceptor simply reads `req.user` from the request object -- no dependency on AuthModule needed.
2. **Use `@Injectable()` interceptor with `ExecutionContext`**: Access `context.switchToHttp().getRequest().user` directly.
3. **Audit log writes should use PrismaService directly** (which is already globally available), not through a service that imports auth.
4. **Make audit logging async and non-blocking**: Use `tap()` in the RxJS `handle()` pipeline to log after response is sent, so audit write failures don't affect API response times.

**Detection:** If `NestFactory.create()` throws during `npm start`, check for circular dependency error messages.

**Phase to address:** Audit logging phase.

**Severity if hit:** MEDIUM -- blocks application startup until resolved, but the fix (reading from request object) is straightforward.

**Sources:**
- [NestJS Auth Circular Dependency Guide](https://copyprogramming.com/howto/nestjs-auth-and-user-module-circular-dependency)

---

### Pitfall 8: Docker Build Copies `node_modules` Incorrectly, Image Size Balloons to 2GB+

**What goes wrong:** Naive Dockerfile `COPY . .` includes development `node_modules` (with TypeScript, ESLint, Jest, ts-jest, Prisma CLI, etc.) in the production image. The backend has 80+ dependencies including heavy dev tools. The image becomes 1.5-2GB instead of ~300MB.

**Why it happens:** Developers test Docker build locally, see it works, and don't check image size. The lightweight Tencent Cloud server has limited disk (typically 40-80GB SSD), and a 2GB image consumes a significant portion.

**Consequences:**
- Docker pull/push takes 5-10 minutes on slow connections
- Tencent Cloud lightweight server disk fills up after a few image versions
- CI/CD deploy time becomes unacceptable
- Attack surface increases with unnecessary packages in production

**Prevention:**
1. **Multi-stage build with production-only dependencies**:
   ```dockerfile
   # Build stage
   FROM node:20-slim AS builder
   COPY package.json pnpm-lock.yaml ./
   RUN pnpm install --frozen-lockfile
   COPY . .
   RUN npx prisma generate && pnpm build

   # Production stage
   FROM node:20-slim
   COPY package.json pnpm-lock.yaml ./
   RUN pnpm install --prod --frozen-lockfile
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
   COPY prisma ./prisma
   ```
2. **Use `.dockerignore`**: Exclude `node_modules`, `test/`, `*.spec.ts`, `.git/`, `coverage/`, `backend/uploads/`.
3. **Target image size**: <400MB for backend, <100MB for frontend (nginx + static files).

**Detection:** `docker images | grep borealis` -- if size >500MB for backend, something is wrong.

**Phase to address:** Docker/containerization phase.

**Severity if hit:** MEDIUM -- doesn't break functionality but makes deployment impractical on lightweight server.

---

### Pitfall 9: Source Map Upload to Sentry Exposes Server-Side Source Code

**What goes wrong:** Uploading backend source maps to Sentry is useful for readable stack traces, but if misconfigured, source maps become publicly accessible or leak proprietary business logic (import strategies, pricing calculations, order state machine).

**Why it happens:** Sentry source map upload is straightforward for frontend (Vite produces source maps, upload during build). For the backend, NestJS `nest build` does not produce source maps by default, and enabling them + uploading requires explicit configuration.

**Consequences:**
- Proprietary business logic exposed if source maps are public
- Source maps in production bundle increase attack surface (attackers can read server code)
- If source maps are not uploaded, Sentry stack traces show minified/compiled code (less useful but functional)

**Prevention:**
1. **Frontend**: Upload source maps to Sentry during CI build, then DELETE them from the built output before deploying. Use `@sentry/vite-plugin` which handles this automatically with `sourcemaps.filesToDeleteAfterUpload`.
2. **Backend**: Enable source maps in `tsconfig.json` (`"sourceMap": true`), upload to Sentry in CI, but do NOT include `.js.map` files in the production Docker image.
3. **Sentry artifact settings**: Set `releaseHealth` and version tags to match deployments for proper source map association.
4. **For this project (2-5 users, internal tool)**: Backend source map upload is LOW priority. Frontend source maps are MEDIUM priority. The team can read compiled TypeScript stack traces reasonably well.

**Detection:** After deploying, check `dist/` in the container: `docker exec <container> ls dist/*.map` should return nothing.

**Phase to address:** Sentry integration phase.

**Severity if hit:** LOW -- information disclosure risk, but mitigated by this being an internal tool.

---

### Pitfall 10: PWA Service Worker Caches Stale API Responses

**What goes wrong:** Adding `vite-plugin-pwa` to the existing Vite config with default settings aggressively caches all fetched resources, including `/api/v1/*` responses. Users see cached data even after backend updates. Worse, if the service worker caches a 401 response (JWT cookie expired), the user is stuck in a redirect loop.

**Why it happens:** The default Workbox configuration in `vite-plugin-pwa` uses a "stale-while-revalidate" strategy that may cache API responses alongside static assets.

**Consequences:**
- Users see stale supplier/order data
- Logout doesn't work because cached auth responses are served
- "Works for me but not for the user" debugging nightmare

**Prevention:**
1. **Explicitly exclude API routes from service worker caching**:
   ```typescript
   VitePWA({
     workbox: {
       navigateFallback: '/index.html',
       navigateFallbackDenylist: [/^\/api/],
       runtimeCaching: [] // No runtime caching for APIs
     }
   })
   ```
2. **Cache ONLY static assets** (JS, CSS, images, fonts). Never cache API endpoints or auth-related routes.
3. **Add update prompt**: Show a banner when new service worker is available, letting users click to update instead of auto-updating.
4. **For this project**: PWA is for "basic offline support" per requirements. This means manifest + install prompt + cached shell only. Do NOT add offline data sync -- it's out of scope and dangerous for a supply chain system where data consistency matters.

**Detection:** Deploy a backend update, check if the frontend shows new data without a hard refresh.

**Phase to address:** PWA phase.

**Severity if hit:** MEDIUM -- stale data shown to users, potential auth issues.

---

## Minor Pitfalls

### Pitfall 11: E2E Tests Break After Adding Global Prisma Middleware/Extension

**What goes wrong:** All 11 E2E test suites create test modules using `overrideProvider(PrismaService).useValue(mockPrismaService)`. The mock `PrismaService` is a plain object with jest.fn() methods -- it does not have Prisma middleware or client extensions. If the production code starts relying on middleware behavior (auto-filtering `deletedAt`), tests pass with the mock but production behavior differs.

**Why it happens:** E2E tests mock PrismaService at the NestJS DI level, completely bypassing Prisma's middleware/extension layer. The mock returns exactly what the test specifies, regardless of soft delete state.

**Consequences:**
- Tests pass but production queries return different results (filtered by deletedAt)
- False confidence in test coverage
- Specifically: mock `findMany` returns all records including soft-deleted ones, but production `findMany` auto-filters them

**Prevention:**
1. **Don't rely on Prisma middleware for correctness in tests**. The existing pattern of explicit `isActive: true` in service code is actually MORE testable than implicit middleware filtering.
2. **If using Prisma client extensions**: Add a test helper that wraps the mock to simulate the extension behavior:
   ```typescript
   // In test helper
   function wrapMockWithSoftDelete(mock: MockPrismaService) {
     const originalFindMany = mock.supplier.findMany;
     mock.supplier.findMany = jest.fn((args) => {
       // Simulate soft delete filter
       return originalFindMany(args);
     });
   }
   ```
3. **Add integration tests** (not just E2E mocks) that use a real test database to verify middleware behavior. A separate test suite with `testcontainers` or a dedicated test MySQL instance.

**Detection:** After adding soft delete extension, run full E2E suite. If ALL tests pass without changes, the tests are not exercising the new behavior.

**Phase to address:** Soft delete phase + test update.

**Severity if hit:** LOW -- tests give false confidence, but the risk is limited for a 2-5 user system.

---

### Pitfall 12: Tencent Cloud CDB MySQL Restrictions vs Self-Managed MySQL

**What goes wrong:** Tencent CDB (managed MySQL) has restrictions that self-managed MySQL doesn't:
- No `SUPER` privilege (can't set global variables, can't use `LOAD DATA LOCAL INFILE`)
- No direct file system access (can't use `INTO OUTFILE`)
- Automated backup windows may cause brief I/O spikes
- Connection limits are tied to the CDB tier (basic tier: 800 connections max)
- Character set must be configured at instance creation (changing later requires recreation)

**Why it happens:** Developers test against local MySQL (full privileges), then deploy to CDB which is locked down.

**Consequences:**
- Prisma migrations that use raw SQL with privileged operations fail
- Excel import that uses temp files may hit I/O limits
- Backup cron job that tries `mysqldump` with `--single-transaction` may need CDB-specific flags

**Prevention:**
1. **Test all Prisma migrations against CDB** (or a CDB-compatible restricted MySQL) before production deploy.
2. **Database backup**: Use CDB's built-in automatic backup feature (free, up to 7-day retention) instead of custom `mysqldump` scripts. CDB provides console-based backup download.
3. **Connection pooling**: Configure Prisma connection pool size to stay well under CDB's limit. For lightweight tier, set `connection_limit=10` in DATABASE_URL.
4. **Character set**: Ensure CDB instance is created with `utf8mb4` encoding for Chinese character support.

**Detection:** Run `prisma migrate deploy` against CDB. If any migration fails with "Access denied" or "SUPER privilege required," the migration has restricted operations.

**Phase to address:** Deployment phase.

**Severity if hit:** LOW for this project -- CDB backup covers the backup requirement, and Prisma migrations rarely need SUPER privilege.

---

### Pitfall 13: Load Testing with k6 Fails to Authenticate Due to HttpOnly Cookie

**What goes wrong:** The existing auth system uses HttpOnly JWT cookies (migrated from localStorage in Phase 5). k6 scripts that try to set the `Authorization` header with a JWT token won't work because the backend reads the token from cookies, not headers. k6 needs to perform a login flow and let cookie jar management handle subsequent authenticated requests.

**Why it happens:** k6 documentation examples mostly show `Authorization: Bearer <token>` header patterns. The project's cookie-based auth requires a different approach.

**Consequences:**
- All load test requests return 401
- Developer wastes time debugging "auth works in browser but not in k6"

**Prevention:**
1. **Use k6's built-in cookie jar**: k6 automatically stores cookies from responses. Perform a login request first, then subsequent requests will include the cookie automatically.
2. **Alternatively, add a test-only `/auth/login-test` endpoint** (disabled in production) that returns a JWT cookie for load testing without WeChat OAuth.
3. **k6 script pattern**:
   ```javascript
   // Login once in setup()
   export function setup() {
     const loginRes = http.post(`${BASE_URL}/api/v1/auth/login-test`, {
       testUserId: 'load-test-user'
     });
     return { cookies: loginRes.cookies };
   }

   export default function(data) {
     const jar = http.cookieJar();
     // jar automatically manages cookies from setup
     const res = http.get(`${BASE_URL}/api/v1/suppliers`);
   }
   ```

**Detection:** k6 output shows 100% of requests returning 401.

**Phase to address:** Load testing phase.

**Severity if hit:** LOW -- delays load testing but doesn't affect production.

**Sources:**
- [k6 Cookies Documentation](https://grafana.com/docs/k6/latest/using-k6/cookies/)

---

### Pitfall 14: Audit Log Table Grows Unboundedly Without Retention Policy

**What goes wrong:** Every POST, PATCH, DELETE request generates an audit log row. With order state machine transitions (9 states, each tracked), payment records, and import operations (potentially hundreds of rows per import), the audit table grows rapidly. Without retention policy, it becomes the largest table and slows down queries.

**Why it happens:** Audit logging is implemented as "log everything" with no consideration for lifecycle management. The system design focuses on what to log, not when to clean up.

**Consequences:**
- Disk usage on CDB grows (CDB charges for storage exceeding the tier limit)
- `SELECT * FROM audit_logs WHERE entityId = X` becomes slow without proper indexing
- CDB automatic backup size increases, slowing backup/restore operations

**Prevention:**
1. **Design retention policy upfront**: 90-day detailed logs, then aggregate/archive. For a trading company, 1 year of audit logs should be sufficient.
2. **Add composite index**: `@@index([entityType, entityId, createdAt])` for the most common query pattern.
3. **Use partitioning by month** if MySQL 8.0 is available on CDB (it is). This makes retention cleanup a fast `DROP PARTITION` instead of slow `DELETE`.
4. **For this project**: With 2-5 users doing maybe 50-100 operations/day, growth is ~3000 rows/month. Not urgent for year 1, but design the schema with `createdAt` index from day 1.

**Detection:** `SELECT COUNT(*) FROM audit_logs` periodically. If >100K rows in first 3 months, review the logging granularity.

**Phase to address:** Audit logging phase.

**Severity if hit:** LOW in year 1 (small team, low volume). Becomes MEDIUM after 2+ years without cleanup.

---

### Pitfall 15: Frontend Sentry SDK Captures User PII in Breadcrumbs and Error Context

**What goes wrong:** Ant Design form values, console.log statements with customer data (addresses, phone numbers, WeChat IDs), and URL parameters containing entity IDs are captured as Sentry breadcrumbs. Chinese characters in error messages and customer names flow directly into Sentry's cloud servers.

**Why it happens:** Sentry's default breadcrumb capture includes console output, DOM interactions (click events with text content), and XHR request/response data. The app's Chinese error messages (`getErrorMessage`) and form interactions with real customer data are all captured.

**Consequences:**
- Customer PII stored on Sentry's servers (data sovereignty concern for Chinese business data)
- WeChat IDs, phone numbers, and addresses visible in Sentry dashboard to anyone with access

**Prevention:**
1. **Scrub PII in `beforeSend`**: Delete `event.user.email`, scrub request body data containing phone/wechat/address fields.
2. **Filter `beforeBreadcrumb`**: Drop `console` breadcrumbs and `ui.click` breadcrumbs that contain Chinese text matching customer data patterns.
3. **Use Sentry's `sendDefaultPii: false`** (default) and do NOT override it to `true`.
4. **For the frontend**: Only capture JavaScript errors and performance data. Do NOT enable session replay or form interaction capture.

**Detection:** Check Sentry events for any occurrence of phone numbers (13XXXXXXXXX pattern), WeChat IDs, or Chinese address strings.

**Phase to address:** Sentry integration phase.

**Severity if hit:** LOW technically, but potentially MEDIUM from a compliance perspective for Chinese business data.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Soft Delete | Unique constraint collision (Pitfall 1) | Composite unique with deletedAt, MySQL NULL trick | HIGH |
| Soft Delete | 205 isActive queries become ambiguous (Pitfall 2) | Decide isActive vs deletedAt role BEFORE coding | HIGH |
| Docker | Wrong Prisma engine binary (Pitfall 3) | Same base image for build and run stages | HIGH |
| Docker | Image size >1GB (Pitfall 8) | Multi-stage build, .dockerignore, prod-only deps | MEDIUM |
| CI/CD | Migration race condition (Pitfall 4) | Sequential script: migrate && start | MEDIUM |
| Sentry | 404 noise floods dashboard (Pitfall 5) | beforeSend filter for <500 status codes | MEDIUM |
| Sentry | PII in breadcrumbs (Pitfall 15) | beforeBreadcrumb scrubbing, sendDefaultPii: false | MEDIUM |
| Sentry | Source maps expose code (Pitfall 9) | Upload then delete from build output | LOW |
| Redis Cache | Stale data after writes (Pitfall 6) | Short TTLs, cache only read-heavy entities | MEDIUM |
| Audit Logging | Circular dependency (Pitfall 7) | Read req.user directly, no AuthModule import | MEDIUM |
| Audit Logging | Unbounded table growth (Pitfall 14) | Index + TTL + retention policy design | LOW |
| PWA | Service worker caches API responses (Pitfall 10) | Exclude /api routes from workbox config | MEDIUM |
| E2E Tests | Mock bypasses middleware (Pitfall 11) | Don't rely on implicit middleware in tests | LOW |
| Load Testing | k6 can't authenticate (Pitfall 13) | Use k6 cookie jar + test login endpoint | LOW |
| Deployment | CDB restrictions (Pitfall 12) | Test migrations against CDB, use built-in backup | LOW |

---

## "Looks Done But Isn't" Checklist

- [ ] Soft delete: `deletedAt` added to all models, but unique constraints not updated -> re-creating deleted entities fails
- [ ] Soft delete: Prisma extension auto-filters reads, but `isActive: true` still in 205 locations -> double filtering, no test catches it
- [ ] Docker: Image builds and runs locally, but uses 2GB disk -> lightweight server runs out of disk after 3 deploys
- [ ] Sentry: Integration works, but 95% of events are 404s -> real errors buried, quota exhausted
- [ ] Sentry: Frontend captures errors, but customer phone numbers visible in breadcrumbs -> PII exposure
- [ ] Redis cache: `findAll` results cached, but cache not invalidated on create/update -> users see stale data
- [ ] Redis cache: Individual entity cached, but paginated list still hits DB -> no measurable performance improvement
- [ ] Audit log: Every request logged, but no index on entityType+entityId -> audit queries slow after 3 months
- [ ] PWA: Service worker registered, but caches `/api/v1/auth/me` -> logout doesn't work
- [ ] CI/CD: Pipeline deploys successfully, but migration runs after app start -> intermittent crashes on schema changes
- [ ] Load test: k6 scripts written, but all requests return 401 -> testing unauthenticated paths only
- [ ] CDB: App connects, but `prisma migrate deploy` fails on one migration with SUPER privilege error -> partial schema

---

## Impact Summary Matrix

| Pitfall | Data Loss Risk | Downtime Risk | Test Suite Impact | Effort to Fix After Hit |
|---------|---------------|---------------|-------------------|------------------------|
| Unique constraint (1) | None | None | LOW | HIGH (schema + migration redesign) |
| isActive ambiguity (2) | None | None | HIGH (205 locations) | HIGH (global refactor) |
| Prisma engine binary (3) | None | YES (startup crash) | None | LOW (config change) |
| Migration race (4) | Possible | YES | None | LOW (script ordering) |
| Sentry noise (5) | None | None | None | LOW (config change) |
| Cache desync (6) | None | None | None | MEDIUM (redesign caching) |
| Circular dep (7) | None | YES (startup crash) | None | LOW (architectural fix) |
| Docker size (8) | None | Indirect (disk) | None | LOW (Dockerfile rewrite) |
| Source maps (9) | None | None | None | LOW (build config) |
| PWA stale API (10) | None | None | None | LOW (config change) |
| E2E mock gap (11) | None | None | HIGH (false confidence) | MEDIUM (test rewrite) |
| CDB restrictions (12) | None | Possible | None | MEDIUM (migration rewrite) |
| k6 auth (13) | None | None | None | LOW (script fix) |
| Audit log growth (14) | None | None | None | LOW (add index + policy) |
| PII leakage (15) | None | None | None | LOW (config change) |

---

*Pitfalls research: 2026-03-28 -- v1.1 Production Readiness milestone*
*Previous version (v1.0): archived in milestones/*
