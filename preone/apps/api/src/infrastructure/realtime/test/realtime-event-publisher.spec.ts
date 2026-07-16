/**
 * Unit tests for RealtimeEventPublisher (Wave 16.1).
 *
 * Verifies the publisher:
 *   - Delegates to WsPubSubBridge.publish with a valid envelope.
 *   - Generates eventId (UUID) + timestamp automatically.
 *   - Drops invalid channels (defensive).
 *   - Drops non-JSON-serializable payloads (defensive).
 *   - publishToUser / publishToBranch sugar methods build the right channel.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RealtimeEventPublisher } from '../bridge/realtime-event-publisher';

function makeBridgeMock() {
  return {
    publish: vi.fn<(ns: string, tenantId: string, channel: string, envelope: unknown) => Promise<void>>()
      .mockResolvedValue(undefined),
  } as any;
}

describe('RealtimeEventPublisher', () => {
  let publisher: RealtimeEventPublisher;
  let bridge: ReturnType<typeof makeBridgeMock>;

  beforeEach(() => {
    bridge = makeBridgeMock();
    publisher = new RealtimeEventPublisher(bridge);
  });

  describe('publish', () => {
    it('should delegate to bridge with a valid envelope', async () => {
      await publisher.publish(
        'chat',
        '01HSCH',
        'room:01HROOM',
        'chat.message.sent',
        { messageId: '01HMSG', body: 'hi' },
      );

      expect(bridge.publish).toHaveBeenCalledTimes(1);
      const [ns, tenantId, channel, envelope] = bridge.publish.mock.calls[0];
      expect(ns).toBe('chat');
      expect(tenantId).toBe('01HSCH');
      expect(channel).toBe('room:01HROOM');
      expect(envelope).toMatchObject({
        event: 'chat.message.sent',
        payload: { messageId: '01HMSG', body: 'hi' },
      });
      // eventId + timestamp auto-generated
      expect(typeof envelope.eventId).toBe('string');
      expect(envelope.eventId.length).toBeGreaterThan(0);
      expect(typeof envelope.timestamp).toBe('string');
      // ISO 8601
      expect(new Date(envelope.timestamp).toISOString()).toBe(envelope.timestamp);
    });

    it('should drop invalid channel without calling bridge.publish', async () => {
      await publisher.publish(
        'chat',
        '01HSCH',
        'not-a-valid-channel',
        'chat.message.sent',
        { body: 'hi' },
      );
      expect(bridge.publish).not.toHaveBeenCalled();
    });

    it('should drop non-JSON-serializable payloads (circular reference)', async () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      await publisher.publish(
        'chat',
        '01HSCH',
        'room:01HROOM',
        'chat.message.sent',
        circular,
      );
      expect(bridge.publish).not.toHaveBeenCalled();
    });
  });

  describe('publishToUser', () => {
    it('should build user:<userId> channel', async () => {
      await publisher.publishToUser(
        'notifications',
        '01HSCH',
        '01HUSER',
        'notification.created',
        { id: '01HNOT' },
      );
      const [, , channel] = bridge.publish.mock.calls[0];
      expect(channel).toBe('user:01HUSER');
    });
  });

  describe('publishToBranch', () => {
    it('should build branch:<branchId> channel', async () => {
      await publisher.publishToBranch(
        'dashboard',
        '01HSCH',
        '01HBR',
        'dashboard.kpi.updated',
        { attendanceRate: 0.95 },
      );
      const [, , channel] = bridge.publish.mock.calls[0];
      expect(channel).toBe('branch:01HBR');
    });
  });
});
