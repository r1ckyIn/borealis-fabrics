import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import helmet from 'helmet';
import { PrismaModule } from '../src/prisma/prisma.module';
import { CommonModule } from '../src/common/common.module';
import { HealthController } from '../src/common/health/health.controller';
import { ClsService } from 'nestjs-cls';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/common/services/redis.service';
import configuration from '../src/config/configuration';

// Response type definitions
interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface HealthCheckData {
  status: string;
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        PrismaModule,
        CommonModule,
        TerminusModule,
      ],
      controllers: [HealthController],
    })
      .overrideProvider(RedisService)
      .useValue({ ping: jest.fn(), isAvailable: jest.fn(() => false) })
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply helmet with the same config as main.ts (dev mode)
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'", 'ws://localhost:*'],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
        },
      }),
    );

    // Apply global pipes and filters as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    const mockCls = {
      getId: () => 'test-correlation-id',
    } as unknown as ClsService;
    app.useGlobalFilters(new AllExceptionsFilter(mockCls));
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.$disconnect();
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET) should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const body = response.body as ApiSuccessResponse<HealthCheckData>;

      // Response should be wrapped by TransformInterceptor
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include Content-Security-Policy header', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
    });

    it('should include X-Content-Type-Options header', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include Strict-Transport-Security header', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
    });

    it('should not expose X-Powered-By header', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});
