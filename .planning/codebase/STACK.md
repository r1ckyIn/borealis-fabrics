# Technology Stack

**Analysis Date:** 2026-04-16

## Languages

**Primary:**
- TypeScript 5.7.x (backend strict mode, `ES2023` target) — `backend/tsconfig.json`
- TypeScript 5.9.x (frontend strict mode, `ES2022` target) — `frontend/tsconfig.app.json`

**Secondary:**
- SQL (MySQL 8.0 via Prisma migrations) — `backend/prisma/schema.prisma`

## Runtime

**Environment:**
- Node.js 22 (slim Docker image in production, enforced in CI via `actions/setup-node`)
- Docker-based deployment via `docker-compose.prod.yml`

**Package Manager:**
- pnpm 10 (both workspaces use separate `pnpm-lock.yaml`)
- Lockfiles: `backend/pnpm-lock.yaml`, `frontend/pnpm-lock.yaml` — both committed

## Monorepo Layout

```
borealis-fabrics/          # Project root (no workspace-level package.json)
├── backend/               # NestJS application
│   ├── src/               # TypeScript source
│   ├── prisma/            # Schema + migrations
│   ├── test/              # E2E tests (jest-e2e.json)
│   ├── package.json
│   └── Dockerfile
├── frontend/              # React + Vite application
│   ├── src/               # TypeScript source
│   ├── package.json
│   └── vite.config.ts
├── nginx/                 # Nginx config (SSL termination + reverse proxy)
├── prometheus/            # Prometheus scrape config
├── loki/                  # Loki config (log aggregation)
├── grafana/               # Grafana provisioning (datasources + dashboards)
├── scripts/               # Ad-hoc data scripts (TypeScript, standalone)
├── deploy/                # Deployment helpers
├── docker-compose.prod.yml
├── docker-compose.monitoring.yml
└── .github/workflows/ci.yml
```

## Frameworks

**Backend Core:**
- NestJS 11 — modular monolith framework — `backend/src/app.module.ts`
- `@nestjs/platform-express` 11 — Express adapter
- `@nestjs/config` 4 — ConfigModule with validation in `backend/src/config/configuration.ts`
- `@nestjs/schedule` 6 — cron jobs (QuoteExpirationJob)
- `@nestjs/swagger` 11 — OpenAPI docs at `/api/docs` (non-production only)
- `@nestjs/terminus` 11 — health check endpoints (`/health`, `/ready`)
- `@nestjs/throttler` 6 — rate limiting (60 req/min global, 5 req/min on auth endpoints)
- `nestjs-cls` 6 — request-scoped correlation ID (X-Correlation-ID header)
- `nestjs-pino` 4 — structured logging

**Backend Auth:**
- `@nestjs/jwt` 11 + `@nestjs/passport` 11 + `passport-jwt` 4
- JWT stored in HttpOnly cookie (set by `cookie-parser` 1.4.7)
- WeChat Work (企业微信) OAuth 2.0 — custom implementation in `backend/src/auth/auth.service.ts`
- Token blacklisting via Redis on logout
- No dev login bypass exists in production

**Backend ORM/DB:**
- Prisma 6.19 — ORM and migration tool — `backend/prisma/schema.prisma`
- `prisma-extension-soft-delete` 2 — soft-delete extension (deletedAt field)
- MySQL 8.0 provider

**Backend Observability:**
- `pino-loki` 3 — pushes logs to Loki when `LOKI_HOST` env var is set
- `pino-pretty` 13 — colorized console output in non-production
- `@willsoto/nestjs-prometheus` 6 + `prom-client` 15 — `/metrics` endpoint
- `@sentry/nestjs` 10 — error tracking initialized in `backend/src/instrument.ts`

**Backend Other:**
- `exceljs` 4 — Excel import/export
- `multer` 2 — file upload (10MB limit via Nginx)
- `helmet` 8 — security headers (CSP, HSTS)
- `ioredis` 5 — Redis client wrapper in `backend/src/common/services/redis.service.ts`
- `@nestjs/cache-manager` 3 + `cache-manager` 7 — NestJS cache abstraction
- `cos-nodejs-sdk-v5` 2 — Tencent Cloud COS object storage client

**Frontend Core:**
- React 18.3 + React DOM 18.3 — `frontend/src/`
- Vite 7 — build tool, dev server (port 5173), HMR — `frontend/vite.config.ts`
- `@vitejs/plugin-react` 5 — React refresh plugin

**Frontend UI:**
- antd 6.2 (Ant Design) — primary UI component library
- `@ant-design/icons` 6 — icon set
- `react-router-dom` 7 — client-side routing (SPA mode)

**Frontend Data & State:**
- `@tanstack/react-query` 5 — server state / data fetching
- `zustand` 5 + `persist` middleware — client state (`frontend/src/store/authStore.ts`)
- `axios` 1 — HTTP client with interceptors (`frontend/src/api/client.ts`)

**Frontend Utilities:**
- `dayjs` 1 — date handling
- `web-vitals` 5 — performance metrics
- `@sentry/react` 10 — frontend error tracking

**Testing:**
- Backend: Jest 30 + ts-jest 29 + SuperTest 7 (`backend/package.json` jest config)
- Backend E2E: Jest with `backend/test/jest-e2e.json`
- Frontend: Vitest 4 + jsdom 27 + @testing-library/react 16 + @testing-library/user-event 14

**Build/Dev Tools:**
- ESLint 9 + typescript-eslint 8 + eslint-config-prettier — both workspaces
- Prettier 3 — both workspaces
- `@nestjs/cli` 11 — `nest build` command for backend

## Key Dependencies

**Critical Runtime:**
- `@prisma/client` 6.19 — database access layer
- `ioredis` 5 — Redis for token blacklisting, OAuth state, code generation, caching
- `cos-nodejs-sdk-v5` 2 — file storage in production via `backend/src/file/storage/cos.storage.ts`
- `@sentry/nestjs` 10 / `@sentry/react` 10 — production error tracking
- `pino-loki` 3 — production log shipping to Loki

**Storage Strategy:**
- Local storage provider: `backend/src/file/storage/local.storage.ts` (dev)
- COS storage provider: `backend/src/file/storage/cos.storage.ts` (prod)
- Provider injected via `STORAGE_PROVIDER` token in `backend/src/file/storage/index.ts`

## Configuration

**Environment Variables (backend — required in production):**
- `DATABASE_URL` — MySQL CDB connection string
- `REDIS_URL` — Redis connection (defaults to `redis://localhost:6379`)
- `REDIS_PASSWORD` — optional
- `JWT_SECRET` — min 32 chars in production
- `JWT_EXPIRES_IN` — defaults to `7d`
- `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION` — Tencent COS
- `CORS_ORIGINS` — comma-separated allowed origins
- `FORCE_HTTPS_COOKIES=true` — enables `secure` flag on JWT HttpOnly cookie (required after SSL)
- `WEWORK_CORP_ID`, `WEWORK_SECRET`, `WEWORK_AGENT_ID`, `WEWORK_REDIRECT_URI` — WeChat Work OAuth
- `SENTRY_DSN` — Sentry error tracking (optional, SDK disabled if unset)
- `LOKI_HOST` — Loki push URL e.g. `http://localhost:3100` (optional, enables log shipping)
- `SLOW_QUERY_THRESHOLD_MS` — defaults to `200`ms
- `BOSS_WEWORK_IDS`, `DEV_WEWORK_IDS` — comma-separated admin WeWork IDs
- `GRAFANA_ADMIN_PASSWORD` — Grafana admin password (monitoring stack only)
- `NODE_ENV` — `production` triggers strict validation in `backend/src/config/configuration.ts`

**Config files:**
- `backend/src/config/configuration.ts` — main config loader with production validation
- `backend/prisma/schema.prisma` — database schema (MySQL 8.0)
- `backend/tsconfig.json` — strict TypeScript (target ES2023, nodenext modules)
- `frontend/tsconfig.app.json` — strict TypeScript (target ES2022, bundler modules)
- `frontend/vite.config.ts` — Vite config (port 5173, `/api` proxy to localhost:3000, path alias `@/`)
- `audit-ci.jsonc` — security audit allowlist for `audit-ci@^7`

## Platform Requirements

**Development:**
- Node.js 22, pnpm 10
- Docker + Docker Compose (for local MySQL/Redis)
- Backend dev server: `pnpm start:dev` (port 3000, watch mode)
- Frontend dev server: `pnpm dev` (port 5173, proxies `/api` to backend at localhost:3000)

**Production:**
- Tencent Cloud 轻量服务器
- MySQL 8.0 via Tencent CDB (external, not in Docker Compose)
- Redis 7-alpine container (128MB max memory, allkeys-lru policy)
- NestJS container (768MB memory limit)
- Nginx 1.27-alpine (HTTPS termination, static file serving, API reverse proxy)
- Monitoring stack (separate compose): Loki 3.4.3, Prometheus latest, Grafana latest
- Business stack and monitoring stack share `borealis-fabrics_default` Docker network

## CI/CD

**Pipeline:** GitHub Actions — `.github/workflows/ci.yml`
- Triggers: push to `main`/`develop`, PR to `main`
- Backend job: lint → typecheck (`tsc --noEmit`) → unit tests → build
- Frontend job: lint → typecheck → unit tests → build
- Security job: `audit-ci@^7` with allowlist (non-blocking, `continue-on-error: true`)
- Node.js 22, pnpm 10 in all jobs
- No automated deployment (manual Docker Compose deploy on server)

---

*Stack analysis: 2026-04-16*
