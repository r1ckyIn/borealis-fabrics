import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { MetricsInterceptor } from '../metrics.interceptor';
import { Histogram } from 'prom-client';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let endFn: jest.Mock;
  let mockHistogram: Partial<Histogram>;

  beforeEach(() => {
    endFn = jest.fn();
    mockHistogram = {
      startTimer: jest.fn().mockReturnValue(endFn),
    };
    interceptor = new MetricsInterceptor(mockHistogram as Histogram);
  });

  const createMockContext = (
    method: string,
    routePath: string | undefined,
    url: string,
    statusCode: number,
  ): ExecutionContext => {
    const mockRequest = {
      method,
      url,
      route: routePath ? { path: routePath } : undefined,
    };
    const mockResponse = { statusCode };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (
    result: unknown = 'ok',
  ): CallHandler => ({
    handle: () => of(result),
  });

  const createErrorCallHandler = (error: Error): CallHandler => ({
    handle: () => throwError(() => error),
  });

  it('should record histogram with method, route, status labels on success', (done) => {
    const ctx = createMockContext('GET', '/api/v1/fabrics', '/api/v1/fabrics', 200);
    const handler = createMockCallHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: () => {
        expect(mockHistogram.startTimer).toHaveBeenCalledWith({
          method: 'GET',
          route: '/api/v1/fabrics',
        });
        expect(endFn).toHaveBeenCalledWith({ status: '200' });
        done();
      },
    });
  });

  it('should use req.route.path (not req.url) to avoid cardinality explosion', (done) => {
    const ctx = createMockContext(
      'GET',
      '/api/v1/orders/:id',
      '/api/v1/orders/12345',
      200,
    );
    const handler = createMockCallHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: () => {
        expect(mockHistogram.startTimer).toHaveBeenCalledWith({
          method: 'GET',
          route: '/api/v1/orders/:id',
        });
        done();
      },
    });
  });

  it('should fall back to req.url when route.path is undefined', (done) => {
    const ctx = createMockContext('POST', undefined, '/unknown-path', 201);
    const handler = createMockCallHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: () => {
        expect(mockHistogram.startTimer).toHaveBeenCalledWith({
          method: 'POST',
          route: '/unknown-path',
        });
        done();
      },
    });
  });

  it('should record status 500 on error path', (done) => {
    const ctx = createMockContext('DELETE', '/api/v1/fabrics/:id', '/api/v1/fabrics/1', 200);
    const handler = createErrorCallHandler(new Error('Internal error'));

    interceptor.intercept(ctx, handler).subscribe({
      error: () => {
        expect(endFn).toHaveBeenCalledWith({ status: '500' });
        done();
      },
    });
  });
});
