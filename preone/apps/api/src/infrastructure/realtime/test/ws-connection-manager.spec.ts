/**
 * Unit tests for WsConnectionManager — register / unregister / indexes.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { WsConnectionManager } from '../gateway/ws-connection-manager';
import { WsNamespace, type WsConnectionContext, type WsAuthenticatedUser } from '../ws-connection-context';

function makeCtx(
  socketId: string,
  user: Partial<WsAuthenticatedUser> = {},
  ns: WsNamespace = WsNamespace.CHAT,
): WsConnectionContext {
  const u: WsAuthenticatedUser = {
    id: '01HUSER',
    tenantId: '01HSCH',
    branchId: '01HBR',
    email: 'u@preone.in',
    roles: ['TEACHER'],
    permissionsVersion: 1,
    sessionId: '01HSESS',
    ...user,
  };
  return {
    socketId,
    user: u,
    namespace: ns,
    subscriptions: new Set(),
    connectedAt: '2026-07-17T10:00:00.000Z',
    lastPongAt: '2026-07-17T10:00:00.000Z',
  };
}

describe('WsConnectionManager', () => {
  let mgr: WsConnectionManager;

  beforeEach(() => {
    mgr = new WsConnectionManager();
  });

  it('should register a connection and look it up by socketId', () => {
    const ctx = makeCtx('sock-1');
    mgr.register(ctx);
    expect(mgr.get('sock-1')).toBe(ctx);
    expect(mgr.size()).toBe(1);
  });

  it('should unregister a connection and clean up indexes', () => {
    const ctx = makeCtx('sock-1');
    mgr.register(ctx);
    const removed = mgr.unregister('sock-1');
    expect(removed).toBe(ctx);
    expect(mgr.get('sock-1')).toBeUndefined();
    expect(mgr.size()).toBe(0);
  });

  it('should return undefined when unregistering unknown socketId', () => {
    expect(mgr.unregister('never-seen')).toBeUndefined();
  });

  it('should index by user (multiple sockets per user allowed)', () => {
    mgr.register(makeCtx('sock-1', { id: '01HALICE' }));
    mgr.register(makeCtx('sock-2', { id: '01HALICE' }));
    mgr.register(makeCtx('sock-3', { id: '01HBOB' }));

    expect(mgr.socketsForUser('01HALICE')).toEqual(['sock-1', 'sock-2']);
    expect(mgr.socketsForUser('01HBOB')).toEqual(['sock-3']);
    expect(mgr.socketsForUser('nobody')).toEqual([]);
  });

  it('should index by tenant', () => {
    mgr.register(makeCtx('sock-1', { tenantId: '01HSCH' }));
    mgr.register(makeCtx('sock-2', { tenantId: '01HSCH' }));
    mgr.register(makeCtx('sock-3', { tenantId: '01HSCH2' }));

    expect(mgr.socketsForTenant('01HSCH')).toHaveLength(2);
    expect(mgr.socketsForTenant('01HSCH2')).toHaveLength(1);
  });

  it('should index by namespace', () => {
    mgr.register(makeCtx('sock-1', {}, WsNamespace.CHAT));
    mgr.register(makeCtx('sock-2', {}, WsNamespace.ATTENDANCE));
    mgr.register(makeCtx('sock-3', {}, WsNamespace.CHAT));

    expect(mgr.sizeForNamespace(WsNamespace.CHAT)).toBe(2);
    expect(mgr.sizeForNamespace(WsNamespace.ATTENDANCE)).toBe(1);
    expect(mgr.sizeForNamespace(WsNamespace.NOTIFICATIONS)).toBe(0);
  });

  it('should find sockets by channel', () => {
    const ctx1 = makeCtx('sock-1');
    ctx1.subscriptions.add('room:01HROOM');
    mgr.register(ctx1);

    const ctx2 = makeCtx('sock-2');
    ctx2.subscriptions.add('room:01HROOM');
    ctx2.subscriptions.add('class:01HCL');
    mgr.register(ctx2);

    const ctx3 = makeCtx('sock-3');
    ctx3.subscriptions.add('class:01HCL');
    mgr.register(ctx3);

    expect(mgr.socketsForChannel('room:01HROOM')).toEqual(['sock-1', 'sock-2']);
    expect(mgr.socketsForChannel('class:01HCL')).toEqual(['sock-2', 'sock-3']);
    expect(mgr.socketsForChannel('room:none')).toEqual([]);
  });

  it('should filter socketsForChannelInTenant by tenantId', () => {
    const ctx1 = makeCtx('sock-1', { tenantId: '01HSCH' });
    ctx1.subscriptions.add('room:01HROOM');
    mgr.register(ctx1);

    const ctx2 = makeCtx('sock-2', { tenantId: '01HSCH2' });
    ctx2.subscriptions.add('room:01HROOM');
    mgr.register(ctx2);

    expect(mgr.socketsForChannelInTenant('room:01HROOM', '01HSCH')).toEqual(['sock-1']);
    expect(mgr.socketsForChannelInTenant('room:01HROOM', '01HSCH2')).toEqual(['sock-2']);
    expect(mgr.socketsForChannelInTenant('room:01HROOM', '01HNOPE')).toEqual([]);
  });

  it('should clean up user/tenant indexes when unregistering', () => {
    mgr.register(makeCtx('sock-1', { id: '01HALICE', tenantId: '01HSCH' }));
    mgr.register(makeCtx('sock-2', { id: '01HALICE', tenantId: '01HSCH' }));

    expect(mgr.socketsForUser('01HALICE')).toHaveLength(2);
    mgr.unregister('sock-1');
    expect(mgr.socketsForUser('01HALICE')).toEqual(['sock-2']);
    mgr.unregister('sock-2');
    expect(mgr.socketsForUser('01HALICE')).toEqual([]);
    expect(mgr.socketsForTenant('01HSCH')).toEqual([]);
  });
});
