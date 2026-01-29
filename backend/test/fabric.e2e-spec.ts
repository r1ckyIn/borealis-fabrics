/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FabricModule } from '../src/fabric/fabric.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FileService } from '../src/file/file.service';
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

interface FabricImageData {
  id: number;
  fabricId: number;
  url: string;
  sortOrder: number;
  createdAt: string;
}

interface FabricSupplierData {
  supplier: {
    id: number;
    companyName: string;
    contactName: string | null;
    phone: string | null;
    status: string;
  };
  fabricSupplierRelation: {
    fabricSupplierId: number;
    purchasePrice: number;
    minOrderQty: number | null;
    leadTimeDays: number | null;
  };
}

interface PaginatedFabricSupplierData {
  items: FabricSupplierData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface FabricSupplierAssociationData {
  id: number;
  fabricId: number;
  supplierId: number;
  purchasePrice: number;
  minOrderQty: number | null;
  leadTimeDays: number | null;
  createdAt: string;
  updatedAt: string;
}

interface FabricPricingData {
  id: number;
  customerId: number;
  fabricId: number;
  specialPrice: number;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    companyName: string;
    contactName: string | null;
  };
}

interface PaginatedFabricPricingData {
  items: FabricPricingData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface FabricPricingRecordData {
  id: number;
  fabricId: number;
  customerId: number;
  specialPrice: number;
  createdAt: string;
  updatedAt: string;
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

  interface MockFabricImageMethods extends MockCountMethod {
    create: jest.Mock;
    findFirst: jest.Mock;
    delete: jest.Mock;
  }

  interface MockFabricSupplierMethods extends MockCountMethod {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  }

  interface MockSupplierMethods {
    findFirst: jest.Mock;
  }

  interface MockCustomerMethods {
    findFirst: jest.Mock;
  }

  interface MockCustomerPricingMethods {
    count: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  }

  interface MockPrismaServiceTypeExtended extends MockPrismaServiceType {
    fabricImage: MockFabricImageMethods;
    fabricSupplier: MockFabricSupplierMethods;
    supplier: MockSupplierMethods;
    customer: MockCustomerMethods;
    customerPricing: MockCustomerPricingMethods;
  }

  const mockPrismaService: MockPrismaServiceTypeExtended = {
    fabric: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Related tables for delete check and image operations
    fabricImage: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    // Fabric-supplier association methods
    fabricSupplier: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Supplier methods for validation
    supplier: {
      findFirst: jest.fn(),
    },
    // Customer methods for pricing validation
    customer: {
      findFirst: jest.fn(),
    },
    // CustomerPricing methods for pricing operations
    customerPricing: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    orderItem: { count: jest.fn() },
    quote: { count: jest.fn() },
    // Transaction mock - passes the mock service to the callback
    $transaction: jest.fn(
      <T>(fn: (tx: MockPrismaServiceTypeExtended) => Promise<T>): Promise<T> =>
        fn(mockPrismaService),
    ),
  };

  // Mock FileService
  const mockFileService = {
    upload: jest.fn(),
    findOne: jest.fn(),
    findByKey: jest.fn(),
    remove: jest.fn(),
    removeByKey: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FabricModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(FileService)
      .useValue(mockFileService)
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
      // Use findFirst for existence check (with isActive: true)
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
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
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
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
      // First call for existence check, second for conflict check
      mockPrismaService.fabric.findFirst
        .mockResolvedValueOnce(mockFabric)
        .mockResolvedValueOnce(null);
      mockPrismaService.fabric.update.mockResolvedValue(updatedFabric);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ fabricCode: 'FB-NEW-CODE' })
        .expect(200);

      const body = response.body as ApiSuccessResponse<FabricData>;
      expect(body.data.fabricCode).toBe('FB-NEW-CODE');
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/999')
        .send({ name: 'Updated Name' })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });

    it('should return 404 when fabric is soft deleted', async () => {
      // findFirst with isActive: true returns null for soft-deleted fabric
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ name: 'Updated Name' })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });

    it('should return 409 when fabricCode conflicts with another fabric', async () => {
      const anotherFabric = { ...mockFabric, id: 2, fabricCode: 'FB-EXISTING' };
      // First call for existence check, second for conflict check
      mockPrismaService.fabric.findFirst
        .mockResolvedValueOnce(mockFabric)
        .mockResolvedValueOnce(anotherFabric);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ fabricCode: 'FB-EXISTING' })
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(409);
      expect(body.message).toContain('already exists');
    });

    it('should allow updating to same fabricCode (no conflict)', async () => {
      // First call for existence check, second for conflict check (returns self)
      mockPrismaService.fabric.findFirst
        .mockResolvedValueOnce(mockFabric)
        .mockResolvedValueOnce(mockFabric);
      mockPrismaService.fabric.update.mockResolvedValue(mockFabric);

      await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1')
        .send({ fabricCode: 'FB-2401-0001' })
        .expect(200);
    });

    it('should return 400 for invalid name length', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

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

  // ============================================================
  // POST /api/v1/fabrics/:id/images - Upload Fabric Image
  // ============================================================
  describe('POST /api/v1/fabrics/:id/images', () => {
    const mockFileUploadResult = {
      id: 1,
      key: 'uuid-123.jpg',
      url: 'http://localhost:3000/uploads/uuid-123.jpg',
      originalName: 'test-image.jpg',
      mimeType: 'image/jpeg',
      size: 1024 * 1024,
    };

    const mockFabricImage = {
      id: 1,
      fabricId: 1,
      url: 'http://localhost:3000/uploads/uuid-123.jpg',
      sortOrder: 0,
      createdAt: new Date('2025-01-01'),
    };

    it('should upload an image successfully and return 201', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue(mockFileUploadResult);
      mockPrismaService.fabricImage.create.mockResolvedValue(mockFabricImage);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .attach('file', Buffer.from('test image data'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FabricImageData>;
      expect(body.code).toBe(201);
      expect(body.message).toBe('success');
      expect(body.data.fabricId).toBe(1);
      expect(body.data.url).toBe('http://localhost:3000/uploads/uuid-123.jpg');
      expect(body.data.sortOrder).toBe(0);
    });

    it('should upload with custom sortOrder and return 201', async () => {
      const customSortOrderImage = { ...mockFabricImage, sortOrder: 5 };
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue(mockFileUploadResult);
      mockPrismaService.fabricImage.create.mockResolvedValue(
        customSortOrderImage,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .field('sortOrder', '5')
        .attach('file', Buffer.from('test image data'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FabricImageData>;
      expect(body.code).toBe(201);
      expect(body.data.sortOrder).toBe(5);
    });

    it('should return 404 when fabric does not exist', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/999/images')
        .attach('file', Buffer.from('test image data'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
      expect(body.message).toContain('not found');
    });

    it('should return 400 when no file is provided', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
      expect(body.message).toContain('No file provided');
    });

    it('should return 400 for non-image file type', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .attach('file', Buffer.from('pdf content'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
      expect(body.message).toContain('Invalid file type');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/invalid/images')
        .attach('file', Buffer.from('test image data'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for negative sortOrder', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .field('sortOrder', '-1')
        .attach('file', Buffer.from('test image data'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for sortOrder exceeding maximum (999)', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .field('sortOrder', '1000')
        .attach('file', Buffer.from('test image data'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should accept PNG image', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue({
        ...mockFileUploadResult,
        mimeType: 'image/png',
      });
      mockPrismaService.fabricImage.create.mockResolvedValue(mockFabricImage);

      await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .attach('file', Buffer.from('png data'), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(201);
    });

    it('should accept GIF image', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue({
        ...mockFileUploadResult,
        mimeType: 'image/gif',
      });
      mockPrismaService.fabricImage.create.mockResolvedValue(mockFabricImage);

      await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .attach('file', Buffer.from('gif data'), {
          filename: 'test.gif',
          contentType: 'image/gif',
        })
        .expect(201);
    });

    it('should accept WebP image', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue({
        ...mockFileUploadResult,
        mimeType: 'image/webp',
      });
      mockPrismaService.fabricImage.create.mockResolvedValue(mockFabricImage);

      await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .attach('file', Buffer.from('webp data'), {
          filename: 'test.webp',
          contentType: 'image/webp',
        })
        .expect(201);
    });

    it('should accept sortOrder at maximum (999)', async () => {
      const maxSortOrderImage = { ...mockFabricImage, sortOrder: 999 };
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue(mockFileUploadResult);
      mockPrismaService.fabricImage.create.mockResolvedValue(maxSortOrderImage);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/images')
        .field('sortOrder', '999')
        .attach('file', Buffer.from('test image data'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FabricImageData>;
      expect(body.data.sortOrder).toBe(999);
    });
  });

  // ============================================================
  // DELETE /api/v1/fabrics/:id/images/:imageId - Delete Fabric Image (2.3.8)
  // ============================================================
  describe('DELETE /api/v1/fabrics/:id/images/:imageId', () => {
    const mockFabricImage = {
      id: 10,
      fabricId: 1,
      url: 'http://localhost:3000/uploads/uuid-123.jpg',
      sortOrder: 0,
      createdAt: new Date('2025-01-01'),
    };

    it('should delete fabric image successfully', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.findFirst.mockResolvedValue(
        mockFabricImage,
      );
      mockPrismaService.fabricImage.delete.mockResolvedValue(mockFabricImage);
      mockFileService.removeByKey.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/images/10')
        .expect(204);

      expect(mockPrismaService.fabricImage.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/999/images/10')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
      expect(body.message).toContain('Fabric');
    });

    it('should return 404 when fabric is soft-deleted', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/images/10')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });

    it('should return 404 when image not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/images/999')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
      expect(body.message).toContain('image');
    });

    it('should return 404 when image belongs to different fabric', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.findFirst.mockResolvedValue(null); // findFirst with fabricId filter returns null

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/images/10')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });

    it('should return 400 for invalid fabric ID format', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/invalid/images/10')
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for invalid image ID format', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/images/invalid')
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should continue even if file removal fails (graceful degradation)', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.findFirst.mockResolvedValue(
        mockFabricImage,
      );
      mockPrismaService.fabricImage.delete.mockResolvedValue(mockFabricImage);
      mockFileService.removeByKey.mockRejectedValue(
        new Error('File not found'),
      );

      // Should still return 204 even if file deletion fails
      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/images/10')
        .expect(204);

      expect(mockPrismaService.fabricImage.delete).toHaveBeenCalled();
    });

    it('should delete image record even when URL parsing fails', async () => {
      const imageWithBadUrl = {
        ...mockFabricImage,
        url: 'not-a-valid-url',
      };
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricImage.findFirst.mockResolvedValue(
        imageWithBadUrl,
      );
      mockPrismaService.fabricImage.delete.mockResolvedValue(imageWithBadUrl);

      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/images/10')
        .expect(204);

      expect(mockPrismaService.fabricImage.delete).toHaveBeenCalled();
    });
  });

  // ========================================
  // Fabric-Supplier Association E2E Tests (2.3.9-2.3.12)
  // ========================================
  describe('GET /api/v1/fabrics/:id/suppliers (2.3.9)', () => {
    const mockSupplier = {
      id: 10,
      companyName: 'Test Supplier Co.',
      contactName: 'John Smith',
      phone: '123-456-7890',
      status: 'active',
    };

    const mockFabricSupplierWithRelation = {
      id: 1,
      fabricId: 1,
      supplierId: 10,
      purchasePrice: 45.0,
      minOrderQty: 100.0,
      leadTimeDays: 7,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      supplier: mockSupplier,
    };

    it('should return paginated list of suppliers for a fabric', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([
        mockFabricSupplierWithRelation,
      ]);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/1/suppliers')
        .expect(200);

      const body =
        response.body as ApiSuccessResponse<PaginatedFabricSupplierData>;
      expect(body.code).toBe(200);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].supplier.companyName).toBe('Test Supplier Co.');
      expect(body.data.items[0].fabricSupplierRelation.purchasePrice).toBe(
        45.0,
      );
      expect(body.data.pagination.total).toBe(1);
    });

    it('should return empty list when fabric has no suppliers', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/1/suppliers')
        .expect(200);

      const body =
        response.body as ApiSuccessResponse<PaginatedFabricSupplierData>;
      expect(body.data.items).toHaveLength(0);
      expect(body.data.pagination.total).toBe(0);
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/999/suppliers')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric with ID 999 not found');
    });

    it('should support pagination parameters', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(50);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/1/suppliers?page=2&pageSize=10')
        .expect(200);

      const body =
        response.body as ApiSuccessResponse<PaginatedFabricSupplierData>;
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.pageSize).toBe(10);
    });

    it('should support supplierName filter', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([
        mockFabricSupplierWithRelation,
      ]);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/fabrics/1/suppliers?supplierName=Test')
        .expect(200);

      expect(mockPrismaService.fabricSupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            supplier: expect.objectContaining({
              companyName: { contains: 'Test' },
            }),
          }),
        }),
      );
    });
  });

  describe('POST /api/v1/fabrics/:id/suppliers (2.3.10)', () => {
    const mockSupplier = {
      id: 10,
      companyName: 'Test Supplier Co.',
      contactName: 'John Smith',
      phone: '123-456-7890',
      email: 'test@example.com',
      address: null,
      bankInfo: null,
      status: 'active',
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreatedAssociation = {
      id: 1,
      fabricId: 1,
      supplierId: 10,
      purchasePrice: 45.0,
      minOrderQty: 100.0,
      leadTimeDays: 7,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    it('should create fabric-supplier association successfully', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      mockPrismaService.fabricSupplier.create.mockResolvedValue(
        mockCreatedAssociation,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/suppliers')
        .send({
          supplierId: 10,
          purchasePrice: 45.0,
          minOrderQty: 100.0,
          leadTimeDays: 7,
        })
        .expect(201);

      const body =
        response.body as ApiSuccessResponse<FabricSupplierAssociationData>;
      expect(body.code).toBe(201);
      expect(body.data.fabricId).toBe(1);
      expect(body.data.supplierId).toBe(10);
    });

    it('should create association with only required fields', async () => {
      const minimalAssociation = {
        ...mockCreatedAssociation,
        minOrderQty: null,
        leadTimeDays: null,
      };
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      mockPrismaService.fabricSupplier.create.mockResolvedValue(
        minimalAssociation,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/suppliers')
        .send({
          supplierId: 10,
          purchasePrice: 45.0,
        })
        .expect(201);

      const body =
        response.body as ApiSuccessResponse<FabricSupplierAssociationData>;
      expect(body.code).toBe(201);
    });

    it('should return 400 when supplierId is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/suppliers')
        .send({
          purchasePrice: 45.0,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      // message can be string or array
      const messageStr = Array.isArray(body.message)
        ? body.message.join(' ')
        : body.message;
      expect(messageStr).toContain('supplierId');
    });

    it('should return 400 when purchasePrice is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/suppliers')
        .send({
          supplierId: 10,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      // message can be string or array
      const messageStr = Array.isArray(body.message)
        ? body.message.join(' ')
        : body.message;
      expect(messageStr).toContain('purchasePrice');
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/999/suppliers')
        .send({
          supplierId: 10,
          purchasePrice: 45.0,
        })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric with ID 999 not found');
    });

    it('should return 404 when supplier not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/suppliers')
        .send({
          supplierId: 999,
          purchasePrice: 45.0,
        })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Supplier with ID 999 not found');
    });

    it('should return 409 when association already exists', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      const prismaError = new Error('Unique constraint failed');
      (prismaError as unknown as { code: string }).code = 'P2002';
      mockPrismaService.fabricSupplier.create.mockRejectedValue(prismaError);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/suppliers')
        .send({
          supplierId: 10,
          purchasePrice: 45.0,
        })
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('already associated');
    });

    it('should validate purchasePrice range (min)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/suppliers')
        .send({
          supplierId: 10,
          purchasePrice: 0,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toBeDefined();
    });

    it('should validate purchasePrice range (max)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/suppliers')
        .send({
          supplierId: 10,
          purchasePrice: 10000000,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toBeDefined();
    });
  });

  describe('PATCH /api/v1/fabrics/:id/suppliers/:supplierId (2.3.11)', () => {
    const mockExistingAssociation = {
      id: 1,
      fabricId: 1,
      supplierId: 10,
      purchasePrice: 45.0,
      minOrderQty: 100.0,
      leadTimeDays: 7,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    it('should update fabric-supplier association successfully', async () => {
      const updatedAssociation = {
        ...mockExistingAssociation,
        purchasePrice: 50.0,
      };
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricSupplier.findFirst.mockResolvedValue(
        mockExistingAssociation,
      );
      mockPrismaService.fabricSupplier.update.mockResolvedValue(
        updatedAssociation,
      );

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/suppliers/10')
        .send({
          purchasePrice: 50.0,
        })
        .expect(200);

      const body =
        response.body as ApiSuccessResponse<FabricSupplierAssociationData>;
      expect(body.code).toBe(200);
      expect(body.data.purchasePrice).toBe(50.0);
    });

    it('should update multiple fields at once', async () => {
      const updatedAssociation = {
        ...mockExistingAssociation,
        purchasePrice: 55.0,
        minOrderQty: 200.0,
        leadTimeDays: 14,
      };
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricSupplier.findFirst.mockResolvedValue(
        mockExistingAssociation,
      );
      mockPrismaService.fabricSupplier.update.mockResolvedValue(
        updatedAssociation,
      );

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/suppliers/10')
        .send({
          purchasePrice: 55.0,
          minOrderQty: 200.0,
          leadTimeDays: 14,
        })
        .expect(200);

      const body =
        response.body as ApiSuccessResponse<FabricSupplierAssociationData>;
      expect(body.data.purchasePrice).toBe(55.0);
      expect(body.data.minOrderQty).toBe(200.0);
      expect(body.data.leadTimeDays).toBe(14);
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/999/suppliers/10')
        .send({
          purchasePrice: 50.0,
        })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric with ID 999 not found');
    });

    it('should return 404 when association not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricSupplier.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/suppliers/999')
        .send({
          purchasePrice: 50.0,
        })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('not associated');
    });

    it('should validate leadTimeDays range (max)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/suppliers/10')
        .send({
          leadTimeDays: 400,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toBeDefined();
    });
  });

  describe('DELETE /api/v1/fabrics/:id/suppliers/:supplierId (2.3.12)', () => {
    const mockExistingAssociation = {
      id: 1,
      fabricId: 1,
      supplierId: 10,
      purchasePrice: 45.0,
      minOrderQty: 100.0,
      leadTimeDays: 7,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    it('should delete fabric-supplier association successfully', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricSupplier.findFirst.mockResolvedValue(
        mockExistingAssociation,
      );
      mockPrismaService.fabricSupplier.delete.mockResolvedValue(
        mockExistingAssociation,
      );

      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/suppliers/10')
        .expect(204);

      expect(mockPrismaService.fabricSupplier.delete).toHaveBeenCalled();
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/999/suppliers/10')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric with ID 999 not found');
    });

    it('should return 404 when association not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.fabricSupplier.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/suppliers/999')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('not associated');
    });

    it('should handle non-numeric supplier ID', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/suppliers/abc')
        .expect(400);
    });
  });

  // ========================================
  // Fabric Pricing E2E Tests (2.3.13-2.3.16)
  // ========================================
  describe('GET /api/v1/fabrics/:id/pricing (2.3.13)', () => {
    const mockCustomerForPricing = {
      id: 20,
      companyName: 'Test Customer Co.',
      contactName: 'Jane Doe',
    };

    const mockCustomerPricingWithRelation = {
      id: 1,
      fabricId: 1,
      customerId: 20,
      specialPrice: 38.5,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      customer: mockCustomerForPricing,
    };

    it('should return paginated list of pricing for a fabric', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customerPricing.findMany.mockResolvedValue([
        mockCustomerPricingWithRelation,
      ]);
      mockPrismaService.customerPricing.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/1/pricing')
        .expect(200);

      const body =
        response.body as ApiSuccessResponse<PaginatedFabricPricingData>;
      expect(body.code).toBe(200);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].customer.companyName).toBe('Test Customer Co.');
      expect(body.data.items[0].specialPrice).toBe(38.5);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should return empty list when fabric has no pricing', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customerPricing.findMany.mockResolvedValue([]);
      mockPrismaService.customerPricing.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/1/pricing')
        .expect(200);

      const body =
        response.body as ApiSuccessResponse<PaginatedFabricPricingData>;
      expect(body.data.items).toHaveLength(0);
      expect(body.data.pagination.total).toBe(0);
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/999/pricing')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric with ID 999 not found');
    });

    it('should support pagination parameters', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customerPricing.findMany.mockResolvedValue([]);
      mockPrismaService.customerPricing.count.mockResolvedValue(50);

      const response = await request(app.getHttpServer())
        .get('/api/v1/fabrics/1/pricing?page=2&pageSize=10')
        .expect(200);

      const body =
        response.body as ApiSuccessResponse<PaginatedFabricPricingData>;
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.pageSize).toBe(10);
    });

    it('should support customerName filter', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customerPricing.findMany.mockResolvedValue([
        mockCustomerPricingWithRelation,
      ]);
      mockPrismaService.customerPricing.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/fabrics/1/pricing?customerName=Test')
        .expect(200);

      expect(mockPrismaService.customerPricing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customer: expect.objectContaining({
              companyName: { contains: 'Test' },
            }),
          }),
        }),
      );
    });

    it('should support sorting by specialPrice', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customerPricing.findMany.mockResolvedValue([
        mockCustomerPricingWithRelation,
      ]);
      mockPrismaService.customerPricing.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/fabrics/1/pricing?sortBy=specialPrice&sortOrder=desc')
        .expect(200);

      expect(mockPrismaService.customerPricing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { specialPrice: 'desc' },
        }),
      );
    });
  });

  describe('POST /api/v1/fabrics/:id/pricing (2.3.14)', () => {
    const mockCustomer = {
      id: 20,
      companyName: 'Test Customer Co.',
      contactName: 'Jane Doe',
      phone: '987-654-3210',
      email: 'jane@test.com',
      address: null,
      creditLimit: null,
      status: 'active',
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreatedPricing = {
      id: 1,
      fabricId: 1,
      customerId: 20,
      specialPrice: 38.5,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    it('should create fabric pricing successfully', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.customerPricing.create.mockResolvedValue(
        mockCreatedPricing,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/pricing')
        .send({
          customerId: 20,
          specialPrice: 38.5,
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FabricPricingRecordData>;
      expect(body.code).toBe(201);
      expect(body.data.fabricId).toBe(1);
      expect(body.data.customerId).toBe(20);
      expect(body.data.specialPrice).toBe(38.5);
    });

    it('should return 400 when customerId is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/pricing')
        .send({
          specialPrice: 38.5,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      const messageStr = Array.isArray(body.message)
        ? body.message.join(' ')
        : body.message;
      expect(messageStr).toContain('customerId');
    });

    it('should return 400 when specialPrice is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/pricing')
        .send({
          customerId: 20,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      const messageStr = Array.isArray(body.message)
        ? body.message.join(' ')
        : body.message;
      expect(messageStr).toContain('specialPrice');
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/999/pricing')
        .send({
          customerId: 20,
          specialPrice: 38.5,
        })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric with ID 999 not found');
    });

    it('should return 404 when customer not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/pricing')
        .send({
          customerId: 999,
          specialPrice: 38.5,
        })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Customer with ID 999 not found');
    });

    it('should return 409 when pricing already exists', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      const prismaError = new Error('Unique constraint failed');
      (prismaError as unknown as { code: string }).code = 'P2002';
      mockPrismaService.customerPricing.create.mockRejectedValue(prismaError);

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/pricing')
        .send({
          customerId: 20,
          specialPrice: 38.5,
        })
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('already has special pricing');
    });

    it('should validate specialPrice range (min)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/pricing')
        .send({
          customerId: 20,
          specialPrice: 0,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toBeDefined();
    });

    it('should validate specialPrice range (max)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/pricing')
        .send({
          customerId: 20,
          specialPrice: 10000000,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toBeDefined();
    });

    it('should accept specialPrice at min boundary (0.01)', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.customerPricing.create.mockResolvedValue({
        ...mockCreatedPricing,
        specialPrice: 0.01,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/fabrics/1/pricing')
        .send({
          customerId: 20,
          specialPrice: 0.01,
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FabricPricingRecordData>;
      expect(body.data.specialPrice).toBe(0.01);
    });
  });

  describe('PATCH /api/v1/fabrics/:id/pricing/:pricingId (2.3.15)', () => {
    const mockExistingPricing = {
      id: 1,
      fabricId: 1,
      customerId: 20,
      specialPrice: 38.5,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    it('should update fabric pricing successfully', async () => {
      const updatedPricing = {
        ...mockExistingPricing,
        specialPrice: 42.0,
      };
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customerPricing.findUnique.mockResolvedValue(
        mockExistingPricing,
      );
      mockPrismaService.customerPricing.update.mockResolvedValue(
        updatedPricing,
      );

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/pricing/1')
        .send({
          specialPrice: 42.0,
        })
        .expect(200);

      const body = response.body as ApiSuccessResponse<FabricPricingRecordData>;
      expect(body.code).toBe(200);
      expect(body.data.specialPrice).toBe(42.0);
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/999/pricing/1')
        .send({
          specialPrice: 42.0,
        })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric with ID 999 not found');
    });

    it('should return 404 when pricing not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customerPricing.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/pricing/999')
        .send({
          specialPrice: 42.0,
        })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric pricing with ID 999 not found');
    });

    it('should validate specialPrice range (min)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/pricing/1')
        .send({
          specialPrice: 0,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toBeDefined();
    });

    it('should validate specialPrice range (max)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/pricing/1')
        .send({
          specialPrice: 10000000,
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toBeDefined();
    });

    it('should return 400 when specialPrice is missing', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/pricing/1')
        .send({})
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toBeDefined();
    });

    it('should handle non-numeric pricing ID', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/fabrics/1/pricing/abc')
        .send({
          specialPrice: 42.0,
        })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/fabrics/:id/pricing/:pricingId (2.3.16)', () => {
    const mockExistingPricing = {
      id: 1,
      fabricId: 1,
      customerId: 20,
      specialPrice: 38.5,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    it('should delete fabric pricing successfully', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customerPricing.findUnique.mockResolvedValue(
        mockExistingPricing,
      );
      mockPrismaService.customerPricing.delete.mockResolvedValue(
        mockExistingPricing,
      );

      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/pricing/1')
        .expect(204);

      expect(mockPrismaService.customerPricing.delete).toHaveBeenCalled();
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/999/pricing/1')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric with ID 999 not found');
    });

    it('should return 404 when pricing not found', async () => {
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.customerPricing.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/pricing/999')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.message).toContain('Fabric pricing with ID 999 not found');
    });

    it('should handle non-numeric pricing ID', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/1/pricing/abc')
        .expect(400);
    });

    it('should handle non-numeric fabric ID', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/fabrics/abc/pricing/1')
        .expect(400);
    });
  });
});
