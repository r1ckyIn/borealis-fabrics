/**
 * System enums index file.
 * Re-exports all business enums and provides Chinese label mappings.
 */

// Re-export enums from their original locations
export {
  OrderItemStatus,
  CustomerPayStatus,
  PaymentMethod,
} from '../../order/enums/order-status.enum';

export { QuoteStatus } from '../../quote/dto/create-quote.dto';

export {
  SupplierStatus,
  SettleType,
} from '../../supplier/dto/create-supplier.dto';

/**
 * Order item status Chinese labels.
 */
export const ORDER_ITEM_STATUS_LABELS = {
  INQUIRY: '询价中',
  PENDING: '待下单',
  ORDERED: '已下单',
  PRODUCTION: '生产中',
  QC: '质检中',
  SHIPPED: '已发货',
  RECEIVED: '已签收',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
} as const satisfies Record<string, string>;

/**
 * Customer payment status Chinese labels.
 */
export const CUSTOMER_PAY_STATUS_LABELS = {
  unpaid: '未付款',
  partial: '部分付款',
  paid: '已付清',
} as const satisfies Record<string, string>;

/**
 * Payment method Chinese labels.
 */
export const PAYMENT_METHOD_LABELS = {
  wechat: '微信支付',
  alipay: '支付宝',
  bank: '银行转账',
  credit: '赊账',
} as const satisfies Record<string, string>;

/**
 * Quote status Chinese labels.
 */
export const QUOTE_STATUS_LABELS = {
  active: '有效',
  expired: '已过期',
  converted: '已转订单',
} as const satisfies Record<string, string>;

/**
 * Supplier status Chinese labels.
 */
export const SUPPLIER_STATUS_LABELS = {
  active: '合作中',
  suspended: '暂停合作',
  eliminated: '已淘汰',
} as const satisfies Record<string, string>;

/**
 * Settlement type Chinese labels.
 */
export const SETTLE_TYPE_LABELS = {
  prepay: '预付',
  credit: '账期',
} as const satisfies Record<string, string>;

/**
 * Product category enum.
 */
export enum ProductCategory {
  IRON_FRAME_MOTOR = 'IRON_FRAME_MOTOR',
}

/**
 * Product sub-category enum.
 */
export enum ProductSubCategory {
  IRON_FRAME = 'IRON_FRAME',
  MOTOR = 'MOTOR',
  MATTRESS = 'MATTRESS',
  ACCESSORY = 'ACCESSORY',
}

/**
 * Product category Chinese labels.
 */
export const PRODUCT_CATEGORY_LABELS = {
  IRON_FRAME_MOTOR: '铁架电机',
} as const satisfies Record<string, string>;

/**
 * Product sub-category Chinese labels.
 */
export const PRODUCT_SUB_CATEGORY_LABELS = {
  IRON_FRAME: '铁架',
  MOTOR: '电机',
  MATTRESS: '床垫',
  ACCESSORY: '配件',
} as const satisfies Record<string, string>;
