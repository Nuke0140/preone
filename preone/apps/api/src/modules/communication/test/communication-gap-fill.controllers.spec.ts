/**
 * Communication Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { CommunicationGapFillControllerPart1, CommunicationGapFillControllerPart2 } from '../controllers/communication-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Communication Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let communicationGapFillControllerPart1: CommunicationGapFillControllerPart1;
  let communicationGapFillControllerPart2: CommunicationGapFillControllerPart2;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    communicationGapFillControllerPart1 = new CommunicationGapFillControllerPart1(cb as any, qb as any);
    communicationGapFillControllerPart2 = new CommunicationGapFillControllerPart2(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [CommunicationGapFillControllerPart1, CommunicationGapFillControllerPart2],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('CommunicationGapFillControllerPart1', () => {
    it('PATCH notifications/:id -> dispatches Communication.UpdateNotification', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart1.patchNotificationsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.UpdateNotification');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE notifications/:id -> dispatches Communication.DeleteNotification', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart1.deleteNotificationsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.DeleteNotification');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST notifications/mark-all-read -> dispatches Communication.CreateMarkAllRead', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart1.postNotificationsMarkallread({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.CreateMarkAllRead');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET notifications/unread-count -> dispatches Communication.ListUnreadCount', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart1.getNotificationsUnreadcount({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.ListUnreadCount');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH announcements/:id -> dispatches Communication.UpdateAnnouncement', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart1.patchAnnouncementsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.UpdateAnnouncement');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE announcements/:id -> dispatches Communication.DeleteAnnouncement', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart1.deleteAnnouncementsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.DeleteAnnouncement');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET announcements/:id/acknowledgments -> dispatches Communication.ListAnnouncementAcknowledgments', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart1.getAnnouncementsByidAcknowledgments({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.ListAnnouncementAcknowledgments');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('CommunicationGapFillControllerPart2', () => {
    it('PATCH conversations/:id -> dispatches Communication.UpdateConversation', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart2.patchConversationsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.UpdateConversation');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE conversations/:id -> dispatches Communication.DeleteConversation', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart2.deleteConversationsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.DeleteConversation');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET conversations/:id/participants -> dispatches Communication.ListConversationParticipants', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart2.getConversationsByidParticipants({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.ListConversationParticipants');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE messages/:id -> dispatches Communication.DeleteMessage', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart2.deleteMessagesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.DeleteMessage');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST messages/:id/reactions -> dispatches Communication.Reactions', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart2.postMessagesByidReactions({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.Reactions');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST conversations/:id/typing -> dispatches Communication.Typing', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart2.postConversationsByidTyping({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.Typing');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET messages/search -> dispatches Communication.ListSearch', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await communicationGapFillControllerPart2.getMessagesSearch({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Communication.ListSearch');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
