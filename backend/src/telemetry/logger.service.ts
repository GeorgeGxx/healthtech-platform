import { Injectable, LoggerService, Scope } from '@nestjs/common';
import winston from 'winston';
import { trace } from '@opentelemetry/api';

@Injectable({ scope: Scope.DEFAULT })
export class ElasticEcsLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const ecsFormat = winston.format((info) => {
      const activeSpan = trace.getActiveSpan();
      const spanContext = activeSpan?.spanContext();

      const baseInfo: Record<string, any> = {
        '@timestamp': new Date().toISOString(),
        'log.level': info.level.toUpperCase(),
        message: info.message,
        'service.name': process.env.OTEL_SERVICE_NAME || 'healthtech-backend',
        'ecs.version': '8.11.0',
        context: info.context || 'Application',
      };

      if (spanContext && spanContext.traceId) {
        baseInfo['trace.id'] = spanContext.traceId;
        baseInfo['span.id'] = spanContext.spanId;
        baseInfo['trace.flags'] = spanContext.traceFlags;
      }

      if (info.stack) {
        baseInfo['error.stack_trace'] = info.stack;
      }

      // Copiar cualquier metadata adicional
      const reserved = ['level', 'message', 'context', 'stack'];
      const extraMeta: Record<string, any> = {};
      for (const key of Object.keys(info)) {
        if (!reserved.includes(key)) {
          extraMeta[key] = info[key];
        }
      }

      if (Object.keys(extraMeta).length > 0) {
        baseInfo['labels'] = extraMeta;
      }

      return Object.assign(info, baseInfo);
    });

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        ecsFormat(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            ecsFormat(),
            process.env.NODE_ENV === 'development'
              ? winston.format.printf((info) => {
                  const traceStr = info['trace.id'] ? ` [trace_id=${info['trace.id']}]` : '';
                  const ctx = info.context ? ` [${info.context}]` : '';
                  return `${info['@timestamp']} [${info['log.level']}]${ctx}${traceStr}: ${info.message}`;
                })
              : winston.format.json(),
          ),
        }),
      ],
    });
  }

  log(message: any, context?: string) {
    this.logger.info(typeof message === 'object' ? JSON.stringify(message) : message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(typeof message === 'object' ? JSON.stringify(message) : message, {
      context,
      stack: trace,
    });
  }

  warn(message: any, context?: string) {
    this.logger.warn(typeof message === 'object' ? JSON.stringify(message) : message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(typeof message === 'object' ? JSON.stringify(message) : message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(typeof message === 'object' ? JSON.stringify(message) : message, { context });
  }
}
