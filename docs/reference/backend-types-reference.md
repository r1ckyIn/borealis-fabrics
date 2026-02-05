# Backend Types Reference

This document provides a comprehensive reference for all backend types, enums, and data structures used in the Borealis Fabrics system.

---

## Table of Contents

1. [API Response Format](#1-api-response-format)
2. [Enums](#2-enums)
3. [Core Entity Types](#3-core-entity-types)
4. [Business Constraints](#4-business-constraints)
5. [DTO Reference](#5-dto-reference)

---

## 1. API Response Format

### Standard Response

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  code: number;      // HTTP status code
  message: string;   // "success" for successful responses
  data: T;           // Response payload
}
```

### Paginated Response

```typescript
interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;       // Current page (1-based)
    pageSize: number;   // Items per page (default: 20, max: 100)
    total: number;      // Total items in database
    totalPages: number; // Calculated: ceil(total / pageSize)
  };
}
```

### Pagination Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (1-based) |
| pageSize | number | 20 | Items per page (1-100) |
| sortBy | string | 'createdAt' | Field to sort by |
| sortOrder | 'asc' \| 'desc' | 'desc' | Sort direction |

### Error Response

```typescript
{
  code: number;      // HTTP status code (4xx/5xx)
  message: string;   // Error description
  data: null;
}
```

---

## 2. Enums

### OrderItemStatus

9-state workflow for order items:

| Value | Label (CN) | Description |
|-------|------------|-------------|
| INQUIRY | 询价中 | Inquiring stage |
| PENDING | 待下单 | Pending order |
| ORDERED | 已下单 | Order placed |
| PRODUCTION | 生产中 | In production |
| QC | 质检中 | Quality check |
| SHIPPED | 已发货 | Shipped |
| RECEIVED | 已收货 | Received |
| COMPLETED | 已完成 | Completed |
| CANCELLED | 已取消 | Cancelled |

**Status Priority** (for aggregation):
```
INQUIRY < PENDING < ORDERED < PRODUCTION < QC < SHIPPED < RECEIVED < COMPLETED
```

**Status Rules**:
- Editable: INQUIRY, PENDING (can modify quantity/price)
- Deletable: INQUIRY, PENDING
- Cancellable: All except CANCELLED
- Restorable: CANCELLED items with prevStatus

### CustomerPayStatus

| Value | Label (CN) | Description |
|-------|------------|-------------|
| unpaid | 未付款 | No payment received |
| partial | 部分付款 | Partial payment |
| paid | 已付清 | Fully paid |

### PaymentMethod

| Value | Label (CN) | Description |
|-------|------------|-------------|
| wechat | 微信 | WeChat Pay |
| alipay | 支付宝 | Alipay |
| bank | 银行转账 | Bank transfer |
| credit | 赊账 | Credit |

### QuoteStatus

| Value | Label (CN) | Description |
|-------|------------|-------------|
| active | 有效 | Active quote |
| expired | 已过期 | Expired (auto-marked by scheduler) |
| converted | 已转换 | Converted to order |

### SupplierStatus

| Value | Label (CN) | Description |
|-------|------------|-------------|
| active | 正常 | Active supplier |
| suspended | 暂停 | Temporarily suspended |
| eliminated | 淘汰 | Eliminated |

### SettleType (Supplier)

| Value | Label (CN) | Description |
|-------|------------|-------------|
| prepay | 预付款 | Prepayment required |
| credit | 账期 | Credit terms |

### CreditType (Customer)

| Value | Label (CN) | Description |
|-------|------------|-------------|
| prepay | 预付款 | Prepayment required |
| credit | 账期 | Credit terms |

---

## 3. Core Entity Types

### User

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key (auto-increment) |
| weworkId | string | ✓ | WeWork ID (unique) |
| name | string | ✓ | User name |
| avatar | string | | Avatar URL |
| mobile | string | | Mobile phone |
| isActive | boolean | - | Soft delete flag (default: true) |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

### Supplier

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| companyName | string | ✓ | Company name (unique, max: 200) |
| contactName | string | | Contact person (max: 100) |
| phone | string | | Phone (max: 50) |
| wechat | string | | WeChat ID (max: 100) |
| email | string | | Email (validated) |
| address | string | | Address (max: 500) |
| status | SupplierStatus | - | Status (default: 'active') |
| billReceiveType | string | | Invoice type (max: 100) |
| settleType | SettleType | - | Settlement type (default: 'prepay') |
| creditDays | number | | Credit days (0-365, only when settleType='credit') |
| notes | string | | Notes (max: 2000) |
| isActive | boolean | - | Soft delete flag |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

### Customer

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| companyName | string | ✓ | Company name (max: 200) |
| contactName | string | | Contact person (max: 100) |
| phone | string | | Phone (max: 50) |
| wechat | string | | WeChat ID (max: 100) |
| email | string | | Email (validated) |
| addresses | Address[] | | Delivery addresses (JSON) |
| creditType | CreditType | - | Credit type (default: 'prepay') |
| creditDays | number | | Credit days (0-365, only when creditType='credit') |
| notes | string | | Notes (max: 2000) |
| isActive | boolean | - | Soft delete flag |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

**Address Structure**:
```typescript
interface Address {
  province: string;        // Province (max: 50)
  city: string;            // City (max: 50)
  district: string;        // District (max: 50)
  detailAddress: string;   // Detail address (max: 500)
  contactName: string;     // Contact name (max: 100)
  contactPhone: string;    // Contact phone (max: 50)
  label?: string;          // Label (max: 50) e.g. "工厂地址"
  isDefault?: boolean;     // Default address (default: false)
}
```

### Fabric

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| fabricCode | string | ✓ | Fabric code (unique, max: 50, format: BF-YYMM-NNNN) |
| name | string | ✓ | Fabric name (max: 200) |
| material | object | | Material info e.g. {primary: 'cotton'} |
| composition | string | | Composition (max: 200) e.g. "80% Cotton" |
| color | string | | Color (max: 100) |
| weight | Decimal | | Weight g/m² (0-9999.99) |
| width | Decimal | | Width cm (0-9999.99) |
| thickness | string | | Thickness (max: 50) |
| handFeel | string | | Hand feel (max: 50) |
| glossLevel | string | | Gloss level (max: 50) |
| application | string[] | | Applications e.g. ["apparel"] |
| defaultPrice | Decimal | | Default sale price (0-99999999.99) |
| defaultLeadTime | number | | Default lead time days (0-365) |
| description | string | | Description (max: 2000) |
| tags | string[] | | Tags e.g. ["premium"] |
| notes | string | | Notes (max: 2000) |
| isActive | boolean | - | Soft delete flag |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

### FabricSupplier

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| fabricId | number | ✓ | Fabric ID (FK) |
| supplierId | number | ✓ | Supplier ID (FK) |
| purchasePrice | Decimal | ✓ | Purchase price (0.01-999999.99) |
| minOrderQty | Decimal | | Minimum order quantity (0-999999.99) |
| leadTimeDays | number | | Lead time days (0-365) |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

**Unique constraint**: (fabricId, supplierId)

### CustomerPricing

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| customerId | number | ✓ | Customer ID (FK) |
| fabricId | number | ✓ | Fabric ID (FK) |
| specialPrice | Decimal | ✓ | Special price (0.01-999999.99) |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

**Unique constraint**: (customerId, fabricId)

### Order

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| orderCode | string | - | Order code (unique, format: ORD-YYMM-NNNN) |
| customerId | number | ✓ | Customer ID (FK) |
| status | OrderItemStatus | - | Order status (aggregated from items) |
| totalAmount | Decimal | - | Total amount (0-999999999.99) |
| customerPaid | Decimal | - | Amount paid (default: 0) |
| customerPayStatus | CustomerPayStatus | - | Payment status (default: 'unpaid') |
| customerPayMethod | PaymentMethod | | Payment method |
| customerCreditDays | number | | Credit days |
| customerPaidAt | DateTime | | Payment timestamp |
| deliveryAddress | string | | Delivery address (max: 2000) |
| createdBy | number | | Creator ID (FK) |
| notes | string | | Notes (max: 2000) |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

### OrderItem

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| orderId | number | ✓ | Order ID (FK) |
| fabricId | number | ✓ | Fabric ID (FK) |
| supplierId | number | | Supplier ID (FK) |
| quoteId | number | | Quote ID (FK) |
| quantity | Decimal | ✓ | Quantity meters (0.01-1000000) |
| salePrice | Decimal | ✓ | Sale price per meter (0.01-100000) |
| purchasePrice | Decimal | | Purchase price per meter (0.01-100000) |
| subtotal | Decimal | - | Subtotal (= quantity * salePrice) |
| status | OrderItemStatus | - | Item status |
| prevStatus | string | | Previous status (for restore) |
| deliveryDate | DateTime | | Required delivery date |
| notes | string | | Notes (max: 2000) |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

### Quote

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| quoteCode | string | - | Quote code (unique, format: QT-YYMM-NNNN) |
| customerId | number | ✓ | Customer ID (FK) |
| fabricId | number | ✓ | Fabric ID (FK) |
| quantity | Decimal | ✓ | Quantity meters (0.01-1000000) |
| unitPrice | Decimal | ✓ | Unit price per meter (0.01-100000) |
| totalPrice | Decimal | - | Total price (0-999999999.99) |
| validUntil | DateTime | ✓ | Valid until date |
| status | QuoteStatus | - | Quote status (default: 'active') |
| notes | string | | Notes (max: 2000) |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

### Logistics

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| orderItemId | number | ✓ | Order item ID (FK) |
| carrier | string | ✓ | Carrier name |
| contactName | string | | Contact name |
| contactPhone | string | | Contact phone |
| trackingNo | string | | Tracking number |
| shippedAt | DateTime | | Shipped timestamp |
| notes | string | | Notes (max: 2000) |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

### SupplierPayment

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| orderId | number | ✓ | Order ID (FK) |
| supplierId | number | ✓ | Supplier ID (FK) |
| payable | Decimal | ✓ | Payable amount (0-999999999.99) |
| paid | Decimal | - | Paid amount (default: 0) |
| payStatus | string | - | Payment status (default: 'unpaid') |
| payMethod | string | | Payment method |
| creditDays | number | | Credit days |
| paidAt | DateTime | | Payment timestamp |
| createdAt | Date | - | Created timestamp |
| updatedAt | Date | - | Updated timestamp |

**Unique constraint**: (orderId, supplierId)

### PaymentRecord

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| orderId | number | ✓ | Order ID (FK) |
| type | string | ✓ | Type: 'customer' or 'supplier' |
| supplierId | number | | Supplier ID (only when type='supplier') |
| amount | Decimal | ✓ | Amount (0-999999999.99) |
| payMethod | string | | Payment method |
| remark | string | | Remark (max: 2000) |
| operatorId | number | | Operator ID (FK) |
| createdAt | Date | - | Created timestamp |

### File

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| key | string | ✓ | COS unique key (unique) |
| url | string | ✓ | Public access URL |
| originalName | string | ✓ | Original filename |
| mimeType | string | ✓ | MIME type |
| size | number | ✓ | File size (bytes) |
| createdAt | Date | - | Created timestamp |

### FabricImage

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | - | Primary key |
| fabricId | number | ✓ | Fabric ID (FK) |
| url | string | ✓ | Image URL |
| sortOrder | number | - | Sort order (default: 0) |
| createdAt | Date | - | Created timestamp |

---

## 4. Business Constraints

### Code Generation Rules

```
Format: {PREFIX}-{YYMM}-{4-digit sequence}

Examples:
  - Fabric: BF-2601-0001, BF-2601-0042
  - Order: ORD-2601-0001
  - Quote: QT-2601-0001

YYMM: Two-digit year + two-digit month (e.g., 2601 = January 2026)
NNNN: 4-digit sequence (0001-9999), resets monthly

Generation mechanism:
  1. Primary: Redis INCR (atomic operation)
  2. Fallback: Database with Serializable transaction
  3. Uniqueness guaranteed by database UNIQUE constraint
```

### Decimal Precision

| Category | Precision | Max Value | Fields |
|----------|-----------|-----------|--------|
| Amount | Decimal(12, 2) | 999,999,999.99 | totalAmount, subtotal, totalPrice, payable, paid, amount |
| Unit Price | Decimal(10, 2) | 99,999.99 | purchasePrice, salePrice, unitPrice, defaultPrice, specialPrice |
| Quantity | Decimal(10, 2) | 999,999.99 | quantity, minOrderQty |
| Physical | Decimal(8, 2) | 9,999.99 | weight, width |

### Status Transition Rules

```typescript
const VALID_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  INQUIRY:    [PENDING, CANCELLED],
  PENDING:    [ORDERED, CANCELLED],
  ORDERED:    [PRODUCTION, CANCELLED],
  PRODUCTION: [QC, CANCELLED],
  QC:         [SHIPPED, CANCELLED],
  SHIPPED:    [RECEIVED, CANCELLED],
  RECEIVED:   [COMPLETED, CANCELLED],
  COMPLETED:  [CANCELLED],
  CANCELLED:  [],  // Restore via separate endpoint using prevStatus
};
```

### Credit Days Validation

- Only valid when settleType/creditType = 'credit'
- Range: 0-365
- Validator: `IsCreditDaysValidFor`

---

## 5. DTO Reference

### Authentication

**LoginResponseDto**:
```typescript
{
  token: string;         // JWT token
  user: {
    id: number;
    weworkId: string;
    name: string;
    avatar?: string;
    mobile?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
```

### System Enums

**GET /system/enums** returns all business enums with Chinese labels:
```typescript
{
  orderItemStatus: {
    values: ['INQUIRY', 'PENDING', ...],
    labels: { 'INQUIRY': '询价中', 'PENDING': '待下单', ... }
  },
  customerPayStatus: { ... },
  paymentMethod: { ... },
  quoteStatus: { ... },
  supplierStatus: { ... },
  settleType: { ... },
}
```

---

## Utility Functions

### Decimal Conversion

```typescript
// Nullable conversion
toNumber(value: Decimal | null | undefined): number | null

// Required conversion (value guaranteed non-null)
toNumberRequired(value: Decimal): number
```

---

## Last Updated

2026-02-05 (Phase 4 Frontend Development)
