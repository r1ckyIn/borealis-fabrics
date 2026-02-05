# Borealis Fabrics Frontend Design Document

## Overview

This document defines the complete frontend architecture and implementation plan for the Borealis Fabrics digital management system. The frontend provides a web-based administrative dashboard for fabric trade intermediaries, covering the entire business flow from inquiry and quotation to order fulfillment and payment tracking.

## Design Summary (Meta)

```yaml
design_type: "new_feature"
risk_level: "medium"
complexity_level: "high"
complexity_rationale: |
  (1) Requirements/ACs: 39 API endpoints across 7 modules, 9-state order workflow,
      bidirectional payment tracking, Excel import, OAuth authentication
  (2) Constraints/Risks: MVP scope with full business coverage, complex state machines,
      multiple entity relationships, Chinese localization requirements
main_constraints:
  - "Desktop-first design with responsive tablet support"
  - "Standard Ant Design 5/6 components, no custom theming"
  - "Chinese localization (zh_CN) required"
  - "Integration with existing 39 backend API endpoints"
biggest_risks:
  - "Complex order state machine UI with 9 states"
  - "Bidirectional payment tracking complexity"
  - "Form state management for nested entities (addresses, order items)"
unknowns:
  - "WeWork OAuth redirect behavior in development environment"
  - "Excel import file size limits and performance"
```

## Background and Context

### Prerequisite ADRs

- **ADR-001-modular-monolith.md**: Backend architecture decision affecting API structure
- No frontend-specific ADRs exist yet (this is the first frontend implementation)

### Agreement Checklist

#### Scope
- [x] Complete MVP frontend for all 7 business modules
- [x] Authentication flow with WeWork OAuth
- [x] CRUD operations for all entities (Fabric, Supplier, Customer, Order, Quote)
- [x] Order state machine visualization and workflow
- [x] Bidirectional payment tracking (Customer and Supplier)
- [x] Excel batch import for Fabrics and Suppliers
- [x] Responsive layout (desktop-first, tablet support)

#### Non-Scope (Explicitly not changing)
- [x] Backend API implementations (already completed in Phase 3)
- [x] Database schema (already finalized)
- [x] WeChat Mini Program (Phase 2)
- [x] Real-time logistics tracking (MVP: manual entry only)
- [x] Payment records table (post-MVP iteration)

#### Constraints
- [x] Parallel operation: No (clean slate frontend)
- [x] Backward compatibility: Not required (new implementation)
- [x] Performance measurement: Required (page load < 5s)
- [x] Browser support: Chrome/Firefox/Safari/Edge (latest 2 versions)

### Problem to Solve

The Borealis Fabrics business currently manages operations through scattered Excel files, WeChat messages, and paper documents. This frontend provides a unified web interface to:

1. Centralize fabric catalog management with images and supplier relationships
2. Streamline the quotation-to-order workflow
3. Track order status through 9 distinct states
4. Monitor bidirectional payment status (customer receivables, supplier payables)
5. Enable batch data import from existing Excel files

### Current Challenges

- No existing frontend implementation (placeholder App.tsx only)
- Complex business logic for order state transitions
- Multiple nested entities (Order -> OrderItems -> Suppliers/Fabrics)
- Bidirectional payment tracking requires careful UI design
- Chinese localization throughout

### Requirements

#### Functional Requirements

1. **Authentication**: WeWork OAuth login with JWT session management
2. **Fabric Management**: CRUD with images, supplier relationships, and customer pricing
3. **Supplier Management**: CRUD with fabric associations
4. **Customer Management**: CRUD with multiple addresses and special pricing
5. **Quote Management**: CRUD with expiration tracking and order conversion
6. **Order Management**: Full lifecycle with 9-state workflow, item management, payment tracking
7. **Logistics Management**: CRUD for shipping information linked to order items
8. **Batch Import**: Excel upload for fabrics and suppliers with conflict handling

#### Non-Functional Requirements

- **Performance**: Initial page load < 5 seconds, navigation < 2 seconds
- **Scalability**: Handle 500+ orders, 100+ suppliers, 50+ customers
- **Reliability**: Graceful error handling with user-friendly messages
- **Maintainability**: TypeScript strict mode, modular component architecture

## Acceptance Criteria (AC) - EARS Format

### Authentication (AC-AUTH)

- [ ] **When** user accesses any protected route without authentication, the system shall redirect to login page
- [ ] **When** user clicks WeWork login button, the system shall redirect to WeWork OAuth authorization page
- [ ] **When** OAuth callback returns with valid code, the system shall authenticate and redirect to dashboard
- [ ] **If** OAuth callback fails, **then** the system shall display error message and allow retry
- [ ] **While** user is authenticated, the system shall maintain JWT session with sliding expiration

### Fabric Module (AC-FABRIC)

- [ ] The system shall display fabric list with pagination, search, and filter capabilities
- [ ] **When** user clicks fabric row, the system shall navigate to fabric detail page
- [ ] **When** user submits fabric form with valid data, the system shall create/update fabric
- [ ] **When** user uploads image, the system shall display preview and upload to server
- [ ] **When** user associates supplier to fabric, the system shall save purchase price and lead time
- [ ] **When** user sets customer pricing, the system shall save special price per customer-fabric

### Supplier Module (AC-SUPPLIER)

- [ ] The system shall display supplier list with pagination and search
- [ ] **When** user clicks supplier row, the system shall navigate to supplier detail with fabric list
- [ ] **When** user submits supplier form with valid data, the system shall create/update supplier
- [ ] **If** supplier has active orders, **then** delete shall be blocked with conflict message

### Customer Module (AC-CUSTOMER)

- [ ] The system shall display customer list with pagination and search
- [ ] **When** user clicks customer row, the system shall navigate to customer detail
- [ ] **When** user adds address, the system shall validate and save with optional default flag
- [ ] **When** user views customer, the system shall display order history
- [ ] **When** user sets special pricing, the system shall override fabric default price

### Quote Module (AC-QUOTE)

- [ ] The system shall display quote list with status badges (active/expired/converted)
- [ ] **When** user creates quote, the system shall generate quote code (QT-YYMM-NNNN)
- [ ] **When** quote expires (validUntil passed), the system shall display expired status
- [ ] **When** user clicks "Convert to Order", the system shall create order with PENDING status
- [ ] **If** quote status is converted, **then** edit and delete shall be disabled

### Order Module (AC-ORDER)

- [ ] The system shall display order list with aggregate status and payment status
- [ ] **When** user creates order, the system shall require at least one order item
- [ ] **When** user adds order item, the system shall calculate subtotal (quantity x salePrice)
- [ ] **When** user changes item status, the system shall validate state machine transitions
- [ ] **When** any item status changes, the system shall recalculate aggregate order status
- [ ] **When** user cancels item, the system shall save prevStatus for restoration
- [ ] **When** user restores cancelled item, the system shall restore to prevStatus
- [ ] The system shall display order timeline with status change history
- [ ] **When** user updates customer payment, the system shall recalculate payment status
- [ ] **When** user updates supplier payment, the system shall track per-supplier payables

### Logistics Module (AC-LOGISTICS)

- [ ] **When** user creates logistics record, the system shall link to specific order item
- [ ] The system shall display logistics info within order detail view
- [ ] **When** user enters tracking number, the system shall save and display in timeline

### Import Module (AC-IMPORT)

- [ ] **When** user downloads template, the system shall provide Excel file with headers
- [ ] **When** user uploads Excel file, the system shall parse and validate data
- [ ] **If** record exists (by code), **then** the system shall skip without overwriting
- [ ] **When** import completes, the system shall display result summary (success/skipped/failed)

## Existing Codebase Analysis

### Implementation Path Mapping

| Type | Path | Description |
|------|------|-------------|
| Existing | frontend/src/App.tsx | Placeholder component with Ant Design ConfigProvider |
| Existing | frontend/src/main.tsx | React entry point with StrictMode |
| Existing | frontend/vite.config.ts | Vite config with proxy to backend |
| Existing | frontend/.env.example | Environment variable template |
| New | frontend/src/routes/ | React Router configuration |
| New | frontend/src/pages/ | Page components by module |
| New | frontend/src/components/ | Shared UI components |
| New | frontend/src/api/ | API client and service functions |
| New | frontend/src/hooks/ | Custom React hooks |
| New | frontend/src/store/ | Zustand state stores |
| New | frontend/src/types/ | TypeScript type definitions |
| New | frontend/src/utils/ | Utility functions |

### Integration Points

- **Backend API**: 39 endpoints via Vite proxy (`/api` -> `http://localhost:3000`)
- **WeWork OAuth**: Redirect to `/api/v1/auth/wework/login`, callback handled by backend
- **File Upload**: Multipart form data to `/api/v1/files/upload`
- **Excel Import**: Multipart form data to `/api/v1/import/fabrics` and `/import/suppliers`

## Design

### Change Impact Map

```yaml
Change Target: Complete frontend implementation
Direct Impact:
  - frontend/src/* (all new files)
  - frontend/package.json (no changes, dependencies already installed)
Indirect Impact:
  - Backend API endpoints (consumption only, no changes)
  - Vite proxy configuration (already configured)
No Ripple Effect:
  - Backend source code
  - Database schema
  - Docker configuration
```

### Architecture Overview

```
+-------------------------------------------------------------------------+
|                           Frontend Architecture                          |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------+    +-------------+    +-------------+                 |
|  |   Routes    |    |   Pages     |    | Components  |                 |
|  | (React      |--->| (Module     |--->| (Reusable   |                 |
|  |  Router 7)  |    |  Views)     |    |  UI)        |                 |
|  +-------------+    +------+------+    +-------------+                 |
|                            |                                            |
|         +------------------+------------------+                         |
|         v                  v                  v                         |
|  +-------------+    +-------------+    +-------------+                 |
|  |   Hooks     |    |   Store     |    |    API      |                 |
|  | (Custom     |    | (Zustand    |    | (TanStack   |                 |
|  |  Logic)     |    |  Client)    |    |  Query)     |                 |
|  +-------------+    +-------------+    +------+------+                 |
|                                               |                         |
|                                               v                         |
|                                        +-------------+                 |
|                                        |   Axios     |                 |
|                                        |  Instance   |                 |
|                                        +------+------+                 |
|                                               |                         |
+-------------------------------------------------+------------------------------+
                                                |
                                                v
                                    +-------------------+
                                    |  Backend API      |
                                    |  (NestJS)         |
                                    +-------------------+
```

### Directory Structure

```
frontend/src/
+-- main.tsx                    # Application entry point
+-- App.tsx                     # Root component with providers
+-- vite-env.d.ts              # Vite type declarations
|
+-- routes/                     # React Router configuration
|   +-- index.tsx              # Route definitions
|   +-- ProtectedRoute.tsx     # Auth guard component
|   +-- layouts/               # Layout components
|       +-- MainLayout.tsx     # Sidebar + Header + Content
|
+-- pages/                      # Page components
|   +-- auth/
|   |   +-- LoginPage.tsx
|   |   +-- OAuthCallback.tsx
|   +-- fabrics/
|   |   +-- FabricListPage.tsx
|   |   +-- FabricDetailPage.tsx
|   |   +-- FabricFormPage.tsx
|   +-- suppliers/
|   |   +-- SupplierListPage.tsx
|   |   +-- SupplierDetailPage.tsx
|   |   +-- SupplierFormPage.tsx
|   +-- customers/
|   |   +-- CustomerListPage.tsx
|   |   +-- CustomerDetailPage.tsx
|   |   +-- CustomerFormPage.tsx
|   +-- orders/
|   |   +-- OrderListPage.tsx
|   |   +-- OrderDetailPage.tsx
|   |   +-- OrderFormPage.tsx
|   +-- quotes/
|   |   +-- QuoteListPage.tsx
|   |   +-- QuoteDetailPage.tsx
|   |   +-- QuoteFormPage.tsx
|   +-- import/
|       +-- ImportPage.tsx
|
+-- components/                 # Shared components
|   +-- layout/
|   |   +-- Sidebar.tsx
|   |   +-- Header.tsx
|   |   +-- PageContainer.tsx
|   +-- common/
|   |   +-- SearchForm.tsx
|   |   +-- StatusTag.tsx
|   |   +-- AmountDisplay.tsx
|   |   +-- LoadingSpinner.tsx
|   |   +-- ErrorBoundary.tsx
|   |   +-- ConfirmModal.tsx
|   +-- business/
|   |   +-- OrderTimeline.tsx
|   |   +-- OrderStatusFlow.tsx
|   |   +-- AddressManager.tsx
|   |   +-- PricingTable.tsx
|   |   +-- ImageUploader.tsx
|   |   +-- FabricSelector.tsx
|   |   +-- SupplierSelector.tsx
|   |   +-- CustomerSelector.tsx
|   |   +-- PaymentStatusCard.tsx
|   |   +-- ImportResultModal.tsx
|   +-- forms/
|       +-- FabricForm.tsx
|       +-- SupplierForm.tsx
|       +-- CustomerForm.tsx
|       +-- OrderForm.tsx
|       +-- OrderItemForm.tsx
|       +-- QuoteForm.tsx
|       +-- LogisticsForm.tsx
|
+-- api/                        # API layer
|   +-- client.ts              # Axios instance configuration
|   +-- fabric.api.ts
|   +-- supplier.api.ts
|   +-- customer.api.ts
|   +-- order.api.ts
|   +-- quote.api.ts
|   +-- logistics.api.ts
|   +-- import.api.ts
|   +-- auth.api.ts
|   +-- system.api.ts
|
+-- hooks/                      # Custom hooks
|   +-- useAuth.ts
|   +-- usePagination.ts
|   +-- useDebounce.ts
|   +-- useLocalStorage.ts
|   +-- queries/               # TanStack Query hooks
|       +-- useFabrics.ts
|       +-- useSuppliers.ts
|       +-- useCustomers.ts
|       +-- useOrders.ts
|       +-- useQuotes.ts
|       +-- useLogistics.ts
|       +-- useEnums.ts
|
+-- store/                      # Zustand stores
|   +-- authStore.ts           # Authentication state
|   +-- uiStore.ts             # UI state (sidebar, theme)
|   +-- enumStore.ts           # Cached enum values
|
+-- types/                      # TypeScript definitions
|   +-- api.types.ts           # API response types
|   +-- entities.types.ts      # Entity types
|   +-- enums.types.ts         # Enum types
|   +-- forms.types.ts         # Form data types
|
+-- utils/                      # Utility functions
    +-- format.ts              # Formatting helpers
    +-- validation.ts          # Validation helpers
    +-- constants.ts           # Constants
    +-- statusHelpers.ts       # Status-related utilities
```

### Data Flow

```
User Interaction
      |
      v
+-------------+     +-------------+     +-------------+
|   Page      |---->|  TanStack   |---->|   Axios     |
|  Component  |     |   Query     |     |  Instance   |
+-------------+     +-------------+     +------+------+
      |                    |                   |
      |                    |                   v
      |                    |            +-------------+
      |                    |            |  Backend    |
      |                    |            |   API       |
      |                    |            +------+------+
      |                    |                   |
      |                    v                   |
      |             +-------------+            |
      |             |   Query     |<-----------+
      |             |   Cache     |
      |             +-------------+
      |                    |
      v                    v
+-------------+     +-------------+
|  Zustand    |     |   React     |
|  Store      |     |   State     |
| (UI State)  |     | (Form Data) |
+-------------+     +-------------+
```

### Integration Points List

| Integration Point | Location | Old Implementation | New Implementation | Switching Method |
|-------------------|----------|-------------------|-------------------|------------------|
| API Base URL | api/client.ts | N/A | Environment variable | Vite env |
| Auth State | store/authStore.ts | N/A | Zustand + localStorage | Direct |
| Server State | hooks/queries/*.ts | N/A | TanStack Query | React hooks |
| Form State | components/forms/*.tsx | N/A | Ant Design Form | Component props |
| Route Guards | routes/ProtectedRoute.tsx | N/A | Auth context check | HOC/Component |

### Main Components

#### Layout Components

##### MainLayout

- **Responsibility**: Overall page structure with sidebar navigation and header
- **Interface**: `children: React.ReactNode`
- **Dependencies**: Sidebar, Header, Zustand uiStore

##### Sidebar

- **Responsibility**: Navigation menu with collapsible functionality
- **Interface**: `collapsed: boolean, onCollapse: (collapsed: boolean) => void`
- **Dependencies**: React Router, Ant Design Menu

##### Header

- **Responsibility**: Top bar with user info and global actions
- **Interface**: `user: User | null, onLogout: () => void`
- **Dependencies**: authStore, Ant Design Layout.Header

##### PageContainer

- **Responsibility**: Consistent page wrapper with title and breadcrumbs
- **Interface**: `title: string, breadcrumbs?: BreadcrumbItem[], actions?: React.ReactNode`
- **Dependencies**: Ant Design Breadcrumb, Typography

#### Common Components

##### SearchForm

- **Responsibility**: Reusable search/filter form with debouncing
- **Interface**: `fields: SearchField[], onSearch: (values) => void, loading?: boolean`
- **Dependencies**: Ant Design Form, Input, Select, DatePicker

##### StatusTag

- **Responsibility**: Colored badge for status display
- **Interface**: `status: string, type: 'order' | 'quote' | 'supplier' | 'payment'`
- **Dependencies**: Ant Design Tag, enumStore

##### AmountDisplay

- **Responsibility**: Formatted currency display
- **Interface**: `amount: number, currency?: string, size?: 'small' | 'default' | 'large'`
- **Dependencies**: Ant Design Typography

#### Business Components

##### OrderTimeline

- **Responsibility**: Visual timeline of order status changes
- **Interface**: `timeline: TimelineItem[], orderItemId?: number`
- **Dependencies**: Ant Design Timeline, StatusTag

##### OrderStatusFlow

- **Responsibility**: Visual flow diagram of 9-state order lifecycle
- **Interface**: `currentStatus: OrderItemStatus, onStatusChange?: (newStatus) => void`
- **Dependencies**: Ant Design Steps, statusHelpers

##### AddressManager

- **Responsibility**: CRUD for customer delivery addresses
- **Interface**: `addresses: Address[], onChange: (addresses) => void`
- **Dependencies**: Ant Design List, Modal, Form

##### PaymentStatusCard

- **Responsibility**: Payment status summary with progress
- **Interface**: `payable: number, paid: number, status: PayStatus, direction: 'customer' | 'supplier'`
- **Dependencies**: Ant Design Card, Progress, AmountDisplay

##### ImageUploader

- **Responsibility**: Image upload with preview and sorting
- **Interface**: `images: FabricImage[], onChange: (images) => void, maxCount?: number`
- **Dependencies**: Ant Design Upload, Image, fileApi

### Contract Definitions

#### API Response Types

```typescript
// Generic paginated response
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Generic API response wrapper
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// Error response
interface ApiError {
  code: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

#### Entity Types

```typescript
// Core entities derived from backend DTOs
interface Fabric {
  id: number;
  fabricCode: string;
  name: string;
  material?: Record<string, unknown>;
  composition?: string;
  color?: string;
  weight?: number;
  width?: number;
  thickness?: string;
  handFeel?: string;
  glossLevel?: string;
  application?: string[];
  defaultPrice?: number;
  defaultLeadTime?: number;
  description?: string;
  tags?: string[];
  notes?: string;
  images?: FabricImage[];
  suppliers?: FabricSupplier[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: number;
  companyName: string;
  contactName?: string;
  phone?: string;
  wechat?: string;
  email?: string;
  address?: string;
  status: SupplierStatus;
  billReceiveType?: string;
  settleType: SettleType;
  creditDays?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: number;
  companyName: string;
  contactName?: string;
  phone?: string;
  wechat?: string;
  email?: string;
  addresses?: Address[];
  creditType: CreditType;
  creditDays?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Address {
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  contactName: string;
  contactPhone: string;
  label?: string;
  isDefault?: boolean;
}

interface Order {
  id: number;
  orderCode: string;
  customerId: number;
  customer?: Customer;
  deliveryAddress?: string;
  notes?: string;
  status: OrderItemStatus;
  totalAmount: number;
  customerPayable: number;
  customerPaid: number;
  customerPayStatus: CustomerPayStatus;
  customerPayMethod?: PaymentMethod;
  customerCreditDays?: number;
  customerPaidAt?: string;
  items?: OrderItem[];
  supplierPayments?: SupplierPayment[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  id: number;
  orderId: number;
  fabricId: number;
  fabric?: Fabric;
  supplierId?: number;
  supplier?: Supplier;
  quoteId?: number;
  quantity: number;
  salePrice: number;
  purchasePrice?: number;
  subtotal: number;
  deliveryDate?: string;
  notes?: string;
  status: OrderItemStatus;
  prevStatus?: OrderItemStatus;
  logistics?: Logistics[];
  createdAt: string;
  updatedAt: string;
}

interface Quote {
  id: number;
  quoteCode: string;
  customerId: number;
  customer?: Customer;
  fabricId: number;
  fabric?: Fabric;
  quantity: number;
  unitPrice: number;
  validUntil: string;
  status: QuoteStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Logistics {
  id: number;
  orderItemId: number;
  carrier: string;
  contactName?: string;
  contactPhone?: string;
  trackingNo?: string;
  shippedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierPayment {
  orderId: number;
  supplierId: number;
  supplier?: Supplier;
  payable: number;
  paid: number;
  payStatus: PayStatus;
  payMethod?: PaymentMethod;
  creditDays?: number;
  paidAt?: string;
}

interface TimelineEntry {
  id: number;
  orderItemId: number;
  fromStatus?: OrderItemStatus;
  toStatus: OrderItemStatus;
  operatorId?: number;
  operator?: User;
  notes?: string;
  createdAt: string;
}

interface User {
  id: number;
  weworkId: string;
  name: string;
  avatar?: string;
}
```

#### Enum Types

```typescript
// Order Item Status (9 states)
enum OrderItemStatus {
  INQUIRY = 'INQUIRY',
  PENDING = 'PENDING',
  ORDERED = 'ORDERED',
  PRODUCTION = 'PRODUCTION',
  QC = 'QC',
  SHIPPED = 'SHIPPED',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Status progression order for aggregate calculation
const STATUS_ORDER: OrderItemStatus[] = [
  OrderItemStatus.INQUIRY,
  OrderItemStatus.PENDING,
  OrderItemStatus.ORDERED,
  OrderItemStatus.PRODUCTION,
  OrderItemStatus.QC,
  OrderItemStatus.SHIPPED,
  OrderItemStatus.RECEIVED,
  OrderItemStatus.COMPLETED,
];

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  INQUIRY: ['PENDING', 'CANCELLED'],
  PENDING: ['ORDERED', 'CANCELLED'],
  ORDERED: ['PRODUCTION', 'CANCELLED'],
  PRODUCTION: ['QC', 'CANCELLED'],
  QC: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['CANCELLED'],
  CANCELLED: [], // Restored via separate endpoint
};

enum QuoteStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
}

enum SupplierStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ELIMINATED = 'eliminated',
}

enum SettleType {
  PREPAY = 'prepay',
  CREDIT = 'credit',
}

enum CreditType {
  PREPAY = 'prepay',
  CREDIT = 'credit',
}

enum CustomerPayStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

enum PayStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

enum PaymentMethod {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BANK = 'bank',
  CREDIT = 'credit',
}
```

### Data Contract

#### TanStack Query Hooks

```yaml
useFabrics:
  Input:
    Type: QueryFabricParams
    Preconditions: page >= 1, pageSize 1-100
    Validation: Type guards in API layer

  Output:
    Type: PaginatedResponse<Fabric>
    Guarantees: items always array, pagination always present
    On Error: throw ApiError, handled by Error Boundary

useCreateFabric:
  Input:
    Type: CreateFabricDto
    Preconditions: fabricCode and name required
    Validation: Ant Design Form validation

  Output:
    Type: Fabric
    Guarantees: Returns created entity with id
    On Error: throw ApiError with validation details
```

### State Transitions and Invariants

```yaml
Order Item State Machine:
  Initial State: INQUIRY (when created via quote) or PENDING (direct order)
  Possible States: [INQUIRY, PENDING, ORDERED, PRODUCTION, QC, SHIPPED, RECEIVED, COMPLETED, CANCELLED]

State Transitions:
  INQUIRY -> PENDING, CANCELLED
  PENDING -> ORDERED, CANCELLED
  ORDERED -> PRODUCTION, CANCELLED
  PRODUCTION -> QC, CANCELLED
  QC -> SHIPPED, CANCELLED
  SHIPPED -> RECEIVED, CANCELLED
  RECEIVED -> COMPLETED, CANCELLED
  COMPLETED -> CANCELLED
  CANCELLED -> prevStatus (restore only)

System Invariants:
  - Order aggregate status = MIN(all non-cancelled item statuses)
  - totalAmount = SUM(item.quantity * item.salePrice)
  - supplierPayment.payable = SUM(items by supplier: quantity * purchasePrice)
  - Cancelled items do not participate in aggregate calculation
  - prevStatus preserved when cancelling for restoration
```

### Error Handling

| Error Type | Handling Strategy | User Feedback |
|------------|-------------------|---------------|
| Network Error | Retry with exponential backoff | "Network error, retrying..." toast |
| 401 Unauthorized | Clear auth, redirect to login | "Session expired, please login again" |
| 403 Forbidden | Display error message | "You don't have permission" |
| 404 Not Found | Navigate to not found page | "Resource not found" |
| 409 Conflict | Display specific conflict reason | "Cannot delete: has active orders" |
| 422 Validation | Highlight form fields | Field-level error messages |
| 500 Server Error | Log and display generic error | "Server error, please try again" |

### Logging and Monitoring

- **Console Logging**: Development only, removed in production build
- **Error Boundary**: Catches React rendering errors, displays fallback UI
- **API Error Logging**: Axios interceptor logs all failed requests
- **Performance**: React DevTools Profiler for development optimization

## Implementation Plan

### Implementation Approach

**Selected Approach**: Hybrid (Vertical for core features, Horizontal for shared infrastructure)

**Selection Reason**:
- Infrastructure (routing, auth, API layer) must be established first
- Core modules can then be developed vertically for faster value delivery
- Common components extracted as patterns emerge (Rule of Three)

### Technical Dependencies and Implementation Order

#### Phase 1: Foundation (Required First)

1. **Routing and Layout**
   - Technical Reason: All pages depend on routing and layout structure
   - Dependent Elements: All page components

2. **API Client and Type Definitions**
   - Technical Reason: All data fetching depends on API layer
   - Prerequisites: Backend API documentation review

3. **Authentication Flow**
   - Technical Reason: Protected routes require auth state
   - Prerequisites: Routing, API client

4. **Zustand Stores**
   - Technical Reason: UI state and enum caching needed early
   - Prerequisites: Type definitions

#### Phase 2: Core Modules (Vertical Slices)

1. **System Module (Enums API)**
   - Technical Reason: All modules need enum labels
   - Prerequisites: API client

2. **Fabric Module**
   - Technical Reason: Orders and Quotes depend on fabrics
   - Prerequisites: API client, types, common components

3. **Supplier Module**
   - Technical Reason: Fabrics reference suppliers
   - Prerequisites: API client, types

4. **Customer Module**
   - Technical Reason: Orders and Quotes depend on customers
   - Prerequisites: API client, types

#### Phase 3: Business Process Modules

1. **Quote Module**
   - Technical Reason: Convert to Order feature
   - Prerequisites: Customer, Fabric modules

2. **Order Module**
   - Technical Reason: Most complex, depends on all entities
   - Prerequisites: Customer, Fabric, Supplier, Quote modules

3. **Logistics Module**
   - Technical Reason: Linked to Order Items
   - Prerequisites: Order module

4. **Import Module**
   - Technical Reason: Independent batch operations
   - Prerequisites: Fabric, Supplier modules

### Integration Points

**Integration Point 1: Auth -> Protected Routes**
- Components: AuthStore -> ProtectedRoute -> All Pages
- Verification: Login redirects to protected page, logout redirects to login

**Integration Point 2: Enum Store -> Status Components**
- Components: System API -> EnumStore -> StatusTag, OrderStatusFlow
- Verification: Status tags display Chinese labels correctly

**Integration Point 3: Quote -> Order Conversion**
- Components: QuoteDetailPage -> Order API -> OrderDetailPage
- Verification: Convert creates order with correct initial status and items

**Integration Point 4: Order Items -> Aggregate Status**
- Components: OrderItemForm -> Order API -> OrderDetailPage
- Verification: Changing item status updates order aggregate status

### Migration Strategy

Not applicable - this is a new implementation with no existing frontend to migrate from.

## Test Strategy

### Basic Test Design Policy

- Create at least one test case for each acceptance criterion
- Use React Testing Library for component tests
- Use MSW (Mock Service Worker) for API mocking in integration tests
- Maintain 80% code coverage for critical paths

### Unit Tests

| Component | Test Focus |
|-----------|------------|
| StatusTag | Correct color/label for each status |
| AmountDisplay | Formatting with various currencies |
| statusHelpers | Valid transitions, aggregate calculation |
| format utils | Date, currency, number formatting |
| validation utils | Form validation rules |

### Integration Tests

| Feature | Test Focus |
|---------|------------|
| AuthFlow | Login redirect, OAuth callback, logout |
| FabricCRUD | List, create, update, delete with API |
| OrderStatusChange | State machine transitions |
| PaymentUpdate | Customer and supplier payment flows |

### E2E Tests

| Scenario | Steps |
|----------|-------|
| Complete Order Flow | Login -> Create Quote -> Convert to Order -> Update Status -> Complete |
| Batch Import | Login -> Download Template -> Upload File -> Verify Results |
| Payment Tracking | Create Order -> Update Customer Payment -> Update Supplier Payment |

### Performance Tests

- Initial page load: < 5 seconds
- Navigation: < 2 seconds
- List pagination: < 1 second
- Form submission: < 3 seconds

## Security Considerations

1. **JWT Token Storage**: Store in memory (Zustand) + httpOnly cookie refresh
2. **XSS Prevention**: React's built-in escaping, avoid raw HTML injection
3. **CSRF**: Backend handles with cookie-based tokens
4. **API Security**: All sensitive operations server-validated
5. **File Upload**: Backend validates file type and size
6. **No Client Secrets**: API keys and secrets only on backend

## Future Extensibility

1. **WeChat Mini Program**: Shared types and API layer can be reused
2. **Role-Based Access**: Auth context ready for role extension
3. **Real-time Logistics**: Logistics module structured for API integration
4. **Payment Records**: SupplierPayment entity ready for record history
5. **Dashboard Analytics**: Query hooks ready for aggregation endpoints

## Alternative Solutions

### Alternative 1: Redux Toolkit

- **Overview**: Full Redux with RTK Query for data fetching
- **Advantages**: More structured, better DevTools, familiar to many developers
- **Disadvantages**: More boilerplate, larger bundle, overkill for this scale
- **Reason for Rejection**: TanStack Query + Zustand provides same functionality with 70% smaller bundle and better DX

### Alternative 2: Single Page App without React Router

- **Overview**: Use Ant Design Tabs/Menu for navigation
- **Advantages**: Simpler initial setup
- **Disadvantages**: No deep linking, poor UX for bookmarking
- **Reason for Rejection**: Deep linking essential for sharing order/quote links

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| WeWork OAuth complexity | High | Medium | Test OAuth flow early in Phase 1 |
| Order state machine bugs | High | Medium | Comprehensive unit tests for transitions |
| Form performance with many items | Medium | Medium | Virtualized lists, form field optimization |
| Bundle size growth | Medium | Low | Code splitting by route, tree shaking |
| Browser compatibility issues | Low | Low | Test on target browsers early |

## References

- [TanStack Query + Zustand Architecture Best Practices](https://dev.to/martinrojas/federated-state-done-right-zustand-tanstack-query-and-the-patterns-that-actually-work-27c0)
- [TanStack Guide 2025](https://void.ma/en/publications/tanstack-react-query-table-router-guide-complet-2025/)
- [Zustand + TanStack Query Integration](https://gdsks.medium.com/how-we-cut-70-bundle-size-the-tanstack-query-zustand-architecture-at-glincker-374ba9214290)
- [Redux vs React Query vs Zustand 2025](https://medium.com/@vishalthakur2463/redux-toolkit-vs-react-query-vs-zustand-which-one-should-you-use-in-2025-048c1d3915f4)
- [React Router 7 Protected Routes](https://dev.to/ra1nbow1/building-reliable-protected-routes-with-react-router-v7-1ka0)
- [React Router 7 Authentication Guide](https://blog.logrocket.com/authentication-react-router-v7/)
- [Ant Design Layout Components](https://ant.design/components/layout/)
- [React Admin Dashboard Templates](https://github.com/larry-xue/react-admin-dashboard)
- [React Patterns 2026](https://www.patterns.dev/react/react-2026/)

## Update History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-05 | 1.0 | Initial version | Claude |
