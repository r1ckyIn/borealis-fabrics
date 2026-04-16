# Codebase Structure

**Analysis Date:** 2026-04-16

## Directory Layout

```
borealis-fabrics/                       # Monorepo root
├── backend/                            # NestJS API server
│   ├── src/
│   │   ├── main.ts                     # Bootstrap, middleware, global prefix
│   │   ├── instrument.ts               # Sentry init (imported first)
│   │   ├── app.module.ts               # Root module, global providers
│   │   ├── config/
│   │   │   └── configuration.ts        # Typed config factory (env → object)
│   │   ├── prisma/                     # @Global PrismaModule
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts       # PrismaClient + soft-delete extension + $raw
│   │   ├── common/                     # @Global CommonModule + shared utilities
│   │   │   ├── common.module.ts
│   │   │   ├── constants/
│   │   │   ├── decorators/             # roles.decorator.ts
│   │   │   ├── filters/                # http-exception.filter.ts (AllExceptionsFilter)
│   │   │   ├── guards/                 # roles.guard.ts, (index.ts)
│   │   │   ├── health/                 # health.controller.ts (/health, /ready)
│   │   │   ├── interceptors/           # transform.interceptor.ts, user-cls.interceptor.ts
│   │   │   ├── services/               # redis.service.ts, cache.service.ts, code-generator.service.ts
│   │   │   ├── transforms/             # Request transform helpers
│   │   │   ├── utils/                  # pagination.ts, decimal.ts, admin.ts, product-units.ts
│   │   │   └── validators/             # credit-days.validator.ts, xor-field.validator.ts, etc.
│   │   ├── auth/                       # AuthModule — WeWork OAuth + JWT
│   │   │   ├── auth.controller.ts      # /auth/wework/login, /callback, /me, /logout
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── constants/              # AUTH_COOKIE_NAME, TOKEN_BLACKLIST_PREFIX, cookie options
│   │   │   ├── decorators/             # public.decorator.ts
│   │   │   ├── dto/                    # UserResponseDto, LogoutResponseDto
│   │   │   ├── guards/                 # jwt-auth.guard.ts, optional-jwt-auth.guard.ts
│   │   │   ├── interfaces/             # JwtPayload, RequestUser
│   │   │   └── strategies/             # jwt.strategy.ts (Passport)
│   │   ├── audit/                      # AuditModule — change logging
│   │   │   ├── audit.controller.ts     # GET /audit-logs
│   │   │   ├── audit.interceptor.ts    # Global AuditInterceptor (fire-and-forget)
│   │   │   ├── audit.service.ts
│   │   │   ├── audit.module.ts
│   │   │   ├── decorators/             # audited.decorator.ts (@Audited)
│   │   │   ├── dto/
│   │   │   └── utils/                  # diff.ts (buildChangesDiff)
│   │   ├── metrics/                    # MetricsModule — Prometheus
│   │   │   ├── metrics.controller.ts   # GET /metrics (excluded from api/v1 prefix)
│   │   │   ├── metrics.interceptor.ts  # http_request_duration_seconds histogram
│   │   │   └── metrics.module.ts
│   │   ├── supplier/                   # Business module (representative pattern)
│   │   │   ├── supplier.controller.ts
│   │   │   ├── supplier.service.ts
│   │   │   ├── supplier.module.ts
│   │   │   └── dto/                    # create-supplier.dto.ts, update-supplier.dto.ts, query-supplier.dto.ts
│   │   ├── customer/                   # Same pattern: controller + service + module + dto/
│   │   ├── fabric/                     # Fabric management + image API
│   │   ├── file/
│   │   │   └── storage/                # Local disk storage strategy
│   │   ├── quote/
│   │   │   └── quote.scheduler.ts      # @Cron: hourly quote expiration job
│   │   ├── order/
│   │   │   ├── order-item.service.ts   # Sub-service for order line items
│   │   │   ├── order-payment.service.ts
│   │   │   ├── order.includes.ts       # Shared Prisma include shapes
│   │   │   └── order.validators.ts
│   │   ├── logistics/
│   │   ├── import/
│   │   │   ├── strategies/             # import-strategy.interface.ts + 5 concrete strategies
│   │   │   └── utils/
│   │   ├── export/                     # Excel export (ExportModule)
│   │   ├── product/                    # Product catalog (non-fabric categories)
│   │   ├── system/                     # SystemModule — enum values endpoint
│   │   └── scripts/                    # One-off DB scripts (not deployed)
│   ├── prisma/
│   │   ├── schema.prisma               # Single schema file
│   │   └── migrations/                 # Timestamped migration directories
│   ├── generated/
│   │   └── prisma/                     # Prisma generated client (committed)
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                           # React SPA
│   ├── src/
│   │   ├── main.tsx                    # Entry — renders <App>, imports instrument.ts
│   │   ├── instrument.ts               # Sentry init
│   │   ├── App.tsx                     # QueryClientProvider + ConfigProvider + AppRouter
│   │   ├── index.css                   # Global CSS (minimal — Ant Design handles most)
│   │   ├── api/
│   │   │   ├── client.ts               # axios instance, withCredentials, response unwrap
│   │   │   ├── auth.api.ts
│   │   │   ├── supplier.api.ts
│   │   │   ├── customer.api.ts
│   │   │   ├── fabric.api.ts
│   │   │   ├── product.api.ts
│   │   │   ├── quote.api.ts
│   │   │   ├── order.api.ts
│   │   │   ├── logistics.api.ts
│   │   │   ├── import.api.ts
│   │   │   ├── export.ts
│   │   │   ├── audit.ts
│   │   │   ├── file.api.ts
│   │   │   ├── system.api.ts
│   │   │   └── index.ts
│   │   ├── routes/
│   │   │   ├── index.tsx               # createBrowserRouter — all routes, lazy-loaded
│   │   │   ├── ProtectedRoute.tsx      # Auth guard wrapper (redirects to /login)
│   │   │   ├── FullPageSpinner.tsx     # Suspense fallback
│   │   │   └── layouts/
│   │   │       └── MainLayout.tsx      # Ant Design Layout with sidebar nav
│   │   ├── pages/                      # Feature pages (one directory per domain)
│   │   │   ├── auth/                   # LoginPage, OAuthCallback
│   │   │   ├── suppliers/              # SupplierListPage, SupplierDetailPage, SupplierFormPage
│   │   │   │   └── __tests__/
│   │   │   ├── customers/
│   │   │   │   └── components/         # Domain-specific sub-components
│   │   │   ├── fabrics/
│   │   │   │   └── components/
│   │   │   ├── products/
│   │   │   │   └── components/
│   │   │   ├── quotes/
│   │   │   ├── orders/
│   │   │   │   └── components/
│   │   │   ├── import/
│   │   │   ├── export/
│   │   │   ├── audit/
│   │   │   └── errors/                 # NotFoundPage
│   │   ├── components/
│   │   │   ├── common/                 # Shared: ErrorBoundary, etc.
│   │   │   ├── business/               # Shared business components
│   │   │   ├── forms/                  # Shared form components
│   │   │   └── layout/                 # Shared layout components
│   │   ├── hooks/
│   │   │   ├── queries/                # TanStack Query hooks (useSuppliers, useFabrics, etc.)
│   │   │   ├── useDebounce.ts
│   │   │   ├── usePagination.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── useOrderItemsSection.ts
│   │   ├── store/
│   │   │   ├── authStore.ts            # Zustand: user | null (NO token)
│   │   │   ├── enumStore.ts            # Zustand: reference/enum data
│   │   │   ├── uiStore.ts              # Zustand: sidebar collapsed state
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── api.types.ts            # ApiResponse, ApiError, PaginatedResponse
│   │   │   ├── entities.types.ts       # Domain entity types
│   │   │   ├── enums.types.ts
│   │   │   ├── forms.types.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── constants.ts            # API_BASE_URL='/api/v1', routes, storage keys
│   │   │   ├── format.ts               # Date, currency, number formatters
│   │   │   ├── statusHelpers.ts        # Status label/color helpers
│   │   │   ├── validation.ts
│   │   │   ├── logger.ts
│   │   │   ├── errorMessages.ts
│   │   │   ├── parseEntityId.ts
│   │   │   └── product-constants.ts
│   │   ├── styles/                     # Additional CSS/theme overrides
│   │   └── test/
│   │       ├── mocks/                  # MSW handlers, mock data factories
│   │       ├── integration/            # Integration test suites
│   │       └── __tests__/              # Test utilities
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.app.json
│   └── package.json
│
├── nginx/                              # Nginx configuration
│   ├── nginx.conf                      # Worker config, gzip, include conf.d/*.conf
│   └── conf.d/
│       └── default.conf                # HTTP→HTTPS redirect, HTTPS server, /api/ proxy, SPA routing
│
├── grafana/
│   └── provisioning/
│       ├── dashboards/                 # Pre-built dashboard JSON
│       └── datasources/               # Loki + Prometheus datasource YAML
│
├── prometheus/
│   └── prometheus.yml                  # Scrape config (target: host.docker.internal:3000/metrics)
│
├── loki/
│   └── loki-config.yml                 # Loki storage + retention config
│
├── scripts/                            # One-off maintenance scripts (TypeScript)
│   ├── backup/                         # DB backup scripts
│   └── *.ts                            # Import test, price prep, debug scripts
│
├── tests/
│   └── load/                           # k6 load test scripts
│
├── deploy/
│   ├── deploy.sh                       # Production deploy script
│   └── rollback.sh                     # Production rollback script
│
├── docs/                               # Project documentation
│   ├── ARCHITECTURE.md
│   ├── DEPLOY.md
│   ├── SECURITY.md
│   ├── OPERATION_GUIDE.md
│   ├── adr/                            # Architecture Decision Records
│   ├── design/                         # Frontend design docs
│   ├── plans/                          # Historical planning docs
│   ├── project/                        # Project overview docs
│   └── reference/                      # backend-types-reference.md, etc.
│
├── .github/
│   └── workflows/
│       └── ci.yml                      # GitHub Actions CI
│
├── docker-compose.prod.yml             # Business stack: nestjs + redis + nginx
├── docker-compose.monitoring.yml       # Monitoring stack: loki + prometheus + grafana
└── audit-ci.jsonc                      # npm audit CI policy
```

## Directory Purposes

**`backend/src/<module>/`:**
- Purpose: One directory per business domain; contains controller, service, module, and `dto/` subdirectory
- Key files: `<module>.module.ts` (NestJS module), `<module>.controller.ts` (routes), `<module>.service.ts` (logic)
- Exceptions: `order/` has additional sub-services (`order-item.service.ts`, `order-payment.service.ts`); `import/` has a `strategies/` subdirectory

**`backend/src/common/`:**
- Purpose: @Global shared module — services, guards, interceptors, filters, utilities used across all modules
- Key files: `services/redis.service.ts`, `services/cache.service.ts`, `services/code-generator.service.ts`, `filters/http-exception.filter.ts`, `interceptors/transform.interceptor.ts`, `interceptors/user-cls.interceptor.ts`, `guards/roles.guard.ts`, `utils/pagination.ts`

**`backend/prisma/`:**
- Purpose: Database schema and migration history
- Key files: `schema.prisma` (single source of truth for DB structure)
- Never edit `migrations/` manually; use `npx prisma migrate dev --name <name>`

**`frontend/src/api/`:**
- Purpose: One file per backend module containing typed API call functions using `apiClient`
- Pattern: `get<ResponseType>('/suppliers', params)` → returns unwrapped `data` from `ApiResponse`

**`frontend/src/hooks/queries/`:**
- Purpose: TanStack Query hooks that wrap API calls for server state management
- Pattern: `useSuppliers(params)` → `useQuery({ queryKey: [...], queryFn: () => supplierApi.list(params) })`

**`frontend/src/pages/<domain>/`:**
- Purpose: Feature pages (List, Detail, Form pattern per domain); domain-specific sub-components in `components/` subdirectory; tests in `__tests__/`

**`frontend/src/store/`:**
- Purpose: Client-only state (not server data); authStore stores user object only — token is in HttpOnly cookie and NOT accessible from JS

## Key File Locations

**Entry Points:**
- `backend/src/main.ts`: NestJS bootstrap, global middleware, port 3000
- `backend/src/instrument.ts`: Sentry init (must be first import)
- `frontend/src/main.tsx`: React render root
- `frontend/src/App.tsx`: Provider tree
- `frontend/src/routes/index.tsx`: All route definitions

**Configuration:**
- `backend/src/config/configuration.ts`: Typed env var mapping
- `frontend/src/utils/constants.ts`: `API_BASE_URL = '/api/v1'`, routes, storage keys
- `frontend/vite.config.ts`: Build config, path aliases (`@/` → `src/`)
- `nginx/conf.d/default.conf`: SSL config, API proxy, SPA routing

**Core Business Logic:**
- `backend/src/prisma/prisma.service.ts`: PrismaService with soft-delete extension
- `backend/src/auth/guards/jwt-auth.guard.ts`: Primary auth guard
- `backend/src/audit/audit.interceptor.ts`: Global audit logging
- `backend/src/common/interceptors/transform.interceptor.ts`: Response envelope
- `backend/src/common/utils/pagination.ts`: Shared pagination utilities
- `backend/src/common/services/code-generator.service.ts`: BF-YYMM-NNNN code generation

**Testing:**
- Backend unit tests: co-located `<module>.service.spec.ts`, `<module>.controller.spec.ts`
- Backend E2E tests: `backend/src/**/*.e2e-spec.ts` (run with `pnpm test:e2e`)
- Frontend unit tests: co-located `__tests__/` inside each feature directory
- Frontend integration tests: `frontend/src/test/integration/`
- Load tests: `tests/load/` (k6)

**Infrastructure:**
- `docker-compose.prod.yml`: Business stack (nestjs + redis + nginx)
- `docker-compose.monitoring.yml`: Observability stack (loki + prometheus + grafana)
- `deploy/deploy.sh`: Pull latest, rebuild, restart containers
- `deploy/rollback.sh`: Revert to previous image

## Naming Conventions

**Backend Files:**
- Modules: `<name>.module.ts` (e.g., `supplier.module.ts`)
- Controllers: `<name>.controller.ts`
- Services: `<name>.service.ts`
- DTOs: `<action>-<name>.dto.ts` (e.g., `create-supplier.dto.ts`, `query-supplier.dto.ts`)
- Tests: `<name>.<type>.spec.ts` (e.g., `supplier.service.spec.ts`, `jwt-auth.guard.spec.ts`)
- Guards: `<name>.guard.ts`
- Interceptors: `<name>.interceptor.ts`
- Decorators: `<name>.decorator.ts`
- All backend files: kebab-case

**Frontend Files:**
- Pages: `PascalCase.tsx` (e.g., `SupplierListPage.tsx`, `SupplierFormPage.tsx`)
- Components: `PascalCase.tsx` (e.g., `ErrorBoundary.tsx`, `MainLayout.tsx`)
- Hooks: `use<Name>.ts` (e.g., `useSuppliers.ts`, `usePagination.ts`)
- API modules: `<name>.api.ts` (e.g., `supplier.api.ts`)
- Type files: `<name>.types.ts` (e.g., `entities.types.ts`)
- Store files: `<name>Store.ts` (e.g., `authStore.ts`)
- Utilities: camelCase `.ts` (e.g., `statusHelpers.ts`, `format.ts`)

**Variables and Classes:**
- Classes/interfaces/types: PascalCase (e.g., `SupplierService`, `CreateSupplierDto`)
- Methods/variables: camelCase (e.g., `findById`, `companyName`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_PAGE_SIZE`, `AUTH_COOKIE_NAME`)
- Enum values: SCREAMING_SNAKE_CASE (e.g., `OrderStatus.PENDING`)
- React component functions: PascalCase

**Business Codes:**
- Format: `BF-YYMM-NNNN` (4-digit sequential number, Redis INCR + DB UNIQUE constraint fallback)
- Quotes: `QT-YYMM-NNNN`
- Orders: `ORD-YYMM-NNNN` (per `frontend/src/utils/constants.ts` CODE_PATTERNS)

## Where to Add New Code

**New Backend Business Module:**
1. Create `backend/src/<module>/` directory
2. Files: `<module>.module.ts`, `<module>.controller.ts`, `<module>.service.ts`, `dto/` subdirectory
3. Register in `backend/src/app.module.ts` imports array
4. Add DTOs: `create-<module>.dto.ts`, `update-<module>.dto.ts`, `query-<module>.dto.ts`
5. Tests: co-located `<module>.service.spec.ts`, `<module>.controller.spec.ts`
6. Add `@Audited()` to all CUD controller methods

**New Frontend Feature Page:**
1. Create `frontend/src/pages/<domain>/` directory with `<Domain>ListPage.tsx`, `<Domain>DetailPage.tsx`, `<Domain>FormPage.tsx`
2. Add API functions to `frontend/src/api/<domain>.api.ts`
3. Add TanStack Query hooks to `frontend/src/hooks/queries/use<Domain>s.ts`
4. Add entity types to `frontend/src/types/entities.types.ts`
5. Register routes in `frontend/src/routes/index.tsx` (use `lazy()` import)
6. Add tests to `frontend/src/pages/<domain>/__tests__/`

**New Shared Backend Utility:**
- Shared services (Redis, Cache, CodeGen): `backend/src/common/services/`
- Request/pagination utils: `backend/src/common/utils/`
- Custom validators: `backend/src/common/validators/`
- New global interceptor: `backend/src/common/interceptors/` + register as `APP_INTERCEPTOR` in `app.module.ts`

**New Frontend Shared Component:**
- Business-domain agnostic: `frontend/src/components/common/`
- Business-domain shared: `frontend/src/components/business/`
- Shared form component: `frontend/src/components/forms/`
- Reusable hook: `frontend/src/hooks/`

**New Environment Variable:**
- Backend: add to `backend/src/config/configuration.ts` typed factory
- Frontend: prefix with `VITE_` (accessed via `import.meta.env.VITE_*`)
- Document in `backend/.env.example` (never commit `.env`)

## Special Directories

**`backend/generated/prisma/`:**
- Purpose: Prisma-generated TypeScript client
- Generated: Yes (via `npx prisma generate`)
- Committed: Yes (avoids build-time generation in Docker)

**`backend/prisma/migrations/`:**
- Purpose: Migration SQL history
- Generated: Yes (via `npx prisma migrate dev`)
- Committed: Yes (required for `migrate deploy` in CI/prod)

**`frontend/dist/`:**
- Purpose: Vite production build output; served by Nginx
- Generated: Yes (via `pnpm build`)
- Committed: No

**`nginx/conf.d/default.conf`:**
- Purpose: Active nginx server config; `<DOMAIN>` placeholder must be replaced before deployment
- Note: Let's Encrypt cert path uses actual domain; OCSP stapling intentionally omitted (Let's Encrypt ended OCSP Aug 2025)

**`grafana/provisioning/`:**
- Purpose: Auto-provision Grafana datasources (Loki + Prometheus) and dashboards on container start
- Generated: No (hand-authored)
- Committed: Yes

**`scripts/`:**
- Purpose: One-off operational scripts (data import testing, price list preparation, debug)
- Generated: No
- Committed: Yes (for auditability); NOT deployed to production container

---

*Structure analysis: 2026-04-16*
