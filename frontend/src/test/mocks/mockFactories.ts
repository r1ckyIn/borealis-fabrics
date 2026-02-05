/**
 * Mock data factories for testing.
 * Creates realistic test data for entities.
 */

import type { Fabric, Supplier, Customer, Address } from '@/types/entities.types';
import { SupplierStatus, SettleType, CreditType } from '@/types/enums.types';

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
