/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { OrderModule } from '../src/order/order.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CodeGeneratorService, RedisService } from '../src/common/services';
import {
  OrderItemStatus,
  CustomerPayStatus,
} from '../src/order/enums/order-status.enum';

// Response type definitions for type safety
interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface OrderItemData {
  id: number;
  fabricId: number;
  supplierId: number | null;
  quoteId: number | null;
  quantity: number;
  salePrice: number;
  purchasePrice: number | null;
  subtotal: number;
  status: string;
  deliveryDate: string | null;
  notes: string | null;
}

interface OrderData {
  id: number;
  orderCode: string;
  customerId: number;
  status: string;
  totalAmount: number;
  customerPaid: number;
  customerPayStatus: string;
  deliveryAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItemData[];
  customer?: {
    id: number;
    companyName: string;
    contactName: string;
    phone: string;
  };
}

interface PaginatedOrderData {
  items: OrderData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

describe('OrderController (e2e)', () => {
  let app: INestApplication<App>;

  // Mock data
  const mockCustomer = {
    id: 1,
    companyName: 'Test Customer',
    contactName: 'John Doe',
    phone: '13800138000',
    email: 'test@example.com',
    isActive: true,
  };

  const mockFabric = {
    id: 1,
    fabricCode: 'BF-2601-0001',
    name: 'Cotton White',
    composition: '100% Cotton',
    isActive: true,
  };

  const mockSupplier = {
    id: 1,
    companyName: 'Test Supplier',
    contactName: 'Supplier Contact',
    phone: '13900139000',
    isActive: true,
  };

  const mockQuote = {
    id: 1,
    quoteCode: 'QT-2601-0001',
  };

  const mockOrderItem = {
    id: 1,
    orderId: 1,
    fabricId: 1,
    supplierId: 1,
    quoteId: 1,
    quantity: 100,
    salePrice: 35.5,
    purchasePrice: 25.0,
    subtotal: 3550.0,
    status: OrderItemStatus.INQUIRY,
    deliveryDate: null,
    notes: 'Item notes',
    fabric: mockFabric,
    supplier: mockSupplier,
    quote: mockQuote,
    timelines: [],
  };

  const mockOrder = {
    id: 1,
    orderCode: 'ORD-2601-0001',
    customerId: 1,
    status: OrderItemStatus.INQUIRY,
    totalAmount: 3550.0,
    customerPaid: 0,
    customerPayStatus: CustomerPayStatus.UNPAID,
    deliveryAddress: 'Test Address',
    notes: 'Test notes',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    items: [mockOrderItem],
    customer: mockCustomer,
    supplierPayments: [],
  };

  // Mock Prisma service type
  interface MockOrderMethods {
    create: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  }

  interface MockPrismaServiceType {
    order: MockOrderMethods;
    orderItem: {
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
    orderTimeline: {
      createMany: jest.Mock;
    };
    customer: { findFirst: jest.Mock; findMany: jest.Mock };
    fabric: { findMany: jest.Mock };
    supplier: { findMany: jest.Mock };
    quote: { findMany: jest.Mock };
    $transaction: jest.Mock;
  }

  const mockPrismaService: MockPrismaServiceType = {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    orderTimeline: {
      createMany: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    fabric: {
      findMany: jest.fn(),
    },
    supplier: {
      findMany: jest.fn(),
    },
    quote: {
      findMany: jest.fn(),
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
      imports: [OrderModule],
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
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/orders', () => {
    const createDto = {
      customerId: 1,
      items: [
        {
          fabricId: 1,
          supplierId: 1,
          quoteId: 1,
          quantity: 100,
          salePrice: 35.5,
          purchasePrice: 25.0,
          notes: 'Item notes',
        },
      ],
      deliveryAddress: 'Test Address',
      notes: 'Test notes',
    };

    it('should create a new order (201)', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2601-0001');
      mockPrismaService.order.create.mockResolvedValue(mockOrder);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send(createDto)
        .expect(201);

      const body = response.body as ApiSuccessResponse<OrderData>;
      expect(body.code).toBe(201);
      expect(body.data.orderCode).toBe('ORD-2601-0001');
      expect(body.data.customerId).toBe(1);
      expect(body.data.status).toBe(OrderItemStatus.INQUIRY);
    });

    it('should return 400 when items array is empty', async () => {
      const invalidDto = {
        customerId: 1,
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send(createDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send(createDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/orders', () => {
    it('should return paginated orders list (200)', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);
      mockPrismaService.order.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedOrderData>;
      expect(body.code).toBe(200);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should filter by customerId', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);
      mockPrismaService.order.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/orders?customerId=1')
        .expect(200);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 1 }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);
      mockPrismaService.order.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/orders?status=INQUIRY')
        .expect(200);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: OrderItemStatus.INQUIRY }),
        }),
      );
    });

    it('should search by keyword', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);
      mockPrismaService.order.count.mockResolvedValue(1);

      await request(app.getHttpServer())
        .get('/api/v1/orders?keyword=ORD-2601')
        .expect(200);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should return empty list when no orders', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .expect(200);

      const body = response.body as ApiSuccessResponse<PaginatedOrderData>;
      expect(body.data.items).toHaveLength(0);
      expect(body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('should return order detail (200)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1')
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderData>;
      expect(body.code).toBe(200);
      expect(body.data.id).toBe(1);
      expect(body.data.orderCode).toBe('ORD-2601-0001');
      expect(body.data.items).toHaveLength(1);
    });

    it('should return 404 when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/999')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/v1/orders/:id', () => {
    const updateDto = {
      deliveryAddress: 'New Address',
      notes: 'Updated notes',
    };

    it('should update order basic info (200)', async () => {
      const existingOrder = { ...mockOrder };
      const updatedOrder = {
        ...mockOrder,
        deliveryAddress: 'New Address',
        notes: 'Updated notes',
      };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1')
        .send(updateDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderData>;
      expect(body.code).toBe(200);
      expect(body.data.deliveryAddress).toBe('New Address');
      expect(body.data.notes).toBe('Updated notes');
    });

    it('should update customerId when provided', async () => {
      const existingOrder = { ...mockOrder };
      const newCustomer = { ...mockCustomer, id: 2 };
      const updatedOrder = { ...mockOrder, customerId: 2 };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.customer.findFirst.mockResolvedValue(newCustomer);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1')
        .send({ customerId: 2 })
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderData>;
      expect(body.code).toBe(200);
      expect(body.data.customerId).toBe(2);
    });

    it('should return 404 when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/999')
        .send(updateDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when new customer not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1')
        .send({ customerId: 999 })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/v1/orders/:id', () => {
    it('should delete order with INQUIRY status and no payments (204)', async () => {
      // Mock deleteMany returning count: 1 (success)
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 1 });

      await request(app.getHttpServer()).delete('/api/v1/orders/1').expect(204);

      expect(mockPrismaService.order.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: OrderItemStatus.INQUIRY,
          customerPaid: 0,
        },
      });
    });

    it('should return 404 when order not found', async () => {
      // deleteMany returns 0, findUnique returns null
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/orders/999')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when order status is not INQUIRY', async () => {
      // deleteMany returns 0 due to status mismatch
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 0 });
      const orderedOrder = {
        ...mockOrder,
        status: OrderItemStatus.ORDERED,
        customerPaid: 0,
        supplierPayments: [],
      };
      mockPrismaService.order.findUnique.mockResolvedValue(orderedOrder);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/orders/1')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 409 when order has customer payment records', async () => {
      // deleteMany returns 0 due to customerPaid > 0
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 0 });
      const orderWithPayment = {
        ...mockOrder,
        status: OrderItemStatus.INQUIRY,
        customerPaid: 1000,
        supplierPayments: [],
      };
      mockPrismaService.order.findUnique.mockResolvedValue(orderWithPayment);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/orders/1')
        .expect(409);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 409 when order has supplier payment with paid > 0', async () => {
      // deleteMany returns 0, then check supplier payments
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 0 });
      const orderWithSupplierPayment = {
        ...mockOrder,
        status: OrderItemStatus.INQUIRY,
        customerPaid: 0,
        supplierPayments: [{ id: 1, supplierId: 1, paid: 500 }],
      };
      mockPrismaService.order.findUnique.mockResolvedValue(
        orderWithSupplierPayment,
      );

      const response = await request(app.getHttpServer())
        .delete('/api/v1/orders/1')
        .expect(409);

      expect(response.body).toHaveProperty('message');
    });
  });
});
