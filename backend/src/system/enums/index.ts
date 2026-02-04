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
export const ORDER_ITEM_STATUS_LABELS: Record<string, string> = {
  INQUIRY: '询价中',
  PENDING: '待下单',
  ORDERED: '已下单',
  PRODUCTION: '生产中',
  QC: '质检中',
  SHIPPED: '已发货',
  RECEIVED: '已签收',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

/**
 * Customer payment status Chinese labels.
 */
export const CUSTOMER_PAY_STATUS_LABELS: Record<string, string> = {
  unpaid: '未付款',
  partial: '部分付款',
  paid: '已付清',
};

/**
 * Payment method Chinese labels.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
  bank: '银行转账',
  credit: '赊账',
};

/**
 * Quote status Chinese labels.
 */
export const QUOTE_STATUS_LABELS: Record<string, string> = {
  active: '有效',
  expired: '已过期',
  converted: '已转订单',
};

/**
 * Supplier status Chinese labels.
 */
export const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  active: '合作中',
  suspended: '暂停合作',
  eliminated: '已淘汰',
};

/**
 * Settlement type Chinese labels.
 */
export const SETTLE_TYPE_LABELS: Record<string, string> = {
  prepay: '预付',
  credit: '账期',
};
