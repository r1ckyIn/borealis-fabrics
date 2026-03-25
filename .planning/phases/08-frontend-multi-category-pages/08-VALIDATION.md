---
phase: 8
slug: frontend-multi-category-pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `frontend/vite.config.ts` |
| **Quick run command** | `cd frontend && pnpm test --run` |
| **Full suite command** | `cd frontend && pnpm build && pnpm test --run && pnpm lint && pnpm typecheck` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm test --run`
- **After every plan wave:** Run `cd frontend && pnpm build && pnpm test --run && pnpm lint && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| *Populated after planning* | | | | | | | |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing test infrastructure covers all phase requirements (vitest + @testing-library/react already configured)
- No new test framework or fixture setup needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar navigation renders SubMenu correctly | MCAT-10 | Visual layout verification | Open app, verify 产品管理 SubMenu with 5 sub-items |
| Category-specific form fields render correctly | MCAT-11 | Dynamic form visual verification | Create product for each subCategory, verify correct fields shown |
| Quote expandable rows display items inline | MCAT-12 | Complex table interaction | View quote list, expand row, verify QuoteItem details visible |
| Unified search shows category tags | MCAT-11 | Dropdown visual styling | Open OrderItemForm, search product, verify category tags |
| Partial quote conversion UI | MCAT-12 | Multi-step interaction flow | Select QuoteItems via checkbox, click 转化为订单, verify conversion |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
