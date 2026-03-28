---
phase: 05
slug: multi-category-schema-product-crud
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (backend), vitest (frontend) |
| **Config file** | `backend/jest.config.ts`, `frontend/vite.config.ts` |
| **Quick run command** | `cd backend && pnpm test -- --testPathPattern=product` |
| **Full suite command** | `cd backend && pnpm build && pnpm test && pnpm lint` |
| **Estimated runtime** | ~30 seconds (quick), ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && pnpm test -- --testPathPattern=product`
- **After every plan wave:** Run `cd backend && pnpm build && pnpm test && pnpm lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | MCAT-01 | unit | `pnpm test -- --testPathPattern=product.service` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MCAT-02 | unit | `pnpm test -- --testPathPattern=product.service` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MCAT-03 | unit | `pnpm test -- --testPathPattern=product.service` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MCAT-04 | unit | `pnpm test -- --testPathPattern=product-bundle` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MCAT-09 | unit | `pnpm test -- --testPathPattern=code-generator` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/product/product.service.spec.ts` — stubs for MCAT-01~03
- [ ] `backend/src/product/product.controller.spec.ts` — stubs for CRUD endpoints
- [ ] `backend/src/product/product-bundle.service.spec.ts` — stubs for MCAT-04

*Existing test infrastructure (jest, supertest) covers all framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration safety | MCAT-01 | Requires real DB with existing fabric data | Run `prisma migrate dev`, verify fabric data intact |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
