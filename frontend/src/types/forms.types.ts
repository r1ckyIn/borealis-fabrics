/**
 * Form data types for create/update operations.
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

import type { PaginationParams } from './api.types';

export interface CreateSupplierData {
  companyName: string;
  contactName?: string;
  phone?: string;
  wechat?: string;
  email?: string;
  address?: string;
  status?: SupplierStatus;
  billReceiveType?: string;
  settleType?: SettleType;
  creditDays?: number;
  notes?: string;
}

export type UpdateSupplierData = Partial<CreateSupplierData>;

export interface QuerySupplierParams extends PaginationParams {
  keyword?: string;
  status?: SupplierStatus;
}

export interface AddressFormData {
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  contactName: string;
  contactPhone: string;
  label?: string;
  isDefault?: boolean;
}

export interface CreateCustomerData {
  companyName: string;
  contactName?: string;
  phone?: string;
  wechat?: string;
  email?: string;
  addresses?: AddressFormData[];
  creditType?: CreditType;
  creditDays?: number;
  notes?: string;
}

export type UpdateCustomerData = Partial<CreateCustomerData>;

export interface QueryCustomerParams extends PaginationParams {
  keyword?: string;
}

export interface MaterialFormData {
  primary?: string;
  secondary?: string;
  [key: string]: string | undefined;
}

export interface CreateFabricData {
  fabricCode: string;
  name: string;
  material?: MaterialFormData;
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
}

export type UpdateFabricData = Partial<CreateFabricData>;

export interface QueryFabricParams extends PaginationParams {
  keyword?: string;
  supplierId?: number;
}

export interface CreateFabricSupplierData {
  supplierId: number;
  purchasePrice: number;
  minOrderQty?: number;
  leadTimeDays?: number;
}

export type UpdateFabricSupplierData = Partial<
  Omit<CreateFabricSupplierData, 'supplierId'>
>;

export interface CreateCustomerPricingData {
  fabricId: number;
  specialPrice: number;
}

export interface UpdateCustomerPricingData {
  specialPrice: number;
}

export interface CreateQuoteData {
  customerId: number;
  fabricId: number;
  quantity: number;
  unitPrice: number;
  validUntil: string;
  notes?: string;
}

export interface UpdateQuoteData {
  quantity?: number;
  unitPrice?: number;
  validUntil?: string;
  status?: QuoteStatus;
  notes?: string;
}

export interface QueryQuoteParams extends PaginationParams {
  customerId?: number;
  fabricId?: number;
  status?: QuoteStatus;
  validFrom?: string;
  validTo?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface AddOrderItemData {
  fabricId: number;
  supplierId?: number;
  quoteId?: number;
  quantity: number;
  salePrice: number;
  purchasePrice?: number;
  deliveryDate?: string;
  notes?: string;
}

export interface CreateOrderData {
  customerId: number;
  deliveryAddress?: string;
  notes?: string;
  items: AddOrderItemData[];
}

export interface UpdateOrderData {
  deliveryAddress?: string;
  notes?: string;
}

export interface UpdateOrderItemData {
  supplierId?: number;
  quoteId?: number;
  quantity?: number;
  salePrice?: number;
  purchasePrice?: number;
  deliveryDate?: string;
  notes?: string;
}

export interface UpdateOrderItemStatusData {
  status: OrderItemStatus;
}

export interface CancelOrderItemData {
  reason?: string;
}

export interface QueryOrderParams extends PaginationParams {
  customerId?: number;
  status?: OrderItemStatus;
  customerPayStatus?: CustomerPayStatus;
}

export interface UpdateCustomerPaymentData {
  customerPaid?: number;
  customerPayStatus?: CustomerPayStatus;
  customerPayMethod?: PaymentMethod;
  customerCreditDays?: number;
  customerPaidAt?: string;
  notes?: string;
}

export interface UpdateSupplierPaymentData {
  paid?: number;
  payStatus?: string;
  payMethod?: string;
  creditDays?: number;
  paidAt?: string;
}

export interface CreatePaymentRecordData {
  orderId: number;
  type: 'customer' | 'supplier';
  supplierId?: number;
  amount: number;
  payMethod?: string;
  remark?: string;
}

export interface CreateLogisticsData {
  orderItemId: number;
  carrier: string;
  contactName?: string;
  contactPhone?: string;
  trackingNo?: string;
  shippedAt?: string;
  notes?: string;
}

export type UpdateLogisticsData = Partial<Omit<CreateLogisticsData, 'orderItemId'>>;

export interface QueryLogisticsParams extends PaginationParams {
  orderItemId?: number;
}

export interface UploadFabricImageData {
  fabricId: number;
  sortOrder?: number;
}

export interface QuerySupplierFabricsParams extends PaginationParams {
  fabricCode?: string;
  fabricName?: string;
}

export interface QueryCustomerOrdersParams extends PaginationParams {
  status?: OrderItemStatus;
  customerPayStatus?: CustomerPayStatus;
}

export interface QueryFabricSuppliersParams extends PaginationParams {
  supplierName?: string;
}

export interface QueryFabricPricingParams extends PaginationParams {
  customerName?: string;
}

export interface CreateFabricPricingData {
  customerId: number;
  specialPrice: number;
}

export interface UpdateFabricPricingData {
  specialPrice: number;
}
