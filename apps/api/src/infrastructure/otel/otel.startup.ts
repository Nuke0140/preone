/**
 * OpenTelemetry startup — must be called BEFORE any other import in main.ts.
 *
 * Per BTD §3.3 Cross-Cutting Concerns:
 *   "OpenTelemetry: Auto-instrumentation for HTTP, PG, Redis, BullMQ — spans auto-created"
 *
 * Per ADR-111 §2.3 Technology Stack:
 *   "Tracing: OpenTelemetry + Jaeger — Vendor-neutral; spans correlated to logs"
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

let startedSdk: NodeSDK | undefined;

export async function startOpenTelemetry(): Promise<void> {
  if (process.env.OTEL_ENABLED !== 'true') return;
  if (startedSdk) return;

  const serviceName = process.env.OTEL_SERVICE_NAME ?? 'preone-api';
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';
  const samplingRatio = Number(process.env.OTEL_TRACES_SAMPLER_RATIO ?? 0.1);

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NODE_ENV ?? 'development',
  });

  const traceExporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
  const metricExporter = new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` });

  startedSdk = new NodeSDK({
    resource,
    spanProcessor: new BatchSpanProcessor(traceExporter),
    metricReader: new PeriodicMetricReader({ exporter: metricExporter, exportIntervalMillis: 60_000 }),
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
