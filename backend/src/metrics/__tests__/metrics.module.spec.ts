import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { register } from 'prom-client';
import { MetricsModule } from '../metrics.module';
import { MetricsInterceptor } from '../metrics.interceptor';

describe('MetricsModule', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Clear the global prom-client registry to avoid duplicate metric errors
    register.clear();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [MetricsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    register.clear();
  });

  it('should register MetricsModule and provide MetricsInterceptor', async () => {
    const interceptor = app.get(MetricsInterceptor);
    expect(interceptor).toBeDefined();
  });

  it('should respond to GET /metrics with text content-type (not JSON-wrapped)', async () => {
    const res = await request(app.getHttpServer()).get('/metrics');
    expect(res.status).toBe(200);
    // Prometheus text format uses text/plain or text/plain; version=0.0.4
    expect(res.headers['content-type']).toContain('text/');
    // Verify it's NOT wrapped in JSON { code, message, data }
    expect(res.text).not.toContain('"code"');
    expect(res.text).not.toContain('"message"');
  });
});
