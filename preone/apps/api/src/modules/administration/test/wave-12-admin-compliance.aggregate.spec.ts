/**
 * Wave 12 — Administration Compliance Aggregate unit tests.
 *
 * Coverage:
 *   - ComplianceItemAggregate (R-CMP-005/007/013/014/017/018 + R-HR-009)
 *   - FoodSampleRetentionAggregate (R-OPS-018)
 *   - CctvCoverageAggregate (R-OPS-020)
 */
import { describe, it, expect } from 'vitest';

import { ComplianceItemAggregate } from '../domain/aggregates/compliance-item.aggregate';
import { FoodSampleRetentionAggregate } from '../domain/aggregates/food-sample-retention.aggregate';
import { CctvCoverageAggregate, MIN_RETENTION_DAYS, MAX_RETENTION_DAYS } from '../domain/aggregates/cctv-coverage.aggregate';

const NOW = '2026-07-16T10:00:00.000Z';
const TODAY = '2026-07-16';

// =============================================================================
// ComplianceItemAggregate (R-CMP-005/007/013/014/017/018)
// =============================================================================
describe('ComplianceItemAggregate (R-CMP-005/007/013/014/017/018)', () => {
  it('should create FSSAI license compliance item', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FSSAI_LICENSE', 'FSSAI Kitchen License',
      '2026-04-01', '2027-03-31',
      'branch-1', 30,
    );
    expect(agg.status).toBe('PENDING');
    expect(agg.category).toBe('FSSAI_LICENSE');
    expect(agg.validUntil).toBe('2027-03-31');
  });

  it('should reject validUntil <= validFrom', () => {
    expect(() => ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2026-04-01', '2026-04-01', // same day
    )).toThrow(/validUntil .* must be > validFrom/);
  });

  it('should reject zero renewalWindowDays', () => {
    expect(() => ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2026-04-01', '2027-04-01', undefined, 0,
    )).toThrow(/renewalWindowDays .* must be > 0/);
  });

  it('should activate with certificate number', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FSSAI_LICENSE', 'FSSAI Kitchen License',
      '2026-04-01', '2027-03-31',
    );
    agg.activate('FSSAI-12345', '2026-04-01', 'https://s3.example.com/fssai.pdf');
    expect(agg.status).toBe('ACTIVE');
    expect(agg.certificateNumber).toBe('FSSAI-12345');
  });

  it('should reject activation without certificate (except FIRE_DRILL)', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2026-04-01', '2027-04-01',
    );
    expect(() => agg.activate('', '2026-04-01')).toThrow(/certificateNumber required/);
  });

  it('should allow FIRE_DRILL without certificate number', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_DRILL', 'Q3 Fire Drill',
      '2026-07-01', '2026-10-01', // quarterly
    );
    agg.activate('', '2026-07-15');
    expect(agg.status).toBe('ACTIVE');
  });

  it('should send reminder within renewal window', () => {
    // validUntil = 2026-08-15; renewalWindowDays = 30
    // On 2026-07-20, daysUntilExpiry = 26 — within 30-day window
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2025-08-15', '2026-08-15',
      undefined, 30,
    );
    agg.activate('NOC-123', '2025-08-15');
    agg.sendReminder('2026-07-20T10:00:00.000Z');
    expect(agg.status).toBe('EXPIRING_SOON');
  });

  it('should reject reminder outside renewal window', () => {
    // validUntil = 2027-03-31; renewalWindowDays = 30
    // On 2026-07-20, daysUntilExpiry = 253 — way outside 30-day window
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2026-04-01', '2027-03-31',
      undefined, 30,
    );
    agg.activate('NOC-123', '2026-04-01');
    expect(() => agg.sendReminder('2026-07-20T10:00:00.000Z')).toThrow(/reminder sent too early/);
  });

  it('should expire when validUntil is past', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2025-01-01', '2026-06-30', // expired June 30
    );
    agg.activate('NOC-123', '2025-01-01');
    agg.expire('2026-07-01T00:00:00.000Z');
    expect(agg.status).toBe('EXPIRED');
  });

  it('should reject expire when still valid', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2026-04-01', '2027-04-01',
    );
    agg.activate('NOC-123', '2026-04-01');
    expect(() => agg.expire('2026-07-01T00:00:00.000Z')).toThrow(/still in the future/);
  });

  it('should mark overdue after 30 days expired', () => {
    // validUntil = 2026-06-15, mark overdue on 2026-07-20 (35 days after expiry)
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2025-06-15', '2026-06-15',
    );
    agg.activate('NOC-123', '2025-06-15');
    agg.expire('2026-06-16T00:00:00.000Z');
    agg.markOverdue('2026-07-20T00:00:00.000Z');
    expect(agg.status).toBe('OVERDUE');
  });

  it('should reject overdue before 30 days past expiry', () => {
    // validUntil = 2026-07-10, mark overdue on 2026-07-15 (only 5 days after)
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2025-07-10', '2026-07-10',
    );
    agg.activate('NOC-123', '2025-07-10');
    agg.expire('2026-07-11T00:00:00.000Z');
    expect(() => agg.markOverdue('2026-07-15T00:00:00.000Z')).toThrow(/days since expiry/);
  });

  it('should renew with new certificate + dates', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FSSAI_LICENSE', 'FSSAI Kitchen License',
      '2025-04-01', '2026-03-31',
    );
    agg.activate('FSSAI-OLD', '2025-04-01');
    agg.expire('2026-04-01T00:00:00.000Z');
    agg.renew(
      '2026-04-01', '2027-03-31',
      'FSSAI-NEW', '2026-04-01T10:00:00.000Z',
      'https://s3.example.com/fssai-new.pdf',
    );
    expect(agg.status).toBe('ACTIVE');
    expect(agg.certificateNumber).toBe('FSSAI-NEW');
    expect(agg.validUntil).toBe('2027-03-31');
  });

  it('should waive with formal reason', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_DRILL', 'Q3 Fire Drill',
      '2026-07-01', '2026-10-01',
    );
    agg.waive('School was closed for summer break during Q3 — drill waived by Fire Safety Officer');
    expect(agg.status).toBe('WAIVED');
  });

  it('should reject waiver with short reason', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_DRILL', 'Q3 Fire Drill',
      '2026-07-01', '2026-10-01',
    );
    expect(() => agg.waive('N/A')).toThrow(/waivedReason .* at least 10 chars/);
  });

  it('should track isCurrentlyValid across states', () => {
    const agg = ComplianceItemAggregate.create(
      'school-1', 'FIRE_NOC', 'Fire NOC',
      '2026-04-01', '2027-04-01',
    );
    expect(agg.isCurrentlyValid).toBe(false); // PENDING
    agg.activate('NOC-123', '2026-04-01');
    expect(agg.isCurrentlyValid).toBe(true); // ACTIVE
  });

  it('should support all compliance categories', () => {
    const cats = [
      'FIRE_NOC', 'FIRE_EXTINGUISHER', 'FIRE_DRILL', 'FSSAI_LICENSE',
      'CCTV_RETENTION', 'POSH_TRAINING', 'FOOD_HANDLER_MEDICAL',
      'ICC_CONSTITUTION', 'STAFF_BG_VERIFICATION',
    ] as const;
    for (const c of cats) {
      const agg = ComplianceItemAggregate.create(
        'school-1', c, `Test ${c}`, '2026-01-01', '2027-01-01',
      );
      expect(agg.category).toBe(c);
    }
  });
});

// =============================================================================
// FoodSampleRetentionAggregate (R-OPS-018)
// =============================================================================
describe('FoodSampleRetentionAggregate (R-OPS-018)', () => {
  it('should create sample with 24h retention period', () => {
    const agg = FoodSampleRetentionAggregate.create(
      'school-1', 'branch-1', 'LUNCH', TODAY,
      '2026-07-16T12:00:00.000Z', // collected at noon
      'Kitchen Fridge - Shelf A',
      'emp-1',
    );
    expect(agg.status).toBe('STORED');
    expect(agg.mealType).toBe('LUNCH');
    // retentionUntil should be 24h after sampleCollectedAt
    const expected = new Date('2026-07-16T12:00:00.000Z').getTime() + (24 * 60 * 60 * 1000);
    expect(new Date(agg.retentionUntil).getTime()).toBe(expected);
  });

  it('should reject creation without storageLocation', () => {
    expect(() => FoodSampleRetentionAggregate.create(
      'school-1', 'branch-1', 'LUNCH', TODAY, NOW, '',
    )).toThrow(/storageLocation required/);
  });

  it('should reject disposal before retentionUntil', () => {
    const agg = FoodSampleRetentionAggregate.create(
      'school-1', 'branch-1', 'BREAKFAST', TODAY,
      '2026-07-16T08:00:00.000Z', // collected 8 AM
      'Fridge A',
    );
    // retentionUntil = 2026-07-17T08:00:00.000Z
    // Try to dispose at 2026-07-16T20:00:00.000Z (12h after, 12h before retention ends)
    expect(() => agg.dispose('2026-07-16T20:00:00.000Z')).toThrow(/cannot dispose before retentionUntil/);
  });

  it('should allow disposal after retentionUntil', () => {
    const agg = FoodSampleRetentionAggregate.create(
      'school-1', 'branch-1', 'BREAKFAST', TODAY,
      '2026-07-16T08:00:00.000Z',
      'Fridge A',
    );
    // Dispose 25h after collection (1h after retention ends)
    agg.dispose('2026-07-17T09:00:00.000Z', 'INCINERATION');
    expect(agg.status).toBe('DISPOSED');
  });

  it('should request lab test on food poisoning incident', () => {
    const agg = FoodSampleRetentionAggregate.create(
      'school-1', 'branch-1', 'LUNCH', TODAY,
      '2026-07-16T12:00:00.000Z', 'Fridge A',
    );
    agg.requestLabTest('2026-07-16T18:00:00.000Z', '3 students reported food poisoning');
    expect(agg.status).toBe('LAB_TEST_REQUESTED');
    expect(agg.labTestRequestedAt).toBe('2026-07-16T18:00:00.000Z');
  });

  it('should retain for legal when lab result indicates contamination', () => {
    const agg = FoodSampleRetentionAggregate.create(
      'school-1', 'branch-1', 'LUNCH', TODAY,
      '2026-07-16T12:00:00.000Z', 'Fridge A',
    );
    agg.requestLabTest('2026-07-16T18:00:00.000Z');
    agg.recordLabResult('Sample tested POSITIVE for Salmonella contamination', '2026-07-17T10:00:00.000Z');
    expect(agg.status).toBe('RETAINED_FOR_LEGAL');
  });

  it('should return to STORED when lab result is negative', () => {
    const agg = FoodSampleRetentionAggregate.create(
      'school-1', 'branch-1', 'LUNCH', TODAY,
      '2026-07-16T12:00:00.000Z', 'Fridge A',
    );
    agg.requestLabTest('2026-07-16T18:00:00.000Z');
    agg.recordLabResult('Sample tested negative for all pathogens', '2026-07-17T10:00:00.000Z');
    expect(agg.status).toBe('STORED');
  });

  it('should reject disposal of RETAINED_FOR_LEGAL sample', () => {
    const agg = FoodSampleRetentionAggregate.create(
      'school-1', 'branch-1', 'LUNCH', TODAY,
      '2026-07-16T12:00:00.000Z', 'Fridge A',
    );
    agg.requestLabTest('2026-07-16T18:00:00.000Z');
    agg.recordLabResult('Positive for E. coli', '2026-07-17T10:00:00.000Z');
    expect(() => agg.dispose('2026-07-18T12:00:00.000Z')).toThrow(/retained for legal/);
  });

  it('should track isReadyForDisposal based on retentionUntil', () => {
    const agg = FoodSampleRetentionAggregate.create(
      'school-1', 'branch-1', 'SNACK', TODAY,
      '2026-07-16T15:00:00.000Z', 'Fridge A',
    );
    // Before retentionUntil (which is 2026-07-17T15:00:00.000Z)
    expect(agg.isReadyForDisposal('2026-07-16T20:00:00.000Z')).toBe(false);
    // After retentionUntil
    expect(agg.isReadyForDisposal('2026-07-17T16:00:00.000Z')).toBe(true);
  });

  it('should support all meal types', () => {
    const meals = ['BREAKFAST', 'LUNCH', 'SNACK'] as const;
    for (const m of meals) {
      const agg = FoodSampleRetentionAggregate.create(
        'school-1', 'branch-1', m, TODAY, NOW, 'Fridge A',
      );
      expect(agg.mealType).toBe(m);
    }
  });
});

// =============================================================================
// CctvCoverageAggregate (R-OPS-020 + R-CMP-005)
// =============================================================================
describe('CctvCoverageAggregate (R-OPS-020 + R-CMP-005)', () => {
  it('should create camera with default 30-day retention', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    );
    expect(agg.status).toBe('INSTALLED');
    expect(agg.retentionDays).toBe(MIN_RETENTION_DAYS);
    expect(agg.coverageZone).toBe('ENTRANCE');
  });

  it('should reject retentionDays < 30 (R-CMP-005 minimum)', () => {
    expect(() => CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01', 15,
    )).toThrow(/out of range/);
  });

  it('should reject retentionDays > 90 (R-CMP-005 maximum)', () => {
    expect(() => CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01', 120,
    )).toThrow(/out of range/);
  });

  it('should allow retentionDays in [30, 90]', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01', 60,
    );
    expect(agg.retentionDays).toBe(60);
    expect(agg.isRetentionCompliant).toBe(true);
  });

  it('should activate camera after install', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    );
    agg.activate();
    expect(agg.status).toBe('ACTIVE');
    expect(agg.isMonitored).toBe(true);
  });

  it('should record OK health check', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    );
    agg.activate();
    agg.recordHealthCheck(NOW, 'OK');
    expect(agg.lastHealthCheckStatus).toBe('OK');
    expect(agg.status).toBe('ACTIVE');
  });

  it('should auto-transition to DEGRADED on degraded health', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    );
    agg.activate();
    agg.recordHealthCheck(NOW, 'DEGRADED');
    expect(agg.status).toBe('DEGRADED');
  });

  it('should auto-transition to OFFLINE on offline health', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    );
    agg.activate();
    agg.recordHealthCheck(NOW, 'OFFLINE');
    expect(agg.status).toBe('OFFLINE');
  });

  it('should recover from DEGRADED on OK health check', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    );
    agg.activate();
    agg.recordHealthCheck(NOW, 'DEGRADED');
    expect(agg.status).toBe('DEGRADED');
    agg.recordHealthCheck(NOW, 'OK');
    expect(agg.status).toBe('ACTIVE'); // recovered
  });

  it('should manually mark recovered from OFFLINE', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    );
    agg.activate();
    agg.recordHealthCheck(NOW, 'OFFLINE');
    agg.markRecovered();
    expect(agg.status).toBe('ACTIVE');
  });

  it('should remove/decommission camera', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    );
    agg.activate();
    agg.remove(NOW, 'Camera damaged beyond repair');
    expect(agg.status).toBe('REMOVED');
    expect(agg.isMonitored).toBe(false);
  });

  it('should reject health check on removed camera', () => {
    const agg = CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    );
    agg.activate();
    agg.remove(NOW);
    expect(() => agg.recordHealthCheck(NOW, 'OK')).toThrow(/removed camera/);
  });

  it('should support all coverage zones', () => {
    const zones = ['ENTRANCE', 'CLASSROOM', 'PLAY_AREA', 'KITCHEN', 'CORRIDOR'] as const;
    for (const z of zones) {
      const agg = CctvCoverageAggregate.create(
        'school-1', 'branch-1', `CAM-${z}`,
        `Location ${z}`, z, '2026-01-01',
      );
      expect(agg.coverageZone).toBe(z);
    }
  });

  it('should reject creation without cameraId or location', () => {
    expect(() => CctvCoverageAggregate.create(
      'school-1', 'branch-1', '',
      'Main Entrance', 'ENTRANCE', '2026-01-01',
    )).toThrow(/cameraId and location required/);
    expect(() => CctvCoverageAggregate.create(
      'school-1', 'branch-1', 'CAM-001',
      '', 'ENTRANCE', '2026-01-01',
    )).toThrow(/cameraId and location required/);
  });
});
