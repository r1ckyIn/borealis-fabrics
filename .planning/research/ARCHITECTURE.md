# Architecture Patterns: v1.1 Production Readiness

**Domain:** Production readiness integration for existing modular monolith
**Researched:** 2026-03-28
**Confidence:** HIGH (based on direct codebase analysis + official documentation)

## Current Architecture Snapshot

Before describing how new capabilities integrate, here is the verified existing architecture.

### Module Dependency Graph

```
AppModule (root)
  |
  |- ConfigModule.forRoot()        (global)
  |- LoggerModule.forRoot()        (nestjs-pino, global)
  |- ThrottlerModule.forRoot()     (rate limiting, global guard)
  |- ScheduleModule.forRoot()      (cron jobs)
  |- TerminusModule                (health checks)
  |
  |- PrismaModule                  (@Global, exports PrismaService)
  |- CommonModule                  (@Global, exports RedisService, CodeGeneratorService)
  |- AuthModule                    (JwtAuthGuard, JwtStrategy, exports JwtAuthGuard + AuthService)
  |
  |- SupplierModule                (business)
  |- CustomerModule                (business)
  |- FabricModule                  (business)
  |- FileModule                    (storage provider factory: local/COS)
  |- ProductModule                 (business)
  |- QuoteModule                   (business + cron job)
  |- OrderModule                   (business, decomposed into Order/OrderItem/OrderPayment services)
  |- LogisticsModule               (business)
  |- ImportModule                  (Excel import strategies)
  |- SystemModule                  (enum values, system info)
```

### Global Providers (app.module.ts)

| Token | Class | Purpose |
|-------|-------|---------|
| APP_FILTER | AllExceptionsFilter | Catches all exceptions, Prisma error handling, production-safe messages |
| APP_INTERCEPTOR | TransformInterceptor | Wraps responses in `{ code, message, data }` |
| APP_PIPE | ValidationPipe | whitelist + forbidNonWhitelisted + transform |
| APP_GUARD | ThrottlerGuard | Global rate limiting (60 req/min) |

### Bootstrap Chain (main.ts)

```
NestFactory.create(AppModule, { bufferLogs: true })
  -> app.useLogger(pino)
  -> app.use(helmet({CSP, HSTS}))
  -> app.use(cookieParser())
  -> app.enableCors({ credentials: true })
  -> app.useStaticAssets(uploadDir, { prefix: '/uploads/' })
  -> app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] })
  -> SwaggerModule (non-production only)
  -> app.listen(port)
```

### Data Access Pattern

All services inject `PrismaService` (extends `PrismaClient`) directly. The current soft-delete pattern uses `isActive: Boolean` checked manually in every query's `where` clause (252 occurrences across 32 files, 1153 findMany/findFirst/findUnique calls across 36 files).

### Frontend Architecture

```
App
  |- QueryClientProvider (TanStack Query, staleTime=5min)
  |- ConfigProvider (Ant Design, zh_CN locale)
  |- AntdApp
  |- AppRouter (createBrowserRouter)
       |- Public: /login, /auth/callback
       |- Protected: MainLayout -> lazy loaded pages
```

- HTTP client: Axios with `withCredentials: true` (HttpOnly cookies)
- Response interceptor unwraps `{ code, message, data }` -> returns `data`
- Error interceptor: 401 -> redirect to /login, formats ApiError
- ErrorBoundary: Already exists (class component), but no Sentry integration

---

## Recommended Architecture for v1.1

### Overall Integration Philosophy

**Principle: Wrap, don't rewrite.** Every new capability integrates as a layer around existing components. No existing service code should change for cross-cutting concerns (soft delete, audit, caching, correlation ID, error tracking).

### Production Architecture Diagram

```
                    Internet
                       |
                  [Nginx :80/:443]
                  /             \
          /api/v1/*         /* (everything else)
               |                  |
       [NestJS :3000]     [Static files]
               |           (React build output
       [MySQL CDB]        served from /usr/share/nginx/html)
               |
       [Redis :6379]            [Sentry SaaS]
```

---

## 1. Soft Delete: Prisma Client Extension (deletedAt)

**Confidence: HIGH** (Prisma 6.x requires extensions; middleware API removed in v6.14.0)

### Integration Point: PrismaService

The current `isActive: Boolean` pattern requires every query to include `isActive: true`. Migration to `deletedAt: DateTime?` with a Prisma Client Extension will automatically filter soft-deleted records without changing any service code.

### Architecture

```
PrismaService (modified)
  |- extends PrismaClient
  |- applies $extends() with soft delete extension
  |- all findMany/findFirst/findUnique automatically exclude deletedAt != null
  |- delete() operations rewritten to set deletedAt = new Date()
  |- deleteMany() operations rewritten to updateMany({ deletedAt })
```

### Implementation Pattern

```typescript
// prisma.service.ts -- MODIFIED (single file change)
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Models that support soft delete (all business entities)
const SOFT_DELETE_MODELS = new Set([
  'Supplier', 'Customer', 'Fabric', 'Product',
  'Order', 'Quote', 'ProductBundle',
]);

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  private _extended: ReturnType<typeof this.withSoftDelete>;

  constructor() {
    super();
    this._extended = this.withSoftDelete();
  }

  private withSoftDelete() {
    return this.$extends({
      query: {
        $allModels: {
          async findMany({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          async findFirst({ model, args, query }) {
            if (SOFT_DELETE_MODELS.has(model)) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          // delete -> update with deletedAt
          // deleteMany -> updateMany with deletedAt
        },
      },
    });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

### Data Migration Required

```sql
-- Migration: add deletedAt to all business entities
ALTER TABLE suppliers ADD COLUMN deleted_at DATETIME(3) NULL;
ALTER TABLE customers ADD COLUMN deleted_at DATETIME(3) NULL;
ALTER TABLE fabrics ADD COLUMN deleted_at DATETIME(3) NULL;
ALTER TABLE products ADD COLUMN deleted_at DATETIME(3) NULL;
ALTER TABLE orders ADD COLUMN deleted_at DATETIME(3) NULL;
ALTER TABLE quotes ADD COLUMN deleted_at DATETIME(3) NULL;

-- Backfill: isActive=false -> deletedAt=updatedAt
UPDATE suppliers SET deleted_at = updated_at WHERE is_active = false;
UPDATE customers SET deleted_at = updated_at WHERE is_active = false;

-- Index for performance (CRITICAL)
CREATE INDEX idx_suppliers_deleted_at ON suppliers(deleted_at);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX idx_fabrics_deleted_at ON fabrics(deleted_at);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at);
CREATE INDEX idx_quotes_deleted_at ON quotes(deleted_at);
```

### What Changes vs What Doesn't

| Component | Changes? | Detail |
|-----------|----------|--------|
| schema.prisma | YES | Add `deletedAt DateTime?` to all business models |
| prisma.service.ts | YES | Apply `$extends()` with soft delete logic |
| All service files | NO | Extension handles filtering transparently |
| Existing tests | MINIMAL | Tests using `isActive: true` in where clauses still pass |
| migration | YES | New migration for schema + data backfill |

### Compatibility Note

The `isActive` field is retained during v1.1 for backward compatibility but deprecated. Services that currently check `isActive: true` will still work; the extension adds `deletedAt: null` as an additional filter. Over time, `isActive` checks can be removed from services since the extension handles it.

**Alternative considered and rejected:** `prisma-extension-soft-delete` npm package. While feature-rich (handles nested queries), it adds an external dependency for a pattern that is ~50 lines of custom code. Given the project's flat query patterns (no deep nested soft-delete filtering needed), a custom extension is simpler and more maintainable.

---

## 2. Audit Logging: NestJS Interceptor + Dedicated AuditLog Table

**Confidence: HIGH**

### Why Interceptor, Not Prisma Extension

| Approach | Has Request Context (user, IP)? | Captures HTTP Method? | Performance Impact |
|----------|---------------------------------|-----------------------|-------------------|
| NestJS Interceptor | YES (via ExecutionContext) | YES | Low (async write) |
| Prisma Extension | NO (no access to request) | NO | Low |
| Both combined | Redundant | N/A | Double writes |

**Decision: NestJS Interceptor only.** The audit log needs WHO (userId from JWT), WHAT (entity, action, changes), and WHEN. Only the NestJS layer has access to the authenticated user from the request context. Prisma extensions operate at the database layer with no HTTP context.

### Architecture

```
Request -> AuditInterceptor -> Controller -> Service -> PrismaService -> DB
                |                                              |
                |<---- after response (tap operator) ---------|
                |
                v
          AuditLogService.log() (async, non-blocking)
                |
                v
          audit_logs table (via PrismaService)
```

### New Components

| Component | Type | Location |
|-----------|------|----------|
| AuditInterceptor | NestJS Interceptor | `src/common/interceptors/audit.interceptor.ts` |
| AuditLogService | Service | `src/common/services/audit-log.service.ts` |
| AuditLog model | Prisma model | `prisma/schema.prisma` |
| @Audited() decorator | Custom decorator | `src/common/decorators/audited.decorator.ts` |

### Schema Addition

```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  userId     Int?     @map("user_id")
  action     String   // CREATE, UPDATE, DELETE, EXPORT
  entity     String   // Supplier, Order, Fabric, etc.
  entityId   Int?     @map("entity_id")
  changes    Json?    @db.Json // { field: { old, new } } for updates
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent") @db.Text
  requestId  String?  @map("request_id") // correlation ID
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([entity, entityId])
  @@index([userId])
  @@index([createdAt])
  @@index([action])
  @@map("audit_logs")
}
```

### Integration with Existing Code

The interceptor is applied via a custom `@Audited()` decorator on controller methods, NOT globally. This avoids logging every GET request (which would flood the audit table).

```typescript
// Usage in existing controllers (minimal change)
@Post()
@Audited({ entity: 'Supplier', action: 'CREATE' })
async create(@Body() dto: CreateSupplierDto) {
  return this.supplierService.create(dto);
}
```

**Relationship with existing TransformInterceptor:** The AuditInterceptor runs in the same interceptor chain. NestJS interceptors execute in registration order. Since AuditInterceptor uses `tap()` (side effect after response), it does not modify the response and is compatible with TransformInterceptor's `map()`.

---

## 3. Redis Caching Layer: Cache-Aside via CacheService

**Confidence: HIGH** (cache-manager already in package.json)

### Architecture Position

```
Controller -> Service -> CacheService -> RedisService (existing)
                                    |
                                    +-> PrismaService (cache miss)
```

The caching layer sits BETWEEN services and PrismaService, NOT as a Prisma extension. This is because:
1. Cache keys need business context (entity type, query params)
2. Cache invalidation needs to happen at the service level (on create/update/delete)
3. The existing RedisService already handles connection management and fallback

### New vs Modified Components

| Component | New/Modified | Purpose |
|-----------|-------------|---------|
| CacheService | NEW | Cache-aside pattern implementation |
| RedisService | MODIFIED | Add `scan` method for pattern-based invalidation |
| CommonModule | MODIFIED | Register CacheService |
| Business services | MODIFIED (minimal) | Add cache calls in hot paths |

### Cache-Aside Pattern

```typescript
// CacheService wraps RedisService with typed cache operations
class CacheService {
  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(key: string, ttl: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as T;

    const value = await factory();
    await this.redis.setex(key, ttl, JSON.stringify(value));
    return value;
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    // Use SCAN to find and delete matching keys
  }
}
```

### Which Queries to Cache

| Query | TTL | Invalidation Trigger | Rationale |
|-------|-----|---------------------|-----------|
| Fabric list (paginated) | 5min | Fabric create/update/delete | Most viewed page |
| Product list (paginated) | 5min | Product CRUD | Second most viewed |
| Supplier dropdown | 10min | Supplier CRUD | Selector in forms, rarely changes |
| Customer dropdown | 10min | Customer CRUD | Selector in forms |
| System enums | 30min | Never (static) | Called on every page load |
| Individual entity by ID | 5min | Entity update/delete | Detail pages |

### NOT Cached (by design)

- Order queries (status changes frequently, stale data is dangerous)
- Quote queries (expiration is time-sensitive)
- Payment/voucher data (financial accuracy required)
- Import operations (one-time batch operations)

### Why NOT use @nestjs/cache-manager CacheInterceptor

Although `@nestjs/cache-manager` is already installed, the `CacheInterceptor` is too coarse:
- It caches entire HTTP responses, not query results
- Cache key is the URL, so pagination/filter variations cause cache misses
- No control over invalidation per entity type
- Cannot cache at the service layer (e.g., caching a dropdown query used by multiple endpoints)

**Decision:** Use a custom `CacheService` wrapping the existing `RedisService` for fine-grained, service-level caching. The `@nestjs/cache-manager` dependency can be removed to avoid dual-abstraction confusion (see Anti-Patterns).

---

## 4. Sentry Integration: Exception Filter + React ErrorBoundary

**Confidence: HIGH** (official @sentry/nestjs and @sentry/react packages)

### Backend Integration

```
instrument.ts (Sentry.init, loaded FIRST in main.ts)
  |
  |- SentryModule.forRoot() in AppModule
  |- @SentryExceptionCaptured() on AllExceptionsFilter.catch()
  |- @SentryCron() on QuoteExpirationJob
  |- Sentry tags enriched with correlation ID
```

### Integration with Existing Exception Filter

The existing `AllExceptionsFilter` already catches all exceptions and logs them. Sentry integration is additive:

```typescript
// MODIFIED: http-exception.filter.ts
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  // ...existing code unchanged...

  @SentryExceptionCaptured()  // <-- ONE DECORATOR ADDED
  catch(exception: unknown, host: ArgumentsHost) {
    // ...existing logic stays exactly the same...
    // Sentry captures the exception via the decorator automatically
  }
}
```

### Integration with Existing Pino Logger

The correlation ID (see section 5) is attached to Sentry events via a beforeSend hook or tag enrichment in the correlation middleware, linking Sentry errors to log output.

### Frontend Integration

```
instrument.ts (Sentry.init, loaded FIRST in main.tsx)
  |
  |- Sentry.ErrorBoundary wraps App at outermost level
  |- Sentry.reactRouterV7BrowserTracingIntegration for route-level tracing
  |- beforeSend filters out expected HTTP errors (400, 401, 403, 404)
```

### Integration with Existing ErrorBoundary

The existing `ErrorBoundary` component is preserved but wrapped:

```typescript
// MODIFIED: App.tsx -- Sentry ErrorBoundary wraps outer level
import * as Sentry from '@sentry/react';

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<GlobalErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={zhCN}>
          <AntdApp>
            <AppRouter />
          </AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
}
```

The existing `ErrorBoundary` component remains in use for page-level boundaries (wrapping individual routes for graceful degradation), while Sentry's boundary catches anything that escapes.

### New Files

| File | Location | Purpose |
|------|----------|---------|
| instrument.ts | `backend/src/instrument.ts` | Sentry.init for backend |
| instrument.ts | `frontend/src/instrument.ts` | Sentry.init for frontend |

### Environment Variables Added

```
SENTRY_DSN_BACKEND=https://...@sentry.io/...
SENTRY_DSN_FRONTEND=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production|staging|development
```

---

## 5. Request Correlation ID: NestJS Middleware

**Confidence: HIGH** (standard pattern with nestjs-pino genReqId)

### Middleware Placement in Bootstrap Chain

```
Request arrives
  -> helmet()           (security headers)
  -> cookieParser()     (parse cookies)
  -> CorrelationIdMiddleware  <-- NEW, applied in AppModule.configure()
  -> ThrottlerGuard     (rate limiting)
  -> JwtAuthGuard       (per-route)
  -> AuditInterceptor   (per-route, reads correlationId from request)
  -> TransformInterceptor
  -> Controller -> Service -> Response
```

### Integration with Existing nestjs-pino

nestjs-pino uses `pino-http` under the hood, which supports `genReqId` for custom request ID generation. The correlation ID middleware sets the ID on the request object, and pino-http picks it up:

```typescript
// MODIFIED: app.module.ts LoggerModule configuration
LoggerModule.forRoot({
  pinoHttp: {
    genReqId: (req) => req.headers['x-request-id']
      || req.headers['x-correlation-id']
      || randomUUID(),
    // ...existing config (transport, level)...
  },
})
```

### New Components

| Component | Type | Location |
|-----------|------|----------|
| CorrelationIdMiddleware | NestJS Middleware | `src/common/middleware/correlation-id.middleware.ts` |

### What It Does

1. Reads `X-Request-Id` or `X-Correlation-Id` header from incoming request (Nginx can inject `$request_id`)
2. If missing, generates `crypto.randomUUID()`
3. Sets it on `request['correlationId']` and `response.setHeader('X-Request-Id', id)`
4. pino-http picks it up via `genReqId` and includes in all log lines for this request
5. AuditInterceptor reads it for the `requestId` field in audit_logs
6. Sentry reads it for error event tags

### Frontend Integration

The Axios client sends correlation IDs for all requests:

```typescript
// MODIFIED: frontend/src/api/client.ts -- add request interceptor
apiClient.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = crypto.randomUUID();
  return config;
});
```

---

## 6. Data Export: New ExportModule

**Confidence: HIGH** (exceljs v4.4.0 already installed for ImportModule)

### Why a New Module, Not Extending Existing Modules

| Approach | Pros | Cons |
|----------|------|------|
| Add export endpoint to each module | Co-located with entity | Bloats every controller, duplicates Excel logic |
| New ExportModule | Centralized, DRY, single responsibility | Cross-module imports needed |

**Decision: New ExportModule.** Export logic (Excel formatting, column definitions, streaming response) is a cross-cutting concern. Each business module already exports its service, so the ExportModule can inject them.

### Architecture

```
ExportModule
  |- imports: [FabricModule, ProductModule, SupplierModule,
  |            CustomerModule, OrderModule, QuoteModule]
  |- ExportController (/api/v1/export/:entity)
  |- ExportService (orchestrates entity queries + Excel generation)
  |- Entity-specific column configs (column definitions, data transformation)
```

### Endpoint Design

```
GET /api/v1/export/fabrics?keyword=&color=      -> Excel download
GET /api/v1/export/products?category=&keyword=   -> Excel download
GET /api/v1/export/suppliers?keyword=            -> Excel download
GET /api/v1/export/customers?keyword=            -> Excel download
GET /api/v1/export/orders?status=&dateFrom=      -> Excel download
GET /api/v1/export/quotes?status=                -> Excel download
```

### Integration with Existing Services

```typescript
// ExportService injects existing services for data retrieval
@Injectable()
export class ExportService {
  constructor(
    private readonly fabricService: FabricService,
    private readonly orderService: OrderService,
    // ... etc.
  ) {}

  async exportFabrics(query: QueryFabricDto): Promise<Buffer> {
    // Reuse existing service query logic
    const { items } = await this.fabricService.findAll(query);
    return this.generateExcel(items, FABRIC_COLUMNS);
  }
}
```

### New Components

| Component | Type | Location |
|-----------|------|----------|
| ExportModule | Module | `src/export/export.module.ts` |
| ExportController | Controller | `src/export/export.controller.ts` |
| ExportService | Service | `src/export/export.service.ts` |
| Column definitions | Config | `src/export/columns/` (one per entity) |

---

## 7. Nginx Reverse Proxy: Docker Compose Service

**Confidence: HIGH** (standard well-documented pattern)

### How Nginx Fronts the Application

```nginx
# nginx.conf (production)
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    # Gzip compression (Nginx handles, NOT Node.js)
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1024;

    # React SPA -- serve static files, fallback to index.html for client routing
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # index.html -- no caching (so deployments take effect immediately)
    location = /index.html {
        root /usr/share/nginx/html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API proxy to NestJS backend
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;  # Nginx generates correlation ID
    }

    # Health check endpoints (no /api/v1 prefix in NestJS)
    location ~ ^/(health|ready)$ {
        proxy_pass http://backend:3000;
    }

    # File uploads proxy (dev only; prod serves from COS)
    location /uploads/ {
        proxy_pass http://backend:3000;
    }
}
```

### Key Integration Points

| Concern | Nginx Handles | NestJS Handles |
|---------|--------------|----------------|
| SSL termination | YES (Let's Encrypt / Tencent SSL) | NO (plain HTTP internally) |
| Static file serving | YES (React build) | NO (remove useStaticAssets in prod) |
| Gzip compression | YES | NO (do not add compression middleware) |
| Correlation ID | Generates `$request_id` if client doesn't send one | Reads from `X-Request-Id` header |
| Rate limiting | Basic (connection limits) | Application-level (ThrottlerGuard) |
| Security headers | HSTS, X-Frame-Options | CSP via Helmet (can be moved to Nginx) |

### Interaction with Existing Helmet Configuration

In production behind Nginx, Helmet should be simplified to avoid duplicate headers:

```typescript
// main.ts -- MODIFIED: conditional Helmet
if (!isProduction) {
  app.use(helmet({ /* full CSP config for dev */ }));
} else {
  // Nginx handles HSTS, CSP in production
  app.use(helmet({
    contentSecurityPolicy: false,
    hsts: false,
  }));
}
```

---

## 8. CI/CD Deploy Pipeline

**Confidence: MEDIUM** (standard pattern; Tencent Cloud specifics need validation during implementation)

### Pipeline Architecture

```
GitHub Push to main
       |
       v
  [CI Job: Build & Test]      (existing ci.yml, unchanged)
       |
       v (on success, main branch only)
  [CD Job: Build & Deploy]
       |
       |- Build Docker images on server via SSH
       |- docker compose -f docker-compose.prod.yml up -d --build
       |- docker compose exec backend npx prisma migrate deploy
       |
       v
  [Health Check]
       |- curl https://your-domain.com/health
       |- curl https://your-domain.com/ready
```

### Production docker-compose.prod.yml

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    env_file: .env.production
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    build:
      context: .
      dockerfile: nginx/Dockerfile
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/ssl:ro
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  redis_data:
```

**Note:** MySQL is NOT in docker-compose.prod.yml because the project uses Tencent Cloud CDB (managed MySQL). Only Redis runs locally alongside the application.

### Dockerfile Strategy

| Service | Base Image | Multi-stage? | Size Target |
|---------|-----------|--------------|-------------|
| backend | node:22-alpine | YES (build + prod) | ~200MB |
| frontend+nginx | node:22-alpine build -> nginx:alpine serve | YES | ~30MB |

### Database Migration in Deploy

```bash
# Run after backend container starts
docker compose exec backend npx prisma migrate deploy
```

`prisma migrate deploy` only applies pending migrations (no interactive prompts, no schema drift detection). Safe for automated pipelines.

### Interaction with Existing CI

The existing `.github/workflows/ci.yml` runs build/test/lint on push and PRs. The CD pipeline is a separate workflow (or a dependent job) that only triggers on push to main after CI passes.

---

## Component Boundaries Summary

### New Components

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Soft Delete Extension | Auto-filter deletedAt on all queries | PrismaService (internal) |
| AuditInterceptor + @Audited() | Capture who/what/when for mutations | Request context, AuditLogService |
| AuditLogService | Persist audit records async | PrismaService |
| CacheService | Cache-aside pattern for hot queries | RedisService, called by business services |
| CorrelationIdMiddleware | Generate/propagate request trace ID | Request/Response headers, pino |
| ExportModule | Excel export for all entities | Business services, exceljs |
| Sentry instrument.ts (x2) | Error tracking initialization | AllExceptionsFilter, ErrorBoundary |
| Nginx config | Reverse proxy, SSL, static serving | Backend container, static files |
| Dockerfiles (x2) | Containerize backend, frontend+nginx | Docker compose orchestration |
| CD workflow | Automated deploy pipeline | GitHub Actions, SSH, docker compose |

### Modified Components

| Component | Modification | Risk Level |
|-----------|-------------|------------|
| PrismaService | Add `$extends()` for soft delete | LOW -- additive, no API change |
| AllExceptionsFilter | Add `@SentryExceptionCaptured()` decorator | LOW -- one decorator |
| AppModule | Add LoggerModule genReqId, SentryModule, ExportModule | LOW -- additive imports |
| main.ts | Import instrument.ts first, conditional Helmet | LOW |
| schema.prisma | Add deletedAt fields, AuditLog model | MEDIUM -- migration required |
| RedisService | Add `scan` method for pattern-based invalidation | LOW -- additive |
| CommonModule | Register CacheService, AuditLogService | LOW -- additive |
| frontend/App.tsx | Wrap with Sentry.ErrorBoundary | LOW |
| frontend/api/client.ts | Add X-Request-Id header in request interceptor | LOW |

---

## Data Flow Changes

### Before v1.1

```
Browser -> NestJS:3000 -> PrismaService -> MySQL
                       -> RedisService  -> Redis (auth/codes only)
```

### After v1.1

```
Browser -> Nginx:443 -> NestJS:3000 -> CacheService -> RedisService -> Redis (cache + auth)
                                    |                -> PrismaService -> MySQL (CDB)
                                    |                -> AuditLogService -> MySQL (audit_logs)
                                    |
                                    -> Sentry Cloud (errors, performance)
                                    -> Pino logs (with correlation ID) -> stdout -> docker logs
```

---

## Suggested Build Order (Dependency-Based)

```
Phase 1: Foundation (no dependencies between items)
  |- Correlation ID middleware (needed by audit logging + Sentry)
  |- Soft delete migration + extension (schema change, do early)

Phase 2: Observability (depends on Phase 1 correlation ID)
  |- Sentry integration backend + frontend (uses correlation ID)
  |- Audit logging interceptor + service (uses correlation ID)

Phase 3: Features (independent, schema must be stable from Phase 1)
  |- Redis caching layer
  |- Data export module

Phase 4: Containerization (depends on all features being stable)
  |- Backend Dockerfile
  |- Frontend Dockerfile + Nginx config
  |- Production docker-compose
  |- CI/CD deploy pipeline

Phase 5: Production deployment (depends on Phase 4)
  |- Tencent Cloud server setup
  |- COS file migration
  |- Database migration on CDB
  |- SSL certificate
  |- Production UAT
```

### Why This Order

1. **Correlation ID first** because audit logging and Sentry both reference it. Building it first means later features automatically benefit.
2. **Soft delete early** because it requires a schema migration. Running migrations is easier before production deployment is set up (no coordination with live database).
3. **Sentry before containerization** so error tracking is in place before deploy automation (catch deploy-related bugs immediately).
4. **Caching and export are independent** of each other and can be parallelized.
5. **Containerization after all features** because Docker builds are based on stable code.
6. **Production deployment last** because it depends on everything else being ready and tested.

---

## Scalability Considerations

| Concern | At 5 users (current) | At 50 users | At 500 users |
|---------|---------------------|-------------|--------------|
| Caching | Optional, 5min staleTime works | Reduces DB load | Essential, tune TTLs |
| Audit logs | Small table | Index on createdAt | Partition by month, archival |
| Soft delete | No impact | Composite indexes | Archive old soft-deleted records |
| Nginx | Single instance | Single (handles 10K+) | Still single, server is bottleneck |
| Sentry | Free tier | Free tier | May need paid tier |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Global Audit Interceptor
**What:** Applying AuditInterceptor to all routes globally.
**Why bad:** Logs every GET request, floods audit_logs, high I/O cost.
**Instead:** Use `@Audited()` decorator on mutation endpoints only (POST/PUT/PATCH/DELETE).

### Anti-Pattern 2: Caching Order/Quote Data
**What:** Caching time-sensitive business data.
**Why bad:** Stale order status can cause incorrect business decisions.
**Instead:** Only cache reference data (products, suppliers, customers, enums).

### Anti-Pattern 3: Soft Delete Without Index
**What:** Adding `deletedAt` column without indexes.
**Why bad:** Every query now filters on deletedAt; without index, full table scan.
**Instead:** Add `@@index([deletedAt])` to every model with soft delete.

### Anti-Pattern 4: Sentry Capturing Expected Errors
**What:** Sending 404s, validation errors (400), auth failures (401) to Sentry.
**Why bad:** Noise drowns out real errors, wastes Sentry quota.
**Instead:** Configure `beforeSend` to filter out expected HTTP status codes (400, 401, 403, 404).

### Anti-Pattern 5: Running Prisma Migrate Dev in Production
**What:** Using `prisma migrate dev` in production deployment.
**Why bad:** Interactive, creates new migrations, potentially destructive.
**Instead:** Always use `prisma migrate deploy` in production.

### Anti-Pattern 6: Dual Redis Abstraction
**What:** Using both `@nestjs/cache-manager` CacheInterceptor AND custom RedisService for caching.
**Why bad:** Two connection pools, two serialization formats, two failure modes.
**Instead:** Remove `@nestjs/cache-manager` dependency. Extend RedisService with `getJSON<T>()`/`setJSON<T>()` helpers.

### Anti-Pattern 7: Compression in Both Nginx and Node.js
**What:** Enabling `compression` Express middleware when Nginx already compresses.
**Why bad:** Double compression wastes CPU and can corrupt responses.
**Instead:** Compression at Nginx level ONLY.

### Anti-Pattern 8: Logging to Files in Docker
**What:** Writing pino logs to files inside the Docker container.
**Why bad:** Container filesystems are ephemeral. Logs lost on restart.
**Instead:** Log to stdout (default pino behavior). Docker captures stdout automatically.

---

## Sources

- [Prisma Soft Delete with Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions/middleware/soft-delete-middleware) -- official docs
- [prisma-extension-soft-delete](https://github.com/olivierwilkinson/prisma-extension-soft-delete) -- evaluated, not recommended
- [Implementing Soft Deletion in Prisma with Client Extensions](https://matranga.dev/true-soft-deletion-in-prisma-orm/)
- [NestJS Official Sentry Recipe](https://docs.nestjs.com/recipes/sentry)
- [Sentry for NestJS](https://docs.sentry.io/platforms/javascript/guides/nestjs/) -- official SDK docs
- [Sentry React Error Boundary](https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/)
- [@sentry/nestjs npm](https://www.npmjs.com/package/@sentry/nestjs)
- [nestjs-pino with request context](https://github.com/iamolegga/nestjs-pino) -- genReqId for correlation
- [NestJS Caching Documentation](https://docs.nestjs.com/techniques/caching) -- official
- [NestJS Audit System](https://medium.com/@usottah/building-a-comprehensive-audit-system-in-nestjs-and-express-js-b34af8588f58)
- [Nginx Reverse Proxy for NestJS](https://javascript.plainenglish.io/setting-up-nginx-as-a-reverse-proxy-for-your-nest-js-microservices-ea3aa53a0eba)
- [Configure Nginx for Production React SPAs](https://oneuptime.com/blog/post/2026-01-15-configure-nginx-production-react-spa/view)
- [Docker Compose SSH Deployment via GitHub Actions](https://docs.servicestack.net/ssh-docker-compose-deploment)
- [NestJS + exceljs Export](https://medium.com/@ggluopeihai/nestjs-export-excel-file-697e3891ea8f)
