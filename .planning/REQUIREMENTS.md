# Requirements: Borealis Supply Chain Management

**Defined:** 2026-03-17
**Core Value:** All business documents can be imported, tracked, and queried in one place for the trading team

## v1 Requirements

Requirements for M1 (Code Remediation) + M2 (Feature Expansion + Real Data Testing).

### Bug Fix (BUGF)

- [ ] **BUGF-01**: All frontend buttons respond correctly without console errors
- [ ] **BUGF-02**: All frontend forms submit successfully and save data to backend
- [ ] **BUGF-03**: All frontend list pages load data with correct pagination
- [ ] **BUGF-04**: All frontend detail pages display complete entity data
- [ ] **BUGF-05**: Frontend API calls match backend endpoint signatures (path, params, body)
- [ ] **BUGF-06**: Frontend error messages display user-friendly Chinese text, not raw error objects

### Core Feature Fix (FEAT)

- [ ] **FEAT-01**: Quote-to-order conversion works end-to-end with transaction safety
- [ ] **FEAT-02**: Quote-to-order prevents duplicate conversion (concurrent request protection)
- [ ] **FEAT-03**: File upload uses Tencent COS SDK instead of local storage
- [ ] **FEAT-04**: Existing file URL records migrated from localhost to COS
- [ ] **FEAT-05**: File URLs use key-only storage with read-time URL generation

### Code Quality (QUAL)

- [ ] **QUAL-01**: OrderService decomposed into OrderService + OrderItemService + OrderPaymentService
- [ ] **QUAL-02**: ImportService refactored with Strategy pattern (FabricImportStrategy, SupplierImportStrategy)
- [ ] **QUAL-03**: FabricDetailPage (769L) refactored: custom hooks extracted, sub-components split
- [ ] **QUAL-04**: CustomerDetailPage (658L) refactored: custom hooks extracted, sub-components split
- [ ] **QUAL-05**: OrderItemsSection (652L) refactored: custom hooks extracted, sub-components split
- [ ] **QUAL-06**: Backend test `any` types eliminated with typed mock builders (97 instances)
- [ ] **QUAL-07**: Frontend test `any` types eliminated (13 instances)
- [ ] **QUAL-08**: No sub-component has more than 5 props after refactoring
- [ ] **QUAL-09**: All refactored page components have zero `useState` calls (state in hooks)

### Test Coverage (TEST)

- [ ] **TEST-01**: Quote-to-order conversion has unit + integration tests including failure paths
- [ ] **TEST-02**: Quote-to-order concurrent conversion test (returns 409 on duplicate)
- [ ] **TEST-03**: COS upload/download integration tests
- [ ] **TEST-04**: Path traversal edge case tests (URL-encoded, unicode normalization, double-encoding)
- [ ] **TEST-05**: Import service tests with malformed Excel (merged cells, blank rows, encoding)
- [ ] **TEST-06**: Frontend error handling tests for unexpected API response formats
- [ ] **TEST-07**: All existing tests continue passing after refactoring (608 backend + 753 frontend)

### Multi-Category (MCAT)

- [ ] **MCAT-01**: Product abstraction schema designed and migrated (products table + category enum)
- [ ] **MCAT-02**: Iron frame CRUD with model numbers, specifications, and pricing
- [ ] **MCAT-03**: Motor CRUD with channel configurations and pricing
- [ ] **MCAT-04**: Hardware/accessories CRUD with specifications and pricing
- [ ] **MCAT-05**: Product import templates for each new category
- [ ] **MCAT-06**: ProductImportStrategy integrated into ImportService
- [ ] **MCAT-07**: OrderItem extended with productId FK (nullable, exactly-one guard with fabricId)
- [ ] **MCAT-08**: Quote extended to support non-fabric products
- [ ] **MCAT-09**: Product code generation (category-specific prefixes via CodeGeneratorService)
- [ ] **MCAT-10**: Frontend product list page with category filter
- [ ] **MCAT-11**: Frontend product detail/edit pages for each category
- [ ] **MCAT-12**: Frontend order form supports selecting products from any category

### OCR & Data Testing (DATA)

- [ ] **DATA-01**: `/contract-ocr` Claude Code skill reads PDF and outputs importable Excel
- [ ] **DATA-02**: OCR skill handles Chinese business document formats (PI, PO, contracts)
- [ ] **DATA-03**: Manual entry test: create supplier, customer, fabric, quote, order with real data
- [ ] **DATA-04**: Excel import test: import real fabric price list (面料价格明细2025.8.15.xlsx)
- [ ] **DATA-05**: Excel import test: import real iron frame/motor price list (铁架电机价格2025.xlsx)
- [ ] **DATA-06**: Excel import test: import real purchase order (海宁优途-采购单)
- [ ] **DATA-07**: System stability: all pages load correctly after bulk data import
- [ ] **DATA-08**: Import result shows per-row failure details (row number + reason)
- [ ] **DATA-09**: Import dry-run mode validates without writing to DB

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Deployment

- **DEPL-01**: Deploy backend to Tencent Cloud lightweight server
- **DEPL-02**: Deploy frontend to Tencent Cloud COS/CDN
- **DEPL-03**: Configure CDB (MySQL) and Redis on Tencent Cloud
- **DEPL-04**: HTTPS certificate and production security configuration

### Advanced Features

- **ADV-01**: Dashboard with business analytics (order volume, revenue, top customers)
- **ADV-02**: Batch operations (bulk status update, bulk import)
- **ADV-03**: Export to Excel (order lists, financial reports)
- **ADV-04**: Notification system (order status change alerts)
- **ADV-05**: Audit log for sensitive operations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Document generation (PI/PO/delivery notes) | Only import and manage; generated by existing external tools |
| Coating/processing as category | Stored as remarks field, not a product category |
| Mobile app | Desktop-first for small team |
| Multi-tenant | Single company (铂润 = U2Living) |
| Real-time chat | Not needed for trading workflow |
| Automated payment reconciliation | MVP tracks manually, only reminders |
| Multi-language i18n | Chinese-only for domestic team |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUGF-01 | TBD | Pending |
| BUGF-02 | TBD | Pending |
| BUGF-03 | TBD | Pending |
| BUGF-04 | TBD | Pending |
| BUGF-05 | TBD | Pending |
| BUGF-06 | TBD | Pending |
| FEAT-01 | TBD | Pending |
| FEAT-02 | TBD | Pending |
| FEAT-03 | TBD | Pending |
| FEAT-04 | TBD | Pending |
| FEAT-05 | TBD | Pending |
| QUAL-01 | TBD | Pending |
| QUAL-02 | TBD | Pending |
| QUAL-03 | TBD | Pending |
| QUAL-04 | TBD | Pending |
| QUAL-05 | TBD | Pending |
| QUAL-06 | TBD | Pending |
| QUAL-07 | TBD | Pending |
| QUAL-08 | TBD | Pending |
| QUAL-09 | TBD | Pending |
| TEST-01 | TBD | Pending |
| TEST-02 | TBD | Pending |
| TEST-03 | TBD | Pending |
| TEST-04 | TBD | Pending |
| TEST-05 | TBD | Pending |
| TEST-06 | TBD | Pending |
| TEST-07 | TBD | Pending |
| MCAT-01 | TBD | Pending |
| MCAT-02 | TBD | Pending |
| MCAT-03 | TBD | Pending |
| MCAT-04 | TBD | Pending |
| MCAT-05 | TBD | Pending |
| MCAT-06 | TBD | Pending |
| MCAT-07 | TBD | Pending |
| MCAT-08 | TBD | Pending |
| MCAT-09 | TBD | Pending |
| MCAT-10 | TBD | Pending |
| MCAT-11 | TBD | Pending |
| MCAT-12 | TBD | Pending |
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| DATA-03 | TBD | Pending |
| DATA-04 | TBD | Pending |
| DATA-05 | TBD | Pending |
| DATA-06 | TBD | Pending |
| DATA-07 | TBD | Pending |
| DATA-08 | TBD | Pending |
| DATA-09 | TBD | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 0
- Unmapped: 43 ⚠️

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after initial definition*
