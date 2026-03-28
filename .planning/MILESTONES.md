# Milestones

## v1.0 Borealis Supply Chain Management (Shipped: 2026-03-28)

**Phases completed:** 12 phases, 41 plans, 84 tasks

**Key accomplishments:**

- 14-bug frontend-backend audit cataloged across 7 modules, plus error code mapping utility with 12 business codes and 10 HTTP status fallbacks for Chinese error messages
- Fixed Supplier and Customer modules with backend keyword search, ApiError-based delete/form error handling, empty states with action buttons, and inline field validation for 400/422 responses
- Fixed fabric search (keyword support via backend DTO), quote convert-to-order 501 graceful handling, Chinese error messages via getErrorMessage/getDeleteErrorMessage on all 6 pages, inline field validation for forms, and empty states with action buttons -- plus 22 new quote tests
- Fixed P0 import controller prefix (404 resolved), normalized all backend controller prefixes to use global prefix, simplified all 5 list pages to view-only, fixed FabricListPage weight crash, and updated all test suites (806 tests pass)
- N:1 batch quote conversion with Redis distributed locking, Prisma transaction safety, and supplier auto-fill from FabricSupplier
- StorageProvider interface with dual-mode local/COS implementations, FileService refactored to key-only DB storage with read-time URL generation via injected provider
- Gap closure: Prisma Decimal string values caused false validation errors in QuoteForm edit mode. InputNumber width was inconsistent between quantity and unitPrice fields.
- Shared mock builder utilities with 11 as-any casts eliminated across 4 test files, ESLint no-explicit-any warning enabled for spec files
- Decomposed 1121-line OrderService into 3 focused services: OrderService (core CRUD, 390 lines), OrderItemService (item/timeline ops, 611 lines), OrderPaymentService (payment ops, 149 lines)
- ImportService decomposed from 607-line monolith to 207-line orchestrator via Strategy pattern with NestJS DI, auto-detecting fabric/supplier import from Excel headers
- Path traversal security tests (16 cases) and malformed Excel import tests (23 cases) using TDD with programmatic ExcelJS fixtures
- FabricDetailPage decomposed from 815-line monolith to 169-line orchestrator + useFabricDetail hook + 4 focused sub-components with full test coverage
- CustomerDetailPage decomposed from 703 to 190 lines with zero useState, useCustomerDetail hook managing all state, 4 sub-components (max 5 props each), and 50 passing tests
- OrderItemsSection decomposed from 654-line monolith to 78-line orchestrator + useOrderItemsSection hook + 3 sub-components (table, form modal, status actions)
- Eliminated 2 remaining frontend test any types via declaration merging and never type, added 27 error handling edge case tests
- PaymentVoucher schema + transactional audit trail + mandatory voucher validation on both customer/supplier payment DTOs with Word doc support
- Upload.Dragger VoucherUploader with file type/size validation and read-only VoucherList with type-aware preview/open/download actions
- VoucherUploader and VoucherList wired into OrderPaymentSection with mandatory voucher enforcement (disabled save), cache invalidation, and 12 integration tests
- Product/ProductSupplier/ProductBundle/ProductBundleItem Prisma models with migration, CodeGeneratorService extended with 5 product prefixes (TJ/DJ/CD/PJ/BD), system enums for ProductCategory and ProductSubCategory
- ProductModule with 18 REST endpoints for products (IRON_FRAME/MOTOR/MATTRESS/ACCESSORY), product-supplier CRUD, customer-specific pricing with XOR validation, and product bundles with auto-generated codes
- ProductImportStrategy with composite modelNumber::name dedup, subCategory validation, supplier lookup, and transactional Product+ProductSupplier batch creation
- ProductImportStrategy wired into ImportModule/Service/Controller with product template download, product import endpoint, and dry-run mode for all 3 import types (fabric, supplier, product)
- OrderItem extended with fabricId XOR productId, QuoteItem table created, XOR enforced at DB CHECK + DTO + service levels, product supplier auto-fill from cheapest ProductSupplier
- Quote DTOs rewritten for multi-item model with header+items pattern, QuoteService CRUD fully supports QuoteItem management, 56 quote tests passing
- Item-level partial quote conversion with ConvertQuoteItemsDto, dual fabric/product supplier auto-fill, and scheduler expiring both active and partially_converted quotes
- Multi-category type system, product API/hooks, sidebar SubMenu navigation, and /products/:category route configuration with /fabrics backward redirects
- Three product page components (list, detail, form) with dynamic columns, 3-tab detail view, and config-driven form fields per subCategory
- Unified fabric+product search selector with parallel API calls, lowest-price supplier auto-populate, and dynamic unit display in OrderItemForm
- All three quote pages rebuilt for Phase 7 multi-item model: expandable list rows, Form.List with UnifiedProductSelector, and checkbox-based partial conversion
- Two conversion scripts (fabric 182 rows, product 172 rows) that transform real company Excel files into import template format, plus RichText-safe detectStrategy fix
- Two dedicated import strategies for non-standard Excel layouts (采购单 creating products+orders, 购销合同/客户订单 creating orders referencing existing entities), with backend endpoints and 4-tab frontend import page
- Core business chain: PASS
- 5 surgical fixes for P0/P2 UAT bugs: order default status, price auto-fill, unit dedup, NaN guard, modal centering
- Supplier query API supports fabricId filter via FabricSupplier join; import script prevents duplicate customer creation
- Product import tab added to ImportPage with template download and file upload, wiring to existing backend endpoints
- Replaced 2 hardcoded error strings in useCustomerDetail.ts with getErrorMessage/getDeleteErrorMessage, and fixed stale JSDoc (INQUIRY -> PENDING) in order.service.ts

---
