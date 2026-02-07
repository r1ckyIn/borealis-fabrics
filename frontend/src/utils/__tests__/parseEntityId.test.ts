import { describe, expect, it } from 'vitest';
import { parseEntityId } from '../parseEntityId';

describe('parseEntityId', () => {
  it('should return undefined for undefined input', () => {
    expect(parseEntityId(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(parseEntityId('')).toBeUndefined();
  });

  it('should return undefined for non-numeric string', () => {
    expect(parseEntityId('abc')).toBeUndefined();
    expect(parseEntityId('not-a-number')).toBeUndefined();
  });

  it('should return undefined for NaN-producing input', () => {
    expect(parseEntityId('NaN')).toBeUndefined();
  });

  it('should return undefined for zero', () => {
    expect(parseEntityId('0')).toBeUndefined();
  });

  it('should return undefined for negative numbers', () => {
    expect(parseEntityId('-1')).toBeUndefined();
    expect(parseEntityId('-100')).toBeUndefined();
  });

  it('should return parsed number for valid positive integers', () => {
    expect(parseEntityId('1')).toBe(1);
    expect(parseEntityId('42')).toBe(42);
    expect(parseEntityId('9999')).toBe(9999);
  });

  it('should truncate decimal strings to integer', () => {
    expect(parseEntityId('3.14')).toBe(3);
    expect(parseEntityId('10.99')).toBe(10);
  });

  it('should handle strings with leading zeros', () => {
    expect(parseEntityId('007')).toBe(7);
  });
});
