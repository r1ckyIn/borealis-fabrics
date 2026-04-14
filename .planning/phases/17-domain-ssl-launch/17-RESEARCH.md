# Phase 17: Domain & SSL Launch (Phase B) - Research

**Researched:** 2026-04-14
**Domain:** DNS, SSL/TLS (Let's Encrypt), Nginx HTTPS, WeChat Work OAuth, Dev Login Cleanup
**Confidence:** HIGH

## Summary

Phase 17 transitions the Borealis Fabrics production system from Phase A (IP + HTTP, dev login) to Phase B (domain + HTTPS, WeChat Work OAuth). The work divides into five distinct areas: (1) Nginx SSL configuration with Let's Encrypt certificates, (2) docker-compose changes to expose port 443 and mount certificate volumes, (3) WeChat Work OAuth domain settings update, (4) complete removal of dev login code from both backend and frontend, and (5) security hardening (FORCE_HTTPS_COOKIES, HSTS, HTTP-to-HTTPS redirect).

The codebase is well-prepared for this transition. The `getCookieOptions()` function already reads `FORCE_HTTPS_COOKIES`, the WeChat Work OAuth flow is complete and only needs `WEWORK_REDIRECT_URI` updated, and the env var toggle pattern (`ALLOW_DEV_LOGIN`) makes cleanup straightforward to identify. The primary risk areas are: certbot certificate acquisition with Nginx running in Docker, ensuring zero-downtime during the cutover, and correctly configuring WeChat Work trusted domain in the admin console.

**Primary recommendation:** Use certbot with webroot plugin for zero-downtime certificate acquisition and renewal. Structure the Nginx config with a well-known ACME challenge location that works in both HTTP-only and HTTPS modes. Completely delete (not disable) all dev login code paths per user decision D-03.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Domain and ICP filing not yet started. Will be handled on Tencent Cloud. Domain preference: u2living-related.
- **D-02:** Phase 17 code changes can be prepared in advance. Use placeholder `<DOMAIN>` in configs until domain is confirmed.
- **D-03:** Completely delete all ALLOW_DEV_LOGIN-related code. No preservation for future debugging. Specifically: backend devLogin endpoint, frontend Dev Login button, env templates, BOSS_WEWORK_IDS=dev-user config, and related tests.
- **D-04:** Enterprise WeChat app already exists (CORP_ID and AGENT_ID available). Only need to update domain-related settings.
- **D-05:** User needs step-by-step guide in DEPLOY.md for WeChat Work admin console operations.
- **D-06:** Claude handles: update WEWORK_REDIRECT_URI env var to `https://<domain>/api/v1/auth/wework/callback`.
- **D-07:** Zero-downtime cutover preferred. Strategy: DNS A record -> SSL certificate -> Nginx config -> env vars -> graceful reload.
- **D-08:** After Phase B, IP direct access redirects to domain (Nginx 301 redirect).
- **D-09:** FORCE_HTTPS_COOKIES=true enabled.
- **D-10:** Let's Encrypt + certbot auto-renewal.
- **D-11:** HSTS headers enabled after SSL is verified working.

### Claude's Discretion
- Certbot installation method (standalone vs webroot vs nginx plugin)
- Nginx SSL configuration details (TLS versions, cipher suites, OCSP stapling)
- Certbot auto-renewal cron/timer setup
- HSTS max-age value and preload decision
- Nginx server block structure for HTTPS + redirect

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-03 | SSL certificate provisioned and auto-renewed | Certbot webroot + cron renewal pattern documented |
| DEPLOY-04 | SSL auto-renewal working | Cron job with deploy-hook for Nginx reload |
| DEPLOY-05 | WeChat Work OAuth callback URL updated to production domain | OAuth flow analysis + trusted domain config guide |
</phase_requirements>

## Architecture Patterns

### Recommended Nginx Server Block Structure

```
nginx/conf.d/default.conf (Phase B)
├── Server block 1: HTTP catch-all (port 80)
│   ├── ACME challenge location (for certbot webroot renewal)
│   └── 301 redirect to HTTPS for all other requests
├── Server block 2: HTTPS main domain (port 443)
│   ├── SSL certificate paths
│   ├── SSL security parameters
│   ├── HSTS header
│   ├── All existing location blocks (/, /api/, /health, static assets)
│   └── Security headers
└── Server block 3: IP direct access redirect (port 80/443)
    └── 301 redirect to https://<domain>
```

### Pattern 1: Certbot Webroot Plugin (Recommended)

**What:** Install certbot on the host (not in a container). Use webroot mode where certbot writes challenge files to a shared directory, and Nginx serves them. This avoids stopping Nginx during certificate issuance or renewal.

**When to use:** Docker-based Nginx deployments where zero-downtime is required.

**Why chosen over alternatives:**
- **standalone mode** requires stopping Nginx to free port 80 -- violates zero-downtime requirement
- **nginx plugin** requires certbot to directly modify Nginx configs inside the container -- fragile with Docker
- **webroot mode** only needs a shared volume -- clean separation, zero downtime

**Configuration:**

```nginx
# Add to HTTP server block (before the redirect)
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
}
```

```yaml
# docker-compose.prod.yml -- add volume to nginx service
nginx:
  volumes:
    - certbot-webroot:/var/www/certbot:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

```bash
# Initial certificate acquisition (host)
certbot certonly --webroot -w /var/www/certbot -d <domain>

# Auto-renewal cron (host)
0 3 * * * certbot renew --quiet --deploy-hook "docker compose -f /opt/borealis-fabrics/docker-compose.prod.yml exec nginx nginx -s reload"
```

### Pattern 2: Zero-Downtime Cutover Sequence

**What:** Ordered sequence of operations that transitions from HTTP to HTTPS without service interruption.

**Sequence:**
1. Update Nginx config to add ACME challenge location to HTTP server block (deploy + reload)
2. Run certbot to obtain certificate via webroot
3. Update Nginx config to add HTTPS server block + HTTP redirect (deploy + reload)
4. Update docker-compose.prod.yml to expose port 443
5. Recreate nginx container (`docker compose up -d nginx`)
6. Update backend .env (FORCE_HTTPS_COOKIES, WEWORK_REDIRECT_URI, remove ALLOW_DEV_LOGIN)
7. Restart NestJS container
8. Verify HTTPS + OAuth flow

### Pattern 3: Dev Login Complete Removal

**What:** Delete all ALLOW_DEV_LOGIN code paths, not just disable them.

**Files to modify (complete inventory):**

Backend:
- `backend/src/auth/auth.controller.ts` -- remove `devLogin` method (lines 109-136)
- `backend/src/auth/auth.service.ts` -- remove `devLogin` method (lines 119-139), remove ALLOW_DEV_LOGIN check (line 122)
- `backend/src/config/configuration.ts` -- remove ALLOW_DEV_LOGIN conditional (lines 16-23), make WeWork vars always required in production
- `backend/src/auth/auth.controller.spec.ts` -- remove entire `devLogin` describe block (lines 203-314)
- `backend/src/auth/auth.service.spec.ts` -- remove `devLogin` describe block and ALLOW_DEV_LOGIN tests
- `backend/test/auth.e2e-spec.ts` -- remove dev-user references (line 40, 173)
- `backend/.env.production.example` -- remove `ALLOW_DEV_LOGIN=true` line
- `backend/.env.example` -- no changes needed (ALLOW_DEV_LOGIN not present)

Frontend:
- `frontend/src/pages/auth/LoginPage.tsx` -- remove dev login button, handleDevLogin function, devLoading state, CodeOutlined import, devLogin import
- `frontend/src/api/auth.api.ts` -- remove `devLogin` function and export
- `frontend/src/pages/auth/__tests__/LoginPage.test.tsx` -- remove dev login tests (lines 133-179), remove mockDevLogin mock
- `frontend/src/test/integration/auth-flow.integration.test.tsx` -- remove devLogin mock and related test assertions
- `frontend/.env.example` -- remove `VITE_ALLOW_DEV_LOGIN` line

Config/Deploy:
- `docs/DEPLOY.md` -- update Phase B section to remove dev login references; update Phase A section to note it was a temporary measure

### Anti-Patterns to Avoid
- **Commenting out instead of deleting:** User explicitly wants complete removal (D-03). Do not leave commented-out dev login code.
- **Stopping Nginx for certbot:** Use webroot mode, not standalone, to maintain zero downtime.
- **Enabling HSTS before verifying SSL:** HSTS should be added only after confirming HTTPS works correctly. A bad HSTS header can lock users out.
- **Setting HSTS preload immediately:** Start with a shorter max-age (e.g., 1 day), test, then increase to production value. Do NOT submit to preload list for an internal business tool.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSL certificate management | Manual cert generation/renewal | certbot + Let's Encrypt | Auto-renewal, widely tested, free |
| TLS configuration | Custom cipher suites | Mozilla SSL Configuration Generator intermediate profile | Security-audited defaults |
| ACME challenge serving | Custom challenge handler | certbot webroot + Nginx location block | Battle-tested, zero-downtime |

## Common Pitfalls

### Pitfall 1: Certbot Webroot Volume Permissions in Docker
**What goes wrong:** Certbot writes challenge files to a directory that Nginx container cannot read, causing HTTP-01 validation failure.
**Why it happens:** Docker volume ownership mismatch between host certbot (root) and Nginx container user (nginx/www-data).
**How to avoid:** Use a named volume or bind mount with `:ro` on Nginx side. Certbot runs on the host, so it writes as root. Nginx only needs read access to serve challenge files.
**Warning signs:** `certbot certonly` returns "unauthorized" or "challenge did not pass" errors.

### Pitfall 2: Docker Compose Port 443 Not Exposed
**What goes wrong:** HTTPS connections refused even though Nginx SSL config is correct.
**Why it happens:** `docker-compose.prod.yml` only maps port 80. Port 443 was never added.
**How to avoid:** Update docker-compose.prod.yml to add `"443:443"` to nginx ports BEFORE deploying SSL config.
**Warning signs:** `curl -v https://<domain>` shows "Connection refused".

### Pitfall 3: FORCE_HTTPS_COOKIES Before HTTPS is Ready
**What goes wrong:** Setting `FORCE_HTTPS_COOKIES=true` while still on HTTP causes cookies not to be sent (Secure flag requires HTTPS).
**Why it happens:** Env var updated before SSL is fully working.
**How to avoid:** Only set `FORCE_HTTPS_COOKIES=true` AFTER verifying HTTPS is working AND the domain resolves correctly.
**Warning signs:** Users cannot log in; cookies are set but never sent back to the server.

### Pitfall 4: WeChat Work Trusted Domain ICP Mismatch
**What goes wrong:** WeChat Work admin console rejects the domain for trusted domain configuration.
**Why it happens:** The domain's ICP filing entity must match or be associated with the enterprise's WeChat Work certified entity. If the user's company and the domain registrant are different entities, this fails.
**How to avoid:** Ensure the domain is registered and ICP-filed under the same entity as the WeChat Work enterprise account. Document this requirement clearly in DEPLOY.md.
**Warning signs:** Error message in WeChat Work admin console about domain verification failure.

### Pitfall 5: configuration.ts Validation After Removing ALLOW_DEV_LOGIN
**What goes wrong:** After removing the `ALLOW_DEV_LOGIN` conditional in `configuration.ts`, WeWork env vars become always required in production. If the server still has placeholder values, the app crashes on startup.
**Why it happens:** The guard `if (process.env.ALLOW_DEV_LOGIN !== 'true')` currently makes WeWork vars optional in Phase A. Removing it without updating the real env vars causes validation failure.
**How to avoid:** Update production .env with real WeWork credentials BEFORE deploying the code that removes the ALLOW_DEV_LOGIN guard. Or keep the guard removal as a separate commit from the env var update.
**Warning signs:** NestJS fails to start with "Missing required environment variables" error.

### Pitfall 6: Let's Encrypt OCSP Stapling Is Dead
**What goes wrong:** Configuring `ssl_stapling on` in Nginx with Let's Encrypt certificates. The directive is silently ignored since Let's Encrypt ended OCSP support (August 2025).
**Why it happens:** Many old tutorials still recommend OCSP stapling config.
**How to avoid:** Do NOT add `ssl_stapling` directives when using Let's Encrypt. Browsers use CRLs (Certificate Revocation Lists) instead, which require no server-side configuration.
**Warning signs:** No visible error, but wasted config lines. `openssl s_client` will show no OCSP response.

### Pitfall 7: Lighthouse Firewall Missing Port 443
**What goes wrong:** HTTPS connections timeout even though Nginx and certbot are configured correctly.
**Why it happens:** Tencent Cloud Lighthouse firewall (separate from OS iptables) only allows port 80, not 443.
**How to avoid:** Add port 443 (HTTPS) to Lighthouse firewall rules in Tencent Cloud console BEFORE testing HTTPS.
**Warning signs:** `curl -v https://<domain>` shows "Connection timed out" (not "Connection refused").

## Code Examples

### Nginx SSL Configuration (Phase B)

```nginx
# Source: Mozilla SSL Configuration Generator (Intermediate profile)
# + adapted for this project's Docker deployment

# HTTP server -- redirect to HTTPS + serve ACME challenges
server {
    listen 80;
    server_name <DOMAIN>;

    # Let's Encrypt certificate renewal
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# IP direct access -- redirect to domain
server {
    listen 80 default_server;
    server_name _;
    return 301 https://<DOMAIN>$request_uri;
}

# HTTPS server -- main application
server {
    listen 443 ssl http2;
    server_name <DOMAIN>;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/<DOMAIN>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<DOMAIN>/privkey.pem;

    # TLS configuration (Mozilla Intermediate)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # SSL session caching
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # NOTE: Do NOT add ssl_stapling -- Let's Encrypt ended OCSP support (Aug 2025)

    # HSTS (enable only after verifying SSL works)
    # Start with 1 day, then increase to 1 year
    # add_header Strict-Transport-Security "max-age=86400" always;
    # Production: add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend static files
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
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
        client_max_body_size 10m;
    }

    # Health/ready/metrics endpoints
    location ~ ^/(health|ready|metrics) {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Docker Compose Port 443 + Certificate Volumes

```yaml
# Source: existing docker-compose.prod.yml + SSL additions
nginx:
  image: nginx:1.27-alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/conf.d:/etc/nginx/conf.d:ro
    - ./frontend/dist:/usr/share/nginx/html:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro          # SSL certificates
    - certbot-webroot:/var/www/certbot:ro            # ACME challenges
  depends_on:
    nestjs:
      condition: service_healthy
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 64M

volumes:
  redis_data:
  certbot-webroot:   # Named volume for certbot webroot
```

### Certbot Renewal Cron

```bash
# /etc/cron.d/certbot-renew (on host, not in container)
0 3 * * * root certbot renew --webroot -w /var/lib/docker/volumes/borealis-fabrics_certbot-webroot/_data --quiet --deploy-hook "cd /opt/borealis-fabrics && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload" >> /var/log/certbot-renew.log 2>&1
```

### configuration.ts After ALLOW_DEV_LOGIN Removal

```typescript
// Source: backend/src/config/configuration.ts (modified)
const validateProductionConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    const requiredVars = [
      'JWT_SECRET',
      'DATABASE_URL',
      'REDIS_URL',
      'COS_SECRET_ID',
      'COS_SECRET_KEY',
      'COS_BUCKET',
      'COS_REGION',
      'CORS_ORIGINS',
      // WeWork vars always required in production (no more ALLOW_DEV_LOGIN guard)
      'WEWORK_CORP_ID',
      'WEWORK_SECRET',
      'WEWORK_AGENT_ID',
      'WEWORK_REDIRECT_URI',
    ];
    // ... rest unchanged
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OCSP Stapling with Let's Encrypt | No OCSP needed (CRL-based) | Aug 2025 | Remove ssl_stapling directives from Nginx config |
| TLS 1.0/1.1 support | TLS 1.2+ only | 2020+ | ssl_protocols TLSv1.2 TLSv1.3 |
| Custom cipher selection for TLS 1.3 | TLS 1.3 ciphers auto-negotiated | OpenSSL 1.1.1+ | Only configure TLS 1.2 ciphers explicitly |
| certbot standalone (stop web server) | certbot webroot (zero downtime) | Always available | Use webroot for Docker deployments |

**Deprecated/outdated:**
- **OCSP Stapling with Let's Encrypt:** Let's Encrypt ended OCSP service August 6, 2025. Do not configure `ssl_stapling` directives.
- **TLS 1.0/1.1:** Universally deprecated. All modern browsers require TLS 1.2+.

## Open Questions

1. **Certbot webroot volume path with Docker named volumes**
   - What we know: Named volumes are stored at `/var/lib/docker/volumes/<project>_<volume>/_data` on Linux
   - What's unclear: The exact volume name depends on the docker compose project name (defaults to directory name)
   - Recommendation: Verify the actual volume path on the server with `docker volume inspect borealis-fabrics_certbot-webroot` or use a bind mount instead (e.g., `/opt/borealis-fabrics/certbot/webroot`)

2. **WeChat Work domain verification file**
   - What we know: WeChat Work requires downloading a verification file and placing it at the domain root
   - What's unclear: Exact file name and format (generated per-app in the admin console)
   - Recommendation: Add instructions in DEPLOY.md for the user to download the file, place it in `frontend/dist/`, and verify it's accessible at `https://<domain>/<filename>`

3. **CORS_ORIGINS and BASE_URL update**
   - What we know: These must change from `http://<IP>` to `https://<domain>`
   - What's unclear: Whether frontend needs a rebuild (VITE_API_BASE_URL may need updating if it references the IP)
   - Recommendation: Check if frontend uses relative paths (it does via `/api/v1` prefix) -- if so, no frontend rebuild needed for the domain change. Only backend env vars need updating.

## Environment Availability

> This phase primarily involves server-side configuration changes. The following dependencies exist on the production server (Tencent Cloud Lighthouse).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| certbot | SSL certificate | Unknown (needs install) | -- | Install via apt |
| Docker + Compose | Container orchestration | Yes | Verified in Phase 16 | -- |
| Nginx (in Docker) | Reverse proxy + SSL termination | Yes | 1.27-alpine | -- |
| Port 443 firewall rule | HTTPS access | Unknown | -- | Add via Tencent Cloud Console |
| Domain + ICP filing | DNS resolution | Not yet (blocker) | -- | Phase blocked until complete |

**Missing dependencies with no fallback:**
- Domain + ICP filing: User must complete this before Phase B can be deployed. Code changes can be prepared in advance.

**Missing dependencies with fallback:**
- certbot: Not installed on server yet. Install via `apt-get install -y certbot` during deployment.
- Port 443 firewall: Add rule in Tencent Cloud Lighthouse console.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (backend) | Jest 29.x |
| Framework (frontend) | Vitest |
| Config file (backend) | `backend/jest.config.ts` |
| Config file (frontend) | `frontend/vitest.config.ts` |
| Quick run command (backend) | `cd backend && pnpm test -- --testPathPattern=auth` |
| Quick run command (frontend) | `cd frontend && pnpm test -- --testPathPattern=LoginPage` |
| Full suite command (backend) | `cd backend && pnpm build && pnpm test && pnpm lint && npx tsc --noEmit` |
| Full suite command (frontend) | `cd frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEV-CLEANUP-01 | devLogin endpoint removed from controller | unit | `cd backend && pnpm test -- --testPathPattern=auth.controller` | Yes (needs update) |
| DEV-CLEANUP-02 | devLogin method removed from service | unit | `cd backend && pnpm test -- --testPathPattern=auth.service` | Yes (needs update) |
| DEV-CLEANUP-03 | Dev Login button removed from LoginPage | unit | `cd frontend && pnpm test -- --testPathPattern=LoginPage` | Yes (needs update) |
| DEV-CLEANUP-04 | devLogin API function removed | unit | `cd frontend && pnpm test -- --testPathPattern=auth-flow` | Yes (needs update) |
| DEV-CLEANUP-05 | configuration.ts validates WeWork vars always in prod | unit | `cd backend && pnpm test -- --testPathPattern=auth` | Needs new test or inline verification |
| SSL-01 | Nginx config syntax valid | smoke | `docker compose exec nginx nginx -t` | Manual |
| SSL-02 | HTTPS responds with valid cert | smoke | `curl -sv https://<domain>/ 2>&1 \| grep "SSL certificate verify ok"` | Manual (post-deploy) |
| SSL-03 | HTTP redirects to HTTPS | smoke | `curl -sv http://<domain>/ 2>&1 \| grep "301"` | Manual (post-deploy) |
| OAUTH-01 | WeChat Work OAuth flow completes | e2e | Manual -- QR scan required | Manual only |

### Sampling Rate
- **Per task commit:** `cd backend && pnpm test -- --testPathPattern=auth && cd ../frontend && pnpm test -- --testPathPattern="LoginPage|auth-flow"`
- **Per wave merge:** `cd backend && pnpm build && pnpm test && pnpm lint && npx tsc --noEmit && cd ../frontend && pnpm build && pnpm test && pnpm lint && pnpm typecheck`
- **Phase gate:** Full suite green + manual SSL/OAuth verification on production server

### Wave 0 Gaps
- None -- existing test infrastructure covers all code-change requirements. SSL and OAuth verification are inherently manual (server-side operations).

## Project Constraints (from CLAUDE.md)

- **Code comments in English only** -- all new comments in Nginx config, shell scripts, and code must be pure English
- **API path is `/api/v1`** not `/api` -- WeChat Work redirect URI must use this prefix
- **Verification commands:** Backend: `pnpm build && pnpm test && pnpm lint && npx tsc --noEmit`; Frontend: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
- **Commit message format:** `<type>(<phase>-<plan>): <description>` (GSD project)
- **No Co-Authored-By in commits** (hook blocks it)
- **DEPLOY.md is bilingual** (EN + CN sections)
- **HttpOnly Cookie auth pattern** -- no frontend token storage, `getCookieOptions()` controls secure flag

## Sources

### Primary (HIGH confidence)
- `backend/src/auth/auth.controller.ts` -- verified getCookieOptions(), devLogin endpoint, FORCE_HTTPS_COOKIES usage
- `backend/src/auth/auth.service.ts` -- verified devLogin(), WeWork OAuth flow, buildWeWorkAuthUrl()
- `backend/src/config/configuration.ts` -- verified ALLOW_DEV_LOGIN guard on WeWork vars
- `nginx/conf.d/default.conf` -- verified current HTTP-only server block
- `docker-compose.prod.yml` -- verified current port 80 only, no SSL volumes
- `docs/DEPLOY.md` -- verified Phase B skeleton (sections 3.1-3.4)
- [Let's Encrypt ending OCSP](https://letsencrypt.org/2024/12/05/ending-ocsp) -- confirmed OCSP end-of-life August 2025
- [HSTS best practices - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html) -- max-age requirements
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/) -- cipher suite recommendations (Intermediate profile)

### Secondary (MEDIUM confidence)
- [Nginx TLS 1.3 Hardening Guide](https://www.getpagespeed.com/server-setup/nginx/nginx-tls-1-3-hardening) -- current SSL config best practices (2026)
- [Certbot webroot with Docker](https://dev.to/kingyou/automating-https-with-docker-nginx-certbot-2ein) -- webroot plugin pattern for Docker
- [WeChat Work trusted domain help](https://open.work.weixin.qq.com/help2/pc/21316) -- domain configuration requirements (ICP match requirement)
- [WeChat Work OAuth docs](https://developer.work.weixin.qq.com/document/path/91335) -- OAuth2 redirect_uri format

### Tertiary (LOW confidence)
- Certbot cron webroot volume path: needs verification on actual server. Named volume path depends on Docker project name.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- certbot + Let's Encrypt is the de facto standard for free SSL
- Architecture: HIGH -- Nginx SSL config patterns are well-established; DEPLOY.md already has Phase B skeleton
- Pitfalls: HIGH -- dev login removal scope fully mapped via grep; all 14 backend + 5 frontend files identified
- OCSP deprecation: HIGH -- confirmed via official Let's Encrypt announcement
- WeChat Work domain config: MEDIUM -- official docs not fully accessible, but ICP requirement confirmed via multiple sources

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable domain -- SSL/TLS config practices change slowly)
