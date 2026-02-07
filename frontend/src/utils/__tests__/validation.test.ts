import { describe, expect, it } from 'vitest';
import type { RuleObject } from 'antd/es/form';
import {
  creditDays,
  email,
  integer,
  isValidEmail,
  isValidFabricCode,
  isValidOrderCode,
  isValidPhone,
  isValidQuoteCode,
  maxLength,
  minLength,
  nonNegativeNumber,
  phone,
  positiveNumber,
  price,
  required,
} from '../validation';

describe('validation utilities', () => {
  // Helper to test form rules - accepts RuleObject
  async function testRule(rule: RuleObject, value: unknown): Promise<boolean> {
    if ('validator' in rule && rule.validator) {
      try {
        await rule.validator(rule, value, () => {});
        return true;
      } catch {
        return false;
      }
    }
    if ('required' in rule && rule.required) {
      return value !== null && value !== undefined && value !== '';
    }
    if ('pattern' in rule && rule.pattern) {
      return (rule.pattern as RegExp).test(String(value));
    }
    if ('min' in rule && typeof rule.min === 'number') {
      return String(value).length >= rule.min;
    }
    if ('max' in rule && typeof rule.max === 'number') {
      return String(value).length <= rule.max;
    }
    return true;
  }

  describe('required', () => {
    it('should have required: true', () => {
      const rule = required() as RuleObject;
      expect(rule.required).toBe(true);
    });

    it('should use custom message', () => {
      const rule = required('Custom message') as RuleObject;
      expect(rule.message).toBe('Custom message');
    });
  });

  describe('email', () => {
    it('should validate correct email', async () => {
      const rule = email() as RuleObject;
      expect(await testRule(rule, 'test@example.com')).toBe(true);
      expect(await testRule(rule, 'user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email', async () => {
      const rule = email() as RuleObject;
      expect(await testRule(rule, 'invalid')).toBe(false);
      expect(await testRule(rule, 'missing@domain')).toBe(false);
      expect(await testRule(rule, '@nodomain.com')).toBe(false);
    });
  });

  describe('phone', () => {
    it('should validate correct phone', async () => {
      const rule = phone() as RuleObject;
      expect(await testRule(rule, '13812345678')).toBe(true);
      expect(await testRule(rule, '19912345678')).toBe(true);
    });

    it('should reject invalid phone', async () => {
      const rule = phone() as RuleObject;
      expect(await testRule(rule, '12345678901')).toBe(false);
      expect(await testRule(rule, '1381234567')).toBe(false);
      expect(await testRule(rule, '138123456789')).toBe(false);
    });
  });

  describe('minLength', () => {
    it('should validate minimum length', async () => {
      const rule = minLength(5) as RuleObject;
      expect(await testRule(rule, 'hello')).toBe(true);
      expect(await testRule(rule, 'hello world')).toBe(true);
    });

    it('should reject short strings', async () => {
      const rule = minLength(5) as RuleObject;
      expect(await testRule(rule, 'hi')).toBe(false);
    });
  });

  describe('maxLength', () => {
    it('should validate maximum length', async () => {
      const rule = maxLength(10) as RuleObject;
      expect(await testRule(rule, 'hello')).toBe(true);
      expect(await testRule(rule, 'hello worl')).toBe(true);
    });

    it('should reject long strings', async () => {
      const rule = maxLength(10) as RuleObject;
      expect(await testRule(rule, 'hello world!')).toBe(false);
    });
  });

  describe('positiveNumber', () => {
    it('should validate positive numbers', async () => {
      const rule = positiveNumber() as RuleObject;
      expect(await testRule(rule, 1)).toBe(true);
      expect(await testRule(rule, 0.5)).toBe(true);
      expect(await testRule(rule, '100')).toBe(true);
    });

    it('should reject zero and negative', async () => {
      const rule = positiveNumber() as RuleObject;
      expect(await testRule(rule, 0)).toBe(false);
      expect(await testRule(rule, -1)).toBe(false);
    });

    it('should pass for empty values', async () => {
      const rule = positiveNumber() as RuleObject;
      expect(await testRule(rule, null)).toBe(true);
      expect(await testRule(rule, undefined)).toBe(true);
      expect(await testRule(rule, '')).toBe(true);
    });
  });

  describe('nonNegativeNumber', () => {
    it('should validate non-negative numbers', async () => {
      const rule = nonNegativeNumber() as RuleObject;
      expect(await testRule(rule, 0)).toBe(true);
      expect(await testRule(rule, 1)).toBe(true);
    });

    it('should reject negative numbers', async () => {
      const rule = nonNegativeNumber() as RuleObject;
      expect(await testRule(rule, -1)).toBe(false);
      expect(await testRule(rule, -0.1)).toBe(false);
    });
  });

  describe('price', () => {
    it('should validate valid prices', async () => {
      const rule = price() as RuleObject;
      expect(await testRule(rule, 100)).toBe(true);
      expect(await testRule(rule, 99.99)).toBe(true);
      expect(await testRule(rule, '50.00')).toBe(true);
    });

    it('should reject zero and negative prices', async () => {
      const rule = price() as RuleObject;
      expect(await testRule(rule, 0)).toBe(false);
      expect(await testRule(rule, -50)).toBe(false);
    });

    it('should reject more than 2 decimal places', async () => {
      const rule = price() as RuleObject;
      expect(await testRule(rule, 99.999)).toBe(false);
    });

    it('should pass for empty values', async () => {
      const rule = price() as RuleObject;
      expect(await testRule(rule, null)).toBe(true);
      expect(await testRule(rule, '')).toBe(true);
    });
  });

  describe('creditDays', () => {
    it('should validate valid credit days', async () => {
      const rule = creditDays() as RuleObject;
      expect(await testRule(rule, 0)).toBe(true);
      expect(await testRule(rule, 30)).toBe(true);
      expect(await testRule(rule, 365)).toBe(true);
    });

    it('should reject out of range values', async () => {
      const rule = creditDays() as RuleObject;
      expect(await testRule(rule, -1)).toBe(false);
      expect(await testRule(rule, 366)).toBe(false);
    });
  });

  describe('integer', () => {
    it('should validate integers', async () => {
      const rule = integer() as RuleObject;
      expect(await testRule(rule, 1)).toBe(true);
      expect(await testRule(rule, -5)).toBe(true);
      expect(await testRule(rule, 0)).toBe(true);
    });

    it('should reject non-integers', async () => {
      const rule = integer() as RuleObject;
      expect(await testRule(rule, 1.5)).toBe(false);
      expect(await testRule(rule, 'abc')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate Chinese mobile phones', () => {
      expect(isValidPhone('13812345678')).toBe(true);
      expect(isValidPhone('15912345678')).toBe(true);
      expect(isValidPhone('17712345678')).toBe(true);
    });

    it('should reject invalid phones', () => {
      expect(isValidPhone('12345678901')).toBe(false);
      expect(isValidPhone('1381234567')).toBe(false);
      expect(isValidPhone('02112345678')).toBe(false);
    });
  });

  describe('isValidOrderCode', () => {
    it('should validate order codes', () => {
      expect(isValidOrderCode('ORD-2401-0001')).toBe(true);
      expect(isValidOrderCode('ORD-9999-9999')).toBe(true);
    });

    it('should reject invalid order codes', () => {
      expect(isValidOrderCode('ORD-240-0001')).toBe(false);
      expect(isValidOrderCode('QT-2401-0001')).toBe(false);
      expect(isValidOrderCode('ORD2401-0001')).toBe(false);
    });
  });

  describe('isValidQuoteCode', () => {
    it('should validate quote codes', () => {
      expect(isValidQuoteCode('QT-2401-0001')).toBe(true);
      expect(isValidQuoteCode('QT-9999-9999')).toBe(true);
    });

    it('should reject invalid quote codes', () => {
      expect(isValidQuoteCode('ORD-2401-0001')).toBe(false);
      expect(isValidQuoteCode('QT-240-0001')).toBe(false);
    });
  });

  describe('isValidFabricCode', () => {
    it('should validate fabric codes', () => {
      expect(isValidFabricCode('BF-2401-0001')).toBe(true);
      expect(isValidFabricCode('BF-9999-9999')).toBe(true);
    });

    it('should reject invalid fabric codes', () => {
      expect(isValidFabricCode('ORD-2401-0001')).toBe(false);
      expect(isValidFabricCode('BF-240-0001')).toBe(false);
    });
  });
});
