# Phase 15: Observability & Performance (Gap Closure) - Research

**Researched:** 2026-04-03
**Domain:** CI/CD dependency security scanning (QUAL-01 gap closure)
**Confidence:** HIGH

## Summary

Phase 15 (Observability & Performance) completed 4/5 success criteria. The sole gap is QUAL-01: "Dependency security scanning integrated in CI/CD pipeline." The project already has a working `.github/workflows/ci.yml` that runs lint, typecheck, tests, and builds for both backend and frontend. The gap closure requires adding a dependency scanning job to this existing workflow.

The project has separate `backend/` and `frontend/` directories, each with independent `pnpm-lock.yaml` files (not a pnpm workspace). Current `pnpm audit` results show 59 backend vulnerabilities (3 critical, 32 high) and 15 frontend vulnerabilities (11 high). Most are transitive dependency issues (e.g., `cos-nodejs-sdk-v5 > form-data`, `ts-jest > handlebars`). The `--audit-level` flag in pnpm has a known bug where it always returns exit code 0 regardless of findings, making `audit-ci` (by IBM) the correct tool for CI gating. Additionally, Dependabot should be configured for automated PR-based vulnerability updates.

**Primary recommendation:** Add `audit-ci` with `high` severity threshold to existing CI workflow + Dependabot config for both directories. Use `continue-on-error: true` initially to avoid blocking existing workflow on known transitive vulnerabilities.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | Dependency security scanning integrated in CI/CD pipeline | audit-ci job in ci.yml + dependabot.yml for automated PR updates |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

### From Project CLAUDE.md
- Tech stack: NestJS + TypeScript + Prisma + MySQL + Redis (backend), React 18 + TypeScript + Vite + Ant Design (frontend)
- Package manager: pnpm (not npm)
- Code comments: pure English only
- Verification: `pnpm build && pnpm test && pnpm lint && npx tsc --noEmit` (backend), `pnpm build && pnpm test && pnpm lint && pnpm typecheck` (frontend)
- API path: `/api/v1`

### From Project Rules
- Feature branch per phase, PR-based merge workflow
- Commit message format: `<type>(<phase>-<plan>): <description>` for GSD projects

### From ROADMAP
- Phase 15 (Containerization & Quality) has INFRA-05 covering CI/CD deploy stage -- the CI workflow created here MUST be designed to be extended later with Docker build/push/deploy stages
- Deployment target: Tencent Cloud (not AWS/GCP)

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| audit-ci | 7.1.0 | CI dependency scanning with severity threshold gating | IBM-maintained, supports pnpm natively, correct exit codes (unlike pnpm audit --audit-level), allowlisting by GHSA ID |
| GitHub Dependabot | built-in | Automated dependency update PRs | Free, native GitHub integration, supports pnpm, handles separate directories |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pnpm/action-setup | v4 | pnpm installation in CI | Already used in existing ci.yml |
| actions/setup-node | v4 | Node.js setup with caching | Already used in existing ci.yml; add cache: 'pnpm' + cache-dependency-path |
| actions/checkout | v4 | Repository checkout | Already used in existing ci.yml |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| audit-ci | pnpm audit (raw) | pnpm audit --audit-level has exit code bug (always returns 0); pnpm audit without --audit-level returns 1 for ANY vulnerability -- no threshold control |
| audit-ci | Snyk | Requires account/token, more complex setup, overkill for this project scale |
| Dependabot | Renovate | More powerful but requires app installation; Dependabot is simpler and free for GitHub |

## Architecture Patterns

### Recommended CI Workflow Structure

The existing ci.yml already has `backend` and `frontend` jobs. Add a `security` job that runs in parallel.

```yaml
# Existing structure (keep as-is):
# jobs:
#   backend:   (lint, typecheck, test, build)
#   frontend:  (lint, typecheck, test, build)
#
# NEW addition:
#   security:  (audit-ci for backend + frontend)
```

### Pattern 1: audit-ci with Configuration File

**What:** Run audit-ci via `pnpm dlx` with a shared configuration file per directory
**When to use:** When you need threshold-based dependency scanning with allowlisting
**Example:**

```yaml
# .github/workflows/ci.yml - security job
security:
  name: Security Audit
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Install pnpm
      uses: pnpm/action-setup@v4
      with:
        version: 10

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 22

    - name: Audit backend dependencies
      working-directory: backend
      run: pnpm install --frozen-lockfile && pnpm dlx audit-ci@^7 --high --config ../audit-ci.jsonc

    - name: Audit frontend dependencies
      working-directory: frontend
      run: pnpm install --frozen-lockfile && pnpm dlx audit-ci@^7 --high --config ../audit-ci.jsonc
```

### Pattern 2: audit-ci Configuration File

**What:** Shared configuration for severity threshold and allowlisted advisories
**When to use:** To maintain a single source of truth for audit policy

```jsonc
// audit-ci.jsonc (project root)
{
  "$schema": "https://github.com/IBM/audit-ci/raw/main/docs/schema.json",
  "high": true,
  "allowlist": [
    // Transitive via cos-nodejs-sdk-v5 > request > form-data
    // No direct fix available; cos-nodejs-sdk-v5 pins old request
    "GHSA-fjxv-7rqg-78g4",
    // Transitive via cos-nodejs-sdk-v5 > fast-xml-parser
    "GHSA-m7jm-9gc2-mpf2",
    // Transitive via ts-jest > handlebars (devDependency only)
    "GHSA-442j-39wm-28r2"
  ]
}
```

### Pattern 3: Dependabot for Separate Directories

**What:** Configure Dependabot to monitor both backend/ and frontend/ independently
**When to use:** For automated dependency update PRs

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### Pattern 4: CI Caching Optimization

**What:** Add pnpm store caching to reduce CI install time
**When to use:** When CI jobs install dependencies

The existing ci.yml does NOT use caching. Adding `cache: 'pnpm'` to `actions/setup-node` and providing `cache-dependency-path` will speed up all CI jobs.

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: 'pnpm'
    cache-dependency-path: backend/pnpm-lock.yaml  # or frontend/pnpm-lock.yaml
```

### Anti-Patterns to Avoid

- **Using `pnpm audit --audit-level` as CI gate:** Exit code is always 0 due to pnpm bug. Use audit-ci instead.
- **Blocking CI on ALL vulnerabilities:** With 59 backend and 15 frontend vulnerabilities (mostly transitive), blocking on everything would make CI permanently red. Use `high` threshold + allowlist for known unfixable transitive deps.
- **Running audit after install without --frozen-lockfile:** Could modify lock file during CI, masking real dependency state.
- **Separate workflow file for security:** Keep it in the same ci.yml for maintainability and to ensure it runs on same triggers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CI dependency scanning with threshold | Custom script parsing pnpm audit JSON | audit-ci | Handles exit codes correctly, supports allowlisting, pnpm-native |
| Automated dependency updates | Manual periodic checks | Dependabot | Automated PRs, groups minor/patch, zero maintenance |
| CI caching | Manual cache key management | actions/setup-node cache: 'pnpm' | Built-in support, automatic cache key from lock file |

## Common Pitfalls

### Pitfall 1: pnpm audit --audit-level Exit Code Bug
**What goes wrong:** CI never fails because `pnpm audit --audit-level high` returns exit code 0 even with critical vulnerabilities
**Why it happens:** Known pnpm bug -- the `--audit-level` flag filters display output but does NOT affect exit code
**How to avoid:** Use `audit-ci` instead, which correctly exits non-zero when threshold is exceeded
**Warning signs:** CI "passes" security check but `pnpm audit` locally shows critical vulnerabilities

### Pitfall 2: Transitive Dependency Noise
**What goes wrong:** CI permanently fails due to vulnerabilities in deep transitive dependencies you cannot fix (e.g., `cos-nodejs-sdk-v5 > request > form-data`)
**Why it happens:** Direct dependency (`cos-nodejs-sdk-v5`) pins old versions of its dependencies; you cannot upgrade them
**How to avoid:** Use audit-ci allowlist with GHSA IDs for verified-unfixable transitive vulnerabilities. Add comments explaining why each is allowlisted.
**Warning signs:** Same vulnerabilities appearing in every CI run with no available fix

### Pitfall 3: No cache-dependency-path for Separate Lock Files
**What goes wrong:** `actions/setup-node` with `cache: 'pnpm'` fails because it looks for `pnpm-lock.yaml` in project root, which does not exist
**Why it happens:** This project has lock files in `backend/` and `frontend/`, not root
**How to avoid:** Always specify `cache-dependency-path` pointing to the specific lock file
**Warning signs:** CI warning "Could not determine pnpm store path" or cache misses

### Pitfall 4: Dependabot + pnpm Without Root package.json
**What goes wrong:** Dependabot fails to update because it expects `package.json` at the directory root
**Why it happens:** Known Dependabot issue with pnpm when no root package.json exists
**How to avoid:** Configure separate `directory: "/backend"` and `directory: "/frontend"` entries pointing to actual package.json locations
**Warning signs:** Dependabot PRs never appear or fail with cryptic errors

### Pitfall 5: Security Job Blocking Unrelated PRs
**What goes wrong:** Feature PRs cannot merge because a newly disclosed CVE fails the security job
**Why it happens:** New advisory published between dependency update and PR creation
**How to avoid:** Initially use `continue-on-error: true` on the security job, or separate it as a non-required check. Graduate to required once allowlist is stable.
**Warning signs:** Multiple PRs blocked simultaneously by the same unrelated vulnerability

## Code Examples

### Complete ci.yml with Security Job

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend:
    name: Backend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          cache-dependency-path: backend/pnpm-lock.yaml

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Unit tests
        run: pnpm exec jest --passWithNoTests

      - name: Build
        run: pnpm build

  frontend:
    name: Frontend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          cache-dependency-path: frontend/pnpm-lock.yaml

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Unit tests
        run: pnpm test

      - name: Build
        run: pnpm build

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    # Non-blocking initially; graduate to required once allowlist is stable
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install backend dependencies
        working-directory: backend
        run: pnpm install --frozen-lockfile

      - name: Audit backend
        working-directory: backend
        run: pnpm dlx audit-ci@^7 --config ../audit-ci.jsonc

      - name: Install frontend dependencies
        working-directory: frontend
        run: pnpm install --frozen-lockfile

      - name: Audit frontend
        working-directory: frontend
        run: pnpm dlx audit-ci@^7 --config ../audit-ci.jsonc
```

### audit-ci.jsonc Configuration

```jsonc
{
  "$schema": "https://github.com/IBM/audit-ci/raw/main/docs/schema.json",
  "high": true,
  "allowlist": [
    // cos-nodejs-sdk-v5 > request > form-data: unsafe random boundary
    // Unfixable: cos-nodejs-sdk-v5 pins old request@2.x
    "GHSA-fjxv-7rqg-78g4",
    // cos-nodejs-sdk-v5 > fast-xml-parser: entity encoding bypass
    // Unfixable: cos-nodejs-sdk-v5 pins old fast-xml-parser
    "GHSA-m7jm-9gc2-mpf2",
    // ts-jest > handlebars: JS injection via AST type confusion
    // devDependency only, not in production bundle
    "GHSA-442j-39wm-28r2"
  ]
}
```

### dependabot.yml Configuration

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm audit / pnpm audit raw | audit-ci with GHSA-based allowlisting | audit-ci v6+ (2023) | Stable advisory IDs instead of volatile npm IDs |
| Manual dependency checks | Dependabot + audit-ci in CI | Native since GitHub 2023 | Automated PR creation + CI gating |
| Snyk for OSS projects | audit-ci + Dependabot | 2024-2025 | Free, no external service dependency, same effectiveness for known CVEs |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | GitHub Actions (CI workflow) |
| Config file | `.github/workflows/ci.yml` |
| Quick run command | `pnpm dlx audit-ci@^7 --high --config audit-ci.jsonc` (run locally in backend/ or frontend/) |
| Full suite command | `git push` to trigger full CI pipeline |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | CI pipeline includes dependency security scanning | smoke | Push to branch, verify security job runs in Actions tab | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** Local `pnpm dlx audit-ci@^7 --high --config audit-ci.jsonc` in both directories
- **Per wave merge:** Full CI run on PR
- **Phase gate:** Security job runs and reports results (continue-on-error initially)

### Wave 0 Gaps
- [ ] `.github/workflows/ci.yml` -- security job does not exist yet
- [ ] `audit-ci.jsonc` -- configuration file does not exist
- [ ] `.github/dependabot.yml` -- Dependabot configuration does not exist

## Open Questions

1. **Should security job be a required check for PR merge?**
   - What we know: Currently 59 backend + 15 frontend vulnerabilities exist, most transitive and unfixable
   - What's unclear: Whether the allowlist covers all unfixable cases without suppressing real risks
   - Recommendation: Start with `continue-on-error: true`, review after 2 weeks, then graduate to required check once allowlist stabilizes

2. **Should devDependency vulnerabilities be scanned?**
   - What we know: audit-ci has `--skip-dev` flag; some vulnerabilities (handlebars via ts-jest) are dev-only
   - What's unclear: Whether dev dependency vulnerabilities pose real risk in this project
   - Recommendation: Scan all dependencies (do NOT skip dev) -- devDependencies execute during CI build and could be exploited in supply chain attacks. Allowlist specific known-safe ones.

## Sources

### Primary (HIGH confidence)
- pnpm audit CLI docs: https://pnpm.io/cli/audit -- flags, options, behavior
- audit-ci GitHub: https://github.com/IBM/audit-ci -- configuration, pnpm support, allowlisting
- Local `pnpm audit` execution -- verified exit code behavior and vulnerability counts
- Existing `.github/workflows/ci.yml` -- verified current CI structure

### Secondary (MEDIUM confidence)
- pnpm CI guide: https://pnpm.io/continuous-integration -- GitHub Actions caching patterns
- actions/setup-node docs: https://github.com/actions/setup-node -- cache-dependency-path for monorepos
- GitHub Dependabot changelog: https://github.blog/changelog/2025-02-04-dependabot-now-supports-pnpm-workspace-catalogs-ga/ -- pnpm support status

### Tertiary (LOW confidence)
- pnpm/pnpm#11163 -- audit-level exit code bug (reported but not yet confirmed fixed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- audit-ci is well-documented, verified locally, IBM-maintained
- Architecture: HIGH -- extending existing ci.yml with known patterns, verified caching approach
- Pitfalls: HIGH -- pnpm audit exit code bug verified locally with actual project data

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain, audit-ci v7 is mature)
