/**
 * OpenTelemetry startup — must be called BEFORE any other import in main.ts.
 *
 * Per BTD §3.3 Cross-Cutting Concerns:
 *   "OpenTelemetry: Auto-instrumentation for HTTP, PG, Redis, BullMQ — spans auto-created"
 *
 * Per ADR-111 §2.3 Technology Stack:
 *   "Tracing: OpenTelemetry + Jaeger — Vendor-neutral; spans correlated to logs"
 *
 * NOTE: Dynamic imports keep OTel out of the hot path when OTEL_ENABLED=false,
 * avoiding the cost of loading instrumentation modules at boot.
 */
let startedSdk: any | undefined;

export async function startOpenTelemetry(): Promise<void> {
  if (process.env.OTEL_ENABLED !== 'true') return;
  if (startedSdk) return;

  const serviceName = process.env.OTEL_SERVICE_NAME ?? 'preone-api';
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';
  const samplingRatio = Number(process.env.OTEL_TRACES_SAMPLER_RATIO ?? 0.1);

  // Dynamic imports — only loaded when OTel is enabled
  const [{ NodeSDK }, { getNodeAutoInstrumentations }, { OTLPTraceExporter }] = await Promise.all([
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/auto-instrumentations-node'),
    import('@opentelemetry/exporter-trace-otlp-http'),
  ]);

  const traceExporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });

  startedSdk = new NodeSDK({
    serviceName,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  await startedSdk.start();
  // eslint-disable-next-line no-console
  console.log(`🔭 OpenTelemetry started — service=${serviceName}, endpoint=${endpoint}, sampling=${samplingRatio}`);
}

export async function shutdownOpenTelemetry(): Promise<void> {
  if (startedSdk) {
    await startedSdk.shutdown();
    startedSdk = undefined;
  }
}
