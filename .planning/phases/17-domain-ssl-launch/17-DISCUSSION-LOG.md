# Phase 17: Domain & SSL Launch (Phase B) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 17-domain-ssl-launch
**Areas discussed:** Domain & ICP, Dev login cleanup, WeChat Work OAuth, Cutover process

---

## Domain & ICP Status

| Option | Description | Selected |
|--------|-------------|----------|
| Already ready | Domain purchased, ICP filed, can start immediately | |
| Domain bought but ICP pending | Domain available but ICP in progress, can prepare code | |
| Neither started | Domain and ICP not started, discuss plan for preparation | ✓ |

**User's choice:** Neither started
**Notes:** Will purchase on Tencent Cloud (same platform as server). Domain preference: u2living-related.

### Domain platform

| Option | Description | Selected |
|--------|-------------|----------|
| Tencent Cloud (Recommended) | Server already on Tencent Cloud, one-stop management | ✓ |
| Alibaba Cloud | Domain on Alibaba, need DNS pointing to Tencent server | |
| Other platform | Other domain registrar | |

**User's choice:** Tencent Cloud

### Domain name preference

| Option | Description | Selected |
|--------|-------------|----------|
| Not decided yet | Use placeholder, replace later | |
| Have candidates | User has specific domain ideas | ✓ |

**User's choice:** u2living-related domain
**Notes:** User specified "u2living相关的"

---

## Dev Login Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Completely delete code (Recommended) | Remove devLogin endpoint, ALLOW_DEV_LOGIN code, Dev Login button. Clean and secure | ✓ |
| Keep but disable | Code preserved, production doesn't set ALLOW_DEV_LOGIN. Convenient for future debugging | |
| Move to separate branch | Delete from main, keep in dev branch for future use | |

**User's choice:** Completely delete code
**Notes:** Clean removal preferred, no security risk left behind

---

## WeChat Work OAuth Configuration

### Familiarity with WeChat Work admin console

| Option | Description | Selected |
|--------|-------------|----------|
| Familiar, I'll configure | User knows how to set trusted domain and callback URL | |
| Need guidance | User wants step-by-step guide in DEPLOY.md | ✓ |
| Not sure | Never accessed WeChat Work admin, needs detailed steps | |

**User's choice:** Need guidance
**Notes:** Claude should write detailed steps in DEPLOY.md

### App creation status

| Option | Description | Selected |
|--------|-------------|----------|
| Already created | CORP_ID and AGENT_ID available, just update domain config | ✓ |
| Not created | Need to create enterprise WeChat app from scratch | |

**User's choice:** Already created

---

## Cutover Process

### Downtime tolerance

| Option | Description | Selected |
|--------|-------------|----------|
| Acceptable downtime (Recommended) | Maintenance window, one-shot DNS+SSL+env+restart. Simple and reliable | |
| Zero downtime | DNS first, then SSL, then smooth switch. More complex but no interruption | ✓ |

**User's choice:** Zero downtime

### IP access after cutover

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to domain (Recommended) | Nginx 301 redirect from IP to https://<domain> | ✓ |
| Reject | Nginx returns 444 (drop connection) for IP access | |
| Keep accessible | Both IP and domain work, only domain has HTTPS | |

**User's choice:** Redirect to domain

---

## Claude's Discretion

- Certbot installation method and auto-renewal setup
- Nginx SSL configuration (TLS versions, cipher suites, OCSP stapling)
- HSTS configuration details
- Nginx server block structure

## Deferred Ideas

None — discussion stayed within phase scope
