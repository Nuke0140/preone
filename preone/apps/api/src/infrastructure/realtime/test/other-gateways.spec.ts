/**
 * Unit tests for the 4 non-chat gateways: AttendanceLive, Notifications,
 * DashboardKpi, BusTracking. Each test class mocks the WsPubSubBridge and
 * verifies that domain events are correctly routed + published.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';

import { AttendanceLiveGateway } from '../gateways/attendance-live.gateway';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { DashboardKpiGateway } from '../gateways/dashboard-kpi.gateway';
import { BusTrackingGateway } from '../gateways/bus-tracking.gateway';
import { WsJwtVerifier } from '../auth/ws-jwt-verifier';
import { WsConnectionManager } from '../gateway/ws-connection-manager';
import { WsSubscriptionManager } from '../subscription/ws-subscription-manager';
import { WsScopeResolver } from '../subscription/ws-scope-resolver';
import { WsPubSubBridge } from '../bridge/ws-pubsub-bridge';
import {
  WsNamespace,
  type WsAuthenticatedUser,
} from '../ws-connection-context';
import type { WsMessageEnvelope } from '../ws-message-envelope';

function makeUser(roles: string[] = ['ADMIN']): WsAuthenticatedUser {
  return {
    id: '01HALICE',
    tenantId: '01HSCH',
    branchId: '01HBR',
    email: 'alice@preone.in',
    roles,
    permissionsVersion: 1,
    sessionId: '01HSESS',
  };
}

function makeEnvelope<T>(event: string, payload: T): WsMessageEnvelope<T> {
  return {
    event,
    payload,
    eventId: randomUUID(),
    timestamp: '2026-07-17T10:00:00.000Z',
  };
}

function makeSocket(token = 'valid-token'): Socket & { _emitted: unknown[] } {
  const emitted: unknown[] = [];
  const sock: any = {
    id: randomUUID(),
    emit: vi.fn((event: string, payload: unknown) => {
      emitted.push({ event, payload });
    }),
    handshake: { query: { token } },
    on: vi.fn(),
    join: vi.fn(async () => undefined),
    leave: vi.fn(async () => undefined),
    disconnect: vi.fn(),
  };
  sock._emitted = emitted;
  return sock as Socket & { _emitted: unknown[] };
}

/** Builds a fully-wired gateway of the given class + connects the socket. */
async function buildGateway<T extends { handleConnection: (s: Socket) => Promise<void> }>(
  GatewayClass: new (...args: any[]) => T,
  opts: {
    user?: WsAuthenticatedUser;
    subscribeChannels?: string[];
    ns: WsNamespace;
  },
): Promise<{ gateway: T; sock: Socket & { _emitted: unknown[] }; bridge: any; handler: (msg: unknown) => Promise<void> }> {
  const jwtVerifier = {
    verify: vi.fn(async () => opts.user ?? makeUser()),
  } as unknown as WsJwtVerifier;
  const connMgr = new WsConnectionManager();
  const subMgr = new WsSubscriptionManager(connMgr, new WsScopeResolver());
  const bridge = {
    publish: vi.fn(async () => undefined),
    setServer: vi.fn(),
  } as unknown as WsPubSubBridge & { publish: ReturnType<typeof vi.fn> };

  const gateway = new GatewayClass(jwtVerifier, connMgr, subMgr, bridge) as T;
  const sock = makeSocket();
  await gateway.handleConnection(sock);

  // Subscribe to requested channels.
  const handler = (sock as any).on.mock.calls.find(
    (c: unknown[]) => c[0] === opts.ns,
  )![1] as (msg: unknown) => Promise<void>;

  for (const ch of opts.subscribeChannels ?? []) {
    await handler({ event: 'subscribe', channel: ch });
  }

  return { gateway, sock, bridge, handler };
}

// ───────────────────────────────────────────────────────────────────────────
// AttendanceLiveGateway
// ───────────────────────────────────────────────────────────────────────────

describe('AttendanceLiveGateway', () => {
  it('should publish attendance.marked on attendance.mark', async () => {
    const { sock, bridge, handler } = await buildGateway(AttendanceLiveGateway, {
      ns: WsNamespace.ATTENDANCE,
      subscribeChannels: ['class:01HCL'],
    });

    await handler(makeEnvelope('attendance.mark', {
      classId: '01HCL',
      studentId: '01HSTD',
      status: 'PRESENT',
    }));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    const [ns, tenantId, channel, outMsg] = bridge.publish.mock.calls[0];
    expect(ns).toBe(WsNamespace.ATTENDANCE);
    expect(tenantId).toBe('01HSCH');
    expect(channel).toBe('class:01HCL');
    expect(outMsg.event).toBe('attendance.marked');
    expect(outMsg.payload).toMatchObject({
      classId: '01HCL',
      studentId: '01HSTD',
      status: 'PRESENT',
      markedBy: '01HALICE',
    });
  });

  it('should publish attendance.undone on attendance.undo', async () => {
    const { bridge, handler } = await buildGateway(AttendanceLiveGateway, {
      ns: WsNamespace.ATTENDANCE,
      subscribeChannels: ['class:01HCL'],
    });

    await handler(makeEnvelope('attendance.undo', {
      classId: '01HCL',
      studentId: '01HSTD',
    }));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    expect(bridge.publish.mock.calls[0][3].event).toBe('attendance.undone');
  });

  it('should publish attendance.note.added on attendance.note', async () => {
    const { bridge, handler } = await buildGateway(AttendanceLiveGateway, {
      ns: WsNamespace.ATTENDANCE,
      subscribeChannels: ['class:01HCL'],
    });

    await handler(makeEnvelope('attendance.note', {
      classId: '01HCL',
      studentId: '01HSTD',
      note: 'sick leave',
    }));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    expect(bridge.publish.mock.calls[0][3].event).toBe('attendance.note.added');
  });

  it('should reject attendance.mark to a non-subscribed class', async () => {
    const { sock, bridge, handler } = await buildGateway(AttendanceLiveGateway, {
      ns: WsNamespace.ATTENDANCE,
      subscribeChannels: ['class:01HCL'],
    });

    await handler(makeEnvelope('attendance.mark', {
      classId: '01HOTHER',
      studentId: '01HSTD',
      status: 'PRESENT',
    }));

    expect(bridge.publish).not.toHaveBeenCalled();
    const errs = sock._emitted.filter((e: any) => e.event === 'error');
    expect(errs.some((e: any) => e.payload?.code === 'SCOPE_DENIED')).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// NotificationsGateway
// ───────────────────────────────────────────────────────────────────────────

describe('NotificationsGateway', () => {
  it('should publish notification.updated on notification.ack', async () => {
    const { bridge, handler } = await buildGateway(NotificationsGateway, {
      ns: WsNamespace.NOTIFICATIONS,
      subscribeChannels: ['user:01HALICE'],
    });

    await handler(makeEnvelope('notification.ack', { notificationId: '01HNTF' }));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    const [ns, tenantId, channel, outMsg] = bridge.publish.mock.calls[0];
    expect(ns).toBe(WsNamespace.NOTIFICATIONS);
    expect(channel).toBe('user:01HALICE');
    expect(outMsg.event).toBe('notification.updated');
    expect(outMsg.payload.notificationId).toBe('01HNTF');
  });

  it('should publish notification.cleared on notification.dismiss', async () => {
    const { bridge, handler } = await buildGateway(NotificationsGateway, {
      ns: WsNamespace.NOTIFICATIONS,
      subscribeChannels: ['user:01HALICE'],
    });

    await handler(makeEnvelope('notification.dismiss', { notificationId: '01HNTF' }));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    expect(bridge.publish.mock.calls[0][3].event).toBe('notification.cleared');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// DashboardKpiGateway
// ───────────────────────────────────────────────────────────────────────────

describe('DashboardKpiGateway', () => {
  it('should publish dashboard.refresh.requested when user is subscribed to their branch', async () => {
    const { bridge, handler } = await buildGateway(DashboardKpiGateway, {
      ns: WsNamespace.DASHBOARD,
      user: makeUser(['CENTER_HEAD']),
      subscribeChannels: ['branch:01HBR'],
    });

    await handler(makeEnvelope('dashboard.refresh', {}));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    const [ns, tenantId, channel, outMsg] = bridge.publish.mock.calls[0];
    expect(ns).toBe(WsNamespace.DASHBOARD);
    expect(channel).toBe('branch:01HBR');
    expect(outMsg.event).toBe('dashboard.refresh.requested');
  });

  it('should deny refresh when not subscribed', async () => {
    const { sock, bridge, handler } = await buildGateway(DashboardKpiGateway, {
      ns: WsNamespace.DASHBOARD,
      user: makeUser(['CENTER_HEAD']),
      subscribeChannels: [], // not subscribed to branch
    });

    await handler(makeEnvelope('dashboard.refresh', {}));

    expect(bridge.publish).not.toHaveBeenCalled();
    const errs = sock._emitted.filter((e: any) => e.event === 'error');
    expect(errs.some((e: any) => e.payload?.code === 'SCOPE_DENIED')).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// BusTrackingGateway
// ───────────────────────────────────────────────────────────────────────────

describe('BusTrackingGateway', () => {
  it('should publish bus.location.updated on bus.location.update', async () => {
    const { bridge, handler } = await buildGateway(BusTrackingGateway, {
      ns: WsNamespace.BUS,
      subscribeChannels: ['trip:01HTRP'],
    });

    await handler(makeEnvelope('bus.location.update', {
      tripId: '01HTRP',
      lat: 19.076,
      lng: 72.8777,
      heading: 90,
      speed: 35,
    }));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    const [ns, _t, channel, outMsg] = bridge.publish.mock.calls[0];
    expect(ns).toBe(WsNamespace.BUS);
    expect(channel).toBe('trip:01HTRP');
    expect(outMsg.event).toBe('bus.location.updated');
    expect(outMsg.payload).toMatchObject({
      tripId: '01HTRP',
      lat: 19.076,
      lng: 72.8777,
      heading: 90,
      speed: 35,
      reportedBy: '01HALICE',
    });
  });

  it('should publish bus.delay.reported on bus.delay.report', async () => {
    const { bridge, handler } = await buildGateway(BusTrackingGateway, {
      ns: WsNamespace.BUS,
      subscribeChannels: ['trip:01HTRP'],
    });

    await handler(makeEnvelope('bus.delay.report', {
      tripId: '01HTRP',
      delayMinutes: 15,
      reason: 'TRAFFIC',
    }));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    expect(bridge.publish.mock.calls[0][3].event).toBe('bus.delay.reported');
    expect(bridge.publish.mock.calls[0][3].payload.delayMinutes).toBe(15);
  });

  it('should publish bus.stop.skipped on bus.skip.stop', async () => {
    const { bridge, handler } = await buildGateway(BusTrackingGateway, {
      ns: WsNamespace.BUS,
      subscribeChannels: ['trip:01HTRP'],
    });

    await handler(makeEnvelope('bus.skip.stop', {
      tripId: '01HTRP',
      stopId: '01HSTP',
      reason: 'NO_STUDENT',
    }));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    expect(bridge.publish.mock.calls[0][3].event).toBe('bus.stop.skipped');
  });

  it('should publish bus.cancelled on bus.cancel', async () => {
    const { bridge, handler } = await buildGateway(BusTrackingGateway, {
      ns: WsNamespace.BUS,
      subscribeChannels: ['trip:01HTRP'],
    });

    await handler(makeEnvelope('bus.cancel', {
      tripId: '01HTRP',
      reason: 'BREAKDOWN',
    }));

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    expect(bridge.publish.mock.calls[0][3].event).toBe('bus.cancelled');
  });

  it('should reject location update for non-subscribed trip', async () => {
    const { sock, bridge, handler } = await buildGateway(BusTrackingGateway, {
      ns: WsNamespace.BUS,
      subscribeChannels: ['trip:01HTRP'],
    });

    await handler(makeEnvelope('bus.location.update', {
      tripId: '01HOTHER',
      lat: 1,
      lng: 2,
    }));

    expect(bridge.publish).not.toHaveBeenCalled();
    const errs = sock._emitted.filter((e: any) => e.event === 'error');
    expect(errs.some((e: any) => e.payload?.code === 'SCOPE_DENIED')).toBe(true);
  });

  it('should reject location update with missing fields', async () => {
    const { sock, bridge, handler } = await buildGateway(BusTrackingGateway, {
      ns: WsNamespace.BUS,
      subscribeChannels: ['trip:01HTRP'],
    });

    await handler(makeEnvelope('bus.location.update', {
      tripId: '01HTRP',
      // missing lat/lng
    }));

    expect(bridge.publish).not.toHaveBeenCalled();
    const errs = sock._emitted.filter((e: any) => e.event === 'error');
    expect(errs.some((e: any) => e.payload?.code === 'PAYLOAD_INVALID')).toBe(true);
  });
});
