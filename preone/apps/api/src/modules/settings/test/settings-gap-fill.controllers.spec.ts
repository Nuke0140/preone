/**
 * Settings Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { SettingsGapFillControllerPart1, SettingsGapFillControllerPart2 } from '../controllers/settings-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Settings Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let settingsGapFillControllerPart1: SettingsGapFillControllerPart1;
  let settingsGapFillControllerPart2: SettingsGapFillControllerPart2;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    settingsGapFillControllerPart1 = new SettingsGapFillControllerPart1(cb as any, qb as any);
    settingsGapFillControllerPart2 = new SettingsGapFillControllerPart2(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [SettingsGapFillControllerPart1, SettingsGapFillControllerPart2],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('SettingsGapFillControllerPart1', () => {
    it('PATCH configs/:id -> dispatches Settings.UpdateConfig', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart1.patchConfigsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.UpdateConfig');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE configs/:id -> dispatches Settings.DeleteConfig', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart1.deleteConfigsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.DeleteConfig');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET configs/by-scope/:scope -> dispatches Settings.GetByScope', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart1.getConfigsByscopeByscope({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.GetByScope');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH preferences/:id -> dispatches Settings.UpdatePreference', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart1.patchPreferencesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.UpdatePreference');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE preferences/:id -> dispatches Settings.DeletePreference', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart1.deletePreferencesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.DeletePreference');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET preferences/by-user/:userId -> dispatches Settings.GetByUser', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart1.getPreferencesByuserByuserid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.GetByUser');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH calendar-events/:id -> dispatches Settings.UpdateCalendarEvent', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart1.patchCalendareventsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.UpdateCalendarEvent');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('SettingsGapFillControllerPart2', () => {
    it('DELETE calendar-events/:id -> dispatches Settings.DeleteCalendarEvent', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart2.deleteCalendareventsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.DeleteCalendarEvent');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET calendar-events/by-date-range -> dispatches Settings.ListByDateRange', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart2.getCalendareventsBydaterange({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.ListByDateRange');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET calendar-events/upcoming -> dispatches Settings.ListUpcoming', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart2.getCalendareventsUpcoming({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.ListUpcoming');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET integrations -> dispatches Settings.ListIntegrations', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart2.getIntegrations({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.ListIntegrations');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH integrations/:id -> dispatches Settings.UpdateIntegration', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await settingsGapFillControllerPart2.patchIntegrationsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Settings.UpdateIntegration');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
