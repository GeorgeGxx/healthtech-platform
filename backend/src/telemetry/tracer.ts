import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:8200';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'healthtech-backend',
  [ATTR_SERVICE_VERSION]: '1.0.0',
  'deployment.environment': process.env.NODE_ENV || 'production',
  'service.namespace': 'healthtech-hospital',
  'telemetry.sdk.language': 'nodejs',
});

const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
  }),
  exportIntervalMillis: 10000,
});

export const otelSdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
  ],
});

try {
  otelSdk.start();
  console.log(`📡 OpenTelemetry SDK inicializado (Exportando Traces y Metrics a ${otlpEndpoint})`);
} catch (error) {
  console.error('❌ Error al inicializar OpenTelemetry SDK:', error);
}

process.on('SIGTERM', () => {
  otelSdk
    .shutdown()
    .then(() => console.log('🛑 OpenTelemetry SDK apagado limpiamente'))
    .catch((err) => console.error('Error deteniendo OpenTelemetry SDK:', err))
    .finally(() => process.exit(0));
});
