/**
 * Unit tests for CircuitBreakerService (Wave 17).
 *
 * Verifies the closed → open → half-open → closed state machine + the
 * rolling-window failure counter + slow-call detection + manual
 * trip/reset + the CircuitOpenError.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CircuitBreakerService, CircuitOpenError } from '../circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let cb: CircuitBreakerService;

  beforeEach(() => {
    cb = new CircuitBreakerService();
    cb.register({
      name: 'test-circuit',
      failureThreshold: 3,
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 1,   // short for tests
      slowCallDurationMs: 100, // 100ms — easy to trigger
    });
  });

  describe('CLOSED state (normal operation)', () => {
    it('should pass through a successful call', async () => {
      const result = await cb.exec('test-circuit', async () => 'ok');
      expect(result).toBe('ok');
      expect(cb.getState('test-circuit')).toBe('CLOSED');
    });

    it('should remain CLOSED after a single failure (below threshold)', async () => {
      const failingCall = vi.fn(async () => { throw new Error('boom'); });
      await expect(cb.exec('test-circuit', failingCall)).rejects.toThrow('boom');
      expect(cb.getState('test-circuit')).toBe('CLOSED');
    });

    it('should OPEN after reaching the failure threshold', async () => {
      const failingCall = vi.fn(async () => { throw new Error('boom'); });
      for (let i = 0; i < 3; i++) {
        await expect(cb.exec('test-circuit', failingCall)).rejects.toThrow('boom');
      }
      expect(cb.getState('test-circuit')).toBe('OPEN');
    });
  });

  describe('OPEN state (fail fast)', () => {
    async function tripCircuit() {
      const failingCall = vi.fn(async () => { throw new Error('boom'); });
      for (let i = 0; i < 3; i++) {
        await expect(cb.exec('test-circuit', failingCall)).rejects.toThrow('boom');
      }
    }

    it('should fail fast with CircuitOpenError (no call to fn)', async () => {
      await tripCircuit();
      const fn = vi.fn(async () => 'should-not-be-called');
      await expect(cb.exec('test-circuit', fn)).rejects.toBeInstanceOf(CircuitOpenError);
      expect(fn).not.toHaveBeenCalled();
    });

    it('CircuitOpenError should include retryAfterSeconds', async () => {
      await tripCircuit();
      try {
        await cb.exec('test-circuit', async () => 'x');
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CircuitOpenError);
        const e = err as CircuitOpenError;
        expect(e.circuitName).toBe('test-circuit');
        expect(e.retryAfterSeconds).toBeGreaterThanOrEqual(0);
        expect(e.retryAfterSeconds).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('HALF_OPEN state (probe)', () => {
    async function tripCircuit() {
      const failingCall = vi.fn(async () => { throw new Error('boom'); });
      for (let i = 0; i < 3; i++) {
        await expect(cb.exec('test-circuit', failingCall)).rejects.toThrow('boom');
      }
    }

    it('should transition OPEN → HALF_OPEN → CLOSED after resetTimeout if probe succeeds', async () => {
      await tripCircuit();
      expect(cb.getState('test-circuit')).toBe('OPEN');
      // Wait for reset timeout (1s in this test).
      await new Promise((r) => setTimeout(r, 1100));
      // Next exec should probe (HALF_OPEN), not fail fast.
      const result = await cb.exec('test-circuit', async () => 'recovered');
      expect(result).toBe('recovered');
      expect(cb.getState('test-circuit')).toBe('CLOSED');
    });

    it('should transition HALF_OPEN → OPEN if probe fails', async () => {
      await tripCircuit();
      await new Promise((r) => setTimeout(r, 1100));
      // Probe fails.
      await expect(
        cb.exec('test-circuit', async () => { throw new Error('still broken'); }),
      ).rejects.toThrow('still broken');
      expect(cb.getState('test-circuit')).toBe('OPEN');
    });
  });

  describe('slow call detection', () => {
    it('should count slow calls as failures', async () => {
      // Register a circuit with a short slow-call threshold.
      cb.register({
        name: 'slow-circuit',
        failureThreshold: 2,
        failureWindowSeconds: 60,
        resetTimeoutSeconds: 60,
        slowCallDurationMs: 50,
      });

      // Two slow calls should trip the circuit.
      const slowCall = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 80));
        return 'slow-ok';
      });
      await cb.exec('slow-circuit', slowCall);
      expect(cb.getState('slow-circuit')).toBe('CLOSED');
      await cb.exec('slow-circuit', slowCall);
      expect(cb.getState('slow-circuit')).toBe('OPEN');
    });
  });

  describe('rolling failure window', () => {
    it('should prune failures outside the window', async () => {
      cb.register({
        name: 'window-circuit',
        failureThreshold: 3,
        failureWindowSeconds: 1, // 1s window
        resetTimeoutSeconds: 60,
      });

      // Two failures (below threshold).
      const failingCall = vi.fn(async () => { throw new Error('boom'); });
      await expect(cb.exec('window-circuit', failingCall)).rejects.toThrow('boom');
      await expect(cb.exec('window-circuit', failingCall)).rejects.toThrow('boom');
      expect(cb.getState('window-circuit')).toBe('CLOSED');

      // Wait for the window to expire.
      await new Promise((r) => setTimeout(r, 1100));

      // Two more failures should NOT trip — the first two were pruned.
      await expect(cb.exec('window-circuit', failingCall)).rejects.toThrow('boom');
      await expect(cb.exec('window-circuit', failingCall)).rejects.toThrow('boom');
      expect(cb.getState('window-circuit')).toBe('CLOSED');

      // One more failure within the window should trip (3 in window).
      await expect(cb.exec('window-circuit', failingCall)).rejects.toThrow('boom');
      expect(cb.getState('window-circuit')).toBe('OPEN');
    });
  });

  describe('manual trip + reset', () => {
    it('trip() should force OPEN', () => {
      cb.trip('test-circuit');
      expect(cb.getState('test-circuit')).toBe('OPEN');
    });

    it('reset() should force CLOSED', async () => {
      cb.trip('test-circuit');
      expect(cb.getState('test-circuit')).toBe('OPEN');
      cb.reset('test-circuit');
      expect(cb.getState('test-circuit')).toBe('CLOSED');
      // Subsequent call should pass through.
      const result = await cb.exec('test-circuit', async () => 'ok');
      expect(result).toBe('ok');
    });
  });

  describe('unregistered circuit', () => {
    it('should pass through without tracking if circuit not registered', async () => {
      const result = await cb.exec('unknown-circuit', async () => 'passthrough');
      expect(result).toBe('passthrough');
      expect(cb.getState('unknown-circuit')).toBeUndefined();
    });
  });
});
