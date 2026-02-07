/**
 * Formatting utilities for Borealis Fabrics frontend.
 */

import {
  CURRENCY_SYMBOL,
  DATE_FORMAT,
  DATETIME_FORMAT,
  DECIMAL_PLACES,
} from './constants';

// =====================
// Internal helpers
// =====================

/**
 * Parse value to number, returns null if invalid.
 */
function parseNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? null : num;
}

/**
 * Format a date string to the standard date format (YYYY-MM-DD).
 * @param dateStr - ISO date string or Date object
 * @param format - Optional custom format (defaults to DATE_FORMAT)
 * @returns Formatted date string or '-' if invalid
 */
export function formatDate(
  dateStr: string | Date | null | undefined,
  format: string = DATE_FORMAT
): string {
  if (!dateStr) return '-';

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  if (isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (format === DATE_FORMAT) {
    return `${year}-${month}-${day}`;
  }

  // Handle DATETIME_FORMAT
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  if (format === DATETIME_FORMAT) {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Fallback to simple replacement for custom formats
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Format a date string to datetime format (YYYY-MM-DD HH:mm:ss).
 * @param dateStr - ISO date string or Date object
 * @returns Formatted datetime string or '-' if invalid
 */
export function formatDateTime(
  dateStr: string | Date | null | undefined
): string {
  return formatDate(dateStr, DATETIME_FORMAT);
}

/**
 * Format a date to relative time (today, yesterday, N days ago).
 * @param dateStr - ISO date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(
  dateStr: string | Date | null | undefined
): string {
  if (!dateStr) return '-';

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  if (isNaN(date.getTime())) return '-';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays === 2) return '前天';
  if (diffDays > 0 && diffDays <= 30) return `${diffDays}天前`;
  if (diffDays === -1) return '明天';
  if (diffDays < 0 && diffDays >= -30) return `${Math.abs(diffDays)}天后`;

  return formatDate(date);
}

/**
 * Currency formatting options.
 */
export interface CurrencyFormatOptions {
  /** Currency symbol (default: ¥) */
  symbol?: string;
  /** Decimal places (default: 2) */
  decimals?: number;
  /** Show plus sign for positive numbers */
  showPlusSign?: boolean;
}

/**
 * Format a number as currency (e.g., ¥1,234.56).
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string or '-' if invalid
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: CurrencyFormatOptions = {}
): string {
  const {
    symbol = CURRENCY_SYMBOL,
    decimals = DECIMAL_PLACES,
    showPlusSign = false,
  } = options;

  const num = parseNumber(amount);
  if (num === null) return '-';

  const sign = showPlusSign && num > 0 ? '+' : '';
  const formatted = Math.abs(num).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const prefix = num < 0 ? '-' : sign;
  return `${prefix}${symbol}${formatted}`;
}

/**
 * Format a number with thousands separators.
 * @param value - The number to format
 * @param decimals - Decimal places (default: 0)
 * @returns Formatted number string or '-' if invalid
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  const num = parseNumber(value);
  if (num === null) return '-';

  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a number as a percentage.
 * @param value - The value to format (0.5 = 50%)
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted percentage string or '-' if invalid
 */
export function formatPercent(
  value: number | string | null | undefined,
  decimals: number = 1
): string {
  const num = parseNumber(value);
  if (num === null) return '-';

  return `${(num * 100).toFixed(decimals)}%`;
}

/**
 * Format quantity with unit.
 * @param qty - The quantity
 * @param unit - The unit (default: 米)
 * @returns Formatted quantity string or '-' if invalid
 */
export function formatQuantity(
  qty: number | string | null | undefined,
  unit: string = '米'
): string {
  const num = parseNumber(qty);
  if (num === null) return '-';

  return `${formatNumber(num, 2)} ${unit}`;
}

/**
 * Format phone number with masking (138****1234).
 * @param phone - The phone number
 * @returns Masked phone number or '-' if invalid
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';

  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Chinese mobile phone format
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}****${cleaned.slice(7)}`;
  }

  // Landline or other format - just mask middle digits
  if (cleaned.length >= 7) {
    const start = cleaned.slice(0, 3);
    const end = cleaned.slice(-4);
    return `${start}****${end}`;
  }

  return phone;
}

/**
 * Truncate text with ellipsis.
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated text
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number = 50
): string {
  if (!text) return '';

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength)}...`;
}
