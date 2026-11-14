import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const otelEnabled =
  process.env.OTEL_ENABLED !== 'false' && process.env.NODE_ENV !== 'test';

let sdk: NodeSDK | null = null;

if (otelEnabled) {
  const endpoint = (
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://elastic-agent:4318'
  ).replace(/\/$/, '');

  const traceExporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
  });

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME ||
        process.env.npm_package_name ||
        'healthtech-service',
      'deployment.environment': process.env.NODE_ENV || 'development',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) =>
            Boolean(req.url?.includes('/health/')),
        },
        '@opentelemetry/instrumentation-pg': {
          // Never export bound SQL query parameters that could contain PHI
          enhancedDatabaseReporting: false,
        },
      }),
    ],
  });

  try {
    sdk.start();
  } catch (err) {
    console.warn('[OTel] Failed to start OpenTelemetry NodeSDK:', err);
  }

  const shutdown = () => {
    sdk?.shutdown().catch(() => {});
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

export { sdk };
