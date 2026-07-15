/**
 * Attendance Aggregates unit tests — pure domain logic (no IO, no NestJS).
 *
 * Per BTD §24 — Testing Strategy
 */
import { describe, it, expect } from 'vitest';

import { AttendanceAggregate } from '../domain/aggregates/attendance.aggregate';
import { DailyLogAggregate } from '../domain/aggregates/daily-log.aggregate';
import { DailyReportAggregate } from '../domain/aggregates/daily-report.aggregate';
import { IncidentReportAggregate } from '../domain/aggregates/incident-report.aggregate';

describe('AttendanceAggregate', () => {
  const baseProps = {
    tenantId: 'school-1',
    studentId: 'student-1',
    classroomId: 'class-1',
    academicSessionId: 'session-2026',
    attendanceDate: '2026-07-14',
    status: 'PRESENT' as const,
    markedBy: 'teacher-1',
    markedAt: '2026-07-14T09:00:00Z',
    source: 'MANUAL' as const,
  };

  describe('create', () => {
    it('should create attendance with AttendanceMarkedEvent', () => {
      const a = AttendanceAggregate.create(baseProps);
      expect(a.id).toBeDefined();
      expect(a.status).toBe('PRESENT');
      expect(a.domainEvents[0].eventType).toBe('AttendanceMarkedEvent');
    });

    it('should refuse future dates', () => {
      expect(() => AttendanceAggregate.create({
        ...baseProps,
        attendanceDate: '2099-12-31',
      })).toThrow(/future date/);
    });
  });

  describe('check-in / check-out', () => {
    it('should set check-in time', () => {
      const a = AttendanceAggregate.create(baseProps);
      a.setCheckIn('2026-07-14T09:00:00Z', 'CAR');
      expect(a['_props'].checkInAt).toBe('2026-07-14T09:00:00Z');
    });

    it('should set check-out time after check-in', () => {
      const a = AttendanceAggregate.create(baseProps);
      a.setCheckIn('2026-07-14T09:00:00Z', 'CAR');
      a.setCheckOut('2026-07-14T17:00:00Z', 'CAR');
      expect(a['_props'].checkOutAt).toBe('2026-07-14T17:00:00Z');
    });

    it('should refuse check-out before check-in', () => {
      const a = AttendanceAggregate.create(baseProps);
      a.setCheckIn('2026-07-14T10:00:00Z', 'CAR');
      expect(() => a.setCheckOut('2026-07-14T08:00:00Z', 'CAR')).toThrow(/before checkInAt/);
    });
  });

  describe('correction', () => {
    it('should correct status with reason', () => {
      const a = AttendanceAggregate.create(baseProps);
      a.correct('teacher-1', 'PRESENT', 'ABSENT', 'Child went home sick', '2026-07-14T12:00:00Z');
      expect(a.status).toBe('ABSENT');
      expect(a.corrections).toHaveLength(1);
      expect(a.corrections[0].isApproved).toBe(false);
      expect(a.domainEvents.some(e => e.eventType === 'AttendanceCorrectedEvent')).toBe(true);
    });

    it('should refuse correction with wrong fromStatus', () => {
      const a = AttendanceAggregate.create(baseProps);
      expect(() => a.correct('teacher-1', 'ABSENT', 'PRESENT', 'test', '2026-07-14T12:00:00Z'))
        .toThrow(/fromStatus/);
    });

    it('should approve a correction', () => {
      const a = AttendanceAggregate.create(baseProps);
      const c = a.correct('teacher-1', 'PRESENT', 'ABSENT', 'Sick', '2026-07-14T12:00:00Z');
      a.approveCorrection(c.id, 'principal-1', '2026-07-14T13:00:00Z');
      expect(a.corrections[0].isApproved).toBe(true);
    });
  });

  describe('arrival / pickup', () => {
    it('should log arrival and auto-detect late arrival', () => {
      const a = AttendanceAggregate.create(baseProps);
      // 9:30 AM is late (after 9 AM)
      a.logArrival('2026-07-14T09:30:00Z', 'CAR', 'teacher-1');
      expect(a['_props'].arrivalLog).toBeDefined();
      expect(a['_props'].arrivalLog!.isLate).toBe(true);
      expect(a.domainEvents.some(e => e.eventType === 'ArrivalLoggedEvent')).toBe(true);
    });

    it('should log pickup and auto-detect late pickup', () => {
      const a = AttendanceAggregate.create(baseProps);
      // 7 PM is late (after 6 PM)
      a.logPickup('2026-07-14T19:00:00Z', 'CAR', 'teacher-1');
      expect(a['_props'].pickupLog).toBeDefined();
      expect(a['_props'].pickupLog!.isLate).toBe(true);
      expect(a['_props'].latePickup).toBeDefined();
      expect(a['_props'].latePickup!.delayMinutes).toBeGreaterThan(0);
      expect(a.domainEvents.some(e => e.eventType === 'LatePickupRecordedEvent')).toBe(true);
    });

    it('should refuse double arrival log', () => {
      const a = AttendanceAggregate.create(baseProps);
      a.logArrival('2026-07-14T09:00:00Z', 'CAR', 'teacher-1');
      expect(() => a.logArrival('2026-07-14T10:00:00Z', 'CAR', 'teacher-1')).toThrow(/already logged/);
    });
  });
});

describe('DailyLogAggregate', () => {
  const baseProps = {
    tenantId: 'school-1',
    attendanceId: 'att-1',
    studentId: 'student-1',
    logType: 'MEAL' as const,
    loggedAt: '2026-07-14T12:00:00Z',
    recordedBy: 'teacher-1',
    payload: { mealType: 'LUNCH', rating: 'ATE_WELL' },
  };

  it('should create a daily log with DailyLogRecordedEvent', () => {
    const log = DailyLogAggregate.create(baseProps);
    expect(log.id).toBeDefined();
    expect(log.logType).toBe('MEAL');
    expect(log.domainEvents[0].eventType).toBe('DailyLogRecordedEvent');
  });

  it('should refuse future loggedAt', () => {
    expect(() => DailyLogAggregate.create({
      ...baseProps,
      loggedAt: '2099-12-31T00:00:00Z',
    })).toThrow(/future/);
  });

  it('should update notes', () => {
    const log = DailyLogAggregate.create(baseProps);
    log.updateNotes('Ate extra serving');
    expect(log.payload).toEqual({ mealType: 'LUNCH', rating: 'ATE_WELL' });
  });
});

describe('IncidentReportAggregate', () => {
  const baseProps = {
    tenantId: 'school-1',
    studentId: 'student-1',
    classroomId: 'class-1',
    incidentType: 'INJURY' as const,
    severity: 'MEDIUM' as const,
    occurredAt: '2026-07-14T11:00:00Z',
    reportedAt: '2026-07-14T11:30:00Z',
    reportedBy: 'teacher-1',
    description: 'Child fell on the playground and scraped knee',
  };

  it('should create a REPORTED incident with IncidentReportedEvent', () => {
    const incident = IncidentReportAggregate.create(baseProps);
    expect(incident.status).toBe('REPORTED');
    expect(incident.domainEvents[0].eventType).toBe('IncidentReportedEvent');
  });

  it('should escalate severity upward', () => {
    const incident = IncidentReportAggregate.create(baseProps);
    incident.escalate('HIGH', 'Parent complaint received');
    expect(incident.severity).toBe('HIGH');
    expect(incident.domainEvents.some(e => e.eventType === 'IncidentEscalatedEvent')).toBe(true);
  });

  it('should refuse severity downgrade', () => {
    const incident = IncidentReportAggregate.create({ ...baseProps, severity: 'HIGH' });
    expect(() => incident.escalate('LOW', 'test')).toThrow(/increase severity/);
  });

  it('should add action and auto-transition to INVESTIGATING', () => {
    const incident = IncidentReportAggregate.create(baseProps);
    const action = incident.addAction('FIRST_AID', 'Cleaned and bandaged the wound', 'nurse-1', '2026-07-14T11:35:00Z');
    expect(incident.status).toBe('INVESTIGATING');
    expect(incident.actions).toHaveLength(1);
    expect(action.isCompleted).toBe(false);
    expect(incident.domainEvents.some(e => e.eventType === 'IncidentActionAddedEvent')).toBe(true);
  });

  it('should complete an action and auto-transition to ACTION_PENDING', () => {
    const incident = IncidentReportAggregate.create(baseProps);
    const action = incident.addAction('FIRST_AID', 'Cleaned', 'nurse-1', '2026-07-14T11:35:00Z');
    incident.completeAction(action.id, 'Wound cleaned and bandaged', '2026-07-14T11:40:00Z');
    expect(incident.actions[0].isCompleted).toBe(true);
    expect(incident.status).toBe('ACTION_PENDING');
  });

  it('should resolve after action completed', () => {
    const incident = IncidentReportAggregate.create(baseProps);
    const action = incident.addAction('FIRST_AID', 'Cleaned', 'nurse-1', '2026-07-14T11:35:00Z');
    incident.completeAction(action.id, 'Done', '2026-07-14T11:40:00Z');
    incident.resolve('2026-07-14T12:00:00Z', 'Child stable, no further treatment needed');
    expect(incident.status).toBe('RESOLVED');
    expect(incident.domainEvents.some(e => e.eventType === 'IncidentResolvedEvent')).toBe(true);
  });

  it('should refuse resolve without any action', () => {
    const incident = IncidentReportAggregate.create(baseProps);
    expect(() => incident.resolve('2026-07-14T12:00:00Z', 'x')).toThrow(/at least one action/);
  });

  it('should refuse resolve CRITICAL without guardian notification', () => {
    const incident = IncidentReportAggregate.create({ ...baseProps, severity: 'CRITICAL' });
    const action = incident.addAction('FIRST_AID', 'Cleaned', 'nurse-1', '2026-07-14T11:35:00Z');
    incident.completeAction(action.id, 'Done', '2026-07-14T11:40:00Z');
    expect(() => incident.resolve('2026-07-14T12:00:00Z', 'x')).toThrow(/guardian notification/);
  });

  it('should resolve CRITICAL after guardian notified', () => {
    const incident = IncidentReportAggregate.create({ ...baseProps, severity: 'CRITICAL' });
    const action = incident.addAction('FIRST_AID', 'Cleaned', 'nurse-1', '2026-07-14T11:35:00Z');
    incident.completeAction(action.id, 'Done', '2026-07-14T11:40:00Z');
    incident.notifyGuardian('teacher-1', '2026-07-14T11:45:00Z');
    incident.resolve('2026-07-14T12:00:00Z', 'Stable');
    expect(incident.status).toBe('RESOLVED');
  });
});

describe('DailyReportAggregate', () => {
  const baseProps = {
    tenantId: 'school-1',
    studentId: 'student-1',
    attendanceId: 'att-1',
    classroomId: 'class-1',
    reportDate: '2026-07-14',
  };

  it('should create a DRAFT daily report', () => {
    const report = DailyReportAggregate.create(baseProps);
    expect(report.status).toBe('DRAFT');
    expect(report.highlights).toHaveLength(0);
  });

  it('should generate report with summaries', () => {
    const report = DailyReportAggregate.create(baseProps);
    report.generate('teacher-1', '2026-07-14T17:00:00Z', {
      summary: 'Good day overall',
      moodSummary: 'Happy and engaged',
      mealsSummary: 'Ate all meals',
      highlights: ['First time sharing toys'],
    });
    expect(report.status).toBe('GENERATED');
    expect(report.highlights).toHaveLength(1);
    expect(report.domainEvents.some(e => e.eventType === 'DailyReportGeneratedEvent')).toBe(true);
  });

  it('should add highlight before generation', () => {
    const report = DailyReportAggregate.create(baseProps);
    report.addHighlight('Learned new song');
    expect(report.highlights).toHaveLength(1);
  });

  it('should send to parent after generation', () => {
    const report = DailyReportAggregate.create(baseProps);
    report.generate('teacher-1', '2026-07-14T17:00:00Z', { summary: 'Good' });
    report.sendToParent('2026-07-14T17:30:00Z');
    expect(report.status).toBe('SENT');
    expect(report.domainEvents.some(e => e.eventType === 'DailyReportSentEvent')).toBe(true);
  });

  it('should refuse send DRAFT report', () => {
    const report = DailyReportAggregate.create(baseProps);
    expect(() => report.sendToParent('2026-07-14T17:30:00Z')).toThrow(/DRAFT/);
  });

  it('should acknowledge parent receipt', () => {
    const report = DailyReportAggregate.create(baseProps);
    report.generate('teacher-1', '2026-07-14T17:00:00Z', { summary: 'Good' });
    report.sendToParent('2026-07-14T17:30:00Z');
    report.acknowledgeParent('2026-07-14T18:00:00Z');
    expect(report.status).toBe('ACKNOWLEDGED');
  });
});
