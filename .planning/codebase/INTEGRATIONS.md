# External Integrations

**Analysis Date:** 2026-03-17

## APIs & External Services

**Authentication & Identity:**
- WeChat Work (WeWork) OAuth2.0 - Enterprise SSO
  - SDK/Client: Native HTTPS requests (no SDK)
  - Auth: `WEWORK_CORP_ID`, `WEWORK_AGENT_ID`, `WEWORK_SECRET`, `WEWORK_REDIRECT_URI`
  - Flow: Authorization code → user info retrieval → JWT token issuance
  - Implementation: `backend/src/auth/auth.service.ts` (lines 46-80, handles OAuth URL building)
  - Endpoint: `https://open.weixin.qq.com/connect/oauth2/authorize`
  - Callback: `/api/v1/auth/wework/callback`

## Data Storage

**Databases:**
- MySQL 8.0
  - Connection: `DATABASE_URL` env var (e.g., `mysql://user:password@localhost:3306/borealis`)
  - Client: Prisma ORM 6.19.2
  - Schema: `backend/prisma/schema.prisma` (387 lines, 14 main models)
  - Models: User, Fabric, FabricImage, File, Supplier, Customer, Order, OrderItem, Quote, Logistics, SupplierPayment, PaymentRecord, OrderTimeline, CustomerPricing, FabricSupplier

**Caching:**
- Redis 7-alpine
  - Connection: `REDIS_URL` env var
  - Client: ioredis 5.9.2
  - Service: `backend/src/common/services/redis.service.ts` (graceful fallback support)
  - Use cases:
    - OAuth state token storage (15-minute TTL)
    - Token blacklist management
    - Session caching
    - Rate limiting counters
  - Fallback: Gracefully degrades if Redis unavailable (logs warnings but continues)

**File Storage:**
- MVP: Local filesystem (development/MVP only)
  - Directory: `./uploads` (configurable via `UPLOAD_DIR`)
  - Implementation: `backend/src/file/file.service.ts`
  - Security: File path traversal protection, filename sanitization, extension whitelist
  - URL generation: `{BASE_URL}/uploads/{uuid}.{ext}`

- Production: Tencent Cloud COS (planned, not yet implemented)
  - Bucket: `COS_BUCKET` env var (format: `bucket-name-appid`)
  - Region: `COS_REGION` (default: ap-shanghai)
  - Auth: `COS_SECRET_ID`, `COS_SECRET_KEY`
  - Note: TODO comment in `backend/src/file/file.service.ts` (line 138) indicates replacement needed

## Authentication & Identity

**Auth Provider:**
- Custom: WeChat Work OAuth2.0 + JWT
  - Implementation: NestJS Passport with JWT strategy
  - Module: `backend/src/auth/auth.module.ts`
  - Service: `backend/src/auth/auth.service.ts`
  - Strategy: `backend/src/auth/strategies/jwt.strategy.ts`
  - Guard: `backend/src/auth/guards/jwt-auth.guard.ts`

**Token Storage (Frontend):**
- HttpOnly Cookies (secure, not accessible from JavaScript)
  - Backend: Sets cookie via `Set-Cookie` header
  - Frontend: Automatic cookie transmission via `axios` with `withCredentials: true`
  - Implementation: `frontend/src/api/client.ts` (line 23)
  - Frontend state: Only stores `user` object in `authStore` (Zustand), not the token

**Logout & Token Blacklist:**
- Redis-based token blacklist
- Implementation: `backend/src/auth/auth.service.ts`
- Prefix: `TOKEN_BLACKLIST_PREFIX` constant

## Monitoring & Observability

**Error Tracking:**
- Not detected (no error tracking service like Sentry)

**Logs:**
- Structured logging with Pino
  - Implementation: nestjs-pino 4.5.0
  - Format: JSON in production, pretty-printed in development
  - Level: `info` in production, `debug` in development
  - Module: `backend/src/app.module.ts` (lines 35-44)
  - Log levels: Error, warn, info, debug
  - HTTP logging: pino-http integrated

**Health Checks:**
- NestJS Terminus module
  - Endpoint: `/health` (excluded from `/api/v1` prefix)
  - Also exposed: `/ready` endpoint
  - Module: `backend/src/common/health/health.controller.ts`

## CI/CD & Deployment

**Hosting:**
- Tencent Cloud (target platform)
  - Lightweight Server (backend)
  - CDB (MySQL database)
  - Redis
  - COS (object storage for files)
  - CDN (likely for frontend)

**CI Pipeline:**
- Not detected in codebase (no GitHub Actions, GitLab CI, etc.)

**Local Development:**
- Docker Compose: `backend/docker-compose.yml`
  - MySQL 8.0 service
  - Redis 7-alpine service
  - Volume: `mysql_data` for persistence

## Environment Configuration

**Required env vars (Production):**
From `backend/.env.production.example`:
- `NODE_ENV="production"`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET` (minimum 32 characters, not "dev-secret")
- `JWT_EXPIRES_IN`
- `WEWORK_CORP_ID`
- `WEWORK_AGENT_ID`
- `WEWORK_SECRET`
- `WEWORK_REDIRECT_URI`
- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`
- `COS_REGION`
- `CORS_ORIGINS`
- `MYSQL_ROOT_PASSWORD` (if using docker-compose)
- `MYSQL_DATABASE`

**Secrets location:**
- Development: `.env` file (gitignored)
- Production: Environment variables injected at deployment time (never committed)
- Validation: `backend/src/config/configuration.ts` (lines 1-38) enforces required vars in production

## Webhooks & Callbacks

**Incoming:**
- OAuth callback: `/api/v1/auth/wework/callback`
  - Receives: `code`, `state` query parameters
  - Returns: JWT token (as HttpOnly cookie), redirects to frontend

**Outgoing:**
- Not detected (no outbound webhook integrations)

## API Integrations

**Frontend to Backend:**
- Base URL: `http://localhost:3000/api/v1` (configurable via `VITE_API_BASE_URL`)
- HTTP Client: Axios 1.13.4
- Implementation: `frontend/src/api/client.ts`
- Features:
  - Automatic response unwrapping (ApiResponse.data extraction)
  - 401 error handling with redirect to login
  - Credentials forwarding (cookies sent automatically)
  - Timeout: 30 seconds (API_TIMEOUT constant)

**Data Flow:**
- Backend wraps all responses in `ApiResponse<T>` format
  - Frontend interceptor extracts `.data` field automatically
  - Blob responses (file downloads) bypass unwrapping

## Database Integration

**ORM:**
- Prisma 6.19.2
  - Schema file: `backend/prisma/schema.prisma`
  - Database provider: MySQL
  - Client generation: `@prisma/client`
  - Usage: PrismaService injected into all business modules

**Service Layer:**
- Implementation: `backend/src/prisma/prisma.service.ts`
- Module: `backend/src/prisma/prisma.module.ts`
- Injected into: Every business module that needs database access

---

*Integration audit: 2026-03-17*
