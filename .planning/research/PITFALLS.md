# Pitfalls Research

**Domain:** Brownfield remediation — NestJS + React + Prisma + MySQL supply chain management system
**Researched:** 2026-03-17
**Confidence:** HIGH (based on direct codebase analysis, not generic advice)

## Critical Pitfalls

### Pitfall 1: OrderItem.fabricId Hard FK Makes Multi-Category Expansion a Schema Rewrite

**What goes wrong:**
The current `OrderItem` model has `fabricId Int @map("fabric_id")` as a non-nullable foreign key directly to `Fabric`. When M2 adds iron frames, motors, and hardware as separate product tables, every order item can only reference one product type. Teams typically respond by making `fabricId` nullable and adding `ironFrameId Int?`, `motorId Int?` — resulting in a "nullable FK jungle" where exactly one FK must be set per row, enforced only in application code.

**How to avoid:**
Before writing any M2 code, decide on a product abstraction strategy:
1. **Polymorphic product reference**: Add `productType String` + `productId Int` to `OrderItem`, drop `fabricId` FK
2. **Abstract product table**: Create a `Product` table that all categories reference via `productId`

**Phase to address:** M2 Phase 1 (schema design) — must be the first decision before any code.

---

### Pitfall 2: COS Migration Breaks Existing File URL Records in Database

**What goes wrong:**
Current `File.url` stores `http://localhost:3000/uploads/{uuid}.jpg`. After COS migration, new uploads get COS URLs. Existing DB records become stale broken links. COS SDK (`cos-nodejs-sdk-v5`) is not even installed yet.

**How to avoid:**
1. Store only the key, not the full URL — generate URLs at read time
2. Write a one-time migration script for existing records
3. Add `storageType String @default("local")` to identify legacy records

**Phase to address:** M1 COS migration task — must include data migration strategy.

---

### Pitfall 3: Quote-to-Order Conversion Breaks Audit Trail Under Partial Failure

**What goes wrong:**
The stub must: create Order, create OrderItems, update Quote.status to CONVERTED, create Timeline entries. Without `$transaction`, partial failure leaves inconsistent state. Concurrent double-clicks create duplicate orders.

**How to avoid:**
- Wrap entire conversion in `prisma.$transaction(async (tx) => { ... })`
- Add unique constraint or optimistic lock for concurrent conversion prevention
- Write failure tests first (RED) before implementation

**Phase to address:** M1 quote-to-order implementation.

---

### Pitfall 4: Refactoring 700+ Line Components Without Extracting Business Logic First

**What goes wrong:**
Splitting JSX without extracting business logic creates prop-drilling hell. Component shrinks in lines but is more fragile.

**How to avoid:**
1. Extract custom hooks first (`useFabricDetailState()`)
2. Then split visual sections — each receives only what it needs from hooks
3. Test: page component should have zero `useState` calls

**Phase to address:** M1 component refactoring.

---

### Pitfall 5: `any` Type Removal Reveals Real Type Errors

**What goes wrong:**
97 `any` types hide that test mocks return incomplete objects. Removing them breaks the build.

**How to avoid:**
Create typed mock builder helpers before removing `any`:
```typescript
const mockFabric = (overrides?: Partial<Fabric>): Fabric => ({
  id: 1, fabricCode: 'FB-0001', name: 'Test', isActive: true,
  ...overrides,
});
```

**Phase to address:** M1 type safety task — mock builders before `any` removal.

---

### Pitfall 6: Real Business Data Exposes Import Service Assumptions

**What goes wrong:**
Real Chinese docs use merged cells, Chinese unit strings ("150米"), mixed encoding (GB2312). Silent row skips produce corrupt data.

**How to avoid:**
- Test against real documents from `/Users/qinyuan/Desktop/铂润测试资料/`
- Add per-row error reporting with row number and reason
- Add dry-run mode for validation without DB writes

**Phase to address:** M2 real data testing.

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| OrderItem FK jungle | M2 Phase 1: schema design | Count nullable FKs on OrderItem; if >1, flag |
| COS URL breaks | M1 COS migration | `SELECT count(*) FROM files WHERE url LIKE 'http://localhost%'` = 0 |
| Quote-to-order partial failure | M1 quote conversion | Concurrent POST returns 409 on second request |
| Component prop drilling | M1 refactoring | No sub-component has >5 props or `useState` |
| `any` removal build break | M1 type safety | Zero `as unknown` casts introduced |
| Import edge cases | M2 real data testing | Row count matches source for each test file |

---

## "Looks Done But Isn't" Checklist

- [ ] COS: SDK + upload works, but no migration for existing localhost URLs
- [ ] Quote-to-Order: Unit tests pass, but no concurrent conversion test
- [ ] `any` Removal: ESLint passes, but `as unknown as X` everywhere
- [ ] Multi-Category: New tables exist, but `fabricId` kept as nullable alongside new FKs
- [ ] Refactoring: File is 200 lines, but sub-components have 8+ props
- [ ] Import: Spec passes, but only programmatic Excel tested
- [ ] Real Data: Import succeeds, but order totals show 0.00

---
*Pitfalls research: 2026-03-17*
