/**
 * Platform Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { PlatformGapFillControllerPart1, PlatformGapFillControllerPart2 } from '../controllers/platform-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Platform Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let platformGapFillControllerPart1: PlatformGapFillControllerPart1;
  let platformGapFillControllerPart2: PlatformGapFillControllerPart2;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    platformGapFillControllerPart1 = new PlatformGapFillControllerPart1(cb as any, qb as any);
    platformGapFillControllerPart2 = new PlatformGapFillControllerPart2(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [PlatformGapFillControllerPart1, PlatformGapFillControllerPart2],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('PlatformGapFillControllerPart1', () => {
    it('PATCH provisionings/:id -> dispatches Platform.UpdateProvisioning', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart1.patchProvisioningsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.UpdateProvisioning');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST provisionings/:id/rollback -> dispatches Platform.Rollback', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart1.postProvisioningsByidRollback({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.Rollback');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH feature-flags/:id -> dispatches Platform.UpdateFeatureFlag', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart1.patchFeatureflagsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.UpdateFeatureFlag');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH support-tickets/:id -> dispatches Platform.UpdateSupportTicket', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart1.patchSupportticketsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.UpdateSupportTicket');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST support-tickets/:id/reopen -> dispatches Platform.Reopen', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart1.postSupportticketsByidReopen({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.Reopen');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST support-tickets/:id/escalate -> dispatches Platform.Escalate', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart1.postSupportticketsByidEscalate({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.Escalate');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST support-tickets/:id/comments -> dispatches Platform.Comments', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart1.postSupportticketsByidComments({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.Comments');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('PlatformGapFillControllerPart2', () => {
    it('GET metrics/history -> dispatches Platform.ListHistory', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart2.getMetricsHistory({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.ListHistory');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET audit-log -> dispatches Platform.ListAuditLog', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart2.getAuditlog({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.ListAuditLog');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET audit-log/by-entity/:entityId -> dispatches Platform.GetByEntity', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart2.getAuditlogByentityByentityid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.GetByEntity');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET subscriptions -> dispatches Platform.ListSubscriptions', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart2.getSubscriptions({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.ListSubscriptions');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST subscriptions/:id/cancel -> dispatches Platform.Cancel', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await platformGapFillControllerPart2.postSubscriptionsByidCancel({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Platform.Cancel');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
