/**
 * Validation utilities for Ant Design forms.
 */

import type { Rule } from 'antd/es/form';
import { CREDIT_DAYS_MAX, CREDIT_DAYS_MIN } from './constants';

// Phone number regex: Chinese mobile format 1[3-9]xxxxxxxxx
const PHONE_REGEX = /^1[3-9]\d{9}$/;

// Email regex: simple but effective
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Business code patterns
const ORDER_CODE_REGEX = /^ORD-\d{4}-\d{4}$/;
const QUOTE_CODE_REGEX = /^QT-\d{4}-\d{4}$/;
const FABRIC_CODE_REGEX = /^BF-\d{4}-\d{4}$/;

/**
 * Required field validation rule.
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function required(message: string = '此字段为必填项'): Rule {
  return {
    required: true,
    message,
  };
}

/**
 * Email validation rule.
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function email(message: string = '请输入有效的邮箱地址'): Rule {
  return {
    pattern: EMAIL_REGEX,
    message,
  };
}

/**
 * Phone number validation rule.
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function phone(message: string = '请输入有效的手机号码'): Rule {
  return {
    pattern: PHONE_REGEX,
    message,
  };
}

/**
 * Minimum length validation rule.
 * @param min - Minimum length
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function minLength(
  min: number,
  message: string = `最少需要 ${min} 个字符`
): Rule {
  return {
    min,
    message,
  };
}

/**
 * Maximum length validation rule.
 * @param max - Maximum length
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function maxLength(
  max: number,
  message: string = `最多允许 ${max} 个字符`
): Rule {
  return {
    max,
    message,
  };
}

/**
 * Positive number validation rule (> 0).
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function positiveNumber(message: string = '请输入正数'): Rule {
  return {
    validator: (_, value) => {
      if (value === null || value === undefined || value === '') {
        return Promise.resolve();
      }
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || num <= 0) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
  };
}

/**
 * Non-negative number validation rule (>= 0).
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function nonNegativeNumber(message: string = '请输入非负数'): Rule {
  return {
    validator: (_, value) => {
      if (value === null || value === undefined || value === '') {
        return Promise.resolve();
      }
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || num < 0) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
  };
}

/**
 * Price validation rule (positive number with max 2 decimal places).
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function price(message: string = '请输入有效的价格'): Rule {
  return {
    validator: (_, value) => {
      if (value === null || value === undefined || value === '') {
        return Promise.resolve();
      }
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || num <= 0) {
        return Promise.reject(new Error(message));
      }
      // Check max 2 decimal places
      const decimalPart = String(num).split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        return Promise.reject(new Error('价格最多保留2位小数'));
      }
      return Promise.resolve();
    },
  };
}

/**
 * Credit days validation rule (0-365).
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function creditDays(message: string = '账期天数必须在0-365之间'): Rule {
  return {
    validator: (_, value) => {
      if (value === null || value === undefined || value === '') {
        return Promise.resolve();
      }
      const num = typeof value === 'string' ? parseInt(value, 10) : value;
      if (isNaN(num) || num < CREDIT_DAYS_MIN || num > CREDIT_DAYS_MAX) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
  };
}

/**
 * Integer validation rule.
 * @param message - Custom error message
 * @returns Ant Design form rule
 */
export function integer(message: string = '请输入整数'): Rule {
  return {
    validator: (_, value) => {
      if (value === null || value === undefined || value === '') {
        return Promise.resolve();
      }
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || !Number.isInteger(num)) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
  };
}

// =====================
// Validation helpers
// =====================

/**
 * Check if a string is a valid email address.
 * @param emailStr - The string to check
 * @returns true if valid email
 */
export function isValidEmail(emailStr: string): boolean {
  return EMAIL_REGEX.test(emailStr);
}

/**
 * Check if a string is a valid Chinese mobile phone number.
 * @param phoneStr - The string to check
 * @returns true if valid phone
 */
export function isValidPhone(phoneStr: string): boolean {
  return PHONE_REGEX.test(phoneStr);
}

/**
 * Check if a string is a valid order code.
 * @param code - The string to check
 * @returns true if valid order code
 */
export function isValidOrderCode(code: string): boolean {
  return ORDER_CODE_REGEX.test(code);
}

/**
 * Check if a string is a valid quote code.
 * @param code - The string to check
 * @returns true if valid quote code
 */
export function isValidQuoteCode(code: string): boolean {
  return QUOTE_CODE_REGEX.test(code);
}

/**
 * Check if a string is a valid fabric code.
 * @param code - The string to check
 * @returns true if valid fabric code
 */
export function isValidFabricCode(code: string): boolean {
  return FABRIC_CODE_REGEX.test(code);
}
