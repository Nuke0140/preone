/**
 * Unit tests for PII utilities — masking + hashing (BTD §20.3).
 */
import { describe, it, expect } from 'vitest';

import {
  maskEmail, maskPhone, maskAadhaar, maskPan, hashPii,
  maskByFieldName, PII_CLASSIFICATION,
} from '@common/utils/pii.util';

describe('PII Utilities — BTD §20.3', () => {
  describe('maskEmail()', () => {
    it('should mask an email leaving first 2 of local + masked domain', () => {
      expect(maskEmail('priya.sharma@school.com')).toMatch(/^pr\*+\@\*\*\.com$/);
    });

    it('should handle short local part (<=2 chars)', () => {
      expect(maskEmail('p@x.in')).toBe('***@**.in');
    });

    it('should handle null/undefined', () => {
      expect(maskEmail(null)).toBe('<null>');
      expect(maskEmail(undefined)).toBe('<null>');
    });

    it('should return **** for malformed email (no @)', () => {
      expect(maskEmail('not-an-email')).toBe('****');
    });
  });

  describe('maskPhone()', () => {
    it('should mask an Indian phone number', () => {
      const masked = maskPhone('+919876543210');
      // +91 is stripped to digits → '919876543210' (12 digits) → first 2 + *** + last 2
      expect(masked).toMatch(/^\d{2}\*+\d{2}$/);
      expect(masked.endsWith('10')).toBe(true);
    });

    it('should mask a 10-digit plain number', () => {
      const masked = maskPhone('9876543210');
      expect(masked).toBe('98******10');
    });

    it('should handle short numbers', () => {
      expect(maskPhone('1234')).toBe('****');
    });

    it('should handle null/undefined', () => {
      expect(maskPhone(null)).toBe('<null>');
      expect(maskPhone(undefined)).toBe('<null>');
    });
  });

  describe('maskAadhaar()', () => {
    it('should mask an Aadhaar number keeping last 4', () => {
      expect(maskAadhaar('1234 5678 9012')).toBe('XXXX-XXXX-9012');
      expect(maskAadhaar('123456789012')).toBe('XXXX-XXXX-9012');
    });

    it('should reject non-12-digit Aadhaar', () => {
      expect(maskAadhaar('1234')).toBe('****');
      expect(maskAadhaar('1234567890123')).toBe('****');
    });

    it('should handle null/undefined', () => {
      expect(maskAadhaar(null)).toBe('<null>');
      expect(maskAadhaar(undefined)).toBe('<null>');
    });
  });

  describe('maskPan()', () => {
    it('should mask a 10-char PAN', () => {
      // 'ABCDE1234F' — slice(0,2)='AB', then '***', then slice(5,7)='12', then '**', then slice(-1)='F'
      expect(maskPan('ABCDE1234F')).toBe('AB***12**F');
    });

    it('should reject non-10-char PAN', () => {
      expect(maskPan('ABC')).toBe('****');
    });
  });

  describe('hashPii()', () => {
    it('should produce a stable SHA-256 hash', () => {
      const salt = 'tenant-salt-001';
      const h1 = hashPii('priya@school.com', salt);
      const h2 = hashPii('priya@school.com', salt);
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different salts', () => {
      const h1 = hashPii('priya@school.com', 'salt-A');
      const h2 = hashPii('priya@school.com', 'salt-B');
      expect(h1).not.toBe(h2);
    });

    it('should produce different hashes for different values', () => {
      const h1 = hashPii('priya@school.com', 'salt');
      const h2 = hashPii('rahul@school.com', 'salt');
      expect(h1).not.toBe(h2);
    });
  });

  describe('PII_CLASSIFICATION', () => {
    it('should classify Aadhaar as SENSITIVE', () => {
      expect(PII_CLASSIFICATION.aadhaarNumber).toBe('SENSITIVE');
    });

    it('should classify password as RESTRICTED', () => {
      expect(PII_CLASSIFICATION.password).toBe('RESTRICTED');
      expect(PII_CLASSIFICATION.passwordHash).toBe('RESTRICTED');
      expect(PII_CLASSIFICATION.mfaSecret).toBe('RESTRICTED');
      expect(PII_CLASSIFICATION.encryptionKey).toBe('RESTRICTED');
    });

    it('should classify email/phone as NORMAL', () => {
      expect(PII_CLASSIFICATION.email).toBe('NORMAL');
      expect(PII_CLASSIFICATION.phone).toBe('NORMAL');
    });

    it('should classify displayName as PUBLIC', () => {
      expect(PII_CLASSIFICATION.displayName).toBe('PUBLIC');
    });
  });

  describe('maskByFieldName()', () => {
    it('should mask email field by name', () => {
      const masked = maskByFieldName('email', 'priya@school.com');
      expect(masked).toMatch(/^pr\*+\@\*\*\.com$/);
    });

    it('should mask phone field by name', () => {
      const masked = maskByFieldName('phone', '9876543210');
      expect(masked).toBe('98******10');
    });

    it('should mask aadhaarNumber field showing only last 4', () => {
      expect(maskByFieldName('aadhaarNumber', '123456789012')).toBe('XXXX-XXXX-9012');
    });

    it('should return PUBLIC fields unchanged', () => {
      expect(maskByFieldName('displayName', 'Priya Sharma')).toBe('Priya Sharma');
      expect(maskByFieldName('schoolName', 'Sunrise Public School')).toBe('Sunrise Public School');
    });

    it('should fully mask RESTRICTED fields', () => {
      expect(maskByFieldName('password', 'secret123')).toBe('****');
      expect(maskByFieldName('passwordHash', '$argon2id$...')).toBe('****');
      expect(maskByFieldName('mfaSecret', 'ABCDEFGH')).toBe('****');
    });

    it('should handle null/undefined values', () => {
      expect(maskByFieldName('email', null)).toBe('<null>');
      expect(maskByFieldName('email', undefined)).toBe('<null>');
    });

    it('should default to NORMAL masking for unknown fields', () => {
      expect(maskByFieldName('unknownField', 'abcdefgh')).toBe('ab****gh');
    });
  });

  describe('PII_SQL constants', () => {
    it('should expose encrypt/decrypt/mask SQL fragment builders', async () => {
      const { PII_SQL } = await import('@common/utils/pii.util');
      expect(PII_SQL.encrypt('$1')).toBe('pii_encrypt($1)');
      expect(PII_SQL.decrypt('email_enc')).toBe('pii_decrypt(email_enc)');
      expect(PII_SQL.mask('phone')).toBe('pii_mask(phone)');
    });
  });
});
