import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeNumber,
  isValidUUID,
  isValidEmail,
  isValidSubscriptionStatus,
  isValidBillingFrequency,
} from '../server/middleware/validation';

describe('validation helpers', () => {
  describe('sanitizeString', () => {
    it('trims and removes angle brackets and limits length', () => {
      const input = '  <hello>  ';
      expect(sanitizeString(input)).toBe('hello');
    });

    it('returns empty string for non-string or falsy', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('sanitizeNumber', () => {
    it('parses numeric strings', () => {
      expect(sanitizeNumber('123.45')).toBe(123.45);
    });

    it('returns null for NaN or huge values', () => {
      expect(sanitizeNumber('abc')).toBeNull();
      expect(sanitizeNumber(1e20)).toBeNull();
    });
  });

  describe('isValidUUID', () => {
    it('accepts correct format', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });
    it('rejects invalid strings', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('validates basic email pattern', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('bad@@example')).toBe(false);
    });
  });

  describe('isValidSubscriptionStatus', () => {
    it('matches known statuses case-insensitively', () => {
      expect(isValidSubscriptionStatus('Active')).toBe(true);
      expect(isValidSubscriptionStatus('unknown')).toBe(false);
    });
  });

  describe('isValidBillingFrequency', () => {
    it('matches valid frequencies', () => {
      expect(isValidBillingFrequency('monthly')).toBe(true);
      expect(isValidBillingFrequency('yearly')).toBe(true);
      expect(isValidBillingFrequency('daily')).toBe(false);
    });
  });
});
