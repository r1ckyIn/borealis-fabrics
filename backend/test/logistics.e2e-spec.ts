import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Prisma } from '@prisma/client';
import { LogisticsModule } from '../src/logistics/logistics.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

// Response type definitions for type safety
interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface LogisticsData {
  id: number;
  orderItemId: number;
  carrier: string;
  contactName: string | null;
  contactPhone: string | null;
  trackingNo: string | null;
  shippedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  orderItem?: {
    id: number;
    order: {
      id: number;
      orderCode: string;
      customerId: number;
      customer: {
        id: number;
        companyName: string;
      };
    };
    fabric: {
      id: number;
      fabricCode: string;
      name: string;
    };
  };
}

interface PaginatedLogisticsData {
  items: LogisticsData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

describe('LogisticsController (e2e)', () => {
  let app: INestApplication<App>;

  // Mock order item data
  const mockOrderItem = {
    id: 1,
    orderId: 1,
    fabricId: 1,
    quantity: 100,
    salePrice: 50,
    status: 'pending',
    order: {
      id: 1,
      orderCode: 'BF-2602-0001',
      customerId: 1,
      customer: {
        id: 1,
        companyName: 'Test Customer',
      },
    },
    fabric: {
      id: 1,
      fabricCode: 'FB-001',
      name: 'Test Fabric',
    },
  };

  // Mock logistics data
  const mockLogistics = {
    id: 1,
    orderItemId: 1,
    carrier: '顺丰速运',
    contactName: '张三',
    contactPhone: '13800138000',
    trackingNo: 'SF1234567890',
    shippedAt: new Date('2026-02-01T10:00:00Z'),
    notes: 'Handle with care',
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItem: mockOrderItem,
  };

  // Define mock service type
  interface MockPrismaServiceType {
    orderItem: {
      findUnique: jest.Mock;
    };
    logistics: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  }

  const mockPrismaService: MockPrismaServiceType = {
    orderItem: {
      findUnique: jest.fn(),
    },
    logistics: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LogisticsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
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
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // 3.3.1 POST /api/v1/logistics
  // ============================================================
  describe('POST /api/v1/logistics', () => {
    it('should create a logistics record successfully', async () => {
      mockPrismaService.orderItem.findUnique.mockResolvedValue(mockOrderItem);
      mockPrismaService.logistics.create.mockResolvedValue(mockLogistics);

      const createDto = {
        orderItemId: 1,
        carrier: '顺丰速运',
        contactName: '张三',
        contactPhone: '13800138000',
        trackingNo: 'SF1234567890',
        shippedAt: '2026-02-01T10:00:00Z',
        notes: 'Handle with care',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/logistics')
        .send(createDto)
        .expect(201);

      const body = response.body as ApiSuccessResponse<LogisticsData>;
      expect([0, 201]).toContain(body.code);
      expect(body.data.carrier).toBe('顺丰速运');
      expect(body.data.trackingNo).toBe('SF1234567890');
    });

    it('should return 404 when order item not found', async () => {
      // New implementation relies on foreign key constraint (P2003 error)
      mockPrismaService.logistics.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          { code: 'P2003', clientVersion: '5.0.0' },
        ),
      );

      const createDto = {
        orderItemId: 999,
        carrier: '顺丰速运',
      };

      await request(app.getHttpServer())
        .post('/api/v1/logistics')
        .send(createDto)
        .expect(404);
    });

    it('should return 400 for validation errors', async () => {
      const invalidDto = {
        orderItemId: 1,
        // carrier is required but missing
      };

      await request(app.getHttpServer())
        .post('/api/v1/logistics')
        .send(invalidDto)
        .expect(400);
    });

    it('should create logistics without optional fields', async () => {
      mockPrismaService.orderItem.findUnique.mockResolvedValue(mockOrderItem);
      mockPrismaService.logistics.create.mockResolvedValue({
        ...mockLogistics,
        contactName: null,
        contactPhone: null,
        trackingNo: null,
        shippedAt: null,
        notes: null,
      });

      const createDto = {
        orderItemId: 1,
        carrier: '顺丰速运',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/logistics')
        .send(createDto)
        .expect(201);

      const body = response.body as ApiSuccessResponse<LogisticsData>;
      expect(body.data.carrier).toBe('顺丰速运');
    });
  });

  // ============================================================
  // 3.3.2 GET /api/v1/logistics
  // ============================================================
  describe('GET /api/v1/logistics', () => {
    it('should return paginated list of logistics records', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([mockLogistics]);
      mockPrismaService.logistics.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/logistics')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedLogisticsData>;
      expect(body.data.items).toHaveLength(1);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should filter by tracking number', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([mockLogistics]);
      mockPrismaService.logistics.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/logistics')
        .query({ trackingNo: 'SF123' })
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedLogisticsData>;
      expect(body.data.items).toHaveLength(1);
    });

    it('should filter by carrier', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([mockLogistics]);
      mockPrismaService.logistics.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/logistics')
        .query({ carrier: '顺丰' })
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedLogisticsData>;
      expect(body.data.items).toHaveLength(1);
    });

    it('should support pagination', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([]);
      mockPrismaService.logistics.count.mockResolvedValue(100);

      const response = await request(app.getHttpServer())
        .get('/api/v1/logistics')
        .query({ page: 2, pageSize: 10 })
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedLogisticsData>;
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.pageSize).toBe(10);
      expect(body.data.pagination.totalPages).toBe(10);
    });

    it('should sort by specified field', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([mockLogistics]);
      mockPrismaService.logistics.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/logistics')
        .query({ sortBy: 'shippedAt', sortOrder: 'asc' })
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedLogisticsData>;
      expect(body.data.items).toHaveLength(1);
    });
  });

  // ============================================================
  // 3.3.3 GET /api/v1/logistics/:id
  // ============================================================
  describe('GET /api/v1/logistics/:id', () => {
    it('should return logistics record by ID', async () => {
      mockPrismaService.logistics.findUnique.mockResolvedValue(mockLogistics);

      const response = await request(app.getHttpServer())
        .get('/api/v1/logistics/1')
        .expect(200);

      const body = response.body as ApiSuccessResponse<LogisticsData>;
      expect(body.data.id).toBe(1);
      expect(body.data.carrier).toBe('顺丰速运');
    });

    it('should return 404 when logistics record not found', async () => {
      mockPrismaService.logistics.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/logistics/999')
        .expect(404);
    });
  });

  // ============================================================
  // 3.3.4 PATCH /api/v1/logistics/:id
  // ============================================================
  describe('PATCH /api/v1/logistics/:id', () => {
    it('should update logistics record successfully', async () => {
      const updatedLogistics = {
        ...mockLogistics,
        trackingNo: 'SF9999999999',
        notes: 'Updated notes',
      };
      mockPrismaService.logistics.update.mockResolvedValue(updatedLogistics);

      const updateDto = {
        trackingNo: 'SF9999999999',
        notes: 'Updated notes',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/logistics/1')
        .send(updateDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<LogisticsData>;
      expect(body.data.trackingNo).toBe('SF9999999999');
      expect(body.data.notes).toBe('Updated notes');
    });

    it('should return 404 when updating non-existent logistics record', async () => {
      // Simulate Prisma P2025 error (record not found)
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found.',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      mockPrismaService.logistics.update.mockRejectedValue(prismaError);

      const updateDto = {
        trackingNo: 'SF9999999999',
      };

      await request(app.getHttpServer())
        .patch('/api/v1/logistics/999')
        .send(updateDto)
        .expect(404);
    });

    it('should update shippedAt field', async () => {
      const updatedLogistics = {
        ...mockLogistics,
        shippedAt: new Date('2026-02-15T10:00:00Z'),
      };
      mockPrismaService.logistics.update.mockResolvedValue(updatedLogistics);

      const updateDto = {
        shippedAt: '2026-02-15T10:00:00Z',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/logistics/1')
        .send(updateDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<LogisticsData>;
      expect(body.data).toBeDefined();
    });
  });

  // ============================================================
  // 3.3.5 DELETE /api/v1/logistics/:id
  // ============================================================
  describe('DELETE /api/v1/logistics/:id', () => {
    it('should delete logistics record successfully', async () => {
      mockPrismaService.logistics.delete.mockResolvedValue(mockLogistics);

      await request(app.getHttpServer())
        .delete('/api/v1/logistics/1')
        .expect(204);
    });

    it('should return 404 when deleting non-existent logistics record', async () => {
      // Simulate Prisma P2025 error (record not found)
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to delete not found.',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      mockPrismaService.logistics.delete.mockRejectedValue(prismaError);

      await request(app.getHttpServer())
        .delete('/api/v1/logistics/999')
        .expect(404);
    });
  });
});
