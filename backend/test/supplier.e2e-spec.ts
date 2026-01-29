import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SupplierModule } from '../src/supplier/supplier.module';
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

interface SupplierData {
  id: number;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  wechat: string | null;
  email: string | null;
  address: string | null;
  status: string;
  billReceiveType: string | null;
  settleType: string;
  creditDays: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedSupplierData {
  items: SupplierData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

describe('SupplierController (e2e)', () => {
  let app: INestApplication<App>;

  // Mock data
  const mockSupplier = {
    id: 1,
    companyName: 'ABC Textiles',
    contactName: 'John Doe',
    phone: '13800138000',
    wechat: 'wechat_123',
    email: 'contact@abc.com',
    address: '123 Fabric Street',
    status: 'active',
    billReceiveType: 'invoice',
    settleType: 'prepay',
    creditDays: null,
    notes: 'Premium supplier',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockPrismaService = {
    supplier: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    fabricSupplier: { count: jest.fn() },
    orderItem: { count: jest.fn() },
    supplierPayment: { count: jest.fn() },
    paymentRecord: { count: jest.fn() },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SupplierModule],
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
  // POST /api/v1/suppliers - Create Supplier
  // ============================================================
  describe('POST /api/v1/suppliers', () => {
    it('should create a supplier with valid data', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);
      mockPrismaService.supplier.create.mockResolvedValue(mockSupplier);

      const createDto = {
        companyName: 'ABC Textiles',
        contactName: 'John Doe',
        phone: '13800138000',
        email: 'contact@abc.com',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .send(createDto)
        .expect(201);

      const body = response.body as ApiSuccessResponse<SupplierData>;
      expect(body.code).toBe(201);
      expect(body.message).toBe('success');
      expect(body.data.companyName).toBe('ABC Textiles');
    });

    it('should return 400 for missing companyName', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .send({ contactName: 'John Doe' })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
      expect(body.message).toBeDefined();
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .send({
          companyName: 'Test Supplier',
          email: 'invalid-email',
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 400 for invalid status enum', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .send({
          companyName: 'Test Supplier',
          status: 'invalid_status',
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 409 for duplicate companyName', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      const response = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .send({ companyName: 'ABC Textiles' })
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(409);
      expect(body.message).toContain('already exists');
    });
  });

  // ============================================================
  // GET /api/v1/suppliers/:id - Get Supplier by ID
  // ============================================================
  describe('GET /api/v1/suppliers/:id', () => {
    it('should return a supplier when found', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers/1')
        .expect(200);

      const body = response.body as ApiSuccessResponse<SupplierData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.id).toBe(1);
      expect(body.data.companyName).toBe('ABC Textiles');
    });

    it('should return 404 when supplier not found', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers/999')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
      expect(body.message).toContain('not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers/invalid')
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });
  });

  // ============================================================
  // GET /api/v1/suppliers - List Suppliers
  // ============================================================
  describe('GET /api/v1/suppliers', () => {
    it('should return paginated suppliers', async () => {
      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedSupplierData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.items).toHaveLength(1);
      expect(body.data.pagination).toBeDefined();
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should filter by companyName', async () => {
      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/suppliers?companyName=ABC')
        .expect(200);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            companyName: { contains: 'ABC' },
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/suppliers?status=active')
        .expect(200);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            status: 'active',
          }),
        }),
      );
    });

    it('should support custom pagination', async () => {
      mockPrismaService.supplier.findMany.mockResolvedValue([]);
      mockPrismaService.supplier.count.mockResolvedValue(50);

      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers?page=2&pageSize=10')
        .expect(200);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      const body = response.body as ApiSuccessResponse<PaginatedSupplierData>;
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.pageSize).toBe(10);
    });

    it('should default to isActive=true when not specified', async () => {
      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
      mockPrismaService.supplier.count.mockResolvedValue(1);

      await request(app.getHttpServer()).get('/api/v1/suppliers').expect(200);

      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should return empty list when no matches', async () => {
      mockPrismaService.supplier.findMany.mockResolvedValue([]);
      mockPrismaService.supplier.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers?companyName=NonExistent')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedSupplierData>;
      expect(body.data.items).toEqual([]);
      expect(body.data.pagination.total).toBe(0);
    });
  });

  // ============================================================
  // PATCH /api/v1/suppliers/:id - Update Supplier
  // ============================================================
  describe('PATCH /api/v1/suppliers/:id', () => {
    it('should update a supplier successfully', async () => {
      const updatedSupplier = { ...mockSupplier, contactName: 'Jane Doe' };
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrismaService.supplier.update.mockResolvedValue(updatedSupplier);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/suppliers/1')
        .send({ contactName: 'Jane Doe' })
        .expect(200);

      const body = response.body as ApiSuccessResponse<SupplierData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.contactName).toBe('Jane Doe');
    });

    it('should return 404 when supplier not found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/suppliers/999')
        .send({ contactName: 'Jane Doe' })
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });

    it('should return 409 for companyName conflict', async () => {
      const anotherSupplier = { ...mockSupplier, id: 2 };
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrismaService.supplier.findFirst.mockResolvedValue(anotherSupplier);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/suppliers/1')
        .send({ companyName: 'XYZ Fabrics' })
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(409);
      expect(body.message).toContain('already exists');
    });

    it('should return 400 for invalid email format', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/suppliers/1')
        .send({ email: 'invalid-email' })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });
  });

  // ============================================================
  // DELETE /api/v1/suppliers/:id - Delete Supplier
  // ============================================================
  describe('DELETE /api/v1/suppliers/:id', () => {
    it('should physically delete a supplier with no relations', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(0);
      mockPrismaService.orderItem.count.mockResolvedValue(0);
      mockPrismaService.supplierPayment.count.mockResolvedValue(0);
      mockPrismaService.paymentRecord.count.mockResolvedValue(0);
      mockPrismaService.supplier.delete.mockResolvedValue(mockSupplier);

      await request(app.getHttpServer())
        .delete('/api/v1/suppliers/1')
        .expect(204);

      expect(mockPrismaService.supplier.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return 404 when supplier not found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/suppliers/999')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });

    it('should return 409 when supplier has relations and force=false', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(2);
      mockPrismaService.orderItem.count.mockResolvedValue(5);
      mockPrismaService.supplierPayment.count.mockResolvedValue(0);
      mockPrismaService.paymentRecord.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/suppliers/1')
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(409);
      expect(body.message).toContain('Related data exists');
      expect(body.message).toContain('force=true');
    });

    it('should soft delete when force=true and has relations', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrismaService.fabricSupplier.count.mockResolvedValue(2);
      mockPrismaService.orderItem.count.mockResolvedValue(0);
      mockPrismaService.supplierPayment.count.mockResolvedValue(0);
      mockPrismaService.paymentRecord.count.mockResolvedValue(0);
      mockPrismaService.supplier.update.mockResolvedValue({
        ...mockSupplier,
        isActive: false,
      });

      await request(app.getHttpServer())
        .delete('/api/v1/suppliers/1?force=true')
        .expect(204);

      expect(mockPrismaService.supplier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(mockPrismaService.supplier.delete).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // DTO Validation Boundary Tests
  // ============================================================
  describe('DTO Validation Boundaries', () => {
    describe('sortBy validation', () => {
      it('should reject invalid sortBy field', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/suppliers?sortBy=invalidField')
          .expect(400);

        const body = response.body as ApiErrorResponse;
        expect(body.code).toBe(400);
        expect(body.message).toBeDefined();
      });

      it('should accept valid sortBy field (companyName)', async () => {
        mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
        mockPrismaService.supplier.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/suppliers?sortBy=companyName')
          .expect(200);
      });

      it('should accept valid sortBy field (updatedAt)', async () => {
        mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
        mockPrismaService.supplier.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/suppliers?sortBy=updatedAt')
          .expect(200);
      });
    });

    describe('sortOrder validation', () => {
      it('should reject invalid sortOrder value', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/suppliers?sortOrder=invalid')
          .expect(400);

        const body = response.body as ApiErrorResponse;
        expect(body.code).toBe(400);
        expect(body.message).toBeDefined();
      });

      it('should accept valid sortOrder (asc)', async () => {
        mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
        mockPrismaService.supplier.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/suppliers?sortOrder=asc')
          .expect(200);
      });

      it('should accept valid sortOrder (desc)', async () => {
        mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
        mockPrismaService.supplier.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/api/v1/suppliers?sortOrder=desc')
          .expect(200);
      });
    });

    describe('companyName length validation', () => {
      it('should reject companyName exceeding 200 characters', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/suppliers')
          .send({ companyName: 'A'.repeat(201) })
          .expect(400);

        const body = response.body as ApiErrorResponse;
        expect(body.code).toBe(400);
        expect(body.message).toBeDefined();
      });

      it('should accept companyName at exactly 200 characters', async () => {
        const companyName = 'A'.repeat(200);
        const createdSupplier = { ...mockSupplier, companyName };
        mockPrismaService.supplier.findFirst.mockResolvedValue(null);
        mockPrismaService.supplier.create.mockResolvedValue(createdSupplier);

        const response = await request(app.getHttpServer())
          .post('/api/v1/suppliers')
          .send({ companyName })
          .expect(201);

        const body = response.body as ApiSuccessResponse<SupplierData>;
        expect(body.code).toBe(201);
      });
    });
  });

  // ============================================================
  // Response Format Validation
  // ============================================================
  describe('Response Format', () => {
    it('should wrap successful response with code, message, and data', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers/1')
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('message', 'success');
      expect(response.body).toHaveProperty('data');
    });

    it('should wrap error response with code, message, path, and timestamp', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers/999')
        .expect(404);

      expect(response.body).toHaveProperty('code', 404);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
