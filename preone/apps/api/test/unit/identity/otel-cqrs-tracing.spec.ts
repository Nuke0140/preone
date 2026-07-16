/**
 * Unit tests for OTel tracing of CQRS bus + EventBus (Wave 9a, BTD §22.2).
 *
 * Verifies that:
 *   - Command/Query/Event dispatch creates spans with correct names + attributes
 *   - Span attributes include actor/tenant/command.type
 *   - Exceptions are recorded on the span + rethrown
 *   - When multiple subscribers exist, each gets a child span
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusService } from '@infra/event-bus/event-bus.service';
import { DomainEvent } from '@shared/kernel/domain-event';

// ─── Test fixture event ─────────────────────────────
class TestCreatedEvent extends DomainEvent<{ tenantId: string; entityId: string }> {}

// ─── Span exporter setup ────────────────────────────
let exporter: InMemorySpanExporter;
let provider: BasicTracerProvider;

function setupOtel(): void {
  exporter = new InMemorySpanExporter();
  provider = new BasicTracerProvider();
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  // Register as global so getCqrsTracer() picks it up
  trace.setGlobalTracerProvider(provider);
}

function resetOtel(): void {
  exporter?.reset();
  void provider?.shutdown();
  // Disable global tracer provider so subsequent tests don't accidentally use it
  trace.disable();
}

describe('OTel tracing — CQRS CommandBus (Wave 9a)', () => {
  let bus: CommandBus;

  beforeEach(() => {
    setupOtel();
    bus = new CommandBus();
  });

  afterEach(() => resetOtel());

  it('creates a span named "command:<type>" on successful dispatch', async () => {
    const handler = { handle: vi.fn(async () => ({ ok: true })) };
    bus.register('Test.Command', handler);

    await bus.execute({
      type: 'Test.Command',
      payload: {},
      metadata: { actorId: 'user-1', tenantId: 'school-1' },
    });

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0]!.name).toBe('command:Test.Command');
    expect(spans[0]!.attributes['preone.cqrs.kind']).toBe('command');
    expect(spans[0]!.attributes['preone.cqrs.type']).toBe('Test.Command');
    expect(spans[0]!.attributes['preone.actor.id']).toBe('user-1');
    expect(spans[0]!.attributes['preone.tenant.id']).toBe('school-1');
  });

  it('records exception on span when handler throws', async () => {
    const handler = { handle: vi.fn(async () => { throw new Error('boom'); }) };
    bus.register('Test.Fail', handler);

    await expect(bus.execute({
      type: 'Test.Fail', payload: {}, metadata: { actorId: 'u', tenantId: 't' },
    })).rejects.toThrow('boom');

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    const span = spans[0]!;
    expect(span.attributes['preone.cqrs.error']).toBe('boom');
    // Status should be ERROR (1 = OK, 2 = ERROR in OTel canonical code)
    expect(span.status.code).toBe(2);
  });
});

describe('OTel tracing — CQRS QueryBus (Wave 9a)', () => {
  let bus: QueryBus;

  beforeEach(() => {
    setupOtel();
    bus = new QueryBus();
  });

  afterEach(() => resetOtel());

  it('creates a span named "query:<type>" with actor/tenant attributes', async () => {
    const handler = { handle: vi.fn(async () => ({ rows: [] })) };
    bus.register('Test.Query', handler);

    await bus.execute({
      type: 'Test.Query',
      payload: { filter: 'x' },
      metadata: { actorId: 'reader-1', tenantId: 'school-x', branchId: 'b-1' },
    });

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0]!.name).toBe('query:Test.Query');
    expect(spans[0]!.attributes['preone.branch.id']).toBe('b-1');
  });
});

describe('OTel tracing — EventBusService (Wave 9a)', () => {
  let eventBus: EventBusService;

  beforeEach(() => {
    setupOtel();
    eventBus = new EventBusService();
  });

  afterEach(() => resetOtel());

  it('creates a parent span + one child span per subscriber', async () => {
    const sub1 = vi.fn(async () => {});
    const sub2 = vi.fn(async () => {});
    eventBus.subscribe(TestCreatedEvent.name, sub1);
    eventBus.subscribe(TestCreatedEvent.name, sub2);

    await eventBus.publish(new TestCreatedEvent({
      tenantId: 'school-1', entityId: 'e-1',
    }));

    const spans = exporter.getFinishedSpans();
    // 1 parent + 2 children
    expect(spans.length).toBe(3);

    const parent = spans.find((s) => s.name === 'event:TestCreatedEvent');
    expect(parent).toBeDefined();
    expect(parent!.attributes['preone.cqrs.kind']).toBe('event');
    expect(parent!.attributes['preone.cqrs.subscribers']).toBe(2);
    expect(parent!.attributes['preone.tenant.id']).toBe('school-1');

    const children = spans.filter((s) => s.name.startsWith('event:TestCreatedEvent:'));
    expect(children.length).toBe(2);
    expect(children.every((s) => s.attributes['preone.cqrs.kind'] === 'event.subscriber')).toBe(true);
  });

  it('records error on failing subscriber child span but completes parent', async () => {
    const okSub = vi.fn(async () => {});
    const failSub = vi.fn(async () => { throw new Error('subscriber failed'); });
    eventBus.subscribe(TestCreatedEvent.name, okSub);
    eventBus.subscribe(TestCreatedEvent.name, failSub);

    // publish does not throw — failures are caught per subscriber
    await eventBus.publish(new TestCreatedEvent({
      tenantId: 'school-1', entityId: 'e-2',
    }));

    const spans = exporter.getFinishedSpans();
    const failedChild = spans.find((s) => s.attributes?.['preone.cqrs.error'] === 'subscriber failed');
    expect(failedChild).toBeDefined();
    expect(failedChild!.status.code).toBe(2);

    const parent = spans.find((s) => s.name === 'event:TestCreatedEvent');
    expect(parent).toBeDefined();
    expect(parent!.attributes['preone.cqrs.subscribers_failed']).toBe(1);
  });
});
