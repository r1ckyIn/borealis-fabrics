import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigModule } from '@nestjs/config';
import { SystemModule } from '../src/system/system.module';
import { CommonModule } from '../src/common/common.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/common/services/redis.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import configuration from '../src/config/configuration';

// Response type definitions
interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface EnumDefinition {
  values: string[];
  labels: Record<string, string>;
}

interface EnumsData {
  orderItemStatus: EnumDefinition;
  customerPayStatus: EnumDefinition;
  paymentMethod: EnumDefinition;
  quoteStatus: EnumDefinition;
  supplierStatus: EnumDefinition;
  settleType: EnumDefinition;
}

describe('SystemController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        PrismaModule,
        CommonModule,
        SystemModule,
      ],
    })
      .overrideProvider(RedisService)
      .useValue({ ping: jest.fn(), isAvailable: jest.fn(() => false) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /api/v1/system/enums', () => {
    it('should return all enums with 200 status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/system/enums')
        .expect(200);

      const body = response.body as ApiSuccessResponse<EnumsData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data).toBeDefined();
    });

    it('should return orderItemStatus with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/system/enums')
        .expect(200);

      const body = response.body as ApiSuccessResponse<EnumsData>;
      const { orderItemStatus } = body.data;
      expect(orderItemStatus).toBeDefined();
      expect(orderItemStatus.values).toBeInstanceOf(Array);
      expect(orderItemStatus.values).toContain('INQUIRY');
      expect(orderItemStatus.values).toContain('PENDING');
      expect(orderItemStatus.values).toContain('ORDERED');
      expect(orderItemStatus.values).toContain('PRODUCTION');
      expect(orderItemStatus.values).toContain('QC');
      expect(orderItemStatus.values).toContain('SHIPPED');
      expect(orderItemStatus.values).toContain('RECEIVED');
      expect(orderItemStatus.values).toContain('COMPLETED');
      expect(orderItemStatus.values).toContain('CANCELLED');
      expect(orderItemStatus.labels).toBeDefined();
      expect(orderItemStatus.labels.INQUIRY).toBe('询价中');
    });

    it('should return customerPayStatus with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/system/enums')
        .expect(200);

      const body = response.body as ApiSuccessResponse<EnumsData>;
      const { customerPayStatus } = body.data;
      expect(customerPayStatus).toBeDefined();
      expect(customerPayStatus.values).toBeInstanceOf(Array);
      expect(customerPayStatus.values).toContain('unpaid');
      expect(customerPayStatus.values).toContain('partial');
      expect(customerPayStatus.values).toContain('paid');
      expect(customerPayStatus.labels).toBeDefined();
      expect(customerPayStatus.labels.unpaid).toBe('未付款');
    });

    it('should return paymentMethod with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/system/enums')
        .expect(200);

      const body = response.body as ApiSuccessResponse<EnumsData>;
      const { paymentMethod } = body.data;
      expect(paymentMethod).toBeDefined();
      expect(paymentMethod.values).toBeInstanceOf(Array);
      expect(paymentMethod.values).toContain('wechat');
      expect(paymentMethod.values).toContain('alipay');
      expect(paymentMethod.values).toContain('bank');
      expect(paymentMethod.values).toContain('credit');
      expect(paymentMethod.labels).toBeDefined();
      expect(paymentMethod.labels.wechat).toBe('微信支付');
    });

    it('should return quoteStatus with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/system/enums')
        .expect(200);

      const body = response.body as ApiSuccessResponse<EnumsData>;
      const { quoteStatus } = body.data;
      expect(quoteStatus).toBeDefined();
      expect(quoteStatus.values).toBeInstanceOf(Array);
      expect(quoteStatus.values).toContain('active');
      expect(quoteStatus.values).toContain('expired');
      expect(quoteStatus.values).toContain('converted');
      expect(quoteStatus.labels).toBeDefined();
      expect(quoteStatus.labels.active).toBe('有效');
    });

    it('should return supplierStatus with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/system/enums')
        .expect(200);

      const body = response.body as ApiSuccessResponse<EnumsData>;
      const { supplierStatus } = body.data;
      expect(supplierStatus).toBeDefined();
      expect(supplierStatus.values).toBeInstanceOf(Array);
      expect(supplierStatus.values).toContain('active');
      expect(supplierStatus.values).toContain('suspended');
      expect(supplierStatus.values).toContain('eliminated');
      expect(supplierStatus.labels).toBeDefined();
      expect(supplierStatus.labels.active).toBe('合作中');
    });

    it('should return settleType with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/system/enums')
        .expect(200);

      const body = response.body as ApiSuccessResponse<EnumsData>;
      const { settleType } = body.data;
      expect(settleType).toBeDefined();
      expect(settleType.values).toBeInstanceOf(Array);
      expect(settleType.values).toContain('prepay');
      expect(settleType.values).toContain('credit');
      expect(settleType.labels).toBeDefined();
      expect(settleType.labels.prepay).toBe('预付');
    });

    it('should be accessible without authentication (public endpoint)', async () => {
      // No auth header needed, should still return 200
      const response = await request(app.getHttpServer())
        .get('/api/v1/system/enums')
        .expect(200);

      const body = response.body as ApiSuccessResponse<EnumsData>;
      expect(body.code).toBe(200);
    });
  });
});
