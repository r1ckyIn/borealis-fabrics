/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { OrderModule } from '../src/order/order.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockCls } from './helpers/mock-builders';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CodeGeneratorService, RedisService } from '../src/common/services';
import {
  OrderItemStatus,
  CustomerPayStatus,
  PaymentMethod,
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
  prevStatus?: string | null;
  deliveryDate: string | null;
  notes: string | null;
  fabric?: {
    id: number;
    fabricCode: string;
    name: string;
    composition: string;
  };
  supplier?: {
    id: number;
    companyName: string;
    contactName: string;
    phone: string;
  } | null;
}

interface OrderData {
  id: number;
  orderCode: string;
  customerId: number;
  status: string;
  totalAmount: number;
  customerPaid: number;
  customerPayStatus: string;
  customerPayMethod?: string | null;
  customerCreditDays?: number | null;
  customerPaidAt?: string | null;
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

interface TimelineData {
  id: number;
  orderItemId: number;
  fromStatus: string | null;
  toStatus: string;
  remark: string | null;
  createdAt: string;
  orderItem?: {
    id: number;
    fabric: {
      id: number;
      fabricCode: string;
      name: string;
    };
  };
  operator?: {
    id: number;
    name: string;
    avatar: string | null;
  } | null;
}

interface SupplierPaymentData {
  id: number;
  orderId: number;
  supplierId: number;
  payable: number;
  paid: number;
  payStatus: string;
  payMethod?: string | null;
  creditDays?: number | null;
  paidAt?: string | null;
  supplier?: {
    id: number;
    companyName: string;
    contactName: string;
    phone: string;
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

  // Additional mock data for extended tests
  const mockOrderedItem = {
    ...mockOrderItem,
    id: 2,
    status: OrderItemStatus.ORDERED,
    prevStatus: OrderItemStatus.PENDING,
  };

  const mockCancelledItem = {
    ...mockOrderItem,
    id: 4,
    status: OrderItemStatus.CANCELLED,
    prevStatus: OrderItemStatus.INQUIRY,
  };

  const mockTimeline = {
    id: 1,
    orderItemId: 1,
    fromStatus: null,
    toStatus: OrderItemStatus.INQUIRY,
    remark: 'Order created',
    createdAt: new Date('2026-01-01'),
    operatorId: null,
    orderItem: {
      id: 1,
      fabric: {
        id: 1,
        fabricCode: 'BF-2601-0001',
        name: 'Cotton White',
      },
    },
    operator: null,
  };

  const mockSupplierPayment = {
    id: 1,
    orderId: 1,
    supplierId: 1,
    payable: 2500.0,
    paid: 0,
    payStatus: CustomerPayStatus.UNPAID,
    payMethod: null,
    creditDays: null,
    paidAt: null,
    supplier: mockSupplier,
  };

  const mockOrderWithOrderedStatus = {
    ...mockOrder,
    status: OrderItemStatus.ORDERED,
    items: [mockOrderedItem],
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
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      aggregate: jest.Mock;
    };
    orderTimeline: {
      create: jest.Mock;
      findMany: jest.Mock;
      createMany: jest.Mock;
    };
    supplierPayment: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    customer: { findFirst: jest.Mock; findMany: jest.Mock };
    fabric: { findFirst: jest.Mock; findMany: jest.Mock };
    supplier: { findFirst: jest.Mock; findMany: jest.Mock };
    quote: { findUnique: jest.Mock; findMany: jest.Mock };
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
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
    },
    orderTimeline: {
      create: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    supplierPayment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    fabric: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    supplier: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    quote: {
      findUnique: jest.fn(),
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
    app.useGlobalFilters(new AllExceptionsFilter(createMockCls()));
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

  // ============================================================
  // Order Items CRUD Tests (3.2.6 - 3.2.9)
  // ============================================================

  describe('GET /api/v1/orders/:id/items (3.2.6)', () => {
    it('should return all items for an order (200)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.orderItem.findMany.mockResolvedValue([mockOrderItem]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/items')
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderItemData[]>;
      expect(body.code).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].fabricId).toBe(1);
    });

    it('should return 404 when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/999/items')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return empty array when order has no items', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        items: [],
      });
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/items')
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderItemData[]>;
      expect(body.data).toHaveLength(0);
    });
  });

  describe('POST /api/v1/orders/:id/items (3.2.7)', () => {
    const addItemDto = {
      fabricId: 1,
      supplierId: 1,
      quantity: 50,
      salePrice: 40.0,
      purchasePrice: 30.0,
      notes: 'New item',
    };

    it('should add a new item to an order (201)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      const newItem = {
        ...mockOrderItem,
        id: 2,
        quantity: 50,
        salePrice: 40.0,
        purchasePrice: 30.0,
        subtotal: 2000.0,
        notes: 'New item',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            create: jest.fn().mockResolvedValue(newItem),
            findMany: jest.fn().mockResolvedValue([newItem]),
            aggregate: jest
              .fn()
              .mockResolvedValue({ _sum: { subtotal: 2000 } }),
          },
          orderTimeline: {
            ...mockPrismaService.orderTimeline,
            create: jest.fn().mockResolvedValue({}),
          },
          supplierPayment: {
            ...mockPrismaService.supplierPayment,
            upsert: jest.fn().mockResolvedValue({}),
            findUnique: jest.fn().mockResolvedValue(null),
            delete: jest.fn().mockResolvedValue({}),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items')
        .send(addItemDto)
        .expect(201);

      const body = response.body as ApiSuccessResponse<OrderItemData>;
      expect(body.code).toBe(201);
      expect(body.data.quantity).toBe(50);
    });

    it('should return 404 when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/999/items')
        .send(addItemDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when fabric not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items')
        .send(addItemDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when supplier not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items')
        .send(addItemDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when order status does not allow adding items', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(
        mockOrderWithOrderedStatus,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items')
        .send(addItemDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when quantity is invalid', async () => {
      const invalidDto = { ...addItemDto, quantity: 0 };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items')
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when salePrice is negative', async () => {
      const invalidDto = { ...addItemDto, salePrice: -10 };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items')
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should create item without supplierId', async () => {
      const dtoWithoutSupplier = {
        fabricId: 1,
        quantity: 50,
        salePrice: 40.0,
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const newItem = {
        ...mockOrderItem,
        id: 2,
        supplierId: null,
        supplier: null,
        quantity: 50,
        salePrice: 40.0,
        subtotal: 2000.0,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            create: jest.fn().mockResolvedValue(newItem),
            findMany: jest.fn().mockResolvedValue([newItem]),
            aggregate: jest
              .fn()
              .mockResolvedValue({ _sum: { subtotal: 2000 } }),
          },
          orderTimeline: {
            ...mockPrismaService.orderTimeline,
            create: jest.fn().mockResolvedValue({}),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items')
        .send(dtoWithoutSupplier)
        .expect(201);

      const body = response.body as ApiSuccessResponse<OrderItemData>;
      expect(body.code).toBe(201);
    });

    it('should validate quoteId if provided', async () => {
      const dtoWithQuote = { ...addItemDto, quoteId: 999 };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items')
        .send(dtoWithQuote)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/v1/orders/:id/items/:itemId (3.2.8)', () => {
    const updateItemDto = {
      quantity: 200,
      salePrice: 38.0,
      notes: 'Updated notes',
    };

    it('should update an order item (200)', async () => {
      const updatedItem = {
        ...mockOrderItem,
        quantity: 200,
        salePrice: 38.0,
        subtotal: 7600.0,
        notes: 'Updated notes',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
            update: jest.fn().mockResolvedValue(updatedItem),
            aggregate: jest
              .fn()
              .mockResolvedValue({ _sum: { subtotal: 7600 } }),
            findMany: jest.fn().mockResolvedValue([updatedItem]),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1')
        .send(updateItemDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderItemData>;
      expect(body.code).toBe(200);
      expect(body.data.quantity).toBe(200);
    });

    it('should return 404 when item not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/999')
        .send(updateItemDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when item status does not allow modification', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderedItem),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/2')
        .send(updateItemDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Cannot modify');
    });

    it('should return 404 when new supplier not found', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1')
        .send({ supplierId: 999 })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when new quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1')
        .send({ quoteId: 999 })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should allow partial updates', async () => {
      const partialDto = { notes: 'Only notes updated' };
      const updatedItem = { ...mockOrderItem, notes: 'Only notes updated' };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
            update: jest.fn().mockResolvedValue(updatedItem),
            aggregate: jest
              .fn()
              .mockResolvedValue({ _sum: { subtotal: 3550 } }),
            findMany: jest.fn().mockResolvedValue([updatedItem]),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1')
        .send(partialDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderItemData>;
      expect(body.data.notes).toBe('Only notes updated');
    });

    it('should update supplier payment when supplierId changes', async () => {
      const updateWithSupplier = { supplierId: 2 };
      const newSupplier = { ...mockSupplier, id: 2 };
      const updatedItem = { ...mockOrderItem, supplierId: 2 };

      mockPrismaService.supplier.findFirst.mockResolvedValue(newSupplier);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const upsertMock = jest.fn().mockResolvedValue({});
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
            update: jest.fn().mockResolvedValue(updatedItem),
            aggregate: jest
              .fn()
              .mockResolvedValue({ _sum: { subtotal: 3550 } }),
            findMany: jest.fn().mockResolvedValue([updatedItem]),
          },
          supplierPayment: {
            ...mockPrismaService.supplierPayment,
            upsert: upsertMock,
            findUnique: jest.fn().mockResolvedValue(null),
            delete: jest.fn().mockResolvedValue({}),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1')
        .send(updateWithSupplier)
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
    });
  });

  describe('DELETE /api/v1/orders/:id/items/:itemId (3.2.9)', () => {
    it('should delete an order item with INQUIRY status (204)', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            findMany: jest.fn().mockResolvedValue([]),
            aggregate: jest.fn().mockResolvedValue({ _sum: { subtotal: 0 } }),
          },
          supplierPayment: {
            ...mockPrismaService.supplierPayment,
            deleteMany: jest.fn().mockResolvedValue({}),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await request(app.getHttpServer())
        .delete('/api/v1/orders/1/items/1')
        .expect(204);
    });

    it('should return 404 when item not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/orders/1/items/999')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when item status does not allow deletion', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            findFirst: jest.fn().mockResolvedValue(mockOrderedItem),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/orders/1/items/2')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Cannot delete');
    });

    it('should delete PENDING item successfully', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            findMany: jest.fn().mockResolvedValue([]),
            aggregate: jest.fn().mockResolvedValue({ _sum: { subtotal: 0 } }),
          },
          supplierPayment: {
            ...mockPrismaService.supplierPayment,
            deleteMany: jest.fn().mockResolvedValue({}),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await request(app.getHttpServer())
        .delete('/api/v1/orders/1/items/3')
        .expect(204);
    });
  });

  // ============================================================
  // Status Management Tests (3.2.10 - 3.2.12)
  // ============================================================

  describe('PATCH /api/v1/orders/:id/items/:itemId/status (3.2.10)', () => {
    it('should update item status from INQUIRY to PENDING (200)', async () => {
      const updatedItem = {
        ...mockOrderItem,
        status: OrderItemStatus.PENDING,
        prevStatus: OrderItemStatus.INQUIRY,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
            update: jest.fn().mockResolvedValue(updatedItem),
            findMany: jest.fn().mockResolvedValue([updatedItem]),
          },
          orderTimeline: {
            ...mockPrismaService.orderTimeline,
            create: jest.fn().mockResolvedValue({}),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1/status')
        .send({ status: OrderItemStatus.PENDING })
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderItemData>;
      expect(body.code).toBe(200);
      expect(body.data.status).toBe(OrderItemStatus.PENDING);
    });

    it('should return 404 when item not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/999/status')
        .send({ status: OrderItemStatus.PENDING })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid status transition', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1/status')
        .send({ status: OrderItemStatus.SHIPPED })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid status transition');
    });

    it('should include remark in timeline if provided', async () => {
      const timelineCreateMock = jest.fn().mockResolvedValue({});
      const updatedItem = {
        ...mockOrderItem,
        status: OrderItemStatus.PENDING,
        prevStatus: OrderItemStatus.INQUIRY,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
            update: jest.fn().mockResolvedValue(updatedItem),
            findMany: jest.fn().mockResolvedValue([updatedItem]),
          },
          orderTimeline: {
            ...mockPrismaService.orderTimeline,
            create: timelineCreateMock,
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1/status')
        .send({
          status: OrderItemStatus.PENDING,
          remark: 'Customer confirmed order',
        })
        .expect(200);

      expect(timelineCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            remark: 'Customer confirmed order',
          }),
        }),
      );
    });

    it('should return 400 for invalid status value', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1/status')
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should update aggregate order status after item status change', async () => {
      const orderUpdateMock = jest.fn().mockResolvedValue({});
      const updatedItem = {
        ...mockOrderItem,
        status: OrderItemStatus.PENDING,
        prevStatus: OrderItemStatus.INQUIRY,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
            update: jest.fn().mockResolvedValue(updatedItem),
            findMany: jest.fn().mockResolvedValue([updatedItem]),
          },
          orderTimeline: {
            ...mockPrismaService.orderTimeline,
            create: jest.fn().mockResolvedValue({}),
          },
          order: {
            ...mockPrismaService.order,
            update: orderUpdateMock,
          },
        };
        return callback(tx);
      });

      await request(app.getHttpServer())
        .patch('/api/v1/orders/1/items/1/status')
        .send({ status: OrderItemStatus.PENDING })
        .expect(200);

      expect(orderUpdateMock).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/orders/:id/items/:itemId/cancel (3.2.11)', () => {
    it('should cancel an order item (201)', async () => {
      const cancelledItem = {
        ...mockOrderItem,
        status: OrderItemStatus.CANCELLED,
        prevStatus: OrderItemStatus.INQUIRY,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
            update: jest.fn().mockResolvedValue(cancelledItem),
            findMany: jest.fn().mockResolvedValue([cancelledItem]),
          },
          orderTimeline: {
            ...mockPrismaService.orderTimeline,
            create: jest.fn().mockResolvedValue({}),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items/1/cancel')
        .send({ reason: 'Customer changed mind' })
        .expect(201);

      const body = response.body as ApiSuccessResponse<OrderItemData>;
      expect(body.code).toBe(201);
      expect(body.data.status).toBe(OrderItemStatus.CANCELLED);
    });

    it('should return 404 when item not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items/999/cancel')
        .send({})
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when item is already cancelled', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockCancelledItem),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items/4/cancel')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already cancelled');
    });

    it('should record cancellation reason in timeline', async () => {
      const timelineCreateMock = jest.fn().mockResolvedValue({});
      const cancelledItem = {
        ...mockOrderItem,
        status: OrderItemStatus.CANCELLED,
        prevStatus: OrderItemStatus.INQUIRY,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
            update: jest.fn().mockResolvedValue(cancelledItem),
            findMany: jest.fn().mockResolvedValue([cancelledItem]),
          },
          orderTimeline: {
            ...mockPrismaService.orderTimeline,
            create: timelineCreateMock,
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await request(app.getHttpServer())
        .post('/api/v1/orders/1/items/1/cancel')
        .send({ reason: 'Out of stock' })
        .expect(201);

      expect(timelineCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            remark: 'Out of stock',
          }),
        }),
      );
    });
  });

  describe('POST /api/v1/orders/:id/items/:itemId/restore (3.2.12)', () => {
    it('should restore a cancelled item (201)', async () => {
      const restoredItem = {
        ...mockCancelledItem,
        status: OrderItemStatus.INQUIRY,
        prevStatus: null,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockCancelledItem),
            update: jest.fn().mockResolvedValue(restoredItem),
            findMany: jest.fn().mockResolvedValue([restoredItem]),
          },
          orderTimeline: {
            ...mockPrismaService.orderTimeline,
            create: jest.fn().mockResolvedValue({}),
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items/4/restore')
        .send({ reason: 'Customer wants to continue' })
        .expect(201);

      const body = response.body as ApiSuccessResponse<OrderItemData>;
      expect(body.code).toBe(201);
      expect(body.data.status).toBe(OrderItemStatus.INQUIRY);
    });

    it('should return 404 when item not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items/999/restore')
        .send({})
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when item is not cancelled', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockOrderItem),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items/1/restore')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Only cancelled items');
    });

    it('should return 400 when no previous status recorded', async () => {
      const cancelledWithoutPrev = {
        ...mockCancelledItem,
        prevStatus: null,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(cancelledWithoutPrev),
          },
        };
        return callback(tx);
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/1/items/4/restore')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('no previous status');
    });

    it('should record restore reason in timeline', async () => {
      const timelineCreateMock = jest.fn().mockResolvedValue({});
      const restoredItem = {
        ...mockCancelledItem,
        status: OrderItemStatus.INQUIRY,
        prevStatus: null,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          orderItem: {
            ...mockPrismaService.orderItem,
            findFirst: jest.fn().mockResolvedValue(mockCancelledItem),
            update: jest.fn().mockResolvedValue(restoredItem),
            findMany: jest.fn().mockResolvedValue([restoredItem]),
          },
          orderTimeline: {
            ...mockPrismaService.orderTimeline,
            create: timelineCreateMock,
          },
          order: {
            ...mockPrismaService.order,
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await request(app.getHttpServer())
        .post('/api/v1/orders/1/items/4/restore')
        .send({ reason: 'Supplier found stock' })
        .expect(201);

      expect(timelineCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            remark: 'Supplier found stock',
          }),
        }),
      );
    });
  });

  // ============================================================
  // Timeline Tests (3.2.13 - 3.2.14)
  // ============================================================

  describe('GET /api/v1/orders/:id/timeline (3.2.13)', () => {
    it('should return order timeline (200)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.orderTimeline.findMany.mockResolvedValue([
        mockTimeline,
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/timeline')
        .expect(200);

      const body = response.body as ApiSuccessResponse<TimelineData[]>;
      expect(body.code).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].toStatus).toBe(OrderItemStatus.INQUIRY);
    });

    it('should return 404 when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/999/timeline')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return empty array when no timeline entries', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.orderTimeline.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/timeline')
        .expect(200);

      const body = response.body as ApiSuccessResponse<TimelineData[]>;
      expect(body.data).toHaveLength(0);
    });

    it('should include item and operator info in timeline', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.orderTimeline.findMany.mockResolvedValue([
        mockTimeline,
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/timeline')
        .expect(200);

      const body = response.body as ApiSuccessResponse<TimelineData[]>;
      expect(body.data[0]).toHaveProperty('orderItem');
    });
  });

  describe('GET /api/v1/orders/:id/items/:itemId/timeline (3.2.14)', () => {
    it('should return item timeline (200)', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      mockPrismaService.orderTimeline.findMany.mockResolvedValue([
        mockTimeline,
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/items/1/timeline')
        .expect(200);

      const body = response.body as ApiSuccessResponse<TimelineData[]>;
      expect(body.code).toBe(200);
      expect(body.data).toHaveLength(1);
    });

    it('should return 404 when item not found', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/items/999/timeline')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return empty array when no timeline entries for item', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      mockPrismaService.orderTimeline.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/items/1/timeline')
        .expect(200);

      const body = response.body as ApiSuccessResponse<TimelineData[]>;
      expect(body.data).toHaveLength(0);
    });

    it('should return only timeline entries for specific item', async () => {
      const itemTimelines = [
        mockTimeline,
        {
          ...mockTimeline,
          id: 2,
          fromStatus: OrderItemStatus.INQUIRY,
          toStatus: OrderItemStatus.PENDING,
        },
      ];
      mockPrismaService.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      mockPrismaService.orderTimeline.findMany.mockResolvedValue(itemTimelines);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/items/1/timeline')
        .expect(200);

      const body = response.body as ApiSuccessResponse<TimelineData[]>;
      expect(body.data).toHaveLength(2);
    });
  });

  // ============================================================
  // Payment Tests (3.2.15 - 3.2.17)
  // ============================================================

  describe('PATCH /api/v1/orders/:id/customer-payment (3.2.15)', () => {
    const customerPaymentDto = {
      customerPaid: 1000,
      customerPayStatus: CustomerPayStatus.PARTIAL,
      customerPayMethod: PaymentMethod.BANK,
    };

    it('should update customer payment (200)', async () => {
      const updatedOrder = {
        ...mockOrder,
        customerPaid: 1000,
        customerPayStatus: CustomerPayStatus.PARTIAL,
        customerPayMethod: PaymentMethod.BANK,
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/customer-payment')
        .send(customerPaymentDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderData>;
      expect(body.code).toBe(200);
      expect(body.data.customerPaid).toBe(1000);
      expect(body.data.customerPayStatus).toBe(CustomerPayStatus.PARTIAL);
    });

    it('should return 404 when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/999/customer-payment')
        .send(customerPaymentDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should update only paid amount', async () => {
      const partialDto = { customerPaid: 500 };
      const updatedOrder = { ...mockOrder, customerPaid: 500 };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/customer-payment')
        .send(partialDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<OrderData>;
      expect(body.data.customerPaid).toBe(500);
    });

    it('should update credit days', async () => {
      const creditDto = { customerCreditDays: 30 };
      const updatedOrder = { ...mockOrder, customerCreditDays: 30 };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/customer-payment')
        .send(creditDto)
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
    });

    it('should return 400 for invalid payment status', async () => {
      const invalidDto = { customerPayStatus: 'INVALID' };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/customer-payment')
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for negative paid amount', async () => {
      const invalidDto = { customerPaid: -100 };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/customer-payment')
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/orders/:id/supplier-payments (3.2.16)', () => {
    it('should return supplier payments (200)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplierPayment.findMany.mockResolvedValue([
        mockSupplierPayment,
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/supplier-payments')
        .expect(200);

      const body = response.body as ApiSuccessResponse<SupplierPaymentData[]>;
      expect(body.code).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].supplierId).toBe(1);
    });

    it('should return 404 when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/999/supplier-payments')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return empty array when no supplier payments', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplierPayment.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/1/supplier-payments')
        .expect(200);

      const body = response.body as ApiSuccessResponse<SupplierPaymentData[]>;
      expect(body.data).toHaveLength(0);
    });
  });

  describe('PATCH /api/v1/orders/:id/supplier-payments/:supplierId (3.2.17)', () => {
    const supplierPaymentDto = {
      paid: 500,
      payStatus: CustomerPayStatus.PARTIAL,
      payMethod: PaymentMethod.BANK,
    };

    it('should update existing supplier payment (200)', async () => {
      const updatedPayment = {
        ...mockSupplierPayment,
        paid: 500,
        payStatus: CustomerPayStatus.PARTIAL,
        payMethod: PaymentMethod.BANK,
      };

      // New implementation uses upsert for atomic operation
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      mockPrismaService.supplierPayment.upsert.mockResolvedValue(
        updatedPayment,
      );

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/supplier-payments/1')
        .send(supplierPaymentDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<SupplierPaymentData>;
      expect(body.code).toBe(200);
      expect(body.data.paid).toBe(500);
    });

    it('should create new supplier payment if not exists (200)', async () => {
      const newPayment = {
        id: 2,
        orderId: 1,
        supplierId: 2,
        payable: 0,
        paid: 500,
        payStatus: CustomerPayStatus.PARTIAL,
        payMethod: PaymentMethod.BANK,
        creditDays: null,
        paidAt: null,
        supplier: { ...mockSupplier, id: 2 },
      };

      // New implementation uses upsert for atomic operation
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplier.findFirst.mockResolvedValue({
        ...mockSupplier,
        id: 2,
      });
      mockPrismaService.supplierPayment.upsert.mockResolvedValue(newPayment);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/supplier-payments/2')
        .send(supplierPaymentDto)
        .expect(200);

      const body = response.body as ApiSuccessResponse<SupplierPaymentData>;
      expect(body.code).toBe(200);
    });

    it('should return 404 when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/999/supplier-payments/1')
        .send(supplierPaymentDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when supplier not found', async () => {
      // New implementation always validates supplier existence
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/supplier-payments/999')
        .send(supplierPaymentDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should update credit days', async () => {
      const creditDto = { creditDays: 45 };
      const updatedPayment = { ...mockSupplierPayment, creditDays: 45 };

      // New implementation uses upsert for atomic operation
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      mockPrismaService.supplierPayment.upsert.mockResolvedValue(
        updatedPayment,
      );

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/supplier-payments/1')
        .send(creditDto)
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
    });

    it('should return 400 for negative paid amount', async () => {
      const invalidDto = { paid: -100 };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/orders/1/supplier-payments/1')
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });
});
