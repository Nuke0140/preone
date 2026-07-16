/**
 * Unit tests for ws-message-envelope — channel parsing + envelope shape.
 */
import { describe, it, expect } from 'vitest';

import {
  parseChannel,
  CHANNEL_PREFIX,
  type WsMessageEnvelope,
} from '../ws-message-envelope';

describe('parseChannel', () => {
  it('should parse room: prefix', () => {
    expect(parseChannel('room:01HROOM')).toEqual({ prefix: CHANNEL_PREFIX.ROOM, id: '01HROOM' });
  });

  it('should parse class: prefix', () => {
    expect(parseChannel('class:01HCL')).toEqual({ prefix: CHANNEL_PREFIX.CLASS, id: '01HCL' });
  });

  it('should parse branch: prefix', () => {
    expect(parseChannel('branch:01HBR')).toEqual({ prefix: CHANNEL_PREFIX.BRANCH, id: '01HBR' });
  });

  it('should parse user: prefix', () => {
    expect(parseChannel('user:01HUSR')).toEqual({ prefix: CHANNEL_PREFIX.USER, id: '01HUSR' });
  });

  it('should parse trip: prefix', () => {
    expect(parseChannel('trip:01HTRP')).toEqual({ prefix: CHANNEL_PREFIX.TRIP, id: '01HTRP' });
  });

  it('should parse school: prefix', () => {
    expect(parseChannel('school:01HSCH')).toEqual({ prefix: CHANNEL_PREFIX.SCHOOL, id: '01HSCH' });
  });

  it('should return undefined for unknown prefix', () => {
    expect(parseChannel('unknown:01HX')).toBeUndefined();
  });

  it('should return undefined when id is empty', () => {
    expect(parseChannel('room:')).toBeUndefined();
  });

  it('should return undefined for malformed channel', () => {
    expect(parseChannel('')).toBeUndefined();
    expect(parseChannel('room')).toBeUndefined();
    expect(parseChannel('room:')).toBeUndefined();
  });
});

describe('WsMessageEnvelope', () => {
  it('should construct a valid envelope', () => {
    const env: WsMessageEnvelope<{ text: string }> = {
      event: 'chat.message.sent',
      payload: { text: 'hello' },
      eventId: '01J0TEST',
      timestamp: '2026-07-17T10:00:00.000Z',
    };
    expect(env.event).toBe('chat.message.sent');
    expect(env.payload.text).toBe('hello');
    expect(env.eventId).toBe('01J0TEST');
    expect(env.timestamp).toContain('2026-07-17');
  });
});
