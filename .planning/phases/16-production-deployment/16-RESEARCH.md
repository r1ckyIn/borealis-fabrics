# Phase 16: Production Deployment - Research

**Researched:** 2026-04-04
**Domain:** Tencent Cloud deployment (Docker, CDB MySQL, COS, Nginx, SSL, WeChat Work OAuth)
**Confidence:** MEDIUM

## Summary

Phase 16 deploys the Borealis Fabrics system to a Tencent Cloud lightweight server (2C4G). The phase has a **critical blocker**: Phase 15 in ROADMAP.md describes "Containerization & Quality" (INFRA-01 through INFRA-06, QUAL-02, QUAL-03) but the actual Phase 15 executed "Observability & Performance" (Phase 14's requirements). **No Dockerfile, docker-compose.prod.yml, or nginx.conf exists in the codebase.** Phase 16 must therefore create all containerization infrastructure as its first wave before any deployment can happen.

The deployment follows a two-phase strategy: Phase A (IP + HTTP, dev WeChat credentials) and Phase B (domain + HTTPS + production OAuth). Key constraints include fitting the entire business stack plus monitoring stack in 4GB RAM, connecting Lighthouse to CDB via CCN (Cloud Connect Network), and COS bucket provisioning. WeChat Work OAuth **requires a trusted domain** (not IP address), confirming the user's two-phase approach is architecturally necessary.

**Primary recommendation:** Create Dockerfiles + docker-compose.prod.yml + nginx.conf as the first plan (containerization gap closure), then provision Tencent Cloud infrastructure, deploy Phase A (IP/HTTP), and finally create a Phase B guide for domain/SSL/OAuth when the domain is available.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Tencent Cloud lightweight server: 2C4G (2 vCPU, 4GB RAM, 4Mbps bandwidth). Must run business stack AND monitoring stack on same machine.
- **D-02:** No domain yet. Initial deployment uses IP address + HTTP access. Domain will be purchased and ICP-filed later.
- **D-03:** CDB MySQL instance not yet provisioned. Will be created during Phase 16 execution.
- **D-04:** Monitoring stack (Grafana + Loki + Prometheus from docker-compose.monitoring.yml) runs in production. Consider limiting Loki retention days and Prometheus scrape interval to stay within 4GB memory.
- **D-05:** Fresh start with empty database. No existing production data to migrate. Run prisma migrate deploy to create schema.
- **D-06:** No file migration needed. Set STORAGE_MODE=cos from day one in production.
- **D-07:** COS bucket needs to be created and configured. No data migration.
- **D-08:** Let's Encrypt with certbot auto-renewal. Configure after domain + ICP filing is complete.
- **D-09:** Two-phase deployment strategy: Phase A (no domain): HTTP + IP, dev WeChat creds. Phase B (after domain + ICP): HTTPS via Let's Encrypt, production OAuth callback URL, HSTS.
- **D-10:** WeChat Work OAuth won't work without domain. During Phase A, use dev/test accounts.
- **D-11:** OAuth callback URL will be updated to production domain when available.
- **D-12:** UAT is two-round: developer self-test first, then team validation.
- **D-13:** UAT scope: full coverage of every feature.
- **D-14:** UAT is performed on the production environment.

### Claude's Discretion
- Rollback strategy (Docker image tag rollback vs fix-forward based on severity)
- Loki retention days and Prometheus memory tuning for 4GB constraint
- Docker image registry choice (Tencent TCR vs Docker Hub)
- Nginx SSL configuration details and security headers
- CDB instance tier selection (smallest available for 2-5 user load)
- Redis instance configuration (standalone, memory allocation)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | Tencent Cloud lightweight server provisioned with Docker, Nginx, Redis | Architecture patterns for docker-compose.prod.yml + Nginx config; memory budget analysis for 4GB; CCN network for CDB |
| DEPLOY-02 | Tencent CDB MySQL instance configured and connected | CCN association required for Lighthouse-to-CDB private network; Prisma migrate deploy for schema creation |
| DEPLOY-03 | Tencent COS configured for file storage, existing local file URLs migrated | No migration needed (D-06); STORAGE_MODE=cos + COS bucket creation + CORS config |
| DEPLOY-04 | SSL certificate provisioned and auto-renewed | Let's Encrypt + certbot in Docker; Phase B only (after domain + ICP) |
| DEPLOY-05 | WeChat Work OAuth callback URL updated to production domain | Phase B only; OAuth requires trusted domain (not IP); dev credentials for Phase A |
| DEPLOY-06 | Production UAT validation | Two-round UAT; full feature coverage; developer self-test checklist + team validation |
</phase_requirements>

## Critical Blocker: Missing Containerization Infrastructure

**Confidence: HIGH** (verified by filesystem search)

Phase 15 (ROADMAP: "Containerization & Quality") was marked complete, but the `.planning/phases/15-observability-performance/` directory actually implemented Phase 14's requirements (OBS-06, OBS-07, PERF-01 through PERF-04, QUAL-01). The following INFRA requirements remain **unimplemented**:

| Requirement | Description | Status |
|-------------|-------------|--------|
| INFRA-01 | Backend multi-stage Docker container with Prisma engine binary | **NOT DONE** -- no Dockerfile exists |
| INFRA-02 | Frontend builds as static assets served by Nginx | **NOT DONE** -- no nginx.conf exists |
| INFRA-03 | docker-compose.prod.yml orchestrates NestJS + Redis + Nginx | **NOT DONE** -- no docker-compose.prod.yml exists |
| INFRA-04 | Nginx reverse proxy handles SSL termination, compression, SPA routing | **NOT DONE** -- no nginx.conf exists |
| INFRA-05 | CI/CD deploy stage (build, push, SSH deploy, Prisma migrate) | **NOT DONE** -- CI has no deploy job |
| INFRA-06 | Environment variable management with dev/production separation | **PARTIAL** -- .env.production.example exists but is incomplete |
| QUAL-02 | PWA manifest + Service Worker | **NOT DONE** |
| QUAL-03 | Accessibility baseline (eslint-plugin-jsx-a11y, vitest-axe) | **NOT DONE** |

**Impact on Phase 16:** Containerization (INFRA-01 through INFRA-04) must be the first plan in Phase 16, as deployment is impossible without it. INFRA-05 (CI/CD deploy) can be deferred to a later plan. QUAL-02 and QUAL-03 are lower priority and can be deferred to post-deployment.

## Standard Stack

### Core Infrastructure

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Docker Engine | 27.x | Container runtime | Industry standard for containerized deployment |
| Docker Compose | 2.x (plugin) | Multi-container orchestration | Built into modern Docker; single-command stack management |
| Nginx | 1.27-alpine | Reverse proxy + static file server | Standard for SPA serving + API proxying; lightweight Alpine image |
| node:22-slim | 22.x (Debian bookworm) | Backend runtime | Matches project's Node 22 requirement; slim = smaller than full image |
| certbot/certbot | latest | SSL certificate management | Standard for Let's Encrypt automation |

### Tencent Cloud Services

| Service | Tier | Purpose | Why This Tier |
|---------|------|---------|---------------|
| Lighthouse | 2C4G 4Mbps | Application server | User's locked decision |
| CDB MySQL | Basic 1C1G | Managed database | Smallest tier; 2-5 users; auto-backup included |
| COS | Standard storage | File/image storage | Already integrated in codebase via cos-nodejs-sdk-v5 |
| CCN | Free tier | Private network | Required to connect Lighthouse to CDB |

### Monitoring Stack (Already Exists)

| Tool | Image | Purpose | Memory Budget |
|------|-------|---------|---------------|
| Loki | grafana/loki:3.4.3 | Log aggregation | ~200-300MB (constrained) |
| Prometheus | prom/prometheus:latest | Metrics scraping | ~100-150MB |
| Grafana | grafana/grafana:latest | Dashboard UI | ~100-150MB |

**No additional packages need to be installed.** All deployment infrastructure is configuration-only (Dockerfiles, compose files, Nginx config).

## Architecture Patterns

### Production Docker Architecture

```
                    Internet
                       |
                  [Nginx :80/:443]
                   /         \
            /api/*         /*  (static)
              |               |
     [NestJS :3000]    [Frontend dist/]
              |
      [Redis :6379]
              |
   [CDB MySQL :3306]  (external, via CCN)

   --- Monitoring (same server) ---
   [Loki :3100]  [Prometheus :9090]  [Grafana :3001]
```

### Recommended File Structure for New Files

```
project-root/
├── backend/
│   └── Dockerfile              # Multi-stage: build + production
├── nginx/
│   ├── nginx.conf              # Main Nginx config
│   ├── conf.d/
│   │   └── default.conf        # Server block (HTTP or HTTPS)
│   └── templates/              # Optional: envsubst templates
├── docker-compose.prod.yml     # Production compose (NestJS + Redis + Nginx)
├── docker-compose.monitoring.yml  # Already exists
├── deploy/
│   └── deploy.sh               # SSH deploy script
└── .env.production.example     # Updated with all required vars
```

### Pattern 1: Backend Multi-Stage Dockerfile

**What:** Two-stage build: install deps + build in stage 1, copy dist + production node_modules to slim runtime image in stage 2.
**When to use:** Production Docker builds for NestJS + Prisma.

```dockerfile
# Stage 1: Build
FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
RUN pnpm build

# Stage 2: Production
FROM node:22-slim AS production
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => {if(!r.ok) throw 1})"
CMD ["node", "dist/main.js"]
```

**Key Prisma consideration:** `node:22-slim` is Debian bookworm (glibc-based), so the default `native` binary target works correctly. No `binaryTargets` change needed in schema.prisma as long as both build and runtime stages use `node:22-slim`. The `openssl` package must be installed in both stages.

### Pattern 2: Nginx Config for SPA + API Reverse Proxy

**What:** Nginx serves frontend static files with SPA routing (try_files $uri /index.html), proxies /api to NestJS, handles compression.
**When to use:** Single-server production deployment.

```nginx
upstream backend {
    server nestjs:3000;
}

server {
    listen 80;
    server_name _;

    # Frontend static files
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing: try file, then directory, then index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Correlation-ID $request_id;
        
        # File upload support (10MB max)
        client_max_body_size 10m;
    }

    # Health/ready/metrics endpoints (no /api prefix)
    location ~ ^/(health|ready|metrics) {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript
               application/vnd.ms-fontobject application/x-font-ttf
               font/opentype image/svg+xml image/x-icon;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Pattern 3: docker-compose.prod.yml

**What:** Compose file orchestrating NestJS + Redis + Nginx (MySQL is external CDB, not in compose).
**When to use:** Production deployment on single server.

```yaml
services:
  nestjs:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file: ./backend/.env
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)throw 1})"]
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 768M

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 192M

  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./frontend-dist:/usr/share/nginx/html:ro
    depends_on:
      nestjs:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 64M
```

### Pattern 4: Memory Budget for 4GB Server

**What:** Memory allocation plan to fit all services within 4GB.

| Service | Memory Limit | Notes |
|---------|-------------|-------|
| OS + Docker | ~600MB | Linux kernel + Docker daemon |
| NestJS | 768MB | Node.js app with Prisma |
| Redis | 192MB | 128MB data + overhead |
| Nginx | 64MB | Static files + reverse proxy |
| Loki | 256MB | Reduced retention (7 days) |
| Prometheus | 128MB | Reduced scrape interval (30s) |
| Grafana | 192MB | Dashboard UI |
| Buffer | ~800MB | Safety margin for spikes |
| **Total** | **~4GB** | |

**Loki tuning for 4GB:**
- Add `limits_config.retention_period: 168h` (7 days) to loki-config.yml
- Add `ingester.chunk_idle_period: 5m` to flush faster
- Set Docker memory limit: 256MB

**Prometheus tuning:**
- Change scrape_interval from 15s to 30s
- Set Docker memory limit: 128MB
- Add `--storage.tsdb.retention.time=7d` flag

### Anti-Patterns to Avoid

- **Running MySQL in Docker on same server:** CDB provides managed backup, HA, monitoring. Never self-host MySQL when CDB is available.
- **Building Docker images on the production server:** Build locally or in CI, push to registry, pull on server. The 2C4G server does not have enough resources for building.
- **Storing secrets in docker-compose.yml:** Use .env file with proper permissions (chmod 600). Never commit .env to git.
- **Using `latest` tag for production images:** Pin specific versions/tags for reproducibility.
- **Skipping healthchecks:** Both Docker and Nginx need healthchecks to detect and restart failed containers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSL certificate management | Custom cert renewal scripts | certbot Docker container + cron | Handles edge cases (renewal failure, rate limits, ACME challenges) |
| Nginx config templating | String replacement scripts | envsubst (built into Nginx image) | Standard, handles escaping correctly |
| Log rotation | Custom log rotation scripts | Docker json-file driver with max-size/max-file | Built into Docker daemon |
| MySQL backup | Custom mysqldump cron | CDB automatic backup (built-in) | Managed service handles retention, point-in-time recovery |
| Process management | pm2/supervisor inside Docker | Docker restart policy (unless-stopped) | Docker handles process lifecycle natively |
| Reverse proxy caching | Custom cache headers per route | Nginx proxy_cache directives | Built-in, battle-tested |

## Common Pitfalls

### Pitfall 1: Lighthouse-CDB Private Network Not Connected

**What goes wrong:** CDB MySQL is unreachable from Lighthouse server via private network.
**Why it happens:** Lighthouse instances and CDB are on separate VPCs by default. They do NOT auto-connect even in the same region.
**How to avoid:** Must associate both Lighthouse and CDB's VPC with a CCN (Cloud Connect Network) instance. Steps: (1) Create CCN instance, (2) Associate Lighthouse, (3) Associate CDB's VPC, (4) Verify with mysql client from Lighthouse.
**Warning signs:** `ECONNREFUSED` or `ETIMEDOUT` when backend tries to connect to CDB private IP.

### Pitfall 2: Prisma Binary Target Mismatch in Docker

**What goes wrong:** `PrismaClientInitializationError: Query engine library not found` at container startup.
**Why it happens:** Prisma generates native binaries for the build platform. If build and runtime use different base images (e.g., Alpine vs Debian), the binary won't work.
**How to avoid:** Use the same base image (`node:22-slim`) for both build and production stages. Install `openssl` in both stages. Do NOT copy `node_modules` from host into container -- always `pnpm install` inside Docker.
**Warning signs:** Error messages mentioning `debian-openssl-3.0.x` or `linux-musl`.

### Pitfall 3: Production Config Validation Fails

**What goes wrong:** NestJS crashes on startup with `Missing required environment variables for production`.
**Why it happens:** `configuration.ts` has strict validation that requires ALL env vars when `NODE_ENV=production`, including WeChat Work credentials. During Phase A (no domain), WeChat Work vars may not be set.
**How to avoid:** For Phase A, set dummy values for WEWORK_* vars (they won't be used since dev login is used). Or temporarily set `NODE_ENV=staging` to bypass the check. Better: modify the validation to make WEWORK_* optional when a `SKIP_WEWORK_VALIDATION=true` flag is set.
**Warning signs:** Container exits immediately with env var validation error.

### Pitfall 4: Cookie Secure Flag Blocks HTTP Login

**What goes wrong:** Auth cookie not set, user cannot log in via HTTP.
**Why it happens:** `auth.controller.ts` sets `secure: isProduction` on cookies. When `NODE_ENV=production` and using HTTP (no SSL), browsers reject secure cookies over HTTP.
**How to avoid:** During Phase A (HTTP only), either: (1) use `NODE_ENV=staging` to bypass secure flag, or (2) modify `getCookieOptions()` to check for actual HTTPS presence rather than NODE_ENV.
**Warning signs:** Login appears to succeed but cookie is not stored; subsequent requests are 401 Unauthorized.

### Pitfall 5: Frontend API Requests Fail After Deployment

**What goes wrong:** Frontend loads but all API calls return 404.
**Why it happens:** Frontend uses relative path `/api/v1` (hardcoded in `constants.ts`). If Nginx is not correctly proxying `/api/` to the NestJS backend, or if the proxy_pass URL is wrong, API calls fail.
**How to avoid:** Verify Nginx location `/api/` block correctly proxies to `http://nestjs:3000`. The backend sets global prefix `api/v1` with exclusions for `health`, `ready`, `metrics`. Ensure Nginx passes the full path.
**Warning signs:** Frontend loads fine but shows empty data / error messages.

### Pitfall 6: COS CORS Not Configured

**What goes wrong:** File uploads succeed but file previews/downloads fail with CORS errors in browser.
**Why it happens:** COS bucket has no CORS rules by default. When frontend tries to load images from COS signed URLs (different origin), browser blocks the request.
**How to avoid:** Configure CORS on COS bucket: AllowOrigin = production domain (or `*` during Phase A), AllowMethod = GET/PUT, AllowHeader = *.
**Warning signs:** Browser console shows `Access-Control-Allow-Origin` errors for COS URLs.

### Pitfall 7: Monitoring Stack Memory Exhaustion

**What goes wrong:** Server becomes unresponsive, Docker OOM kills containers.
**Why it happens:** Loki ingesters can consume 15GB+ in production by default. Without memory limits, monitoring consumes all available RAM.
**How to avoid:** Set Docker deploy.resources.limits.memory on every monitoring container. Reduce Loki retention to 7 days. Increase Prometheus scrape interval to 30s. Consider disabling monitoring initially and enabling after business stack is verified stable.
**Warning signs:** `docker stats` shows a container using >90% of allocated memory. System load average > number of CPUs.

### Pitfall 8: Docker Build Fails Due to Missing .dockerignore

**What goes wrong:** Docker context is extremely large (500MB+), build is slow, or Prisma binary mismatch occurs.
**Why it happens:** Without .dockerignore, Docker copies node_modules, .git, dist, and other unnecessary files into the build context.
**How to avoid:** Create `.dockerignore` in backend/ with: `node_modules`, `dist`, `.git`, `uploads`, `.env`, `.env.*`, `*.md`.
**Warning signs:** `docker build` step "Sending build context" takes > 30 seconds.

## Code Examples

### Existing Health Check Endpoints (for Docker HEALTHCHECK)

```typescript
// Source: backend/src/common/health/health.controller.ts
// /health - basic liveness probe (always returns up)
// /ready - readiness probe (checks DB + Redis connectivity)
// Both excluded from /api/v1 prefix in main.ts line 73
```

### Existing Cookie Configuration (affects Phase A HTTP deployment)

```typescript
// Source: backend/src/auth/constants/auth.constants.ts
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  // NOTE: 'secure' is NOT set here -- it's added dynamically in
  // auth.controller.ts getCookieOptions() based on NODE_ENV
};
```

### Production Config Validation (must handle Phase A gracefully)

```typescript
// Source: backend/src/config/configuration.ts
// Validates these vars when NODE_ENV=production:
// JWT_SECRET, DATABASE_URL, REDIS_URL, COS_SECRET_ID, COS_SECRET_KEY,
// COS_BUCKET, COS_REGION, WEWORK_CORP_ID, WEWORK_SECRET,
// WEWORK_AGENT_ID, WEWORK_REDIRECT_URI, CORS_ORIGINS
```

### Storage Mode Switching (COS from day one)

```typescript
// Source: backend/src/file/file.module.ts
const mode = configService.get<string>('STORAGE_MODE', 'local');
if (mode === 'cos') {
  return new CosStorageProvider(configService);
}
return new LocalStorageProvider(configService);
// Set STORAGE_MODE=cos in production .env
```

### Pino-Loki Transport (Monitoring integration)

```typescript
// Source: backend/src/app.module.ts lines 81-90
// Loki transport is opt-in via LOKI_HOST env var
if (lokiHost) {
  targets.push({
    target: 'pino-loki',
    options: {
      host: lokiHost, // e.g., http://loki:3100
      labels: { app: 'borealis-backend' },
      batching: true,
      interval: 5,
    },
  });
}
```

### Frontend API Base URL (works with Nginx proxy)

```typescript
// Source: frontend/src/utils/constants.ts
export const API_BASE_URL = '/api/v1';
// Relative URL -- works behind any reverse proxy (IP or domain)
// Nginx location /api/ proxy_pass http://nestjs:3000; handles routing
```

## Environment Variables: Complete Production List

The `.env.production.example` is incomplete. Here is the full list required:

```bash
# --- App ---
NODE_ENV=production
PORT=3000

# --- Database (CDB MySQL) ---
DATABASE_URL="mysql://user:password@cdb-private-ip:3306/borealis"

# --- Redis ---
REDIS_URL="redis://localhost:6379"

# --- JWT ---
JWT_SECRET="<openssl rand -base64 48>"
JWT_EXPIRES_IN="7d"

# --- WeChat Work OAuth ---
WEWORK_CORP_ID="<corp-id>"
WEWORK_AGENT_ID="<agent-id>"
WEWORK_SECRET="<agent-secret>"
WEWORK_REDIRECT_URI="https://your-domain.com/api/v1/auth/wework/callback"

# --- Tencent Cloud COS ---
COS_SECRET_ID="<cos-secret-id>"
COS_SECRET_KEY="<cos-secret-key>"
COS_BUCKET="<bucket-name-appid>"
COS_REGION="ap-shanghai"

# --- CORS ---
CORS_ORIGINS="http://server-ip"   # Phase A: IP, Phase B: https://domain.com

# --- Storage ---
STORAGE_MODE=cos
UPLOAD_DIR=./uploads    # Fallback directory (not used with COS)
BASE_URL=http://server-ip:80

# --- Monitoring ---
LOKI_HOST=http://loki:3100
SENTRY_DSN="<sentry-dsn>"
SLOW_QUERY_THRESHOLD_MS=200
GRAFANA_ADMIN_PASSWORD="<strong-password>"

# --- Boss Role ---
BOSS_WEWORK_IDS="<comma-separated-wework-ids>"
```

## Tencent Cloud Specifics

### Lighthouse-CDB Connectivity (CCN Required)

**Confidence: MEDIUM** (verified via Tencent Cloud official docs)

Lighthouse instances cannot connect to CDB via private network by default. Required steps:
1. Create a CCN (Cloud Connect Network) instance
2. Associate the Lighthouse instance with CCN (Lighthouse console > Network > CCN)
3. Associate the CDB VPC with the same CCN instance
4. Verify connectivity: `mysql -h <cdb-private-ip> -u root -p` from Lighthouse
5. Ensure CDB security group allows inbound 3306 from Lighthouse's IP range

**Alternative:** CDB can expose a public network endpoint, but this is less secure and adds latency.

### CDB MySQL Tier Selection

**Recommendation:** Basic Edition, 1 core, 1GB memory, 50GB SSD. This is the smallest available tier and sufficient for 2-5 users. Monthly cost is minimal. CDB includes:
- Automatic daily backups (7-day retention)
- Point-in-time recovery
- Performance monitoring dashboard
- Security group integration

### COS Bucket Setup

1. Create bucket in same region as server (e.g., ap-shanghai or ap-guangzhou)
2. Set access permission to "Private Read/Write" (signed URLs handle access)
3. Configure CORS: AllowOrigin=*, AllowMethod=GET/PUT/POST/DELETE, AllowHeader=*
4. Create sub-account with COS-only permissions for app access (avoid using root account keys)

## WeChat Work OAuth: Phase A vs Phase B

### Phase A (IP + HTTP, No Domain)

WeChat Work OAuth **requires a trusted domain** for the redirect URI. IP addresses are not accepted. During Phase A:

1. Set `NODE_ENV=production` BUT provide dummy WEWORK_* values that pass validation
2. Use the dev login endpoint (`POST /api/v1/auth/dev/login`) for testing
3. **Problem:** Dev login is blocked when `NODE_ENV=production` (returns 403 Forbidden)
4. **Solution options:**
   - Option A: Add a `ALLOW_DEV_LOGIN=true` env var that overrides the NODE_ENV check
   - Option B: Use `NODE_ENV=staging` (but this skips other production validations)
   - Option C: Create a seed script that inserts test users and generates JWT tokens directly
5. **Recommendation:** Option A is cleanest -- minimal code change, explicit opt-in, easy to remove later

### Phase B (Domain + HTTPS)

After domain + ICP filing:
1. Install certbot Docker container, obtain Let's Encrypt certificate
2. Update Nginx to listen on 443 with SSL, redirect 80 to 443
3. Update WEWORK_REDIRECT_URI to `https://domain.com/api/v1/auth/wework/callback`
4. Configure trusted domain in WeChat Work admin console
5. Update CORS_ORIGINS to `https://domain.com`
6. Remove `ALLOW_DEV_LOGIN` env var

## Rollback Strategy

**Recommendation: Docker image tag rollback** (Claude's discretion area)

| Severity | Strategy | Steps |
|----------|----------|-------|
| App crash | Rollback to previous image tag | `docker-compose pull && docker-compose up -d` with previous tag |
| Data corruption | Restore CDB backup + rollback image | CDB point-in-time recovery + previous image tag |
| Config error | Fix .env and restart | Edit .env, `docker-compose up -d` |
| Performance | Fix-forward with hotfix | Build new image with fix, deploy |

Tag convention: `borealis-backend:v1.1.{build-number}` or use git commit SHA as tag.

## Docker Image Registry

**Recommendation: Docker Hub** (Claude's discretion area)

| Option | Pros | Cons |
|--------|------|------|
| Docker Hub | Free tier (1 private repo), simple, widely used | Rate limits on pulls (100/6h anonymous, 200/6h authenticated) |
| Tencent TCR Personal | Free tier, same region = fast pulls, no rate limits | Tencent-specific, may require additional IAM setup |

For a small project with infrequent deploys, Docker Hub free tier is sufficient. If rate limits become an issue, switch to TCR Personal.

## CI/CD Deploy Stage (Future Plan)

The CI pipeline currently has 3 jobs: backend, frontend, security. A deploy stage would:
1. Build backend Docker image
2. Build frontend (static files)
3. Push image to registry
4. SSH into Lighthouse server
5. Pull new image
6. Run `prisma migrate deploy`
7. Restart containers

This can be done manually for Phase A and automated in a subsequent plan.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Docker Compose v1 (docker-compose) | Docker Compose v2 (docker compose plugin) | 2023 | Use `docker compose` not `docker-compose` |
| Nginx + certbot separate containers | nginx-certbot combined images | 2024 | Simpler SSL setup with auto-renewal |
| Manual server provisioning | Infrastructure as Code (Terraform) | 2020+ | Not needed for single-server setup |
| PM2 process management | Docker restart policies | 2020+ | Docker handles lifecycle natively |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (backend) | Jest 30.0.0 |
| Framework (frontend) | Vitest 4.0.18 |
| Config file (backend) | backend/package.json (jest config section) |
| Config file (frontend) | frontend/vite.config.ts (test section) |
| Quick run command | `cd backend && pnpm test` / `cd frontend && pnpm test` |
| Full suite command | `cd backend && pnpm build && pnpm test && pnpm lint && npx tsc --noEmit && cd ../frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | Server runs Docker stack | smoke | `docker compose -f docker-compose.prod.yml up -d && curl http://localhost/health` | N/A (infra) |
| DEPLOY-02 | CDB connected, schema migrated | smoke | `docker compose exec nestjs npx prisma migrate status` | N/A (infra) |
| DEPLOY-03 | COS configured for file storage | manual | Upload a file via UI, verify COS signed URL works | N/A (infra) |
| DEPLOY-04 | SSL active and auto-renews | manual | `curl -I https://domain.com` (Phase B only) | N/A (infra) |
| DEPLOY-05 | WeChat Work OAuth works | manual | Full OAuth login flow on production domain (Phase B only) | N/A (infra) |
| DEPLOY-06 | All business flows pass UAT | manual | Developer self-test checklist + team validation | N/A (manual UAT) |

### Sampling Rate

- **Per task commit:** `cd backend && pnpm build && pnpm test && pnpm lint`
- **Per wave merge:** Full suite (both backend + frontend)
- **Phase gate:** Full suite green + manual UAT pass

### Wave 0 Gaps

None -- this phase is infrastructure/deployment. No new test files needed. Existing test suites must remain green throughout.

## UAT Checklist (DEPLOY-06)

Full-coverage UAT scope from D-13:

| Category | Test Items |
|----------|-----------|
| Authentication | Dev login (Phase A) / WeChat Work OAuth login (Phase B), logout, session persistence |
| Supplier | CRUD, status change, soft delete + restore, Excel import |
| Customer | CRUD, special pricing, address management, soft delete + restore |
| Fabric | CRUD, image upload (COS), soft delete + restore, Excel import |
| Product | CRUD, category management, soft delete + restore |
| Quote | Create, partial conversion, expiration, Excel export |
| Order | Full lifecycle (9 states), payment recording, status transitions |
| Payment | Payment voucher upload (COS), payment record CRUD |
| Logistics | Logistics record CRUD, tracking |
| Excel Import | Supplier/customer/fabric bulk import, conflict handling (skip existing) |
| Excel Export | All entity types export to Excel |
| Audit Log | View audit log, filter by operator/action/entity/date, detail view |
| Data Export | Export any entity to Excel from list pages |
| Soft Delete | Toggle visibility, restore deleted records |
| File Upload | Upload images via COS, preview with signed URLs |
| Permissions | Boss vs normal user access (audit log visibility) |
| System | Enum management, health check endpoint |

## Open Questions

1. **Phase A Authentication Mechanism**
   - What we know: Dev login is blocked in production mode. WeChat Work OAuth requires domain.
   - What's unclear: Best approach to allow authentication during Phase A (IP + HTTP).
   - Recommendation: Add `ALLOW_DEV_LOGIN=true` env var to bypass NODE_ENV check in auth controller. Minimal code change, explicit, removable.

2. **Monitoring Stack Priority**
   - What we know: Monitoring must fit in 4GB with business stack. Memory is tight.
   - What's unclear: Whether to deploy monitoring from day one or add it after business stack is verified.
   - Recommendation: Deploy monitoring from day one but with strict memory limits. If OOM issues occur, temporarily stop monitoring containers and investigate.

3. **ICP Filing Timeline**
   - What we know: Domain requires ICP filing before use in mainland China. Filing takes 1-4 weeks.
   - What's unclear: Whether user has started the ICP filing process.
   - Recommendation: Start ICP filing ASAP. Phase A can proceed without it, but Phase B is blocked until ICP approval.

## Environment Availability

> This phase deploys to a remote Tencent Cloud server, not the local development machine. Local tools needed:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker (local) | Building images | Needs verification on server | -- | Build in CI or on server |
| SSH client | Server access | Built into macOS | -- | -- |
| mysql client | DB verification | Needs installation on server | -- | Use Docker exec |
| git | Code deployment | Built into macOS | -- | -- |
| Tencent Cloud Console | Service provisioning | Web browser | -- | -- |

**Missing dependencies with no fallback:**
- Tencent Cloud account with Lighthouse, CDB, COS, CCN access (user must provision)

**Missing dependencies with fallback:**
- Docker on local machine: can build on server or in CI instead

## Project Constraints (from CLAUDE.md)

- **Language:** Technical discussion in Chinese, code comments in English only
- **API path:** `/api/v1` (not `/api`)
- **Verification commands:** `cd backend && pnpm build && pnpm test && pnpm lint` / `cd frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck`
- **Security:** No hardcoded secrets. Environment variables for all credentials.
- **Git:** No direct commits to main. Feature branch + PR workflow.
- **Commit format:** GSD format `<type>(<phase>-<plan>): <description>`
- **CLAUDE.md never pushed to GitHub**

## Sources

### Primary (HIGH confidence)
- Project codebase filesystem scan -- verified no Dockerfile/docker-compose.prod.yml/nginx.conf exist
- `backend/src/config/configuration.ts` -- production env var validation logic
- `backend/src/auth/auth.controller.ts` -- cookie secure flag behavior
- `backend/src/auth/constants/auth.constants.ts` -- cookie configuration
- `backend/src/file/file.module.ts` -- STORAGE_MODE switching logic
- `backend/src/common/health/health.controller.ts` -- health/ready endpoints
- `backend/src/app.module.ts` -- pino-loki transport configuration
- `frontend/src/utils/constants.ts` -- API_BASE_URL = '/api/v1' (relative)
- `.planning/phases/15-observability-performance/15-VERIFICATION.md` -- confirms Phase 15 implemented Phase 14 requirements

### Secondary (MEDIUM confidence)
- [Tencent Cloud Lighthouse Private Network](https://www.tencentcloud.com/document/product/1103/41396) -- CCN required for Lighthouse-CDB connectivity
- [Tencent Cloud CDB MySQL](https://www.tencentcloud.com/product/cdb) -- CDB tier selection
- [Tencent Cloud COS CORS](https://www.tencentcloud.com/document/product/436/13318) -- COS CORS configuration
- [WeChat Work Developer Community](https://developers.weixin.qq.com/community/enterprisewechat/doc/000e665bef8a10c46e59c325151c00) -- OAuth requires trusted domain
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/docker) -- Prisma binary targets and Docker
- [Prisma GitHub #19729](https://github.com/prisma/prisma/issues/19729) -- node-slim openssl requirement

### Tertiary (LOW confidence)
- Docker memory budget estimates -- based on typical values, actual usage will vary with load
- CDB Basic 1C1G pricing -- verify on Tencent Cloud console during provisioning
- ICP filing timeline (1-4 weeks) -- varies by province and registrar

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools are well-established, project already uses them
- Architecture: MEDIUM -- containerization pattern is standard but specific memory budgets need real-world validation
- Pitfalls: HIGH -- identified from codebase analysis (cookie secure flag, config validation, CCN requirement)
- Tencent Cloud specifics: MEDIUM -- verified via official docs but provisioning details may vary

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days -- stable infrastructure domain)
