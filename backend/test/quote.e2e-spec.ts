/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { QuoteModule } from '../src/quote/quote.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockCls } from './helpers/mock-builders';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CodeGeneratorService, RedisService } from '../src/common/services';
import { QuoteStatus } from '../src/quote/dto';

// Response type definitions for type safety
interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface QuoteData {
  id: number;
  quoteCode: string;
  customerId: number;
  fabricId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  validUntil: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    companyName: string;
  };
  fabric?: {
    id: number;
    fabricCode: string;
    name: string;
  };
}

interface PaginatedQuoteData {
  items: QuoteData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

describe('QuoteController (e2e)', () => {
  let app: INestApplication<App>;

  // Mock data
  const mockCustomer = {
    id: 1,
    companyName: 'Test Customer',
    contactName: 'John Doe',
    phone: '13800138000',
    isActive: true,
  };

  const mockFabric = {
    id: 1,
    fabricCode: 'BF-2601-0001',
    name: 'Cotton White',
    material: 'Cotton',
    color: 'White',
    defaultPrice: 50.0,
    isActive: true,
  };

  const mockQuote = {
    id: 1,
    quoteCode: 'QT-2601-0001',
    customerId: 1,
    fabricId: 1,
    quantity: 100,
    unitPrice: 25.5,
    totalPrice: 2550.0,
    validUntil: new Date('2026-12-31'),
    status: QuoteStatus.ACTIVE,
    notes: 'Test notes',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    customer: mockCustomer,
    fabric: mockFabric,
  };

  // Mock Prisma service type
  interface MockQuoteMethods {
    create: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  }

  interface MockPrismaServiceType {
    quote: MockQuoteMethods;
    customer: { findFirst: jest.Mock };
    fabric: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  }

  const mockPrismaService: MockPrismaServiceType = {
    quote: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    fabric: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCodeGeneratorService = {
    generateCode: jest.fn(),
  };

  const mockRedisService = {
    isAvailable: jest.fn().mockReturnValue(false),
    getClient: jest.fn().mockReturnValue(null),
    incr: jest.fn().mockResolvedValue(null),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(false),
    setex: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    mockPrismaService.$transaction.mockImplementation(
      async <T>(callback: (tx: MockPrismaServiceType) => Promise<T>) => {
        return callback(mockPrismaService);
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [QuoteModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(CodeGeneratorService)
      .useValue(mockCodeGeneratorService)
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
    app.useGlobalFilters(new AllExceptionsFilter(createMockCls()));
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/quotes', () => {
    const createDto = {
      customerId: 1,
      fabricId: 1,
      quantity: 100,
      unitPrice: 25.5,
      validUntil: '2026-12-31T23:59:59.000Z',
      notes: 'Test notes',
    };

    it('should create a new quote (201)', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockCodeGeneratorService.generateCode.mockResolvedValue('QT-2601-0001');
      mockPrismaService.quote.create.mockResolvedValue(mockQuote);

      const response = await request(app.getHttpServer())
        .post('/api/v1/quotes')
        .send(createDto)
        .expect(201);

      const body = response.body as ApiSuccessResponse<QuoteData>;
      expect(body.code).toBe(201);
      expect(body.message).toBe('success');
      expect(body.data.quoteCode).toBe('QT-2601-0001');
      expect(body.data.customerId).toBe(1);
      expect(body.data.fabricId).toBe(1);
    });

    it('should return 404 when customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/quotes')
        .send(createDto)
        .expect(404);
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/quotes')
        .send(createDto)
        .expect(404);
    });

    it('should return 400 when validUntil is in the past', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const pastDateDto = {
        ...createDto,
        validUntil: '2020-01-01T00:00:00.000Z',
      };

      await request(app.getHttpServer())
        .post('/api/v1/quotes')
        .send(pastDateDto)
        .expect(400);
    });

    it('should return 400 for validation error', async () => {
      const invalidDto = {
        customerId: 'invalid', // Should be number
        fabricId: 1,
      };

      await request(app.getHttpServer())
        .post('/api/v1/quotes')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /api/v1/quotes', () => {
    it('should return paginated quote list (200)', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/quotes')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedQuoteData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.items).toHaveLength(1);
      expect(body.data.pagination).toBeDefined();
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.pageSize).toBe(20);
    });

    it('should filter by customerId', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/quotes?customerId=1')
        .expect(200);

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 1 }),
        }),
      );
    });

    it('should filter by fabricId', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/quotes?fabricId=1')
        .expect(200);

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ fabricId: 1 }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get(`/api/v1/quotes?status=${QuoteStatus.ACTIVE}`)
        .expect(200);

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: QuoteStatus.ACTIVE }),
        }),
      );
    });

    it('should support pagination', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(100);

      const response = await request(app.getHttpServer())
        .get('/api/v1/quotes?page=2&pageSize=10')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedQuoteData>;
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.pageSize).toBe(10);
    });
  });

  describe('GET /api/v1/quotes/:id', () => {
    it('should return quote details (200)', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(mockQuote);

      const response = await request(app.getHttpServer())
        .get('/api/v1/quotes/1')
        .expect(200);

      const body = response.body as ApiSuccessResponse<QuoteData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.id).toBe(1);
      expect(body.data.quoteCode).toBe('QT-2601-0001');
    });

    it('should return 404 when quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/api/v1/quotes/999').expect(404);
    });
  });

  describe('PATCH /api/v1/quotes/:id', () => {
    const updateDto = {
      quantity: 200,
      unitPrice: 30.0,
      notes: 'Updated notes',
    };

    it('should update quote successfully (200)', async () => {
      const existingQuote = { ...mockQuote };
      const updatedQuote = {
        ...mockQuote,
        quantity: 200,
        unitPrice: 30.0,
        totalPrice: 6000.0,
        notes: 'Updated notes',
      };

      // First call to get existing quote, second call after updateMany
      mockPrismaService.quote.findUnique
        .mockResolvedValueOnce(existingQuote)
        .mockResolvedValueOnce(updatedQuote);
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/quotes/1')
        .send(updateDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<QuoteData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.quantity).toBe(200);
      expect(body.data.totalPrice).toBe(6000);
    });

    it('should return 404 when quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/api/v1/quotes/999')
        .send(updateDto)
        .expect(404);
    });

    it('should return 409 when updating converted quote', async () => {
      const convertedQuote = { ...mockQuote, status: QuoteStatus.CONVERTED };
      mockPrismaService.quote.findUnique.mockResolvedValue(convertedQuote);
      // updateMany returns 0 count because status doesn't match condition
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 0 });

      await request(app.getHttpServer())
        .patch('/api/v1/quotes/1')
        .send(updateDto)
        .expect(409);
    });

    it('should reset expired status to active when extending validity', async () => {
      const expiredQuote = { ...mockQuote, status: QuoteStatus.EXPIRED };
      const reactivatedQuote = {
        ...mockQuote,
        status: QuoteStatus.ACTIVE,
        validUntil: new Date('2026-12-31'),
      };

      mockPrismaService.quote.findUnique
        .mockResolvedValueOnce(expiredQuote)
        .mockResolvedValueOnce(reactivatedQuote);
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/quotes/1')
        .send({ validUntil: '2026-12-31T23:59:59.000Z' })
        .expect(200);

      const body = response.body as ApiSuccessResponse<QuoteData>;
      expect(body.data.status).toBe(QuoteStatus.ACTIVE);
    });

    it('should return 400 when validUntil is in the past', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/quotes/1')
        .send({ validUntil: '2020-01-01T00:00:00.000Z' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/quotes/:id', () => {
    it('should delete quote successfully (204)', async () => {
      // deleteMany returns count: 1 for successful deletion
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 1 });

      await request(app.getHttpServer()).delete('/api/v1/quotes/1').expect(204);
    });

    it('should return 404 when quote not found', async () => {
      // deleteMany returns 0, then findUnique returns null
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/api/v1/quotes/999')
        .expect(404);
    });

    it('should return 409 when deleting converted quote', async () => {
      const convertedQuote = { ...mockQuote, status: QuoteStatus.CONVERTED };
      // deleteMany returns 0 because status doesn't match, then findUnique returns converted quote
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.quote.findUnique.mockResolvedValue(convertedQuote);

      await request(app.getHttpServer()).delete('/api/v1/quotes/1').expect(409);
    });

    it('should allow deleting expired quote', async () => {
      // deleteMany returns count: 1 for successful deletion (expired is allowed)
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 1 });

      await request(app.getHttpServer()).delete('/api/v1/quotes/1').expect(204);
    });
  });

  describe('POST /api/v1/quotes/:id/convert-to-order', () => {
    it('should return 501 (not implemented)', async () => {
      const activeQuote = {
        ...mockQuote,
        status: QuoteStatus.ACTIVE,
        validUntil: new Date('2030-12-31'), // Future date
      };
      mockPrismaService.quote.findUnique.mockResolvedValue(activeQuote);

      await request(app.getHttpServer())
        .post('/api/v1/quotes/1/convert-to-order')
        .expect(501);
    });

    it('should return 404 when quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/quotes/999/convert-to-order')
        .expect(404);
    });

    it('should return 400 when quote is not active', async () => {
      const expiredQuote = { ...mockQuote, status: QuoteStatus.EXPIRED };
      mockPrismaService.quote.findUnique.mockResolvedValue(expiredQuote);

      await request(app.getHttpServer())
        .post('/api/v1/quotes/1/convert-to-order')
        .expect(400);
    });

    it('should return 400 when quote has expired', async () => {
      const pastQuote = {
        ...mockQuote,
        status: QuoteStatus.ACTIVE,
        validUntil: new Date('2020-01-01'), // Past date
      };
      mockPrismaService.quote.findUnique.mockResolvedValue(pastQuote);

      await request(app.getHttpServer())
        .post('/api/v1/quotes/1/convert-to-order')
        .expect(400);
    });
  });
});
