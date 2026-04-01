import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';

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
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    // Use route pattern, NOT actual URL (avoid cardinality explosion)
    const route: string = req.route?.path ?? req.url;
    const end = this.httpDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          end({ status: String(res.statusCode) });
        },
        error: () => {
          end({ status: '500' });
        },
      }),
    );
  }
}
