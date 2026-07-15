/**
 * PII Utility — encryption + masking helpers (BTD §20.3).
 *
 * Per BTD §20.3 — PII Protection:
 *   "PII fields encrypted at rest (pgcrypto); masked in logs.
 *    DPDP Act Section 17 — data principal has access, correction, and
 *    erasure rights."
 *
 * Two complementary mechanisms:
 *
 * 1. Column-level encryption (pgcrypto, in DB):
 *    - Use pii_encrypt() / pii_decrypt() SQL functions (created in migration).
 *    - Application code never sees plaintext in DB rows.
 *    - Key is passed via app.encryption_key session variable (set by
 *      PrismaService.withTenant) — never stored in DB.
 *
 * 2. Application-level masking (for logs):
 *    - Use maskEmail / maskPhone / maskAadhaar in this module.
 *    - Always applied BEFORE writing PII to logs (logger, audit, error msgs).
 *
 * Aadhaar-specific:
 *   - 12-digit UIDAI Aadhaar number
 *   - Mask: show only last 4 digits (XXXX-XXXX-1234)
 *   - Per DPDP — Aadhaar is "sensitive personal data" — encrypted + masked
 *     everywhere except the explicit "view Aadhaar" permission-gated screen
 */
import { createHash } from 'node:crypto';

/**
 * Mask an email address for logs.
 * "john.doe@example.com" → "jo***@**.com"
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email) return '<null>';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '****';
  const maskedLocal = local.length <= 2 ? '***' : local.slice(0, 2) + '***';
  const domainParts = domain.split('.');
  const maskedDomain =
    domainParts.length >= 2
      ? '**.' + domainParts[domainParts.length - 1]
      : '****';
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask an Indian phone number for logs.
 * "+91 98765 43210" → "98****3210"
 */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return '<null>';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 5) return '****';
  return digits.slice(0, 2) + '*'.repeat(digits.length - 4) + digits.slice(-2);
}

/**
 * Mask an Aadhaar number for logs / non-permission-gated displays.
 * "1234 5678 9012" → "XXXX-XXXX-9012"
 *
 * Per DPDP — Aadhaar is sensitive personal data. Only the explicit
 * "view Aadhaar" permission (settings:pii:read) allows full display.
 */
export function maskAadhaar(aadhaar: string | undefined | null): string {
  if (!aadhaar) return '<null>';
  const digits = aadhaar.replace(/\D/g, '');
  if (digits.length !== 12) return '****';
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

/**
 * Mask a PAN (Permanent Account Number) for logs.
 * "ABCDE1234F" → "AB***XX**F"
 */
export function maskPan(pan: string | undefined | null): string {
  if (!pan) return '<null>';
  if (pan.length !== 10) return '****';
  return pan.slice(0, 2) + '***' + pan.slice(5, 7) + '**' + pan.slice(-1);
}

/**
 * One-way hash for indexing PII (e.g., email lookup without storing plaintext).
 * Uses SHA-256 with a per-tenant salt.
 *
 * Use case: index users by hashed email so we can find a user by email
 * without storing the email in a queryable column.
 */
export function hashPii(value: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

/**
 * SQL fragment helpers — use with Prisma $queryRaw or $executeRaw.
 * These call the SQL functions defined in the Wave 2.1 migration.
 *
 * Per BTD §20.3 — encryption key from app.encryption_key session variable
 * (set by PrismaService.withTenant).
 */
export const PII_SQL = {
  /** Encrypt a PII value — returns base64 ciphertext. */
  encrypt: (param: string) => `pii_encrypt(${param})`,
  /** Decrypt a PII value — requires same key as encryption. */
  decrypt: (column: string) => `pii_decrypt(${column})`,
  /** Mask a PII value for safe display. */
  mask: (column: string) => `pii_mask(${column})`,
} as const;

/**
 * PII field classification (DPDP Act 2023).
 *
 * Used by audit logger + access controls to apply appropriate protection.
 */
export type PiiClass = 'PUBLIC' | 'NORMAL' | 'SENSITIVE' | 'RESTRICTED';

export const PII_CLASSIFICATION: Record<string, PiiClass> = {
  // Sensitive — DPDP §2(35) sensitive personal data
  aadhaarNumber: 'SENSITIVE',
  panNumber: 'SENSITIVE',
  gstNumber: 'SENSITIVE',
  bankAccount: 'SENSITIVE',
  ifscCode: 'NORMAL',

  // Normal — personally identifiable but not "sensitive"
  email: 'NORMAL',
  phone: 'NORMAL',
  firstName: 'NORMAL',
  lastName: 'NORMAL',
  dateOfBirth: 'NORMAL',
  address: 'NORMAL',
  parentName: 'NORMAL',

  // Public — no extra protection
  displayName: 'PUBLIC',
  avatarUrl: 'PUBLIC',
  schoolName: 'PUBLIC',

  // Restricted — only explicit permission
  password: 'RESTRICTED',
  passwordHash: 'RESTRICTED',
  mfaSecret: 'RESTRICTED',
  encryptionKey: 'RESTRICTED',
} as const;

/**
 * Mask a value based on its field name's PII classification.
 * Returns the value as-is for PUBLIC fields.
 */
export function maskByFieldName(fieldName: string, value: string | undefined | null): string {
  if (value === undefined || value === null) return '<null>';
  const cls = PII_CLASSIFICATION[fieldName] ?? 'NORMAL';
  switch (cls) {
    case 'PUBLIC':
      return value;
    case 'SENSITIVE':
      if (fieldName === 'aadhaarNumber') return maskAadhaar(value);
      if (fieldName === 'panNumber') return maskPan(value);
      return '****';
    case 'RESTRICTED':
      return '****';
    case 'NORMAL':
    default:
      if (fieldName === 'email') return maskEmail(value);
      if (fieldName === 'phone') return maskPhone(value);
      // Default for NORMAL — show first 2 + last 2
      if (value.length < 5) return '****';
      return value.slice(0, 2) + '*'.repeat(Math.max(value.length - 4, 1)) + value.slice(-2);
  }
}
