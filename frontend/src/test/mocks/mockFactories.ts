/**
 * Mock data factories for testing.
 * Creates realistic test data for entities.
 */

import type {
  Fabric,
  Supplier,
  Customer,
  Address,
  Order,
  OrderItem,
  Quote,
  QuoteItem,
  SupplierPayment,
  OrderTimelineEntry,
} from '@/types/entities.types';
import type { AuthUser, LoginResponse } from '@/types/api.types';
import {
  SupplierStatus,
  SettleType,
  CreditType,
  OrderItemStatus,
  CustomerPayStatus,
  QuoteStatus,
} from '@/types/enums.types';

let idCounter = 1;

function getNextId(): number {
  return idCounter++;
}

export function resetIdCounter(): void {
  idCounter = 1;
}

export function createMockFabric(overrides?: Partial<Fabric>): Fabric {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    fabricCode: `FAB-${String(id).padStart(4, '0')}`,
    name: `测试面料 ${id}`,
    material: { primary: '棉', secondary: '涤纶' },
    composition: '60% 棉, 40% 涤纶',
    color: '白色',
    weight: 200,
    width: 150,
    thickness: '中厚',
    handFeel: '柔软',
    glossLevel: '亚光',
    application: ['服装', '家纺'],
    defaultPrice: 50.0,
    defaultLeadTime: 7,
    description: '高品质测试面料',
    tags: ['新品', '热销'],
    notes: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockSupplier(overrides?: Partial<Supplier>): Supplier {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    companyName: `测试供应商 ${id}`,
    contactName: `联系人 ${id}`,
    phone: `1380000${String(id).padStart(4, '0')}`,
    wechat: `wechat_${id}`,
    email: `supplier${id}@test.com`,
    address: '上海市浦东新区',
    status: SupplierStatus.ACTIVE,
    billReceiveType: '增值税专用发票',
    settleType: SettleType.CREDIT,
    creditDays: 30,
    notes: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockCustomer(overrides?: Partial<Customer>): Customer {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    companyName: `测试客户 ${id}`,
    contactName: `客户联系人 ${id}`,
    phone: `1390000${String(id).padStart(4, '0')}`,
    wechat: `customer_wechat_${id}`,
    email: `customer${id}@test.com`,
    addresses: [],
    creditType: CreditType.PREPAY,
    creditDays: null,
    notes: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockAddress(overrides?: Partial<Address>): Address {
  return {
    province: '上海市',
    city: '上海市',
    district: '浦东新区',
    detailAddress: '张江高科技园区碧波路888号',
    contactName: '张三',
    contactPhone: '13800138000',
    label: '公司',
    isDefault: false,
    ...overrides,
  };
}

/**
 * Create multiple mock fabrics.
 */
export function createMockFabrics(count: number): Fabric[] {
  return Array.from({ length: count }, () => createMockFabric());
}

/**
 * Create multiple mock suppliers.
 */
export function createMockSuppliers(count: number): Supplier[] {
  return Array.from({ length: count }, () => createMockSupplier());
}

/**
 * Create multiple mock customers.
 */
export function createMockCustomers(count: number): Customer[] {
  return Array.from({ length: count }, () => createMockCustomer());
}

/**
 * Create multiple mock addresses.
 */
export function createMockAddresses(count: number): Address[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAddress({
      contactName: `联系人 ${i + 1}`,
      contactPhone: `1380000${String(i + 1).padStart(4, '0')}`,
      isDefault: i === 0,
    })
  );
}

export function createMockAuthUser(overrides?: Partial<AuthUser>): AuthUser {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    weworkId: `wework_${id}`,
    name: `测试用户 ${id}`,
    avatar: undefined,
    mobile: `1380000${String(id).padStart(4, '0')}`,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockLoginResponse(
  overrides?: Partial<LoginResponse>,
): LoginResponse {
  return {
    token: `mock-jwt-token-${Date.now()}`,
    user: createMockAuthUser(),
    ...overrides,
  };
}

export function createMockOrder(overrides?: Partial<Order>): Order {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    orderCode: `ORD-${String(id).padStart(4, '0')}`,
    customerId: 1,
    status: OrderItemStatus.PENDING,
    totalAmount: 10000,
    customerPaid: 0,
    customerPayStatus: CustomerPayStatus.UNPAID,
    customerPayMethod: null,
    customerCreditDays: null,
    customerPaidAt: null,
    deliveryAddress: null,
    createdBy: null,
    notes: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockOrderItem(
  overrides?: Partial<OrderItem>,
): OrderItem {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    orderId: 1,
    fabricId: 1,
    supplierId: 1,
    quoteId: null,
    quantity: 100,
    salePrice: 60,
    purchasePrice: 40,
    subtotal: 6000,
    unit: '米',
    status: OrderItemStatus.PENDING,
    prevStatus: null,
    deliveryDate: null,
    notes: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockQuoteItem(overrides?: Partial<QuoteItem>): QuoteItem {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    quoteId: 1,
    fabricId: 1,
    productId: null,
    quantity: 100,
    unitPrice: 25,
    subtotal: 2500,
    unit: '米',
    isConverted: false,
    notes: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockQuote(overrides?: Partial<Quote>): Quote {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    quoteCode: `QUO-${String(id).padStart(4, '0')}`,
    customerId: 1,
    totalPrice: 11000,
    validUntil: '2026-12-31T00:00:00.000Z',
    status: QuoteStatus.ACTIVE,
    notes: null,
    items: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockSupplierPayment(
  overrides?: Partial<SupplierPayment>,
): SupplierPayment {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    orderId: 1,
    supplierId: 1,
    payable: 4000,
    paid: 0,
    payStatus: CustomerPayStatus.UNPAID,
    payMethod: null,
    creditDays: null,
    paidAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockOrderTimelineEntry(
  overrides?: Partial<OrderTimelineEntry>,
): OrderTimelineEntry {
  const id = overrides?.id ?? getNextId();
  return {
    id,
    orderItemId: 1,
    fromStatus: OrderItemStatus.INQUIRY,
    toStatus: OrderItemStatus.PENDING,
    operatorId: 1,
    remark: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockOrders(count: number): Order[] {
  return Array.from({ length: count }, () => createMockOrder());
}

export function createMockOrderItems(count: number): OrderItem[] {
  return Array.from({ length: count }, () => createMockOrderItem());
}

export function createMockQuotes(count: number): Quote[] {
  return Array.from({ length: count }, () => createMockQuote());
}
