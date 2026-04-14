---
phase: 17-domain-ssl-launch
plan: 02
subsystem: infra
tags: [nginx, ssl, tls, letsencrypt, certbot, https, wechat-work, docker]

# Dependency graph
requires:
  - phase: 16-production-deployment
    provides: Phase A deployment with HTTP-only Nginx and docker-compose
provides:
  - HTTPS Nginx config with TLS 1.2+, security headers, HTTP-to-HTTPS redirect, IP-to-domain redirect
  - docker-compose.prod.yml with port 443, letsencrypt volume, certbot-webroot volume
  - Complete DEPLOY.md Phase B guide with certbot webroot zero-downtime SSL and WeChat Work admin console steps
affects: [17-domain-ssl-launch]

# Tech tracking
tech-stack:
  added: [certbot-webroot, letsencrypt]
  patterns: [webroot-ssl-renewal, hsts-gradual-rollout, domain-placeholder-config]

key-files:
  modified:
    - nginx/conf.d/default.conf
    - docker-compose.prod.yml
    - docs/DEPLOY.md

key-decisions:
  - "Certbot webroot plugin over standalone for zero-downtime certificate acquisition"
  - "HSTS gradual rollout: 86400s test phase then 63072000s production"
  - "Temporary self-signed cert bootstrap to allow Nginx HTTPS block to start before real cert"
  - "OCSP stapling explicitly excluded due to Let's Encrypt ending OCSP support (Aug 2025)"

patterns-established:
  - "Webroot SSL renewal: certbot writes to Docker named volume, Nginx serves ACME challenges"
  - "Domain placeholder pattern: <DOMAIN> in config files, sed replace on deploy"

requirements-completed: [DEPLOY-03, DEPLOY-04, DEPLOY-05]

# Metrics
duration: 5min
completed: 2026-04-14
---

# Phase 17 Plan 02: HTTPS Infrastructure Configuration Summary

**Nginx HTTPS config with TLS 1.2+, certbot webroot zero-downtime SSL, and comprehensive DEPLOY.md Phase B guide including WeChat Work admin console step-by-step instructions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-14T04:19:27Z
- **Completed:** 2026-04-14T04:24:27Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Nginx config with 3 server blocks: HTTP domain redirect with ACME challenge, HTTP catch-all for IP redirect, HTTPS main server with full TLS configuration
- docker-compose.prod.yml updated with port 443 exposure, Let's Encrypt certificate volume mount, and certbot-webroot named volume
- DEPLOY.md Phase B completely rewritten (both EN and CN sections) with certbot webroot zero-downtime workflow, WeChat Work admin console guide, env var instructions, and HSTS gradual rollout

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Nginx config for HTTPS + docker-compose for port 443 and cert volumes** - `8d0a428` (feat)
2. **Task 2: Rewrite DEPLOY.md Phase B with detailed certbot webroot + WeChat Work admin guide** - `5fe5ac5` (docs)

## Files Created/Modified
- `nginx/conf.d/default.conf` - Complete HTTPS config with 3 server blocks, TLS 1.2+, Mozilla Intermediate cipher suite, security headers, ACME challenge location
- `docker-compose.prod.yml` - Added port 443, /etc/letsencrypt volume, certbot-webroot named volume
- `docs/DEPLOY.md` - Rewrote Phase B sections 3.1-3.9 (EN + CN), updated Phase A verify and UAT checklist to remove dev login references

## Decisions Made
- Used certbot webroot plugin (not standalone) for zero-downtime SSL certificate acquisition -- standalone requires stopping Nginx
- HSTS configured with gradual rollout: commented out by default, Phase 1 at 86400s (1 day), Phase 2 at 63072000s (2 years) -- avoids locking users out if SSL misconfigured
- Temporary self-signed certificate bootstrap pattern to allow Nginx HTTPS server block to start before real Let's Encrypt cert is obtained
- Explicitly excluded OCSP stapling with a code comment noting Let's Encrypt ended OCSP support in August 2025

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before Phase B deployment:**

- **Tencent Cloud Lighthouse:** Add port 443 (HTTPS) to firewall rules
- **Tencent Cloud DNS:** A record pointing domain to server IP
- **WeChat Work Admin Console:** Set trusted domain, download verification file, configure OAuth callback URL, add IP whitelist
- **Server .env:** Update WEWORK_REDIRECT_URI, CORS_ORIGINS, BASE_URL, FORCE_HTTPS_COOKIES, BOSS_WEWORK_IDS

See docs/DEPLOY.md sections 3.1 through 3.6 for step-by-step instructions.

## Known Stubs

None -- all configuration files are complete with `<DOMAIN>` placeholder ready for find-replace deployment.

## Next Phase Readiness
- Infrastructure config files ready for Phase B deployment
- DEPLOY.md provides complete guide for domain replacement, SSL setup, and WeChat Work configuration
- Blocked on: domain purchase + ICP filing approval (user action required)

---
*Phase: 17-domain-ssl-launch*
*Completed: 2026-04-14*
