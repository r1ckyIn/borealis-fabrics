import { describe, expect, it } from 'vitest';
import {
  API_BASE_URL,
  API_TIMEOUT,
  CODE_PATTERNS,
  CREDIT_DAYS_MAX,
  CREDIT_DAYS_MIN,
  CURRENCY_SYMBOL,
  DATE_FORMAT,
  DATETIME_FORMAT,
  DECIMAL_PLACES,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_WIDTH,
  STORAGE_KEYS,
  UPLOAD_CONFIG,
} from '../constants';

describe('constants', () => {
  describe('API configuration', () => {
    it('should have correct API base URL', () => {
      expect(API_BASE_URL).toBe('/api/v1');
    });

    it('should have reasonable API timeout', () => {
      expect(API_TIMEOUT).toBe(30000);
      expect(API_TIMEOUT).toBeGreaterThan(0);
    });
  });

  describe('Pagination', () => {
    it('should have valid default page size', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(10);
      expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
    });

    it('should have ascending page size options', () => {
      expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 50, 100]);
      for (let i = 1; i < PAGE_SIZE_OPTIONS.length; i++) {
        expect(PAGE_SIZE_OPTIONS[i]).toBeGreaterThan(PAGE_SIZE_OPTIONS[i - 1]);
      }
    });

    it('should include default page size in options', () => {
      expect(PAGE_SIZE_OPTIONS).toContain(DEFAULT_PAGE_SIZE);
    });
  });

  describe('Date formats', () => {
    it('should have standard date format', () => {
      expect(DATE_FORMAT).toBe('YYYY-MM-DD');
    });

    it('should have standard datetime format', () => {
      expect(DATETIME_FORMAT).toBe('YYYY-MM-DD HH:mm:ss');
    });
  });

  describe('Currency', () => {
    it('should use Chinese Yuan symbol', () => {
      expect(CURRENCY_SYMBOL).toBe('¥');
    });

    it('should have 2 decimal places', () => {
      expect(DECIMAL_PLACES).toBe(2);
    });
  });

  describe('Code patterns', () => {
    it('should match valid order codes', () => {
      expect(CODE_PATTERNS.ORDER.test('ORD-2401-0001')).toBe(true);
      expect(CODE_PATTERNS.ORDER.test('ORD-9999-9999')).toBe(true);
    });

    it('should reject invalid order codes', () => {
      expect(CODE_PATTERNS.ORDER.test('ORD-240-0001')).toBe(false);
      expect(CODE_PATTERNS.ORDER.test('ORDER-2401-0001')).toBe(false);
      expect(CODE_PATTERNS.ORDER.test('ORD-2401-001')).toBe(false);
    });

    it('should match valid quote codes', () => {
      expect(CODE_PATTERNS.QUOTE.test('QT-2401-0001')).toBe(true);
    });

    it('should match valid fabric codes', () => {
      expect(CODE_PATTERNS.FABRIC.test('BF-2401-0001')).toBe(true);
    });
  });

  describe('UI constants', () => {
    it('should have valid sidebar widths', () => {
      expect(SIDEBAR_WIDTH).toBe(200);
      expect(SIDEBAR_COLLAPSED_WIDTH).toBe(80);
      expect(SIDEBAR_WIDTH).toBeGreaterThan(SIDEBAR_COLLAPSED_WIDTH);
    });
  });

  describe('Storage keys', () => {
    it('should have all required storage keys', () => {
      expect(STORAGE_KEYS.AUTH).toBe('bf_auth');
      expect(STORAGE_KEYS.SIDEBAR_COLLAPSED).toBe('bf_sidebar_collapsed');
    });

    it('should have unique storage keys', () => {
      const values = Object.values(STORAGE_KEYS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('Upload config', () => {
    it('should have 10MB max file size', () => {
      expect(UPLOAD_CONFIG.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('should accept common image types', () => {
      expect(UPLOAD_CONFIG.ACCEPTED_IMAGE_TYPES).toContain('image/jpeg');
      expect(UPLOAD_CONFIG.ACCEPTED_IMAGE_TYPES).toContain('image/png');
      expect(UPLOAD_CONFIG.ACCEPTED_IMAGE_TYPES).toContain('image/webp');
    });
  });

  describe('Credit days', () => {
    it('should have valid credit days range', () => {
      expect(CREDIT_DAYS_MIN).toBe(0);
      expect(CREDIT_DAYS_MAX).toBe(365);
      expect(CREDIT_DAYS_MAX).toBeGreaterThan(CREDIT_DAYS_MIN);
    });
  });
});
