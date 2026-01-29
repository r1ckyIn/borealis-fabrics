import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FabricModule } from '../src/fabric/fabric.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

// Response type definitions for type safety
interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface ApiErrorResponse {
  code: number;
  message: string;
  path: string;
  timestamp: string;
}

interface FabricData {
  id: number;
  fabricCode: string;
  name: string;
  material: Record<string, unknown> | null;
  composition: string | null;
  color: string | null;
  weight: number | null;
  width: number | null;
  thickness: string | null;
  handFeel: string | null;
  glossLevel: string | null;
  application: unknown[] | null;
  defaultPrice: number | null;
  defaultLeadTime: number | null;
  description: string | null;
  tags: unknown[] | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedFabricData {
  items: FabricData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

describe('FabricController (e2e)', () => {
  let app: INestApplication<App>;

  // Mock data
  const mockFabric = {
    id: 1,
    fabricCode: 'FB-2401-0001',
    name: 'Premium Cotton Twill',
    material: { primary: 'cotton', secondary: 'polyester' },
    composition: '80% Cotton, 20% Polyester',
    color: 'Navy Blue',
    weight: 280.5,
    width: 150.0,
    thickness: 'Medium',
    handFeel: 'Soft and smooth',
    glossLevel: 'Matte',
    application: ['apparel', 'home-textile'],
    defaultPrice: 45.5,
    defaultLeadTime: 14,
    description: 'High-quality cotton twill fabric suitable for workwear.',
    tags: ['premium', 'workwear', 'durable'],
    notes: 'Minimum order quantity: 100 meters',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  // Define mock service type for better type safety
  interface MockFabricMethods {
    create: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  }

  interface MockCountMethod {
    count: jest.Mock;
  }

  interface MockPrismaServiceType {
    fabric: MockFabricMethods;
    fabricImage: MockCountMethod;
    fabricSupplier: MockCountMethod;
    customerPricing: MockCountMethod;
    orderItem: MockCountMethod;
    quote: MockCountMethod;
    $transaction: jest.Mock;
  }

  const mockPrismaService: MockPrismaServiceType = {
    fabric: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Related tables for delete check
    fabricImage: { count: jest.fn() },
    fabricSupplier: { count: jest.fn() },
    customerPricing: { count: jest.fn() },
    orderItem: { count: jest.fn() },
    quote: { count: jest.fn() },
    // Transaction mock - passes the mock service to the callback
    $transaction: jest.fn(
      <T>(fn: (tx: MockPrismaServiceType) => Promise<T>): Promise<T> =>
        fn(mockPrismaService),
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FabricModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
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
    app.useGlobalFilters(new AllExceptionsFilter());
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
  // POST /api/v1/fabrics - Create Fabric
  // ============================================================
  describe('POST /api/v1/fabrics', () => {
    it('should create a fabric with full data', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);
      mockPrismaService.fabric.create.mockResolvedValue(mockFabric);

      const createDto = {
        fabricCode: 'FB-2401-0001',
        name: 'Premium Cotton Twill',
        material: { primary: 'cotton', secondary: 'polyester' },
        composition: '80% Cotton, 20% Polyester',
        color: 'Navy Blue',
        weight: 280.5,
        width: 150.0,
        thickness: 'Medium',
        handFeel: 'Soft and smooth',
        glossLevel: 'Matte',
        application: ['apparel', 'home-textile'],
        defaultPrice: 45.5,
        defaultLeadTime: 14,
        description: 'High-quality cotton twill fabric suitable for workwear.',
        tags: ['premium', 'workwear', 'durable'],
        notes: 'Minimum order quantity: 100 meters',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send(createDto)
        .expect(201);

      const body = response.body as ApiSuccessResponse<FabricData>;
      expect(body.code).toBe(201);
      expect(body.message).toBe('success');
      expect(body.data.fabricCode).toBe('FB-2401-0001');
      expect(body.data.name).toBe('Premium Cotton Twill');
    });

    it('should create a fabric with minimal data (only fabricCode and name)', async () => {
      const minimalFabric = {
        ...mockFabric,
        material: null,
        composition: null,
        color: null,
        weight: null,
        width: null,
        thickness: null,
        handFeel: null,
        glossLevel: null,
        application: null,
        defaultPrice: null,
        defaultLeadTime: null,
        description: null,
        tags: null,
        notes: null,
      };
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);
      mockPrismaService.fabric.create.mockResolvedValue(minimalFabric);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ fabricCode: 'FB-2401-0002', name: 'Basic Fabric' })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FabricData>;
      expect(body.code).toBe(201);
    });

    it('should return 409 when fabricCode already exists', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ fabricCode: 'FB-2401-0001', name: 'Duplicate Fabric' })
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(409);
      expect(body.message).toContain('already exists');
    });

    it('should return 400 for missing fabricCode', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ name: 'Test Fabric' })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ fabricCode: 'FB-2401-0003' })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for fabricCode exceeding 50 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ fabricCode: 'A'.repeat(51), name: 'Test Fabric' })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for name exceeding 200 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ fabricCode: 'FB-2401-0004', name: 'A'.repeat(201) })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for weight exceeding 9999.99', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ fabricCode: 'FB-2401-0005', name: 'Test', weight: 10000 })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for negative weight', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ fabricCode: 'FB-2401-0006', name: 'Test', weight: -1 })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for defaultLeadTime exceeding 365', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({
          fabricCode: 'FB-2401-0007',
          name: 'Test',
          defaultLeadTime: 366,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for negative defaultLeadTime', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ fabricCode: 'FB-2401-0008', name: 'Test', defaultLeadTime: -1 })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for defaultPrice exceeding maximum', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({
          fabricCode: 'FB-2401-0009',
          name: 'Test',
          defaultPrice: 100000000,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should trim whitespace from fabricCode and name', async () => {
      const trimmedFabric = {
        ...mockFabric,
        fabricCode: 'FB-TRIM',
        name: 'Trimmed Fabric',
      };
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);
      mockPrismaService.fabric.create.mockResolvedValue(trimmedFabric);

      await request(app.getHttpServer())
        .post('/api/v1/fabrics')
        .send({ fabricCode: '  FB-TRIM  ', name: '  Trimmed Fabric  ' })
        .expect(201);

      expect(mockPrismaService.fabric.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            fabricCode: 'FB-TRIM',
            name: 'Trimmed Fabric',
          }),
        }),
      );
    });
  });

  // ============================================================
  // GET /api/v1/fabrics/:id - Get Fabric by ID
  // ============================================================
  describe('GET /api/v1/fabrics/:id', () => {
    it('should return a fabric when found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/1')
        .expect(200);

      const body = response.body as ApiSuccessResponse<FabricData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.id).toBe(1);
      expect(body.data.fabricCode).toBe('FB-2401-0001');
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/999')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
      expect(body.message).toContain('not found');
    });

    it('should not return soft-deleted fabric', async () => {
      // findFirst with isActive: true will return null for soft-deleted
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/1')
        .expect(404);

      expect(mockPrismaService.fabric.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/invalid')
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });
  });

  // ============================================================
  // GET /api/v1/fabrics - List Fabrics
  // ============================================================
  describe('GET /api/v1/fabrics', () => {
    it('should return paginated fabrics', async () => {
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.fabric.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedFabricData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.items).toHaveLength(1);
      expect(body.data.pagination).toBeDefined();
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should filter by fabricCode (fuzzy search)', async () => {
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.fabric.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/fabrics?fabricCode=FB-2401')
        .expect(200);

      expect(mockPrismaService.fabric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            fabricCode: { contains: 'FB-2401' },
          }),
        }),
      );
    });

    it('should filter by name (fuzzy search)', async () => {
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.fabric.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/fabrics?name=Cotton')
        .expect(200);

      expect(mockPrismaService.fabric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            name: { contains: 'Cotton' },
          }),
        }),
      );
    });

    it('should filter by color (exact match)', async () => {
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.fabric.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/fabrics?color=Navy%20Blue')
        .expect(200);

      expect(mockPrismaService.fabric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            color: 'Navy Blue',
          }),
        }),
      );
    });

    it('should support custom pagination', async () => {
      mockPrismaService.fabric.findMany.mockResolvedValue([]);
      mockPrismaService.fabric.count.mockResolvedValue(50);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics?page=2&pageSize=10')
        .expect(200);

      expect(mockPrismaService.fabric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      const body = response.body as ApiSuccessResponse<PaginatedFabricData>;
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.pageSize).toBe(10);
    });

    it('should support custom sorting', async () => {
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.fabric.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/fabrics?sortBy=name&sortOrder=asc')
        .expect(200);

      expect(mockPrismaService.fabric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should default to isActive=true', async () => {
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.fabric.count.mockResolvedValue(1);

      await request(app.getHttpServer()).get('/api/v1/fabrics').expect(200);

      expect(mockPrismaService.fabric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should handle isActive=false query parameter', async () => {
      const softDeletedFabric = { ...mockFabric, isActive: false };
      mockPrismaService.fabric.findMany.mockResolvedValue([softDeletedFabric]);
      mockPrismaService.fabric.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics?isActive=false')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedFabricData>;
      expect(body.code).toBe(200);
      expect(body.data.items).toBeDefined();
    });

    it('should return empty list when no matches', async () => {
      mockPrismaService.fabric.findMany.mockResolvedValue([]);
      mockPrismaService.fabric.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics?fabricCode=NonExistent')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedFabricData>;
      expect(body.data.items).toEqual([]);
      expect(body.data.pagination.total).toBe(0);
    });
  });

  // ============================================================
  // PATCH /api/v1/fabrics/:id - Update Fabric
  // ============================================================
  describe('PATCH /api/v1/fabrics/:id', () => {
    it('should update a fabric successfully', async () => {
      const updatedFabric = { ...mockFabric, name: 'Updated Fabric Name' };
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);
      mockPrismaService.fabric.update.mockResolvedValue(updatedFabric);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ name: 'Updated Fabric Name' })
        .expect(200);

      const body = response.body as ApiSuccessResponse<FabricData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.name).toBe('Updated Fabric Name');
    });

    it('should update fabric color', async () => {
      const updatedFabric = { ...mockFabric, color: 'Red' };
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabric.update.mockResolvedValue(updatedFabric);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ color: 'Red' })
        .expect(200);

      const body = response.body as ApiSuccessResponse<FabricData>;
      expect(body.data.color).toBe('Red');
    });

    it('should update fabricCode when no conflict', async () => {
      const updatedFabric = { ...mockFabric, fabricCode: 'FB-NEW-CODE' };
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);
      mockPrismaService.fabric.update.mockResolvedValue(updatedFabric);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ fabricCode: 'FB-NEW-CODE' })
        .expect(200);

      const body = response.body as ApiSuccessResponse<FabricData>;
      expect(body.data.fabricCode).toBe('FB-NEW-CODE');
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/999')
        .send({ name: 'Updated Name' })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });

    it('should return 409 when fabricCode conflicts with another fabric', async () => {
      const anotherFabric = { ...mockFabric, id: 2, fabricCode: 'FB-EXISTING' };
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabric.findFirst.mockResolvedValue(anotherFabric);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ fabricCode: 'FB-EXISTING' })
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(409);
      expect(body.message).toContain('already exists');
    });

    it('should allow updating to same fabricCode (no conflict)', async () => {
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric); // Same fabric
      mockPrismaService.fabric.update.mockResolvedValue(mockFabric);

      await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ fabricCode: 'FB-2401-0001' })
        .expect(200);
    });

    it('should return 400 for invalid name length', async () => {
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ name: 'A'.repeat(201) })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });
  });

  // ============================================================
  // DELETE /api/v1/fabrics/:id - Delete Fabric
  // ============================================================
  describe('DELETE /api/v1/fabrics/:id', () => {
    it('should physically delete a fabric with no relations', async () => {
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.count.mockResolvedValue(0);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(0);
      mockPrismaService.customerPricing.count.mockResolvedValue(0);
      mockPrismaService.orderItem.count.mockResolvedValue(0);
      mockPrismaService.quote.count.mockResolvedValue(0);
      mockPrismaService.fabric.delete.mockResolvedValue(mockFabric);

      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1')
        .expect(204);

      expect(mockPrismaService.fabric.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/999')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });

    it('should return 409 when has relations and force=false', async () => {
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.count.mockResolvedValue(3);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(2);
      mockPrismaService.customerPricing.count.mockResolvedValue(0);
      mockPrismaService.orderItem.count.mockResolvedValue(5);
      mockPrismaService.quote.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1')
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(409);
      expect(body.message).toContain('Related data exists');
      expect(body.message).toContain('force=true');
    });

    it('should soft delete when force=true and has relations', async () => {
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.count.mockResolvedValue(2);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(0);
      mockPrismaService.customerPricing.count.mockResolvedValue(1);
      mockPrismaService.orderItem.count.mockResolvedValue(0);
      mockPrismaService.quote.count.mockResolvedValue(0);
      mockPrismaService.fabric.update.mockResolvedValue({
        ...mockFabric,
        isActive: false,
      });

      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1?force=true')
        .expect(204);

      expect(mockPrismaService.fabric.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(mockPrismaService.fabric.delete).not.toHaveBeenCalled();
    });

    it('should include all relation types in conflict message', async () => {
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.count.mockResolvedValue(1);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(2);
      mockPrismaService.customerPricing.count.mockResolvedValue(3);
      mockPrismaService.orderItem.count.mockResolvedValue(4);
      mockPrismaService.quote.count.mockResolvedValue(5);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1')
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('fabric image');
      expect(body.message).toContain('fabric supplier');
      expect(body.message).toContain('customer pricing');
      expect(body.message).toContain('order item');
      expect(body.message).toContain('quote');
    });

    it('should physically delete when force=true but no relations', async () => {
      mockPrismaService.fabric.findUnique.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.count.mockResolvedValue(0);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(0);
      mockPrismaService.customerPricing.count.mockResolvedValue(0);
      mockPrismaService.orderItem.count.mockResolvedValue(0);
      mockPrismaService.quote.count.mockResolvedValue(0);
      mockPrismaService.fabric.delete.mockResolvedValue(mockFabric);

      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1?force=true')
        .expect(204);

      expect(mockPrismaService.fabric.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  // ============================================================
  // DTO Validation Boundary Tests
  // ============================================================
  describe('DTO Validation Boundaries', () => {
    describe('sortBy validation', () => {
      it('should reject invalid sortBy field', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/fabrics?sortBy=invalidField')
          .expect(400);

        const body = response.body as ApiErrorResponse;
        expect(body.code).toBe(400);
      });

      it('should accept valid sortBy field (fabricCode)', async () => {
        mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
        mockPrismaService.fabric.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/fabrics?sortBy=fabricCode')
          .expect(200);
      });

      it('should accept valid sortBy field (name)', async () => {
        mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
        mockPrismaService.fabric.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/fabrics?sortBy=name')
          .expect(200);
      });

      it('should accept valid sortBy field (defaultPrice)', async () => {
        mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
        mockPrismaService.fabric.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/fabrics?sortBy=defaultPrice')
          .expect(200);
      });

      it('should accept valid sortBy field (updatedAt)', async () => {
        mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
        mockPrismaService.fabric.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/fabrics?sortBy=updatedAt')
          .expect(200);
      });
    });

    describe('sortOrder validation', () => {
      it('should reject invalid sortOrder value', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/fabrics?sortOrder=invalid')
          .expect(400);

        const body = response.body as ApiErrorResponse;
        expect(body.code).toBe(400);
      });

      it('should accept valid sortOrder (asc)', async () => {
        mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
        mockPrismaService.fabric.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/fabrics?sortOrder=asc')
          .expect(200);
      });

      it('should accept valid sortOrder (desc)', async () => {
        mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
        mockPrismaService.fabric.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/fabrics?sortOrder=desc')
          .expect(200);
      });
    });

    describe('fabricCode length validation', () => {
      it('should accept fabricCode at exactly 50 characters', async () => {
        const fabricCode = 'A'.repeat(50);
        const createdFabric = { ...mockFabric, fabricCode };
        mockPrismaService.fabric.findFirst.mockResolvedValue(null);
        mockPrismaService.fabric.create.mockResolvedValue(createdFabric);

        const response = await request(app.getHttpServer())
          .post('/api/v1/fabrics')
          .send({ fabricCode, name: 'Test Fabric' })
          .expect(201);

        const body = response.body as ApiSuccessResponse<FabricData>;
        expect(body.code).toBe(201);
      });
    });

    describe('name length validation', () => {
      it('should accept name at exactly 200 characters', async () => {
        const name = 'A'.repeat(200);
        const createdFabric = { ...mockFabric, name };
        mockPrismaService.fabric.findFirst.mockResolvedValue(null);
        mockPrismaService.fabric.create.mockResolvedValue(createdFabric);

        const response = await request(app.getHttpServer())
          .post('/api/v1/fabrics')
          .send({ fabricCode: 'FB-TEST', name })
          .expect(201);

        const body = response.body as ApiSuccessResponse<FabricData>;
        expect(body.code).toBe(201);
      });
    });

    describe('weight validation', () => {
      it('should accept weight at minimum (0)', async () => {
        mockPrismaService.fabric.findFirst.mockResolvedValue(null);
        mockPrismaService.fabric.create.mockResolvedValue({
          ...mockFabric,
          weight: 0,
        });

        await request(app.getHttpServer())
          .post('/api/v1/fabrics')
          .send({ fabricCode: 'FB-TEST', name: 'Test', weight: 0 })
          .expect(201);
      });

      it('should accept weight at maximum (9999.99)', async () => {
        mockPrismaService.fabric.findFirst.mockResolvedValue(null);
        mockPrismaService.fabric.create.mockResolvedValue({
          ...mockFabric,
          weight: 9999.99,
        });

        await request(app.getHttpServer())
          .post('/api/v1/fabrics')
          .send({ fabricCode: 'FB-TEST', name: 'Test', weight: 9999.99 })
          .expect(201);
      });
    });

    describe('defaultLeadTime validation', () => {
      it('should accept defaultLeadTime at minimum (0)', async () => {
        mockPrismaService.fabric.findFirst.mockResolvedValue(null);
        mockPrismaService.fabric.create.mockResolvedValue({
          ...mockFabric,
          defaultLeadTime: 0,
        });

        await request(app.getHttpServer())
          .post('/api/v1/fabrics')
          .send({ fabricCode: 'FB-TEST', name: 'Test', defaultLeadTime: 0 })
          .expect(201);
      });

      it('should accept defaultLeadTime at maximum (365)', async () => {
        mockPrismaService.fabric.findFirst.mockResolvedValue(null);
        mockPrismaService.fabric.create.mockResolvedValue({
          ...mockFabric,
          defaultLeadTime: 365,
        });

        await request(app.getHttpServer())
          .post('/api/v1/fabrics')
          .send({ fabricCode: 'FB-TEST', name: 'Test', defaultLeadTime: 365 })
          .expect(201);
      });
    });

    describe('defaultPrice validation', () => {
      it('should accept defaultPrice at minimum (0)', async () => {
        mockPrismaService.fabric.findFirst.mockResolvedValue(null);
        mockPrismaService.fabric.create.mockResolvedValue({
          ...mockFabric,
          defaultPrice: 0,
        });

        await request(app.getHttpServer())
          .post('/api/v1/fabrics')
          .send({ fabricCode: 'FB-TEST', name: 'Test', defaultPrice: 0 })
          .expect(201);
      });

      it('should accept defaultPrice at maximum (99999999.99)', async () => {
        mockPrismaService.fabric.findFirst.mockResolvedValue(null);
        mockPrismaService.fabric.create.mockResolvedValue({
          ...mockFabric,
          defaultPrice: 99999999.99,
        });

        await request(app.getHttpServer())
          .post('/api/v1/fabrics')
          .send({
            fabricCode: 'FB-TEST',
            name: 'Test',
            defaultPrice: 99999999.99,
          })
          .expect(201);
      });
    });
  });

  // ============================================================
  // Response Format Validation
  // ============================================================
  describe('Response Format', () => {
    it('should wrap successful response with code, message, and data', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/1')
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('message', 'success');
      expect(response.body).toHaveProperty('data');
    });

    it('should wrap error response with code, message, path, and timestamp', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/999')
        .expect(404);

      expect(response.body).toHaveProperty('code', 404);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
