/**
 * Finance Aggregate Unit Tests — covers FeePlan, Invoice, Payment, Refund
 * aggregate invariants + lifecycle transitions.
 */
import { describe, it, expect } from 'vitest';

import { FeePlanAggregate } from '../domain/aggregates/fee-plan.aggregate';
import { InvoiceAggregate } from '../domain/aggregates/invoice.aggregate';
import { PaymentAggregate } from '../domain/aggregates/payment.aggregate';
import { RefundAggregate } from '../domain/aggregates/refund.aggregate';

describe('FeePlanAggregate', () => {
  it('should create in DRAFT status with FeePlanCreatedEvent', () => {
    const fp = FeePlanAggregate.create({
      tenantId: 't1',
      academicSessionId: 's1',
      programType: 'NURSERY',
      name: 'Nursery Annual Plan',
      code: 'NURSERY-2025',
      frequency: 'QUARTERLY',
      annualFeeCents: 40000,
      securityDepositCents: 5000,
      admissionFeeCents: 2000,
      applicationFeeCents: 500,
      lateFeePerDayCents: 50,
      gstApplicable: false,
      gstRatePercent: 0,
      effectiveFrom: '2025-04-01T00:00:00Z',
    });
    expect(fp.status).toBe('DRAFT');
    expect(fp.code).toBe('NURSERY-2025');
    expect(fp.domainEvents.some(e => e.eventType === 'FeePlanCreatedEvent')).toBe(true);
  });

  it('should reject activation without installments', () => {
    const fp = FeePlanAggregate.create({
      tenantId: 't1', academicSessionId: 's1', programType: 'NURSERY',
      name: 'P', code: 'C', frequency: 'ONE_TIME', annualFeeCents: 10000,
      securityDepositCents: 0, admissionFeeCents: 0, applicationFeeCents: 0,
      lateFeePerDayCents: 0, gstApplicable: false, gstRatePercent: 0,
      effectiveFrom: '2025-01-01T00:00:00Z',
    });
    expect(() => fp.activate()).toThrow('without installments');
  });

  it('should validate installment sum equals annual fee', () => {
    const fp = FeePlanAggregate.create({
      tenantId: 't1', academicSessionId: 's1', programType: 'NURSERY',
      name: 'P', code: 'C', frequency: 'QUARTERLY', annualFeeCents: 40000,
      securityDepositCents: 0, admissionFeeCents: 0, applicationFeeCents: 0,
      lateFeePerDayCents: 0, gstApplicable: false, gstRatePercent: 0,
      effectiveFrom: '2025-01-01T00:00:00Z',
    });
    fp.addInstallment({ installmentNumber: 1, label: 'Q1', dueDate: '2025-04-01', amountCents: 10000, gracePeriodDays: 7, isMandatory: true });
    fp.addInstallment({ installmentNumber: 2, label: 'Q2', dueDate: '2025-07-01', amountCents: 10000, gracePeriodDays: 7, isMandatory: true });
    // Sum is 20000, not 40000 — should fail validation
    expect(() => fp.activate()).toThrow('Installment sum');
  });

  it('should activate when installment sum matches annual fee', () => {
    const fp = FeePlanAggregate.create({
      tenantId: 't1', academicSessionId: 's1', programType: 'NURSERY',
      name: 'P', code: 'C', frequency: 'QUARTERLY', annualFeeCents: 40000,
      securityDepositCents: 0, admissionFeeCents: 0, applicationFeeCents: 0,
      lateFeePerDayCents: 0, gstApplicable: false, gstRatePercent: 0,
      effectiveFrom: '2025-01-01T00:00:00Z',
    });
    for (let i = 1; i <= 4; i++) {
      fp.addInstallment({ installmentNumber: i, label: `Q${i}`, dueDate: '2025-04-01', amountCents: 10000, gracePeriodDays: 7, isMandatory: true });
    }
    fp.activate();
    expect(fp.status).toBe('ACTIVE');
    expect(fp.domainEvents.some(e => e.eventType === 'FeePlanActivatedEvent')).toBe(true);
  });

  it('should not allow adding installments to non-DRAFT plan', () => {
    const fp = FeePlanAggregate.create({
      tenantId: 't1', academicSessionId: 's1', programType: 'NURSERY',
      name: 'P', code: 'C', frequency: 'ONE_TIME', annualFeeCents: 10000,
      securityDepositCents: 0, admissionFeeCents: 0, applicationFeeCents: 0,
      lateFeePerDayCents: 0, gstApplicable: false, gstRatePercent: 0,
      effectiveFrom: '2025-01-01T00:00:00Z',
    });
    fp.addInstallment({ installmentNumber: 1, label: 'Full', dueDate: '2025-04-01', amountCents: 10000, gracePeriodDays: 7, isMandatory: true });
    fp.activate();
    expect(() => fp.addInstallment({ installmentNumber: 2, label: 'X', dueDate: '2025-04-01', amountCents: 5000, gracePeriodDays: 7, isMandatory: true })).toThrow();
  });
});

describe('InvoiceAggregate', () => {
  function createBasicInvoice(overrides: any = {}) {
    return InvoiceAggregate.create({
      tenantId: 't1',
      invoiceNumber: 'INV-2025-000001',
      studentId: 's1',
      invoiceDate: '2025-01-01',
      dueDate: '2025-01-15',
      subtotalCents: 10000,
      concessionCents: 0,
      taxableAmountCents: 10000,
      gstCents: 0,
      lateFeeCents: 0,
      adjustmentCents: 0,
      lineItems: [{
        id: 'li1', lineItemType: 'TUITION', description: 'Q1 Tuition',
        quantity: 1, rateCents: 10000, amountCents: 10000,
        gstRatePercent: 0, gstCents: 0, concessionCents: 0,
      }],
      ...overrides,
    });
  }

  it('should create in DRAFT with calculated total + outstanding', () => {
    const inv = createBasicInvoice();
    expect(inv.status).toBe('DRAFT');
    expect(inv.totalCents).toBe(10000);
    expect(inv.outstandingCents).toBe(10000);
    expect(inv.domainEvents.some(e => e.eventType === 'InvoiceGeneratedEvent')).toBe(true);
  });

  it('should transition DRAFT → ISSUED → PAID on full payment', () => {
    const inv = createBasicInvoice();
    inv.issue('u1', '2025-01-01T00:00:00Z');
    expect(inv.status).toBe('ISSUED');
    inv.recordPayment(10000, '2025-01-10T00:00:00Z');
    expect(inv.status).toBe('PAID');
    expect(inv.outstandingCents).toBe(0);
    expect(inv.domainEvents.some(e => e.eventType === 'InvoicePaidEvent')).toBe(true);
  });

  it('should transition to PARTIALLY_PAID on partial payment', () => {
    const inv = createBasicInvoice();
    inv.issue('u1', '2025-01-01T00:00:00Z');
    inv.recordPayment(4000, '2025-01-10T00:00:00Z');
    expect(inv.status).toBe('PARTIALLY_PAID');
    expect(inv.outstandingCents).toBe(6000);
  });

  it('should reject void on PAID invoice', () => {
    const inv = createBasicInvoice();
    inv.issue('u1', '2025-01-01T00:00:00Z');
    inv.recordPayment(10000, '2025-01-10T00:00:00Z');
    expect(() => inv.void('test', '2025-01-11T00:00:00Z')).toThrow('PAID');
  });

  it('should apply WAIVER adjustment reducing outstanding', () => {
    const inv = createBasicInvoice();
    inv.issue('u1', '2025-01-01T00:00:00Z');
    inv.applyAdjustment({
      adjustmentType: 'WAIVER',
      amountCents: 2000,
      description: 'Financial aid waiver',
      appliedById: 'u2',
    }, '2025-01-05T00:00:00Z');
    expect(inv.totalCents).toBe(8000);
    expect(inv.outstandingCents).toBe(8000);
    expect(inv.domainEvents.some(e => e.eventType === 'InvoiceAdjustedEvent')).toBe(true);
  });

  it('should apply LATE_FEE adjustment increasing outstanding', () => {
    const inv = createBasicInvoice();
    inv.issue('u1', '2025-01-01T00:00:00Z');
    inv.applyAdjustment({
      adjustmentType: 'LATE_FEE',
      amountCents: 500,
      description: '5 days late',
      appliedById: 'system',
    }, '2025-01-20T00:00:00Z');
    expect(inv.totalCents).toBe(10500);
    expect(inv.outstandingCents).toBe(10500);
  });

  it('should mark overdue from ISSUED', () => {
    const inv = createBasicInvoice();
    inv.issue('u1', '2025-01-01T00:00:00Z');
    inv.markOverdue(10);
    expect(inv.status).toBe('OVERDUE');
  });
});

describe('PaymentAggregate', () => {
  it('should create in PENDING status', () => {
    const p = PaymentAggregate.create({
      tenantId: 't1', paymentNumber: 'PAY-2025-000001',
      studentId: 's1', amountCents: 10000, method: 'CASH', gateway: 'MANUAL',
    });
    expect(p.status).toBe('PENDING');
    expect(p.amountCents).toBe(10000);
    expect(p.domainEvents.some(e => e.eventType === 'PaymentRecordedEvent')).toBe(true);
  });

  it('should transition PENDING → SUCCESS', () => {
    const p = PaymentAggregate.create({
      tenantId: 't1', paymentNumber: 'PAY-1', studentId: 's1',
      amountCents: 10000, method: 'CASH', gateway: 'MANUAL',
    });
    p.markSucceeded('2025-01-10T00:00:00Z');
    expect(p.status).toBe('SUCCESS');
    expect(p.domainEvents.some(e => e.eventType === 'PaymentSucceededEvent')).toBe(true);
  });

  it('should allocate to invoice', () => {
    const p = PaymentAggregate.create({
      tenantId: 't1', paymentNumber: 'PAY-1', studentId: 's1',
      amountCents: 10000, method: 'CASH', gateway: 'MANUAL',
    });
    p.markSucceeded('2025-01-10T00:00:00Z');
    p.allocate('inv1', 6000, '2025-01-10T00:00:00Z');
    expect(p.domainEvents.some(e => e.eventType === 'PaymentAllocatedEvent')).toBe(true);
  });

  it('should reject allocation exceeding amount', () => {
    const p = PaymentAggregate.create({
      tenantId: 't1', paymentNumber: 'PAY-1', studentId: 's1',
      amountCents: 5000, method: 'CASH', gateway: 'MANUAL',
    });
    p.markSucceeded('2025-01-10T00:00:00Z');
    expect(() => p.allocate('inv1', 6000, '2025-01-10T00:00:00Z')).toThrow('exceeds');
  });

  it('should reject allocation on non-SUCCESS payment', () => {
    const p = PaymentAggregate.create({
      tenantId: 't1', paymentNumber: 'PAY-1', studentId: 's1',
      amountCents: 5000, method: 'CASH', gateway: 'MANUAL',
    });
    expect(() => p.allocate('inv1', 1000, '2025-01-10T00:00:00Z')).toThrow('non-SUCCESS');
  });

  it('should record refund transitioning to REFUNDED on full refund', () => {
    const p = PaymentAggregate.create({
      tenantId: 't1', paymentNumber: 'PAY-1', studentId: 's1',
      amountCents: 10000, method: 'CASH', gateway: 'MANUAL',
    });
    p.markSucceeded('2025-01-10T00:00:00Z');
    p.recordRefund('r1', 10000);
    expect(p.status).toBe('REFUNDED');
    expect(p.domainEvents.some(e => e.eventType === 'PaymentRefundedEvent')).toBe(true);
  });

  it('should record partial refund transitioning to PARTIALLY_REFUNDED', () => {
    const p = PaymentAggregate.create({
      tenantId: 't1', paymentNumber: 'PAY-1', studentId: 's1',
      amountCents: 10000, method: 'CASH', gateway: 'MANUAL',
    });
    p.markSucceeded('2025-01-10T00:00:00Z');
    p.recordRefund('r1', 4000);
    expect(p.status).toBe('PARTIALLY_REFUNDED');
  });
});

describe('RefundAggregate', () => {
  it('should create in REQUESTED status', () => {
    const r = RefundAggregate.create({
      tenantId: 't1', refundNumber: 'REF-2025-000001',
      paymentId: 'p1', studentId: 's1', amountCents: 5000,
      method: 'ORIGINAL_PAYMENT', reason: 'Parent requested',
      requestedById: 'u1', requestedAt: '2025-01-15T00:00:00Z',
    });
    expect(r.status).toBe('REQUESTED');
    expect(r.domainEvents.some(e => e.eventType === 'RefundRequestedEvent')).toBe(true);
  });

  it('should reject approver same as requester (segregation of duties)', () => {
    const r = RefundAggregate.create({
      tenantId: 't1', refundNumber: 'REF-1', paymentId: 'p1',
      studentId: 's1', amountCents: 5000, method: 'ORIGINAL_PAYMENT',
      reason: 'X', requestedById: 'u1', requestedAt: '2025-01-15T00:00:00Z',
    });
    expect(() => r.approve('u1', '2025-01-16T00:00:00Z')).toThrow('segregation');
  });

  it('should require gatewayRefundId for online refund methods', () => {
    const r = RefundAggregate.create({
      tenantId: 't1', refundNumber: 'REF-1', paymentId: 'p1',
      studentId: 's1', amountCents: 5000, method: 'BANK_TRANSFER',
      reason: 'X', requestedById: 'u1', requestedAt: '2025-01-15T00:00:00Z',
    });
    r.approve('u2', '2025-01-16T00:00:00Z');
    expect(() => r.process('2025-01-17T00:00:00Z')).toThrow('gatewayRefundId');
  });

  it('should process cash refund without gatewayRefundId', () => {
    const r = RefundAggregate.create({
      tenantId: 't1', refundNumber: 'REF-1', paymentId: 'p1',
      studentId: 's1', amountCents: 5000, method: 'CASH',
      reason: 'X', requestedById: 'u1', requestedAt: '2025-01-15T00:00:00Z',
    });
    r.approve('u2', '2025-01-16T00:00:00Z');
    r.process('2025-01-17T00:00:00Z');
    expect(r.status).toBe('PROCESSED');
    expect(r.domainEvents.some(e => e.eventType === 'RefundProcessedEvent')).toBe(true);
  });

  it('should reject from REQUESTED status', () => {
    const r = RefundAggregate.create({
      tenantId: 't1', refundNumber: 'REF-1', paymentId: 'p1',
      studentId: 's1', amountCents: 5000, method: 'CASH',
      reason: 'X', requestedById: 'u1', requestedAt: '2025-01-15T00:00:00Z',
    });
    r.reject('u2', 'Not eligible');
    expect(r.status).toBe('REJECTED');
    expect(r.domainEvents.some(e => e.eventType === 'RefundRejectedEvent')).toBe(true);
  });
});
