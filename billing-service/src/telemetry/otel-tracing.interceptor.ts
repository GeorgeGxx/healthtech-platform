import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Observable, tap } from 'rxjs';

/**
 * Interceptor ligero W3C TraceContext + exportador OTLP/HTTP hacia Elastic Agent (puerto 4318).
 * Evita dependencias pesadas de SDK nativo manteniendo trazabilidad distribuida real.
 */
@Injectable()
export class OtelTracingInterceptor implements NestInterceptor {
  private readonly serviceName = process.env.OTEL_SERVICE_NAME || 'billing-service';
  private readonly otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://elastic-agent:4318';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const startTimeNs = BigInt(Date.now()) * 1_000_000n;
    const incomingTraceparent = req.headers?.traceparent;
    const parsed = typeof incomingTraceparent === 'string'
      ? /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i.exec(incomingTraceparent.trim())
      : null;

    const traceId = parsed ? parsed[1].toLowerCase() : randomBytes(16).toString('hex');
    const parentSpanId = parsed ? parsed[2].toLowerCase() : undefined;
    const spanId = randomBytes(8).toString('hex');

    if (typeof res?.setHeader === 'function') {
      res.setHeader('x-trace-id', traceId);
      res.setHeader('traceparent', `00-${traceId}-${spanId}-01`);
    }

    return next.handle().pipe(
      tap({
        next: () => this.emitSpan(req, res?.statusCode ?? 200, traceId, spanId, parentSpanId, startTimeNs),
        error: (err) =>
          this.emitSpan(req, err?.status ?? 500, traceId, spanId, parentSpanId, startTimeNs, err?.message),
      }),
    );
  }

  private emitSpan(
    req: any,
    statusCode: number,
    traceId: string,
    spanId: string,
    parentSpanId: string | undefined,
    startTimeNs: bigint,
    errorMessage?: string,
  ): void {
    if (process.env.OTEL_ENABLED === 'false') {
      return;
    }

    const endTimeNs = BigInt(Date.now()) * 1_000_000n;
    const route = req.route?.path ?? req.url ?? '/';
    const method = req.method ?? 'GET';

    const payload = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: this.serviceName } },
              { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'development' } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: 'healthtech-otel-http', version: '1.0.0' },
              spans: [
                {
                  traceId,
                  spanId,
                  ...(parentSpanId ? { parentSpanId } : {}),
                  name: `${method} ${route}`,
                  kind: 2,
                  startTimeUnixNano: startTimeNs.toString(),
                  endTimeUnixNano: endTimeNs.toString(),
                  attributes: [
                    { key: 'http.method', value: { stringValue: method } },
                    { key: 'http.target', value: { stringValue: String(req.url ?? '/') } },
                    { key: 'http.status_code', value: { intValue: String(statusCode) } },
                  ],
                  status: {
                    code: statusCode >= 500 ? 2 : 1,
                    ...(errorMessage ? { message: errorMessage } : {}),
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    void fetch(`${this.otlpEndpoint}/v1/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500),
    }).catch(() => {
      // No-op: la observabilidad nunca debe degradar el flujo clínico
    });
  }
}
