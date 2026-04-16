# External Integrations

**Analysis Date:** 2026-04-16

## APIs & External Services

**WeChat Work (企业微信) OAuth:**
- Purpose: Employee SSO — only auth method in production (dev login was removed in Phase 17)
- Flow: redirect-based OAuth 2.0 via `https://open.weixin.qq.com/connect/oauth2/authorize`
- Token exchange: `https://qyapi.weixin.qq.com/cgi-bin/gettoken`
- User info: `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo` + `https://qyapi.weixin.qq.com/cgi-bin/user/get`
- Implementation: `backend/src/auth/auth.service.ts` (custom fetch-based, no SDK)
- Auth controller: `backend/src/auth/auth.controller.ts`
  - `GET /api/v1/auth/wework/login` — redirects to WeWork authorization page
  - `GET /api/v1/auth/wework/callback` — exchanges code for JWT, sets HttpOnly cookie
  - `POST /api/v1/auth/logout` — clears cookie, blacklists token in Redis
- CSRF protection: random state stored in Redis (`oauth:state:{state}` key, TTL controlled by `OAUTH_STATE_TTL`)
- Required env vars: `WEWORK_CORP_ID`, `WEWORK_SECRET`, `WEWORK_AGENT_ID`, `WEWORK_REDIRECT_URI`

**Sentry Error Tracking:**
- Backend: `@sentry/nestjs` 10, initialized in `backend/src/instrument.ts` (imported before app bootstrap)
- Frontend: `@sentry/react` 10
- Configuration: `SENTRY_DSN` env var — SDK disabled entirely if unset
- Filtering: 400/401/403/404 errors are not reported; PII (email, phone) scrubbed from events
- Trace sample rate: 20% in production, 100% in development

## Data Storage

**Primary Database — MySQL 8.0:**
- Provider: Tencent Cloud CDB (managed MySQL, external to Docker Compose)
- Connection: `DATABASE_URL` env var
- ORM: Prisma 6.19 (`backend/prisma/schema.prisma`)
- Migrations: `npx prisma migrate deploy` (production), `npx prisma migrate dev` (development)
- Slow query logging: queries exceeding `SLOW_QUERY_THRESHOLD_MS` (default 200ms) logged via nestjs-pino
- Soft-delete: `deletedAt` field on User, Fabric, Supplier, Customer, Product, ProductBundle via `prisma-extension-soft-delete`
- Raw client: `prisma.$raw` (bypasses soft-delete extension for admin queries)

**Cache / Session — Redis 7:**
- Deployment: `redis:7-alpine` container in `docker-compose.prod.yml` (128MB, allkeys-lru)
- Connection: `REDIS_URL` env var, client in `backend/src/common/services/redis.service.ts`
- Client library: `ioredis` 5 (graceful degradation when unavailable)
- Key namespaces:
  - `seq:{CodePrefix}:{YYMM}` — atomic sequence counters for business code generation
  - `oauth:state:{state}` — OAuth CSRF state tokens (short TTL)
  - `token:blacklist:{hash}` — logout token blacklist (TTL = remaining JWT lifetime)
  - `cache:{key}` — cache-aside pattern via `backend/src/common/services/cache.service.ts`
- Business code format: `{PREFIX}-{YYMM}-{4-digit seq}`, e.g. `QT-2601-0042`
- Fallback: DB-based sequence count when Redis unavailable (with `UNIQUE` constraint safety net)

**File Storage — Tencent Cloud COS:**
- SDK: `cos-nodejs-sdk-v5` 2 (`backend/src/file/storage/cos.storage.ts`)
- Required env vars: `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`
- Upload size limit: 10MB (enforced by Nginx `client_max_body_size 10m`)
- Allowed extensions: defined in `backend/src/common/constants/file.constants.ts`
- Filename sanitization: path traversal, null bytes, special chars stripped in `backend/src/file/file.service.ts`
- Storage provider interface: `backend/src/file/storage/storage.interface.ts`
- Local provider (dev): `backend/src/file/storage/local.storage.ts` (serves from `/uploads/` static path)
- Provider injection token: `STORAGE_PROVIDER` in `backend/src/file/storage/index.ts`

## Authentication & Identity

**Auth Provider: WeChat Work (企业微信) OAuth 2.0**
- No third-party auth library (passport-oauth2 is a devDependency but the flow uses raw fetch)
- JWT signed with `JWT_SECRET` (min 32 chars in production), default expiry `7d`
- Token delivery: HttpOnly cookie named `AUTH_COOKIE_NAME` (defined in `backend/src/auth/constants/`)
- `secure` flag: controlled by `FORCE_HTTPS_COOKIES=true` env var (required in production after SSL)
- Frontend storage: JWT NOT in localStorage; `authStore` (`frontend/src/store/authStore.ts`) stores only the user object (persisted to `localStorage` key `bf_auth` for UI state only)
- Axios client: `withCredentials: true` so cookies are sent automatically (`frontend/src/api/client.ts`)
- Token blacklisting: on logout, remaining TTL stored in Redis under `token:blacklist:{sha256(token)}`
- Admin role: determined by `BOSS_WEWORK_IDS` and `DEV_WEWORK_IDS` env vars (comma-separated WeWork user IDs)
- JWT strategy: `backend/src/auth/strategies/jwt.strategy.ts` (reads from both `Authorization: Bearer` header and cookie)

## Monitoring & Observability

**Metrics — Prometheus + Grafana:**
- Metrics endpoint: `GET /metrics` (excluded from `api/v1` prefix, no auth)
- Provider: `@willsoto/nestjs-prometheus` 6 + `prom-client` 15 — `backend/src/metrics/metrics.module.ts`
- Custom histogram: `http_request_duration_seconds` with `method`, `route`, `status` labels
- Default Node.js metrics enabled (GC, event loop, memory)
- Prometheus scrape config: `prometheus/prometheus.yml` (scrapes `nestjs:3000` every 15s)
- Grafana: port 3001 (mapped from internal 3000), provisioned datasources in `grafana/provisioning/datasources/datasources.yml`
  - Prometheus datasource: `http://prometheus:9090` (default)
  - Loki datasource: `http://loki:3100`
- Admin password: `GRAFANA_ADMIN_PASSWORD` env var

**Logs — Loki:**
- Version: Loki 3.4.3, config in `loki/loki-config.yml`
- Push transport: `pino-loki` 3 — batch push every 5s when `LOKI_HOST` env var is set
- Labels: `{ app: 'borealis-backend' }`
- Storage: filesystem (`/loki/chunks`), TSDB schema v13
- `unordered_writes: true` to handle batched out-of-order log lines from pino-loki
- Loki port: 3100

**Error Tracking — Sentry:**
- Initialized before NestJS bootstrap in `backend/src/instrument.ts`
- DSN via `SENTRY_DSN` env var (optional, graceful no-op if absent)

**Health Checks:**
- `GET /health` — app liveness (always returns `up`)
- `GET /ready` — readiness: checks MySQL (`SELECT 1`) + Redis (`PING`) via `@nestjs/terminus`
- Both endpoints excluded from `api/v1` global prefix

**Correlation IDs:**
- `nestjs-cls` + `ClsModule` generates `X-Correlation-ID` per request (UUID or from request header)
- Bound to pino logger so all log lines for a request share the same correlation ID

## SSL/Domain

**Certificate Authority:** Let's Encrypt (certbot webroot challenge)
- Certificate path: `/etc/letsencrypt/live/<DOMAIN>/fullchain.pem` and `privkey.pem`
- Mounted into Nginx container from host `/etc/letsencrypt`
- ACME challenge served from `certbot-webroot` Docker volume at `/.well-known/acme-challenge/`
- TLS protocols: TLSv1.2 + TLSv1.3 (Mozilla Intermediate profile)
- OCSP stapling explicitly NOT configured (Let's Encrypt ended OCSP support Aug 2025)
- Nginx config: `nginx/conf.d/default.conf`

**Nginx Routing:**
- Port 80: redirects all traffic to HTTPS (`301`)
- Port 80 (default_server): IP direct access redirects to domain
- Port 443: HTTPS main server
  - `/` — serves React SPA static files from `/usr/share/nginx/html` (frontend build)
  - `/api/` — proxied to `nestjs:3000` (backend)
  - `/(health|ready|metrics)` — proxied to backend (no `/api/v1` prefix)
  - Static assets (`*.js`, `*.css`, etc.) — 1-year cache with `immutable`
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- HSTS: configured in NestJS `helmet` (1 year, includeSubDomains) — Nginx HSTS header commented out pending testing

**Docker Network:**
- Business stack: `borealis-fabrics_default` (created by `docker-compose.prod.yml`)
- Monitoring stack: uses `external: true` network `borealis-fabrics_default` (same network as business stack, enabling Prometheus to scrape `nestjs:3000` by service name)

## CI/CD & Deployment

**Hosting:** Tencent Cloud 轻量服务器 (manual SSH deployment)

**CI Pipeline:** GitHub Actions — `.github/workflows/ci.yml`
- Runs on push to `main`/`develop` and PR to `main`
- No automated deployment step — deployment is manual

**Deployment Commands:**
```bash
# Business stack
docker compose -f docker-compose.prod.yml up -d

# Monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

## Webhooks & Callbacks

**Incoming:**
- `GET /api/v1/auth/wework/callback` — WeChat Work OAuth redirect callback (receives `code` + `state` query params)

**Outgoing:**
- None detected

## Scheduled Jobs

**QuoteExpirationJob:**
- Runs hourly via `@nestjs/schedule` (cron)
- Marks expired quotes (`status → expired`)
- Implementation: `backend/src/quote/` module

---

*Integration audit: 2026-04-16*
