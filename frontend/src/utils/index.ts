/**
 * Centralized exports for utility functions.
 * Usage: import { formatDate, isValidStatusTransition } from '@/utils';
 */

// Constants
export {
  API_BASE_URL,
  API_TIMEOUT,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT,
  DATETIME_FORMAT,
  CURRENCY_SYMBOL,
  DECIMAL_PLACES,
  CODE_PATTERNS,
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  STORAGE_KEYS,
  UPLOAD_CONFIG,
  CREDIT_DAYS_MIN,
  CREDIT_DAYS_MAX,
} from './constants';

// Format utilities
export {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatPhone,
  truncateText,
} from './format';
export type { CurrencyFormatOptions } from './format';

// Validation utilities
export {
  required,
  email,
  phone,
  minLength,
  maxLength,
  positiveNumber,
  nonNegativeNumber,
  price,
  creditDays,
  integer,
  isValidEmail,
  isValidPhone,
  isValidOrderCode,
  isValidQuoteCode,
  isValidFabricCode,
} from './validation';

// Status helpers
export {
  isValidStatusTransition,
  getValidNextStatuses,
  getNextForwardStatus,
  calculateAggregateStatus,
  canModifyItem,
  canDeleteItem,
  canCancelItem,
  canRestoreItem,
  getStatusLabel,
  getStatusColor,
  getStatusProgress,
  getStatusInfo,
  getStatusFlowSteps,
  calculateOrderStatusSummary,
} from './statusHelpers';
export type { StatusInfo, FlowStep, OrderStatusSummary } from './statusHelpers';
