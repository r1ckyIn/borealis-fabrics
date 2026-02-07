/**
 * Query hooks module exports.
 */

// Enum hooks
export {
  enumKeys,
  useEnums,
  useOrderItemStatusOptions,
  useCustomerPayStatusOptions,
  usePaymentMethodOptions,
  useQuoteStatusOptions,
  useSupplierStatusOptions,
  useSettleTypeOptions,
  useAllEnums,
  type SelectOption,
} from './useEnums';

// Fabric hooks
export {
  fabricKeys,
  useFabrics,
  useFabric,
  useFabricSuppliers,
  useFabricPricing,
  useCreateFabric,
  useUpdateFabric,
  useDeleteFabric,
  useUploadFabricImage,
  useDeleteFabricImage,
  useAddFabricSupplier,
  useUpdateFabricSupplier,
  useRemoveFabricSupplier,
  useCreateFabricPricing,
  useUpdateFabricPricing,
  useDeleteFabricPricing,
  type UpdateFabricParams,
  type UploadFabricImageParams,
  type DeleteFabricImageParams,
  type AddFabricSupplierParams,
  type UpdateFabricSupplierParams,
  type RemoveFabricSupplierParams,
  type CreateFabricPricingParams,
  type UpdateFabricPricingParams,
  type DeleteFabricPricingParams,
} from './useFabrics';

// Supplier hooks
export {
  supplierKeys,
  useSuppliers,
  useSupplier,
  useSupplierFabrics,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  type UpdateSupplierParams,
} from './useSuppliers';

// Customer hooks
export {
  customerKeys,
  useCustomers,
  useCustomer,
  useCustomerPricing,
  useCustomerOrders,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useCreateCustomerPricing,
  useUpdateCustomerPricing,
  useDeleteCustomerPricing,
  type UpdateCustomerParams,
  type CreateCustomerPricingParams,
  type UpdateCustomerPricingParams,
  type DeleteCustomerPricingParams,
} from './useCustomers';

// Quote hooks
export {
  quoteKeys,
  useQuotes,
  useQuote,
  useCreateQuote,
  useUpdateQuote,
  useDeleteQuote,
  useConvertQuoteToOrder,
  type UpdateQuoteParams,
} from './useQuotes';

// Order hooks
export {
  orderKeys,
  useOrders,
  useOrder,
  useOrderItems,
  useOrderTimeline,
  useOrderItemTimeline,
  useSupplierPayments,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  useAddOrderItem,
  useUpdateOrderItem,
  useDeleteOrderItem,
  useUpdateOrderItemStatus,
  useCancelOrderItem,
  useRestoreOrderItem,
  useUpdateCustomerPayment,
  useUpdateSupplierPayment,
  type UpdateOrderParams,
  type AddOrderItemParams,
  type UpdateOrderItemParams,
  type UpdateOrderItemStatusParams,
  type CancelOrderItemParams,
  type RestoreOrderItemParams,
  type UpdateCustomerPaymentParams,
  type UpdateSupplierPaymentParams,
} from './useOrders';
