# Requirements: Borealis Supply Chain Management

**Defined:** 2026-03-17
**Core Value:** All business documents can be imported, tracked, and queried in one place for the trading team

## v1 Requirements

Requirements for M1 (Code Remediation) + M2 (Feature Expansion + Real Data Testing).

### Bug Fix (BUGF)

- [x] **BUGF-01**: All frontend buttons respond correctly without console errors
- [x] **BUGF-02**: All frontend forms submit successfully and save data to backend
- [x] **BUGF-03**: All frontend list pages load data with correct pagination
- [x] **BUGF-04**: All frontend detail pages display complete entity data
- [x] **BUGF-05**: Frontend API calls match backend endpoint signatures (path, params, body)
- [x] **BUGF-06**: Frontend error messages display user-friendly Chinese text, not raw error objects

### Core Feature Fix (FEAT)

- [x] **FEAT-01**: Quote-to-order conversion works end-to-end with transaction safety
- [x] **FEAT-02**: Quote-to-order prevents duplicate conversion (concurrent request protection)
- [x] **FEAT-03**: File upload uses Tencent COS SDK instead of local storage
- [ ] **FEAT-04**: Existing file URL records migrated from localhost to COS
- [x] **FEAT-05**: File URLs use key-only storage with read-time URL generation

### Code Quality (QUAL)

- [x] **QUAL-01**: OrderService decomposed into OrderService + OrderItemService + OrderPaymentService
- [x] **QUAL-02**: ImportService refactored with Strategy pattern (FabricImportStrategy, SupplierImportStrategy)
- [x] **QUAL-03**: FabricDetailPage (769L) refactored: custom hooks extracted, sub-components split
- [x] **QUAL-04**: CustomerDetailPage (658L) refactored: custom hooks extracted, sub-components split
- [x] **QUAL-05**: OrderItemsSection (652L) refactored: custom hooks extracted, sub-components split
- [x] **QUAL-06**: Backend test `any` types eliminated with typed mock builders (97 instances)
- [x] **QUAL-07**: Frontend test `any` types eliminated (13 instances)
- [x] **QUAL-08**: No sub-component has more than 5 props after refactoring
- [x] **QUAL-09**: All refactored page components have zero `useState` calls (state in hooks)

### Test Coverage (TEST)

- [x] **TEST-01**: Quote-to-order conversion has unit + integration tests including failure paths
- [x] **TEST-02**: Quote-to-order concurrent conversion test (returns 409 on duplicate)
- [x] **TEST-03**: COS upload/download integration tests
- [x] **TEST-04**: Path traversal edge case tests (URL-encoded, unicode normalization, double-encoding)
- [x] **TEST-05**: Import service tests with malformed Excel (merged cells, blank rows, encoding)
- [x] **TEST-06**: Frontend error handling tests for unexpected API response formats
- [x] **TEST-07**: All existing tests continue passing after refactoring (608 backend + 753 frontend)

### Payment Voucher (PVOU) — Phase 04.1

- [x] **PVOU-01**: All payment status changes require at least one voucher file (backend returns 400 if missing)
- [x] **PVOU-02**: PaymentRecord created for every payment operation with voucher association in a single transaction
- [x] **PVOU-03**: Supported file types: JPG/PNG/WEBP images, PDF, Word (.doc/.docx), Excel (.xls/.xlsx)
- [x] **PVOU-04**: VoucherUploader component with drag-and-drop (Ant Design Upload.Dragger), file validation, immediate upload
- [x] **PVOU-05**: VoucherList component with file-type-aware actions (preview modal for images, new tab for PDF, download for Office)
- [x] **PVOU-06**: Append-only voucher policy — uploaded vouchers cannot be deleted or replaced
- [x] **PVOU-07**: Double enforcement — frontend disables save button when no vouchers + backend returns 400
- [x] **PVOU-08**: Customer and supplier vouchers displayed separately in their respective payment tabs

### Multi-Category (MCAT)

- [x] **MCAT-01**: Product abstraction schema designed and migrated (products table + category enum)
- [x] **MCAT-02**: Iron frame CRUD with model numbers, specifications, and pricing
- [x] **MCAT-03**: Motor CRUD with channel configurations and pricing
- [x] **MCAT-04**: Hardware/accessories CRUD with specifications and pricing
- [ ] **MCAT-05**: Product import templates for each new category
- [ ] **MCAT-06**: ProductImportStrategy integrated into ImportService
- [ ] **MCAT-07**: OrderItem extended with productId FK (nullable, exactly-one guard with fabricId)
- [ ] **MCAT-08**: Quote extended to support non-fabric products
- [x] **MCAT-09**: Product code generation (category-specific prefixes via CodeGeneratorService)
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
| BUGF-01 | Phase 1 | Complete |
| BUGF-02 | Phase 1 | Complete |
| BUGF-03 | Phase 1 | Complete |
| BUGF-04 | Phase 1 | Complete |
| BUGF-05 | Phase 1 | Complete |
| BUGF-06 | Phase 1 | Complete |
| FEAT-01 | Phase 2 | Complete |
| FEAT-02 | Phase 2 | Complete |
| FEAT-03 | Phase 2 | Complete |
| FEAT-04 | Phase 2 | Pending |
| FEAT-05 | Phase 2 | Complete |
| QUAL-01 | Phase 3 | Complete |
| QUAL-02 | Phase 3 | Complete |
| QUAL-03 | Phase 4 | Complete |
| QUAL-04 | Phase 4 | Complete |
| QUAL-05 | Phase 4 | Complete |
| QUAL-06 | Phase 3 | Complete |
| QUAL-07 | Phase 4 | Complete |
| QUAL-08 | Phase 4 | Complete |
| QUAL-09 | Phase 4 | Complete |
| TEST-01 | Phase 2 | Complete |
| TEST-02 | Phase 2 | Complete |
| TEST-03 | Phase 2 | Complete |
| TEST-04 | Phase 3 | Complete |
| TEST-05 | Phase 3 | Complete |
| TEST-06 | Phase 4 | Complete |
| TEST-07 | Phase 4 | Complete |
| PVOU-01 | Phase 04.1 | Complete |
| PVOU-02 | Phase 04.1 | Complete |
| PVOU-03 | Phase 04.1 | Complete |
| PVOU-04 | Phase 04.1 | Complete |
| PVOU-05 | Phase 04.1 | Complete |
| PVOU-06 | Phase 04.1 | Complete |
| PVOU-07 | Phase 04.1 | Complete |
| PVOU-08 | Phase 04.1 | Complete |
| MCAT-01 | Phase 5 | Complete |
| MCAT-02 | Phase 5 | Complete |
| MCAT-03 | Phase 5 | Complete |
| MCAT-04 | Phase 5 | Complete |
| MCAT-05 | Phase 6 | Pending |
| MCAT-06 | Phase 6 | Pending |
| MCAT-07 | Phase 7 | Pending |
| MCAT-08 | Phase 7 | Pending |
| MCAT-09 | Phase 5 | Complete |
| MCAT-10 | Phase 8 | Pending |
| MCAT-11 | Phase 8 | Pending |
| MCAT-12 | Phase 8 | Pending |
| DATA-01 | Phase 9 | Pending |
| DATA-02 | Phase 9 | Pending |
| DATA-03 | Phase 10 | Pending |
| DATA-04 | Phase 10 | Pending |
| DATA-05 | Phase 10 | Pending |
| DATA-06 | Phase 10 | Pending |
| DATA-07 | Phase 10 | Pending |
| DATA-08 | Phase 6 | Pending |
| DATA-09 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 56 total
- Mapped to phases: 56
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-24 (added PVOU-01~08 for Phase 04.1)*
