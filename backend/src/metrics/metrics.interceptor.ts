import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import type { Request, Response } from 'express';

/**
 * Interceptor that records HTTP request duration as a Prometheus histogram.
 * Uses req.route?.path (Express route pattern) instead of req.url
 * to avoid cardinality explosion from dynamic URL segments.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly httpDuration: Histogram,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method: string = req.method;
    // Use route pattern, NOT actual URL (avoid cardinality explosion)
    const route: string =
      (req.route as { path?: string } | undefined)?.path ?? req.url;
    const end = this.httpDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          end({ status: String(res.statusCode) });
        },
        error: (err: unknown) => {
          const status =
            err instanceof HttpException ? String(err.getStatus()) : '500';
          end({ status });
        },
      }),
    );
  }
}
