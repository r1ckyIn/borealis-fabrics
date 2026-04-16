# Architecture

**Analysis Date:** 2026-04-16

## Pattern Overview

**Overall:** Modular Monolith — all business logic in a single NestJS process, divided into feature modules with explicit dependency boundaries.

**Key Characteristics:**
- Each business domain is a self-contained NestJS module (Controller + Service + DTOs)
- All modules import `PrismaModule` (global) for database access; no repository abstraction layer — services call `PrismaService` directly
- Cross-cutting concerns (auth, audit, logging, metrics) are applied globally via interceptors/guards registered in `AppModule`
- Frontend is a React SPA served by Nginx; API calls go through `/api/v1` reverse proxy
- No microservices; no message queues; no event bus

## Module Dependency Graph

```
ConfigModule (global, isGlobal: true)
ClsModule (global, middleware: true — injects X-Correlation-ID)
PrismaModule (@Global — available to all modules without import)
CommonModule (@Global — RedisService, CacheService, CodeGeneratorService)

AuthModule
  imports: PrismaModule, CommonModule, PassportModule, JwtModule
  exports: JwtAuthGuard, OptionalJwtAuthGuard, AuthService, JwtModule

AuditModule
  exports: AuditService, AuditInterceptor

MetricsModule
  exports: MetricsInterceptor

SupplierModule     → imports: PrismaModule, AuthModule, ClsModule
CustomerModule     → imports: PrismaModule, AuthModule, ClsModule
FabricModule       → imports: PrismaModule, AuthModule, ClsModule
FileModule         → (uses PrismaModule global)
QuoteModule        → imports: PrismaModule, CommonModule
OrderModule        → imports: PrismaModule, CommonModule
LogisticsModule    → imports: PrismaModule
ImportModule       → imports: PrismaModule, CommonModule (strategy pattern)
ProductModule      → imports: PrismaModule
ExportModule       → (standalone)
SystemModule       → (enum values + health)
```

**AppModule (root) global providers:**
```
APP_FILTER      → AllExceptionsFilter
APP_INTERCEPTOR → MetricsInterceptor (order 1 — measures full lifecycle)
APP_INTERCEPTOR → TransformInterceptor (order 2 — wraps { code, message, data })
APP_INTERCEPTOR → UserClsInterceptor (order 3 — stores request.user in CLS)
APP_INTERCEPTOR → AuditInterceptor (order 4 — reads CLS user for audit logs)
APP_PIPE        → ValidationPipe (whitelist, forbidNonWhitelisted, transform)
APP_GUARD       → ThrottlerGuard (60 req/min global)
```

## Layers

**Controller Layer:**
- Purpose: Accept HTTP requests, validate inputs via DTOs, delegate to service, return results
- Location: `backend/src/<module>/<module>.controller.ts`
- Contains: Route decorators (`@Get`, `@Post`, etc.), Swagger annotations, guard application (`@UseGuards`), `@Audited()` decorator
- Depends on: Service layer, CLS (for reading current user in server-side RBAC checks)
- Used by: HTTP clients via nginx reverse proxy

**Service Layer:**
- Purpose: Business logic, Prisma queries, cache management, code generation
- Location: `backend/src/<module>/<module>.service.ts`
- Contains: `PrismaService` calls, `CacheService.getOrSet()` for read caching, `$transaction` for write atomicity, NestJS HTTP exceptions
- Depends on: `PrismaService` (global), `CacheService` (global), `CodeGeneratorService` (global)
- Used by: Controller layer; other services when needed

**DTO Layer:**
- Purpose: Input validation and type safety at API boundaries
- Location: `backend/src/<module>/dto/`
- Contains: `CreateXxxDto`, `UpdateXxxDto` (`PartialType(CreateXxxDto)`), `QueryXxxDto` (extends `PaginationDto`)
- Depends on: `class-validator`, `class-transformer`, `@nestjs/swagger`
- Used by: Controller layer (bound by global `ValidationPipe`)

**Data Access (Prisma):**
- Purpose: Type-safe database queries with transparent soft-delete
- Location: `backend/src/prisma/prisma.service.ts`
- Contains: `PrismaService` extends `PrismaClient`; `prisma-extension-soft-delete` applied in constructor; `this.$raw` exposes unfiltered client for admin queries
- Soft-deletable models: `User`, `Fabric`, `Supplier`, `Customer`, `Product`, `ProductBundle`
- Slow query threshold: 200ms (configurable via `SLOW_QUERY_THRESHOLD_MS`)

## Data Flow

**Standard Authenticated Request (e.g. PATCH /api/v1/suppliers/:id):**

```
Browser / Client
    │  HTTPS — HttpOnly cookie (access_token) sent automatically
    ▼
Nginx (nginx/conf.d/default.conf)
    │  SSL termination (Let's Encrypt); proxy_pass to nestjs:3000
    ▼
NestJS HTTP Server (main.ts port 3000)
    │  helmet CSP/HSTS; cookieParser extracts cookies
    ▼
ThrottlerGuard (global APP_GUARD)
    │  60 req/min per IP
    ▼
JwtAuthGuard (per-controller or per-method @UseGuards)
    │  extracts JWT from Auth header or AUTH_COOKIE_NAME cookie
    │  checks Redis token blacklist (TOKEN_BLACKLIST_PREFIX + hash)
    │  verifies JWT → attaches RequestUser to request.user
    ▼
RolesGuard (optional, per-method @UseGuards + @Roles)
    │  reads weworkId from request.user
    │  checks against BOSS_WEWORK_IDS / DEV_WEWORK_IDS env vars
    ▼
ValidationPipe (global APP_PIPE)
    │  transforms and validates request DTO
    ▼
AuditInterceptor pre-handler (global, order 4)
    │  reads @Audited() metadata; fetches before-state for update/delete/restore
    ▼
Controller method
    │  delegates to service
    ▼
UserClsInterceptor (global, order 3)
    │  copies request.user into CLS key 'user' (available to all services)
    ▼
Service method (e.g. SupplierService.update)
    │  this.prisma.$transaction() — soft-delete extension applied
    │  throws NotFoundException / ConflictException as needed
    ▼
PrismaService → MySQL 8.0 (CDB in prod)
    │  result returned up the chain
    ▼
AuditInterceptor post-handler (RxJS tap, fire-and-forget)
    │  reads CLS user; writes AuditLog record; failures never block response
    ▼
TransformInterceptor (global, order 2)
    │  wraps: { code: <httpStatus>, message: 'success', data: <result> }
    ▼
MetricsInterceptor (global, order 1)
    │  records http_request_duration_seconds histogram
    ▼
AllExceptionsFilter (APP_FILTER, only on uncaught errors)
    │  maps Prisma P2002/P2025 → HTTP 409/404; attaches X-Correlation-ID
    │  reports 5xx to Sentry
    ▼
HTTP Response → Nginx → Browser
```

**WeWork OAuth Login Flow:**
```
1. GET /api/v1/auth/wework/login
   → AuthService.buildWeWorkAuthUrl() → 302 redirect to WeWork
2. WeWork → GET /api/v1/auth/wework/callback?code=&state=
   → AuthService.handleOAuthCallback() → user upsert in DB → JWT signed
   → res.cookie(AUTH_COOKIE_NAME, token, { httpOnly, secure, sameSite:'Lax' })
   → 302 redirect to frontend /auth/callback?success=true
3. OAuthCallback component → GET /api/v1/auth/me
   → authStore.setUser(user) — user object persisted to localStorage (key: bf_auth)
   → navigate to /products/fabrics
4. Logout: POST /api/v1/auth/logout
   → res.clearCookie(AUTH_COOKIE_NAME)
   → token added to Redis blacklist (TTL = remaining JWT expiry)
```

**Frontend State Management:**
- Server state (lists, details): TanStack Query hooks in `frontend/src/hooks/queries/`
- Auth: Zustand `authStore` — stores `user: AuthUser | null` only; JWT token is never in JS, lives in HttpOnly cookie
- Enums/reference data: Zustand `enumStore` loaded once at app start
- UI state: Zustand `uiStore` (sidebar collapsed)
- Query stale time: 5 minutes; retry: 1; refetchOnWindowFocus: false

## Key Abstractions

**JwtAuthGuard:**
- Purpose: Primary authentication guard for all protected endpoints
- File: `backend/src/auth/guards/jwt-auth.guard.ts`
- Pattern: `CanActivate`; extracts token from cookie (`AUTH_COOKIE_NAME`) first, then `Authorization: Bearer` header; checks Redis blacklist via hash; attaches `RequestUser` to `request.user`
- Dev bypass: `NODE_ENV=development` → injects mock user `{ id: 1, weworkId: 'mock-dev-001', name: 'Mock Developer' }` — **removed in Phase 17 for production**

**OptionalJwtAuthGuard:**
- File: `backend/src/auth/guards/optional-jwt-auth.guard.ts`
- Purpose: Used on endpoints that work for both authenticated and anonymous users; never throws 401

**@Audited() Decorator + AuditInterceptor:**
- Files: `backend/src/audit/decorators/audited.decorator.ts`, `backend/src/audit/audit.interceptor.ts`
- Pattern: `SetMetadata(AUDIT_KEY, { entityType, action, idParam? })`; `AuditInterceptor` reads metadata via `Reflector`, captures before/after state diff, writes `AuditLog` fire-and-forget
- Usage on any CUD method: `@Audited({ entityType: 'Supplier', action: 'create' })`

**RolesGuard + @Roles():**
- Files: `backend/src/common/guards/roles.guard.ts`, `backend/src/common/decorators/roles.decorator.ts`
- Pattern: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('boss')` on method; reads `BOSS_WEWORK_IDS` and `DEV_WEWORK_IDS` env vars (comma-separated)

**TransformInterceptor:**
- File: `backend/src/common/interceptors/transform.interceptor.ts`
- Pattern: Global `APP_INTERCEPTOR`; RxJS `map` wraps all non-blob responses in `{ code, message, data }` envelope

**UserClsInterceptor:**
- File: `backend/src/common/interceptors/user-cls.interceptor.ts`
- Pattern: Copies `request.user` → `CLS['user']`; services use `cls.get<RequestUser>('user')` to access current user without controller parameter threading

**PrismaService Soft-Delete:**
- File: `backend/src/prisma/prisma.service.ts`
- Pattern: `prisma-extension-soft-delete` applied in constructor; all `findMany/findFirst` auto-filter `deletedAt IS NULL`; `delete()` calls set `deletedAt`; `this.$raw` bypasses extension for restore/admin queries

**Import Strategy Pattern:**
- Interface: `backend/src/import/strategies/import-strategy.interface.ts`
- Strategies: `fabric-import.strategy.ts`, `product-import.strategy.ts`, `purchase-order-import.strategy.ts`, `sales-contract-import.strategy.ts`, `supplier-import.strategy.ts`
- Pattern: `ImportService` selects strategy by import type; each strategy parses Excel and calls relevant service methods

**MetricsInterceptor:**
- Files: `backend/src/metrics/metrics.interceptor.ts`, `backend/src/metrics/metrics.module.ts`
- Pattern: `@willsoto/nestjs-prometheus` histogram `http_request_duration_seconds`; labels: `method`, `route`, `status`; registered as first `APP_INTERCEPTOR` to measure full request lifecycle

**ProtectedRoute (Frontend):**
- File: `frontend/src/routes/ProtectedRoute.tsx`
- Pattern: Reads `useIsAuthenticated()` from `authStore`; shows `FullPageSpinner` during init; redirects to `/login` if unauthenticated

**axios apiClient (Frontend):**
- File: `frontend/src/api/client.ts`
- Pattern: `withCredentials: true` (sends HttpOnly cookie); response interceptor unwraps `ApiResponse.data`; 401 → redirect to `/login` (single redirect guard via `isRedirecting` flag)

## Entry Points

**Backend Bootstrap:**
- Location: `backend/src/main.ts`
- Triggers: `node dist/main.js` inside Docker container
- Responsibilities: Helmet (CSP, HSTS), cookieParser, CORS (`cors.origins` from config), static assets at `/uploads/`, global prefix `api/v1` (excludes `/health`, `/ready`, `/metrics`), Swagger at `/api/docs` (non-prod only), listens port 3000

**Backend Sentry Init:**
- Location: `backend/src/instrument.ts` (imported as first line of `main.ts`)
- Responsibilities: Sentry SDK init; filters 4xx; scrubs `email`, `phone`, `mobile` PII fields

**Frontend SPA:**
- Location: `frontend/src/main.tsx` → `frontend/src/App.tsx` → `frontend/src/routes/index.tsx`
- Triggers: Browser loads `index.html` served by Nginx from `/usr/share/nginx/html`
- All routes lazy-loaded; SPA routing via `try_files $uri /index.html` in nginx

**Frontend Sentry Init:**
- Location: `frontend/src/instrument.ts` (imported as first line of `main.tsx`)

**Health Endpoints (outside API prefix):**
- `GET /health` → liveness (always up if process running)
- `GET /ready` → readiness (checks MySQL `SELECT 1` + Redis `PING`)
- `GET /metrics` → Prometheus scrape endpoint

## Error Handling

**Strategy:** Centralized `AllExceptionsFilter` + typed NestJS HTTP exceptions thrown by services

**Patterns:**
- Services throw: `NotFoundException` (404), `ConflictException` (409), `BadRequestException` (400), `ForbiddenException` (403)
- Prisma errors: `P2002` (unique constraint) → 409, `P2003` (FK constraint) → 400, `P2025` (not found) → 404; production hides raw message
- All errors include `correlationId` (from CLS), `path`, `timestamp` in response body
- Sentry captures 5xx only (4xx filtered in `beforeSend`); PII scrubbed before send
- Frontend: `ErrorBoundary` at app root (`frontend/src/components/common/ErrorBoundary.tsx`)

## Cross-Cutting Concerns

**Logging:** `nestjs-pino` structured JSON; correlation ID bound per-request via CLS. Dev: `pino-pretty`. Prod: `pino-loki` batched transport → Loki. Slow queries (>`SLOW_QUERY_THRESHOLD_MS` ms, default 200ms) logged at warn level.

**Validation:** Global `ValidationPipe` — `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, `enableImplicitConversion: true`.

**Authentication:** HttpOnly cookie + Redis blacklist. Dev mode mock user (removed in prod). Auth endpoints rate-limited to 5 req/min.

**Observability Stack (separate `docker-compose.monitoring.yml`):**
- Loki (port 3100): log aggregation; backend pushes via `pino-loki` when `LOKI_HOST` set
- Prometheus (port 9090): scrapes `host.docker.internal:3000/metrics`; config at `prometheus/prometheus.yml`
- Grafana (port 3001): dashboards provisioned from `grafana/provisioning/`
- All three share `borealis-fabrics_default` network with business stack

**SSL / Nginx (Phase 17):**
- Let's Encrypt certificates at `/etc/letsencrypt/live/<DOMAIN>/`
- HTTP (80) → 301 redirect to HTTPS; IP direct access → domain redirect
- HTTPS (443): TLS 1.2/1.3, Mozilla Intermediate cipher suite, HSTS header pending (commented out pending test validation)
- `FORCE_HTTPS_COOKIES=true` env var enables `secure` flag on auth cookie
- File uploads: `client_max_body_size 10m`; static assets cached 1 year with `immutable`

---

*Architecture analysis: 2026-04-16*
