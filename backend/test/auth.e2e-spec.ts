import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/common/services/redis.service';
import { createMockCls } from './helpers/mock-builders';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

// Response type definitions
interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface UserData {
  id: number;
  weworkId: string;
  name: string;
  avatar?: string;
  mobile?: string;
  createdAt: string;
  updatedAt: string;
}

interface LogoutData {
  message: string;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  // Mock data
  const mockUser = {
    id: 1,
    weworkId: 'dev-user',
    name: 'Dev User',
    avatar: 'https://avatar.com/dev.png',
    mobile: '13800138000',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  // Mock Prisma service
  interface MockPrismaServiceType {
    user: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  }

  const mockPrismaService: MockPrismaServiceType = {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  // Mock Redis service
  const mockRedisService = {
    get: jest.fn(),
    setex: jest.fn(),
    isAvailable: jest.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              nodeEnv: 'development',
              jwt: {
                secret: 'test-secret',
                expiresIn: '7d',
              },
              wework: {
                corpId: 'test-corp-id',
                agentId: 'test-agent-id',
                secret: 'test-secret',
                redirectUri:
                  'http://localhost:3000/api/v1/auth/wework/callback',
              },
              cors: {
                origins: ['http://localhost:5173'],
              },
            }),
          ],
        }),
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes and filters as in AppModule
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(createMockCls()));
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // GET /api/v1/auth/wework/login - Initiate OAuth Login
  // ============================================================
  describe('GET /api/v1/auth/wework/login', () => {
    it('should redirect to WeWork OAuth URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/wework/login')
        .expect(302);

      expect(response.headers.location).toContain(
        'https://open.weixin.qq.com/connect/oauth2/authorize',
      );
      expect(response.headers.location).toContain('appid=test-corp-id');
      expect(response.headers.location).toContain('agentid=test-agent-id');
    });

    it('should store OAuth state in Redis', async () => {
      await request(app.getHttpServer()).get('/auth/wework/login').expect(302);

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^auth:state:/),
        300,
        '1',
      );
    });
  });

  // ============================================================
  // GET /api/v1/auth/me - Get Current User
  // ============================================================
  describe('GET /api/v1/auth/me', () => {
    it('should return current user info in development mode', async () => {
      // In dev mode, JwtAuthGuard injects mock user
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(200);

      const body = response.body as ApiSuccessResponse<UserData>;
      expect(body.code).toBe(200);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(1);
      expect(body.data.weworkId).toBe('dev-user');
      expect(body.data.name).toBe('Dev User');
    });

    it('should return 404 when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(404);

      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });
  });

  // ============================================================
  // POST /api/v1/auth/logout - Logout
  // ============================================================
  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully in development mode', async () => {
      mockRedisService.setex.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      const body = response.body as ApiSuccessResponse<LogoutData>;
      expect(body.code).toBe(200);
      expect(body.data.message).toBe('Logged out successfully');
    });

    it('should logout with Bearer token', async () => {
      mockRedisService.setex.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer fake-token-for-testing')
        .expect(200);

      const body = response.body as ApiSuccessResponse<LogoutData>;
      expect(body.code).toBe(200);
      expect(body.data.message).toBe('Logged out successfully');
    });
  });

  // Note: Production mode tests are covered in unit tests for JwtAuthGuard.
  // E2E tests run in development mode where auth is bypassed for easier testing.
});
