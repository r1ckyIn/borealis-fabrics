/**
 * Error message mapping utilities for user-friendly Chinese error messages.
 *
 * Maps backend error codes and HTTP status codes to Chinese text.
 * Used across all page components for consistent error display.
 */

import type { ApiError } from '@/types/api.types';

/**
 * Business error code to Chinese message mapping.
 * Keys match the `message` field returned by backend exceptions.
 */
export const ERROR_CODE_MESSAGES: Record<string, string> = {
  // Supplier-related
  SUPPLIER_HAS_ORDERS: '该供应商有关联的订单，无法删除',
  SUPPLIER_HAS_FABRICS: '该供应商有关联的面料，无法删除',
  // Customer-related
  CUSTOMER_HAS_ORDERS: '该客户有关联的订单，无法删除',
  CUSTOMER_HAS_QUOTES: '该客户有关联的报价单，无法删除',
  // Fabric-related
  FABRIC_HAS_ORDERS: '该面料有关联的订单，无法删除',
  FABRIC_CODE_EXISTS: '面料编码已存在',
  // Company-related
  COMPANY_NAME_EXISTS: '公司名称已存在',
  // Quote-related
  QUOTE_ALREADY_CONVERTED: '该报价单已转为订单',
  QUOTE_EXPIRED: '该报价单已过期',
  // Status-related
  INVALID_STATUS_TRANSITION: '当前状态不允许此操作',
  // Order-related
  ORDER_HAS_PAYMENTS: '该订单有付款记录，无法删除',
  // General
  NOT_IMPLEMENTED: '该功能暂未实现',
};

/**
 * HTTP status code to Chinese fallback message mapping.
 */
export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: '请求参数错误',
  401: '请先登录',
  403: '没有权限执行此操作',
  404: '记录不存在或已被删除',
  409: '存在关联数据，无法删除',
  422: '数据验证失败',
  429: '操作过于频繁，请稍后重试',
  500: '服务器错误，请稍后重试',
  501: '该功能暂未实现',
  503: '服务暂时不可用，请稍后重试',
};

/**
 * Get a user-friendly Chinese error message from an ApiError.
 *
 * Resolution order:
 * 1. Check if error.message matches a key in ERROR_CODE_MESSAGES
 * 2. Check if error.code matches a key in HTTP_STATUS_MESSAGES
 * 3. Fall back to error.message if it is a non-empty string
 * 4. Return generic fallback message
 *
 * @param error - The ApiError object from the API client interceptor
 * @returns A user-friendly Chinese error message
 */
export function getErrorMessage(error: ApiError): string {
  // Try business error code lookup first
  if (
    typeof error.message === 'string' &&
    ERROR_CODE_MESSAGES[error.message] !== undefined
  ) {
    return ERROR_CODE_MESSAGES[error.message];
  }

  // Try HTTP status code lookup
  if (HTTP_STATUS_MESSAGES[error.code] !== undefined) {
    return HTTP_STATUS_MESSAGES[error.code];
  }

  // Fall back to raw message if non-empty
  if (typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }

  // Generic fallback
  return '操作失败，请稍后重试';
}

/**
 * Mapping of known backend field names to form field names.
 * Used by parseFieldError to match validation messages to form fields.
 */
const FIELD_NAME_MAP: Record<string, string> = {
  companyName: 'companyName',
  contactName: 'contactName',
  phone: 'phone',
  wechat: 'wechat',
  email: 'email',
  address: 'address',
  status: 'status',
  billReceiveType: 'billReceiveType',
  settleType: 'settleType',
  creditDays: 'creditDays',
  notes: 'notes',
  creditType: 'creditType',
  fabricCode: 'fabricCode',
  name: 'name',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  validUntil: 'validUntil',
};

/**
 * Parse a backend validation error message to extract field name and message.
 *
 * Backend NestJS ValidationPipe typically returns messages like:
 * - "companyName should not be empty"
 * - "companyName must be a string"
 * - "email must be an email"
 *
 * @param msg - The error message string from backend
 * @returns Parsed field and message, or null if no field match found
 */
export function parseFieldError(
  msg: string
): { field: string; message: string } | null {
  if (!msg || typeof msg !== 'string') return null;

  // Check if the message starts with a known field name
  for (const [backendField, formField] of Object.entries(FIELD_NAME_MAP)) {
    if (msg.startsWith(backendField)) {
      return { field: formField, message: msg };
    }
  }

  return null;
}

/**
 * Get a user-friendly Chinese error message for delete operations.
 *
 * Provides entity-specific 404 messages and delegates to getErrorMessage
 * for other error types.
 *
 * @param error - The ApiError object from the API client interceptor
 * @param entityName - Chinese name of the entity (e.g., '供应商', '客户')
 * @returns A user-friendly Chinese error message
 */
export function getDeleteErrorMessage(
  error: ApiError,
  entityName: string
): string {
  // For 409: try specific error code first, then generic
  if (error.code === 409) {
    if (
      typeof error.message === 'string' &&
      ERROR_CODE_MESSAGES[error.message] !== undefined
    ) {
      return ERROR_CODE_MESSAGES[error.message];
    }
    return '存在关联数据，无法删除';
  }

  // For 404: entity-specific message
  if (error.code === 404) {
    return `${entityName}不存在或已被删除`;
  }

  // Delegate to generic handler
  return getErrorMessage(error);
}
