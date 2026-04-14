# Phase 17: Domain & SSL Launch (Phase B) - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

System accessible via domain with HTTPS, WeChat Work OAuth fully functional, dev login removed. This phase covers: domain DNS setup, SSL certificate (Let's Encrypt), Nginx HTTPS configuration, WeChat Work OAuth production callback, dev login code removal, and zero-downtime cutover from Phase A (IP+HTTP) to Phase B (domain+HTTPS).

Requirements: DEPLOY-03 (SSL), DEPLOY-04 (SSL auto-renew), DEPLOY-05 (WeChat Work OAuth)

</domain>

<decisions>
## Implementation Decisions

### Domain & ICP (Prerequisite)
- **D-01:** Domain and ICP filing **not yet started**. Will be handled on **Tencent Cloud** (same platform as server). Domain preference: **u2living-related** (e.g., u2living.cn or similar).
- **D-02:** Phase 17 code changes and configuration can be **prepared in advance** — deploy when domain + ICP are ready. Use placeholder `<DOMAIN>` in configs until domain is confirmed.

### Dev Login Cleanup
- **D-03:** **Completely delete** all ALLOW_DEV_LOGIN-related code. No preservation for future debugging. Specifically:
  - Backend: Remove `devLogin` endpoint and `ALLOW_DEV_LOGIN` env var checks from `auth.controller.ts`
  - Frontend: Remove Dev Login button and `VITE_ALLOW_DEV_LOGIN` condition from `LoginPage.tsx`
  - Env templates: Remove `ALLOW_DEV_LOGIN` and `VITE_ALLOW_DEV_LOGIN` from `.env.production.example` and `.env.example`
  - Config: Remove `BOSS_WEWORK_IDS=dev-user` dev-only config
  - Tests: Remove/update tests that test dev login behavior

### WeChat Work OAuth Configuration
- **D-04:** Enterprise WeChat app **already exists** (CORP_ID and AGENT_ID available). Only need to update domain-related settings.
- **D-05:** User needs **step-by-step guide** in DEPLOY.md for WeChat Work admin console operations:
  - Setting trusted domain (可信域名)
  - Configuring OAuth callback URL
  - Any IP whitelist or web authorization requirements
- **D-06:** Claude handles: update `WEWORK_REDIRECT_URI` env var to `https://<domain>/api/v1/auth/wework/callback`

### Cutover Process
- **D-07:** **Zero-downtime cutover** preferred. Strategy:
  1. DNS A record points to server IP (DNS propagation happens in background)
  2. Install SSL certificate via certbot while HTTP still serves normally
  3. Update Nginx config to add HTTPS server block + HTTP→HTTPS redirect
  4. Update env vars (`FORCE_HTTPS_COOKIES=true`, `WEWORK_REDIRECT_URI`, remove `ALLOW_DEV_LOGIN`)
  5. Reload Nginx (graceful reload, no restart needed) + restart NestJS
  6. Verify HTTPS + OAuth flow
- **D-08:** After Phase B, **IP direct access redirects to domain** (Nginx 301 redirect from IP to `https://<domain>`).

### HTTPS & Security
- **D-09:** `FORCE_HTTPS_COOKIES=true` enabled — all auth cookies become Secure + HttpOnly.
- **D-10:** Let's Encrypt + certbot auto-renewal (decided in Phase 16 D-08, carried forward).
- **D-11:** HSTS headers enabled after SSL is verified working.

### Claude's Discretion
- Certbot installation method (standalone vs webroot vs nginx plugin)
- Nginx SSL configuration details (TLS versions, cipher suites, OCSP stapling)
- Certbot auto-renewal cron/timer setup
- HSTS max-age value and preload decision
- Nginx server block structure for HTTPS + redirect

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Deployment Guide
- `docs/DEPLOY.md` — Contains Phase A and Phase B deployment steps (Phase B section needs updating with actual domain)

### Authentication
- `backend/src/auth/auth.controller.ts` — WeChat Work OAuth flow + `getCookieOptions()` with `FORCE_HTTPS_COOKIES`
- `backend/src/auth/auth.controller.spec.ts` — Tests for `FORCE_HTTPS_COOKIES` and `devLogin` (need cleanup)
- `frontend/src/pages/auth/LoginPage.tsx` — Dev Login button conditional rendering (needs removal)

### Nginx
- `nginx/nginx.conf` — Main Nginx config (HTTP only, needs SSL additions)
- `nginx/conf.d/default.conf` — Server block (port 80 only, needs HTTPS server block + redirect)

### Environment Templates
- `backend/.env.production.example` — Production env var template (FORCE_HTTPS_COOKIES commented out, ALLOW_DEV_LOGIN present)
- `frontend/.env.example` — Frontend env template (VITE_ALLOW_DEV_LOGIN present)

### Prior Phase Context
- `.planning/phases/16-production-deployment/16-CONTEXT.md` — Phase A deployment decisions (D-08 through D-11 re: SSL and OAuth)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **getCookieOptions()** (`auth.controller.ts:56-58`): Already reads `FORCE_HTTPS_COOKIES` env var — just need to set it to `true`
- **WeChat Work OAuth flow** (`auth.controller.ts`): Complete implementation — only `WEWORK_REDIRECT_URI` env var needs updating
- **Nginx config** (`nginx/conf.d/default.conf`): Working HTTP config — extend with SSL server block

### Established Patterns
- **Environment-driven feature flags**: `ALLOW_DEV_LOGIN`, `FORCE_HTTPS_COOKIES`, `STORAGE_MODE` — all follow env var toggle pattern
- **Auth cookie management**: HttpOnly JWT cookies via `getCookieOptions()` — secure flag already parameterized

### Integration Points
- **Nginx**: Add SSL listen + redirect block, update `server_name` from `_` to actual domain
- **docker-compose.prod.yml**: May need port 443 exposed + certbot volume mount
- **Backend .env**: Update `WEWORK_REDIRECT_URI`, set `FORCE_HTTPS_COOKIES=true`, remove `ALLOW_DEV_LOGIN`
- **Frontend build**: Remove `VITE_ALLOW_DEV_LOGIN` from build env — may need rebuild + redeploy of static assets

</code_context>

<specifics>
## Specific Ideas

- User wants u2living-related domain — all config placeholders should use `<DOMAIN>` until confirmed
- Enterprise WeChat app already exists — no app creation needed, just domain config update
- User needs detailed guide for WeChat Work admin console steps (not familiar with the UI)
- Zero-downtime cutover — DNS propagation first, then SSL, then config switch with Nginx graceful reload
- IP access after cutover redirects to domain (301) — not blocked

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-domain-ssl-launch*
*Context gathered: 2026-04-14*
