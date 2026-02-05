import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatPhone,
  formatQuantity,
  formatRelativeTime,
  truncateText,
} from '../format';

describe('format utilities', () => {
  describe('formatDate', () => {
    it('should format ISO date string', () => {
      expect(formatDate('2024-01-15T10:30:00Z')).toBe('2024-01-15');
    });

    it('should format Date object', () => {
      const date = new Date(2024, 0, 15);
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should return "-" for null/undefined', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
    });

    it('should return "-" for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('-');
    });

    it('should support custom format', () => {
      const result = formatDate('2024-01-15T10:30:00Z', 'YYYY/MM/DD');
      expect(result).toBe('2024/01/15');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime string', () => {
      // Create a date in local time to test
      const date = new Date(2024, 0, 15, 10, 30, 45);
      expect(formatDateTime(date)).toBe('2024-01-15 10:30:45');
    });

    it('should return "-" for null/undefined', () => {
      expect(formatDateTime(null)).toBe('-');
      expect(formatDateTime(undefined)).toBe('-');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "今天" for today', () => {
      const today = new Date();
      expect(formatRelativeTime(today)).toBe('今天');
    });

    it('should return "昨天" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelativeTime(yesterday)).toBe('昨天');
    });

    it('should return "前天" for day before yesterday', () => {
      const dayBeforeYesterday = new Date();
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      expect(formatRelativeTime(dayBeforeYesterday)).toBe('前天');
    });

    it('should return "N天前" for recent dates', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      expect(formatRelativeTime(fiveDaysAgo)).toBe('5天前');
    });

    it('should return "明天" for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(formatRelativeTime(tomorrow)).toBe('明天');
    });

    it('should return formatted date for old dates', () => {
      const oldDate = new Date(2020, 0, 1);
      expect(formatRelativeTime(oldDate)).toBe('2020-01-01');
    });

    it('should return "-" for null/undefined', () => {
      expect(formatRelativeTime(null)).toBe('-');
      expect(formatRelativeTime(undefined)).toBe('-');
    });
  });

  describe('formatCurrency', () => {
    it('should format positive number', () => {
      expect(formatCurrency(1234.56)).toBe('¥1,234.56');
    });

    it('should format negative number', () => {
      expect(formatCurrency(-1234.56)).toBe('-¥1,234.56');
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('¥0.00');
    });

    it('should format string number', () => {
      expect(formatCurrency('1234.56')).toBe('¥1,234.56');
    });

    it('should return "-" for null/undefined', () => {
      expect(formatCurrency(null)).toBe('-');
      expect(formatCurrency(undefined)).toBe('-');
      expect(formatCurrency('')).toBe('-');
    });

    it('should return "-" for invalid number', () => {
      expect(formatCurrency('abc')).toBe('-');
    });

    it('should support custom symbol', () => {
      expect(formatCurrency(100, { symbol: '$' })).toBe('$100.00');
    });

    it('should support custom decimals', () => {
      expect(formatCurrency(100.123, { decimals: 3 })).toBe('¥100.123');
    });

    it('should support plus sign for positive', () => {
      expect(formatCurrency(100, { showPlusSign: true })).toBe('+¥100.00');
      expect(formatCurrency(-100, { showPlusSign: true })).toBe('-¥100.00');
    });
  });

  describe('formatNumber', () => {
    it('should format with thousands separator', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should format with decimals', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57');
    });

    it('should format string number', () => {
      expect(formatNumber('1234567')).toBe('1,234,567');
    });

    it('should return "-" for null/undefined', () => {
      expect(formatNumber(null)).toBe('-');
      expect(formatNumber(undefined)).toBe('-');
      expect(formatNumber('')).toBe('-');
    });

    it('should return "-" for invalid number', () => {
      expect(formatNumber('abc')).toBe('-');
    });
  });

  describe('formatPercent', () => {
    it('should format decimal as percentage', () => {
      expect(formatPercent(0.5)).toBe('50.0%');
      expect(formatPercent(1)).toBe('100.0%');
      expect(formatPercent(0.123)).toBe('12.3%');
    });

    it('should support custom decimals', () => {
      expect(formatPercent(0.1234, 2)).toBe('12.34%');
    });

    it('should return "-" for null/undefined', () => {
      expect(formatPercent(null)).toBe('-');
      expect(formatPercent(undefined)).toBe('-');
    });
  });

  describe('formatQuantity', () => {
    it('should format with default unit', () => {
      expect(formatQuantity(100)).toBe('100.00 米');
    });

    it('should format with custom unit', () => {
      expect(formatQuantity(100, '公斤')).toBe('100.00 公斤');
    });

    it('should return "-" for null/undefined', () => {
      expect(formatQuantity(null)).toBe('-');
      expect(formatQuantity(undefined)).toBe('-');
    });
  });

  describe('formatPhone', () => {
    it('should mask mobile phone number', () => {
      expect(formatPhone('13812345678')).toBe('138****5678');
    });

    it('should handle phone with prefix', () => {
      expect(formatPhone('1381234567890123')).toBe('138****0123');
    });

    it('should return "-" for null/undefined', () => {
      expect(formatPhone(null)).toBe('-');
      expect(formatPhone(undefined)).toBe('-');
    });

    it('should return original for short numbers', () => {
      expect(formatPhone('123456')).toBe('123456');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'a'.repeat(60);
      expect(truncateText(longText, 50)).toBe('a'.repeat(50) + '...');
    });

    it('should not truncate short text', () => {
      expect(truncateText('hello', 50)).toBe('hello');
    });

    it('should return empty string for null/undefined', () => {
      expect(truncateText(null)).toBe('');
      expect(truncateText(undefined)).toBe('');
    });

    it('should handle exact length', () => {
      expect(truncateText('hello', 5)).toBe('hello');
    });
  });
});
