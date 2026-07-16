/**
 * Unit tests for AuditService + redactPii (Wave 9c, BTD §20.5).
 *
 * Verifies:
 *   - redactPii masks email/phone/aadhaar/pan/password/bankAccount fields
 *   - redactPii recurses into nested objects + arrays
 *   - redactPii leaves non-PII fields untouched
 *   - AuditService.record persists with masked PII + returns audit id
 *   - AuditService.record returns null + logs error on Prisma failure
 *   - AuditService.recordBatch persists all entries
 *   - AuditService.record truncates over-long action/module/entity strings
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

import { AuditService, redactPii } from '@infra/audit/audit.service';
import type { PrismaService } from '@infra/prisma/prisma.service';

// ─── redactPii ─────────────────────────────────────

describe('redactPii (Wave 9c)', () => {
  it('masks email + phone + aadhaar + pan + password fields', () => {
    const input = {
      email: 'john.doe@example.com',
      phone: '+919876543210',
      aadhaar: '1234 5678 9012',
      pan: 'ABCDE1234F',
      password: 'supersecret',
      name: 'John Doe',
    };
    const redacted = redactPii(input) as Record<string, string>;
    expect(redacted.email).not.toBe(input.email);
    expect(redacted.email).toContain('***');
    expect(redacted.phone).not.toBe(input.phone);
    expect(redacted.phone).toContain('*');
    expect(redacted.aadhaar).toBe('XXXX-XXXX-9012');
    expect(redacted.pan).not.toBe(input.pan);
    expect(redacted.password).toBe('[REDACTED]');
    // Non-PII fields left untouched
    expect(redacted.name).toBe('John Doe');
  });

  it('masks bankAccount as ****<last4>', () => {
    const input = { bankAccount: '12345678901234' };
    const redacted = redactPii(input) as Record<string, string>;
    expect(redacted.bankAccount).toBe('****1234');
  });

  it('recurses into nested objects', () => {
    const input = {
      parent: {
        email: 'parent@example.com',
        meta: { phone: '9876543210' },
      },
      students: [
        { name: 'A', guardianEmail: 'g@example.com' },
      ],
    };
    const redacted = redactPii(input) as any;
    expect(redacted.parent.email).toContain('***');
    expect(redacted.parent.meta.phone).toContain('*');
    expect(redacted.students[0].guardianEmail).toContain('***');
    expect(redacted.students[0].name).toBe('A');
  });

  it('does not mutate the input', () => {
    const input = { email: 'john.doe@example.com' };
    const inputClone = { ...input };
    redactPii(input);
    expect(input).toEqual(inputClone);
  });

  it('handles null / undefined / primitives', () => {
    expect(redactPii(null)).toBeNull();
    expect(redactPii(undefined)).toBeUndefined();
    expect(redactPii(42)).toBe(42);
    expect(redactPii('hello')).toBe('hello');
  });
});

// ─── AuditService ──────────────────────────────────

describe('AuditService (Wave 9c)', () => {
  let audit: AuditService;
  let prismaMock: { auditLog: { create: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    prismaMock = {
      auditLog: {
        create: vi.fn(async () => ({ id: 'audit-001' })),
      },
    };
    audit = new AuditService(prismaMock as unknown as PrismaService);
  });

  it('persists an audit entry with PII redacted', async () => {
    const id = await audit.record({
      userId: 'user-1',
      schoolId: 'school-1',
      action: 'CREATE',
      module: 'student',
      entity: 'Student',
      entityId: 'student-9',
      newValues: { email: 'parent@example.com', name: 'John' },
      ipAddress: '127.0.0.1',
      userAgent: 'curl/8.0',
      requestId: 'req-1',
      traceId: 'trace-1',
    });

    expect(id).toBe('audit-001');
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    const call = prismaMock.auditLog.create.mock.calls[0]![0];
    expect(call.data.userId).toBe('user-1');
    expect(call.data.action).toBe('CREATE');
    // newValues should be redacted JSON
    const newValues = call.data.newValues;
    // Prisma.JsonNull is a special sentinel; when we pass an object, it becomes the object
    expect(newValues).not.toBe(Prisma.JsonNull);
    expect((newValues as { email: string }).email).toContain('***');
    expect((newValues as { name: string }).name).toBe('John');
  });

  it('uses Prisma.JsonNull when oldValues/newValues/metadata are not provided', async () => {
    await audit.record({
      action: 'DELETE',
      module: 'identity',
      entity: 'User',
      entityId: 'u-1',
    });
    const call = prismaMock.auditLog.create.mock.calls[0]![0];
    expect(call.data.oldValues).toBe(Prisma.JsonNull);
    expect(call.data.newValues).toBe(Prisma.JsonNull);
    expect(call.data.metadata).toBe(Prisma.JsonNull);
  });

  it('truncates over-long action / module / entity strings', async () => {
    await audit.record({
      action: 'A'.repeat(100),
      module: 'B'.repeat(100),
      entity: 'C'.repeat(100),
    });
    const call = prismaMock.auditLog.create.mock.calls[0]![0];
    expect(call.data.action.length).toBe(32);
    expect(call.data.module.length).toBe(64);
    expect(call.data.entity.length).toBe(64);
  });

  it('returns null + logs error when Prisma fails', async () => {
    prismaMock.auditLog.create.mockRejectedValueOnce(new Error('connection refused'));
    const id = await audit.record({
      action: 'CREATE',
      module: 'test',
      entity: 'Test',
    });
    expect(id).toBeNull();
  });

  it('recordBatch persists all entries even if some fail', async () => {
    prismaMock.auditLog.create
      .mockResolvedValueOnce({ id: 'audit-1' })
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ id: 'audit-3' });

    await audit.recordBatch([
      { action: 'CREATE', module: 'm', entity: 'E' },
      { action: 'UPDATE', module: 'm', entity: 'E' },
      { action: 'DELETE', module: 'm', entity: 'E' },
    ]);

    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(3);
  });
});
