/**
 * Global constants for Borealis Fabrics frontend.
 */

// API configuration
export const API_BASE_URL = '/api/v1';
export const API_TIMEOUT = 30000;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// Date formats
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// Currency
export const CURRENCY_SYMBOL = '¥';
export const DECIMAL_PLACES = 2;

// Business code patterns
export const CODE_PATTERNS = {
  ORDER: /^ORD-\d{4}-\d{4}$/,
  QUOTE: /^QT-\d{4}-\d{4}$/,
  FABRIC: /^BF-\d{4}-\d{4}$/,
} as const;

// UI constants
export const SIDEBAR_WIDTH = 200;
export const SIDEBAR_COLLAPSED_WIDTH = 80;

// Storage keys
export const STORAGE_KEYS = {
  AUTH: 'bf_auth',
  SIDEBAR_COLLAPSED: 'bf_sidebar_collapsed',
} as const;

// Route paths
export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
} as const;

// File upload configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

// Credit days range
export const CREDIT_DAYS_MIN = 0;
export const CREDIT_DAYS_MAX = 365;

// Supplier status tag colors for Ant Design
export const SUPPLIER_STATUS_TAG_COLORS: Record<string, string> = {
  active: 'green',
  suspended: 'orange',
  eliminated: 'red',
};
