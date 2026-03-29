/**
 * Entity types for Borealis Fabrics frontend.
 * Backend Decimal -> number, DateTime -> string (ISO format).
 */

import type {
  OrderItemStatus,
  CustomerPayStatus,
  PaymentMethod,
  QuoteStatus,
  SupplierStatus,
  SettleType,
  CreditType,
} from './enums.types';

export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface SoftDeletableEntity extends BaseEntity {
  isActive: boolean;
  /** Non-null when the record has been soft-deleted. Included when includeDeleted=true. */
  deletedAt?: string | null;
}

export interface User extends SoftDeletableEntity {
  weworkId: string;
  name: string;
  avatar?: string | null;
  mobile?: string | null;
}

export interface Supplier extends SoftDeletableEntity {
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
  wechat?: string | null;
  email?: string | null;
  address?: string | null;
  status: SupplierStatus;
  billReceiveType?: string | null;
  settleType: SettleType;
  creditDays?: number | null;
  notes?: string | null;
}

export interface Address {
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  contactName: string;
  contactPhone: string;
  label?: string;
  isDefault?: boolean;
}

export interface Customer extends SoftDeletableEntity {
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
  wechat?: string | null;
  email?: string | null;
  addresses?: Address[] | null;
  creditType: CreditType;
  creditDays?: number | null;
  notes?: string | null;
}

export interface MaterialInfo {
  primary?: string;
  secondary?: string;
  [key: string]: string | undefined;
}

export interface Fabric extends SoftDeletableEntity {
  fabricCode: string;
  name: string;
  material?: MaterialInfo | null;
  composition?: string | null;
  color?: string | null;
  weight?: number | null;
  width?: number | null;
  thickness?: string | null;
  handFeel?: string | null;
  glossLevel?: string | null;
  application?: string[] | null;
  defaultPrice?: number | null;
  defaultLeadTime?: number | null;
  description?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  images?: FabricImage[];
}

export interface FabricSupplier extends BaseEntity {
  fabricId: number;
  supplierId: number;
  purchasePrice: number;
  minOrderQty?: number | null;
  leadTimeDays?: number | null;
  supplier?: Supplier;
  fabric?: Fabric;
}

export interface CustomerPricing extends BaseEntity {
  customerId: number;
  fabricId: number;
  specialPrice: number;
  customer?: Customer;
  fabric?: Fabric;
}

export interface FabricImage {
  id: number;
  fabricId: number;
  url: string;
  sortOrder: number;
  createdAt: string;
}

export interface Product extends SoftDeletableEntity {
  productCode: string;
  name: string;
  category: string;
  subCategory: string;
  modelNumber?: string | null;
  specification?: string | null;
  defaultPrice?: number | null;
  specs?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface ProductSupplier extends BaseEntity {
  productId: number;
  supplierId: number;
  purchasePrice: number;
  minOrderQty?: number | null;
  leadTimeDays?: number | null;
  product?: Product;
  supplier?: Supplier;
}

export interface ProductPricing extends BaseEntity {
  customerId: number;
  productId: number;
  specialPrice: number;
  customer?: Customer;
  product?: Product;
}

export interface QuoteItem extends BaseEntity {
  quoteId: number;
  fabricId?: number | null;
  productId?: number | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  unit: string;
  isConverted: boolean;
  notes?: string | null;
  fabric?: Fabric;
  product?: Product;
}

export interface FileEntity {
  id: number;
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Quote extends BaseEntity {
  quoteCode: string;
  customerId: number;
  totalPrice: number;
  validUntil: string;
  status: QuoteStatus;
  notes?: string | null;
  customer?: Customer;
  items?: QuoteItem[];
}

export interface Order extends BaseEntity {
  orderCode: string;
  customerId: number;
  status: OrderItemStatus;
  totalAmount: number;
  customerPaid: number;
  customerPayStatus: CustomerPayStatus;
  customerPayMethod?: PaymentMethod | null;
  customerCreditDays?: number | null;
  customerPaidAt?: string | null;
  deliveryAddress?: string | null;
  createdBy?: number | null;
  notes?: string | null;
  customer?: Customer;
  creator?: User;
  items?: OrderItem[];
}

export interface OrderItem extends BaseEntity {
  orderId: number;
  fabricId?: number | null;
  productId?: number | null;
  supplierId?: number | null;
  quoteId?: number | null;
  quantity: number;
  salePrice: number;
  purchasePrice?: number | null;
  subtotal: number;
  unit: string;
  status: OrderItemStatus;
  prevStatus?: string | null;
  deliveryDate?: string | null;
  notes?: string | null;
  order?: Order;
  fabric?: Fabric;
  product?: Product;
  supplier?: Supplier;
  quote?: Quote;
  logistics?: Logistics[];
}

export interface Logistics extends BaseEntity {
  orderItemId: number;
  carrier: string;
  contactName?: string | null;
  contactPhone?: string | null;
  trackingNo?: string | null;
  shippedAt?: string | null;
  notes?: string | null;
  orderItem?: OrderItem;
}

export interface SupplierPayment extends BaseEntity {
  orderId: number;
  supplierId: number;
  payable: number;
  paid: number;
  payStatus: string;
  payMethod?: string | null;
  creditDays?: number | null;
  paidAt?: string | null;
  order?: Order;
  supplier?: Supplier;
}

export interface PaymentVoucher {
  id: number;
  paymentRecordId: number;
  fileId: number;
  remark?: string | null;
  createdAt: string;
  file?: FileEntity;
  paymentRecord?: PaymentRecord;
}

export interface PaymentRecord {
  id: number;
  orderId: number;
  type: 'customer' | 'supplier';
  supplierId?: number | null;
  amount: number;
  payMethod?: string | null;
  remark?: string | null;
  operatorId?: number | null;
  createdAt: string;
  order?: Order;
  supplier?: Supplier;
  operator?: User;
  vouchers?: PaymentVoucher[];
}

export interface OrderTimelineEntry {
  id: number;
  orderItemId: number;
  fromStatus: string | null;
  toStatus: string;
  operatorId: number | null;
  remark: string | null;
  createdAt: string;
  orderItem?: {
    id: number;
    fabric: { id: number; fabricCode: string; name: string };
  };
  operator?: { id: number; name: string; avatar: string | null };
}
