# Retrospective

## Milestone: v1.0 — Borealis Supply Chain Management

**Shipped:** 2026-03-28
**Phases:** 12 | **Plans:** 40 | **Tasks:** 84
**Timeline:** 58 days (2026-01-29 → 2026-03-28)
**LOC:** 73,271 TypeScript

### What Was Built

- Full CRUD for 7 entity types with multi-category product support (fabric, iron frame, motor, hardware)
- Quote-to-order batch conversion with Redis distributed locking and item-level partial conversion
- Excel import engine with 5 strategies (auto-detected from headers) + dry-run mode
- Payment voucher mandatory upload with append-only audit trail
- Frontend component decomposition (815L → 169L pages with custom hooks)
- Real data validation with company documents + UAT bug fixes

### What Worked

- **Fix-first-expand-second (M1 → M2):** Stabilizing broken features in M1 enabled smooth M2 feature expansion with no regression
- **Strategy pattern for imports:** Adding new import types (purchase order, sales contract, product) was clean — one class per strategy, auto-detection from headers
- **Component decomposition before feature expansion:** Decomposed pages in Phase 3-4 made Phase 8 frontend work much cleaner
- **GSD workflow + TDD discipline:** Structured plan → execute → verify loop caught integration issues early
- **Milestone audit:** Caught 3 integration gaps that would have been missed without systematic audit

### What Was Inefficient

- **Phase 02 VERIFICATION.md missing:** No verification artifact for core features; had to rely on "proven by later phases" during audit
- **SalesContractImportStrategy real-file issues:** Unit tests passed but real file parsing failed — test fixtures didn't match actual document format closely enough
- **Phase 09 grew from 3 to 5 plans:** Gap closure plans (09-04, 09-05) added mid-phase when initial data testing revealed issues — better upfront research would have avoided this
- **State.md Key Decisions Log grew to 80+ entries:** Should have been pruned during milestone; most decisions are archived in phase SUMMARY.md files

### Patterns Established

- `getErrorMessage()` / `getDeleteErrorMessage()` — standardized error display across all pages
- `fabricId XOR productId` with DB CHECK + DTO + service enforcement — multi-reference pattern
- Config-driven form fields per subCategory — extensible product UI
- `UnifiedProductSelector` with composite value format (`fabric:N`/`product:N`) — multi-entity search
- Import Strategy pattern with `getExistingKeys()` → `validateRow()` → `processRow()` lifecycle

### Key Lessons

- **Real data testing should happen earlier:** Phase 9 found format issues that required 2 extra gap closure plans. Testing with real documents mid-milestone would catch these sooner.
- **Milestone audit is essential:** Automated audit found integration gaps (product import tab, error message consistency) that manual review missed.
- **Don't skip VERIFICATION.md:** Phase 02's missing verification made audit harder. Every phase should generate verification artifacts immediately.
- **Tech debt tracking works:** Recording tech debt in audit and deferring non-critical items to v2 kept the milestone focused.

### Cost Observations

- Sessions: ~35 sessions across 58 days
- Notable: Wave-based parallel execution in Phase 8 (5 plans) was most efficient phase

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 12 |
| Plans | 40 |
| Tasks | 84 |
| LOC | 73,271 |
| Timeline (days) | 58 |
| Requirements satisfied | 53/53 (100%) |
| Gap closure phases | 2 (Phase 10 UAT, Phase 11 audit gaps) |
| Tech debt items deferred | 3 (DEBT-01~03) |
