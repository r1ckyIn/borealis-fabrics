/**
 * Business enums for Borealis Fabrics frontend.
 * Using `as const` objects for `erasableSyntaxOnly` compliance.
 */

/** Order item status - 9-state workflow. */
export const OrderItemStatus = {
  INQUIRY: 'INQUIRY',
  PENDING: 'PENDING',
  ORDERED: 'ORDERED',
  PRODUCTION: 'PRODUCTION',
  QC: 'QC',
  SHIPPED: 'SHIPPED',
  RECEIVED: 'RECEIVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderItemStatus =
  (typeof OrderItemStatus)[keyof typeof OrderItemStatus];

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  [OrderItemStatus.INQUIRY]: '询价中',
  [OrderItemStatus.PENDING]: '待下单',
  [OrderItemStatus.ORDERED]: '已下单',
  [OrderItemStatus.PRODUCTION]: '生产中',
  [OrderItemStatus.QC]: '质检中',
  [OrderItemStatus.SHIPPED]: '已发货',
  [OrderItemStatus.RECEIVED]: '已收货',
  [OrderItemStatus.COMPLETED]: '已完成',
  [OrderItemStatus.CANCELLED]: '已取消',
};

/** Status priority for aggregate calculation (lower index = lower progress). */
export const STATUS_PRIORITY: OrderItemStatus[] = [
  OrderItemStatus.INQUIRY,
  OrderItemStatus.PENDING,
  OrderItemStatus.ORDERED,
  OrderItemStatus.PRODUCTION,
  OrderItemStatus.QC,
  OrderItemStatus.SHIPPED,
  OrderItemStatus.RECEIVED,
  OrderItemStatus.COMPLETED,
];

/** Statuses that allow item modification (quantity, price, etc.). */
export const MODIFIABLE_STATUSES: OrderItemStatus[] = [
  OrderItemStatus.INQUIRY,
  OrderItemStatus.PENDING,
];

/** Customer payment status. */
export const CustomerPayStatus = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
} as const;

export type CustomerPayStatus =
  (typeof CustomerPayStatus)[keyof typeof CustomerPayStatus];

export const CUSTOMER_PAY_STATUS_LABELS: Record<CustomerPayStatus, string> = {
  [CustomerPayStatus.UNPAID]: '未付款',
  [CustomerPayStatus.PARTIAL]: '部分付款',
  [CustomerPayStatus.PAID]: '已付清',
};

/** Payment method. */
export const PaymentMethod = {
  WECHAT: 'wechat',
  ALIPAY: 'alipay',
  BANK: 'bank',
  CREDIT: 'credit',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.WECHAT]: '微信',
  [PaymentMethod.ALIPAY]: '支付宝',
  [PaymentMethod.BANK]: '银行转账',
  [PaymentMethod.CREDIT]: '赊账',
};

/** Quote status. */
export const QuoteStatus = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CONVERTED: 'converted',
  PARTIALLY_CONVERTED: 'partially_converted',
} as const;

export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  [QuoteStatus.ACTIVE]: '有效',
  [QuoteStatus.EXPIRED]: '已过期',
  [QuoteStatus.CONVERTED]: '已转换',
  [QuoteStatus.PARTIALLY_CONVERTED]: '部分转换',
};

/** Supplier status. */
export const SupplierStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  ELIMINATED: 'eliminated',
} as const;

export type SupplierStatus =
  (typeof SupplierStatus)[keyof typeof SupplierStatus];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  [SupplierStatus.ACTIVE]: '正常',
  [SupplierStatus.SUSPENDED]: '暂停',
  [SupplierStatus.ELIMINATED]: '淘汰',
};

/** Settlement type for suppliers. */
export const SettleType = {
  PREPAY: 'prepay',
  CREDIT: 'credit',
} as const;

export type SettleType = (typeof SettleType)[keyof typeof SettleType];

export const SETTLE_TYPE_LABELS: Record<SettleType, string> = {
  [SettleType.PREPAY]: '预付款',
  [SettleType.CREDIT]: '账期',
};

/** Credit type for customers. */
export const CreditType = {
  PREPAY: 'prepay',
  CREDIT: 'credit',
} as const;

export type CreditType = (typeof CreditType)[keyof typeof CreditType];

export const CREDIT_TYPE_LABELS: Record<CreditType, string> = {
  [CreditType.PREPAY]: '预付款',
  [CreditType.CREDIT]: '账期',
};

/** Payment record type. */
export const PaymentRecordType = {
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
} as const;

export type PaymentRecordType =
  (typeof PaymentRecordType)[keyof typeof PaymentRecordType];

export const PAYMENT_RECORD_TYPE_LABELS: Record<PaymentRecordType, string> = {
  [PaymentRecordType.CUSTOMER]: '客户付款',
  [PaymentRecordType.SUPPLIER]: '供应商付款',
};

/** Product category. */
export const ProductCategory = {
  IRON_FRAME_MOTOR: 'IRON_FRAME_MOTOR',
} as const;

export type ProductCategory =
  (typeof ProductCategory)[keyof typeof ProductCategory];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.IRON_FRAME_MOTOR]: '铁架电机',
};

/** Product sub-category. */
export const ProductSubCategory = {
  IRON_FRAME: 'IRON_FRAME',
  MOTOR: 'MOTOR',
  MATTRESS: 'MATTRESS',
  ACCESSORY: 'ACCESSORY',
} as const;

export type ProductSubCategory =
  (typeof ProductSubCategory)[keyof typeof ProductSubCategory];

export const PRODUCT_SUB_CATEGORY_LABELS: Record<ProductSubCategory, string> = {
  [ProductSubCategory.IRON_FRAME]: '铁架',
  [ProductSubCategory.MOTOR]: '电机',
  [ProductSubCategory.MATTRESS]: '床垫',
  [ProductSubCategory.ACCESSORY]: '配件',
};
