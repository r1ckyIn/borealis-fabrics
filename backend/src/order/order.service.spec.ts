import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { CodeGeneratorService, CodePrefix } from '../common/services';
import {
  OrderItemStatus,
  CustomerPayStatus,
  isValidStatusTransition,
  canModifyItem,
  canDeleteItem,
  canCancelItem,
  canRestoreItem,
} from './enums/order-status.enum';

describe('OrderService', () => {
  let service: OrderService;
  let mockPrismaService: {
    order: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    orderItem: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      aggregate: jest.Mock;
    };
    orderTimeline: {
      create: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
    };
    supplierPayment: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      upsert: jest.Mock;
    };
    customer: { findFirst: jest.Mock; findMany: jest.Mock };
    fabric: { findFirst: jest.Mock; findMany: jest.Mock };
    supplier: { findFirst: jest.Mock; findMany: jest.Mock };
    quote: { findUnique: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockCodeGeneratorService: { generateCode: jest.Mock };

  // Test fixtures
  const mockCustomer = {
    id: 1,
    companyName: 'Test Customer',
    contactName: 'John Doe',
    isActive: true,
  };
  const mockFabric = {
    id: 1,
    fabricCode: 'BF-2601-0001',
    name: 'Cotton',
    isActive: true,
  };
  const mockSupplier = {
    id: 1,
    companyName: 'Test Supplier',
    isActive: true,
  };
  const mockQuote = {
    id: 1,
    quoteCode: 'QT-2601-0001',
  };

  const mockOrder = {
    id: 1,
    orderCode: 'ORD-2601-0001',
    customerId: 1,
    status: OrderItemStatus.INQUIRY,
    totalAmount: 3550.0,
    customerPaid: 0,
    customerPayStatus: 'unpaid',
    deliveryAddress: 'Test Address',
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 1,
        fabricId: 1,
        quantity: 100.0,
        salePrice: 35.5,
        subtotal: 3550.0,
        status: OrderItemStatus.INQUIRY,
      },
    ],
    customer: {
      id: 1,
      companyName: 'Test Customer',
      contactName: 'John Doe',
    },
  };

  beforeEach(async () => {
    mockPrismaService = {
      order: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      orderItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      orderTimeline: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      supplierPayment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      fabric: { findFirst: jest.fn(), findMany: jest.fn() },
      supplier: { findFirst: jest.fn(), findMany: jest.fn() },
      quote: { findUnique: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(
        <T>(callback: (tx: typeof mockPrismaService) => Promise<T>) =>
          callback(mockPrismaService),
      ),
    };

    mockCodeGeneratorService = {
      generateCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CodeGeneratorService, useValue: mockCodeGeneratorService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('create', () => {
    const createDto = {
      customerId: 1,
      deliveryAddress: 'Test Address',
      notes: 'Test notes',
      items: [
        {
          fabricId: 1,
          quantity: 100.0,
          salePrice: 35.5,
        },
      ],
    };

    it('should create an order successfully', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2601-0001');
      mockPrismaService.order.create.mockResolvedValue(mockOrder);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.create(createDto);

      expect(result).toEqual(mockOrder);
      expect(mockCodeGeneratorService.generateCode).toHaveBeenCalledWith(
        CodePrefix.ORDER,
      );
      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderCode: 'ORD-2601-0001',
          customerId: 1,
          status: OrderItemStatus.INQUIRY,
          totalAmount: 3550.0,
          deliveryAddress: 'Test Address',
          notes: 'Test notes',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Customer with ID 1 not found',
      );
    });

    it('should throw NotFoundException when customer is inactive', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when fabric not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([]);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Fabric not found: 1',
      );
    });

    it('should throw NotFoundException when some fabrics not found', async () => {
      const multiItemDto = {
        ...createDto,
        items: [
          { fabricId: 1, quantity: 100, salePrice: 35.5 },
          { fabricId: 2, quantity: 50, salePrice: 40.0 },
        ],
      };
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]); // Only fabric 1 found

      await expect(service.create(multiItemDto)).rejects.toThrow(
        'Fabric not found: 2',
      );
    });

    it('should throw NotFoundException when supplier not found', async () => {
      const dtoWithSupplier = {
        ...createDto,
        items: [
          {
            fabricId: 1,
            supplierId: 999,
            quantity: 100.0,
            salePrice: 35.5,
          },
        ],
      };
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.supplier.findMany.mockResolvedValue([]);

      await expect(service.create(dtoWithSupplier)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(dtoWithSupplier)).rejects.toThrow(
        'Supplier not found: 999',
      );
    });

    it('should throw NotFoundException when quote not found', async () => {
      const dtoWithQuote = {
        ...createDto,
        items: [
          {
            fabricId: 1,
            quoteId: 999,
            quantity: 100.0,
            salePrice: 35.5,
          },
        ],
      };
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.quote.findMany.mockResolvedValue([]);

      await expect(service.create(dtoWithQuote)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(dtoWithQuote)).rejects.toThrow(
        'Quote not found: 999',
      );
    });

    it('should create order with supplier and quote successfully', async () => {
      const dtoWithRefs = {
        ...createDto,
        items: [
          {
            fabricId: 1,
            supplierId: 1,
            quoteId: 1,
            quantity: 100.0,
            salePrice: 35.5,
            purchasePrice: 25.0,
          },
        ],
      };
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.supplier.findMany.mockResolvedValue([mockSupplier]);
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2601-0001');
      mockPrismaService.order.create.mockResolvedValue(mockOrder);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.create(dtoWithRefs);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1] }, isActive: true },
        select: { id: true },
      });
      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1] } },
        select: { id: true },
      });
    });

    it('should calculate totalAmount correctly with multiple items', async () => {
      const multiItemDto = {
        ...createDto,
        items: [
          { fabricId: 1, quantity: 100, salePrice: 35.5 }, // 3550
          { fabricId: 1, quantity: 50, salePrice: 40.0 }, // 2000
        ],
      };
      const multiItemOrder = {
        ...mockOrder,
        totalAmount: 5550.0,
        items: [
          {
            id: 1,
            fabricId: 1,
            quantity: 100,
            salePrice: 35.5,
            subtotal: 3550,
          },
          { id: 2, fabricId: 1, quantity: 50, salePrice: 40, subtotal: 2000 },
        ],
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2601-0001');
      mockPrismaService.order.create.mockResolvedValue(multiItemOrder);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.create(multiItemDto);

      expect(result.totalAmount).toBe(5550.0);
      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalAmount: 5550.0,
        }),
        include: expect.any(Object),
      });
    });

    it('should retry on order code conflict', async () => {
      const error = { code: 'P2002' };
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockCodeGeneratorService.generateCode
        .mockResolvedValueOnce('ORD-2601-0001')
        .mockResolvedValueOnce('ORD-2601-0002');
      mockPrismaService.order.create
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockOrder);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.create(createDto);

      expect(result).toEqual(mockOrder);
      expect(mockCodeGeneratorService.generateCode).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries on persistent conflict', async () => {
      const error = { code: 'P2002' };
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2601-0001');
      mockPrismaService.order.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        'Failed to create order after maximum retries',
      );
      expect(mockCodeGeneratorService.generateCode).toHaveBeenCalledTimes(3);
    });

    it('should create timeline entries for each item', async () => {
      const multiItemDto = {
        ...createDto,
        items: [
          { fabricId: 1, quantity: 100, salePrice: 35.5 },
          { fabricId: 1, quantity: 50, salePrice: 40.0 },
        ],
      };
      const multiItemOrder = {
        ...mockOrder,
        items: [
          {
            id: 1,
            fabricId: 1,
            quantity: 100,
            salePrice: 35.5,
            subtotal: 3550,
          },
          { id: 2, fabricId: 1, quantity: 50, salePrice: 40, subtotal: 2000 },
        ],
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2601-0001');
      mockPrismaService.order.create.mockResolvedValue(multiItemOrder);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 2,
      });

      await service.create(multiItemDto);

      expect(mockPrismaService.orderTimeline.createMany).toHaveBeenCalledWith({
        data: [
          {
            orderItemId: 1,
            fromStatus: null,
            toStatus: OrderItemStatus.INQUIRY,
            remark: 'Order created',
          },
          {
            orderItemId: 2,
            fromStatus: null,
            toStatus: OrderItemStatus.INQUIRY,
            remark: 'Order created',
          },
        ],
      });
    });
  });

  describe('findAll', () => {
    const mockOrders = [
      {
        id: 1,
        orderCode: 'ORD-2601-0001',
        customerId: 1,
        status: OrderItemStatus.INQUIRY,
        totalAmount: 3550.0,
        customer: mockCustomer,
        items: [],
      },
      {
        id: 2,
        orderCode: 'ORD-2601-0002',
        customerId: 1,
        status: OrderItemStatus.ORDERED,
        totalAmount: 5000.0,
        customer: mockCustomer,
        items: [],
      },
    ];

    it('should return paginated orders with default parameters', async () => {
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.items).toEqual(mockOrders);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by customerId', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrders[0]]);
      mockPrismaService.order.count.mockResolvedValue(1);

      await service.findAll({ customerId: 1 });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 1,
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrders[0]]);
      mockPrismaService.order.count.mockResolvedValue(1);

      await service.findAll({ status: OrderItemStatus.INQUIRY });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderItemStatus.INQUIRY,
          }),
        }),
      );
    });

    it('should filter by fabricId using items relation', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrders[0]]);
      mockPrismaService.order.count.mockResolvedValue(1);

      await service.findAll({ fabricId: 1 });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            items: {
              some: {
                fabricId: 1,
              },
            },
          }),
        }),
      );
    });

    it('should search by keyword in orderCode and customer name', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrders[0]]);
      mockPrismaService.order.count.mockResolvedValue(1);

      await service.findAll({ keyword: 'ORD-2601' });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { orderCode: { contains: 'ORD-2601' } },
              { customer: { companyName: { contains: 'ORD-2601' } } },
            ]),
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      await service.findAll({
        createdFrom: '2026-01-01',
        createdTo: '2026-12-31',
      });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });

    it('should apply pagination', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrders[1]]);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 2, pageSize: 1 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(1);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        }),
      );
    });

    it('should apply sorting', async () => {
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      await service.findAll({ sortBy: 'totalAmount', sortOrder: 'asc' });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { totalAmount: 'asc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockOrderWithDetails = {
      id: 1,
      orderCode: 'ORD-2601-0001',
      customerId: 1,
      status: OrderItemStatus.INQUIRY,
      totalAmount: 3550.0,
      customer: mockCustomer,
      items: [
        {
          id: 1,
          fabricId: 1,
          quantity: 100,
          salePrice: 35.5,
          subtotal: 3550,
          status: OrderItemStatus.INQUIRY,
          fabric: mockFabric,
          supplier: mockSupplier,
        },
      ],
      timeline: [
        {
          id: 1,
          orderItemId: 1,
          fromStatus: null,
          toStatus: OrderItemStatus.INQUIRY,
          remark: 'Order created',
        },
      ],
    };

    it('should return order with full details', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(
        mockOrderWithDetails,
      );

      const result = await service.findOne(1);

      expect(result).toEqual(mockOrderWithDetails);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.objectContaining({
          customer: expect.any(Object),
          items: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Order with ID 999 not found',
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      deliveryAddress: 'New Address',
      notes: 'Updated notes',
    };

    it('should update order basic information', async () => {
      const existingOrder = {
        ...mockOrder,
        isActive: true,
      };
      const updatedOrder = {
        ...mockOrder,
        deliveryAddress: 'New Address',
        notes: 'Updated notes',
      };
      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedOrder);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          deliveryAddress: 'New Address',
          notes: 'Updated notes',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, updateDto)).rejects.toThrow(
        'Order with ID 999 not found',
      );
    });

    it('should update customerId when provided', async () => {
      const existingOrder = {
        ...mockOrder,
        isActive: true,
      };
      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.order.update.mockResolvedValue(mockOrder);

      await service.update(1, { customerId: 2 });

      expect(mockPrismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 2, isActive: true },
        select: { id: true },
      });
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customer: { connect: { id: 2 } },
          }),
        }),
      );
    });

    it('should throw NotFoundException when new customer not found', async () => {
      const existingOrder = {
        ...mockOrder,
        isActive: true,
      };
      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.update(1, { customerId: 999 })).rejects.toThrow(
        'Customer with ID 999 not found',
      );
    });
  });

  describe('updateAggregateStatus', () => {
    it('should calculate aggregate status as lowest progress', async () => {
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { status: OrderItemStatus.ORDERED },
        { status: OrderItemStatus.PRODUCTION },
        { status: OrderItemStatus.SHIPPED },
      ]);
      mockPrismaService.order.update.mockResolvedValue({});

      await service.updateAggregateStatus(1);

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: OrderItemStatus.ORDERED },
      });
    });

    it('should exclude CANCELLED from aggregate calculation', async () => {
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { status: OrderItemStatus.CANCELLED },
        { status: OrderItemStatus.SHIPPED },
        { status: OrderItemStatus.RECEIVED },
      ]);
      mockPrismaService.order.update.mockResolvedValue({});

      await service.updateAggregateStatus(1);

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: OrderItemStatus.SHIPPED },
      });
    });

    it('should return CANCELLED when all items are cancelled', async () => {
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { status: OrderItemStatus.CANCELLED },
        { status: OrderItemStatus.CANCELLED },
      ]);
      mockPrismaService.order.update.mockResolvedValue({});

      await service.updateAggregateStatus(1);

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: OrderItemStatus.CANCELLED },
      });
    });
  });

  describe('updateTotalAmount', () => {
    it('should sum all item subtotals', async () => {
      mockPrismaService.orderItem.aggregate.mockResolvedValue({
        _sum: { subtotal: 5550.0 },
      });
      mockPrismaService.order.update.mockResolvedValue({});

      await service.updateTotalAmount(1);

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { totalAmount: 5550.0 },
      });
    });

    it('should handle null sum (no items)', async () => {
      mockPrismaService.orderItem.aggregate.mockResolvedValue({
        _sum: { subtotal: null },
      });
      mockPrismaService.order.update.mockResolvedValue({});

      await service.updateTotalAmount(1);

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { totalAmount: 0 },
      });
    });
  });

  describe('remove', () => {
    it('should delete order with INQUIRY status and no payment records using atomic operation', async () => {
      // Mock deleteMany returning count: 1 (success)
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove(1);

      // Verify atomic conditional delete was used
      expect(mockPrismaService.order.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: OrderItemStatus.INQUIRY,
          customerPaid: 0,
        },
      });
    });

    it('should throw NotFoundException when order not found (deleteMany returns 0)', async () => {
      // deleteMany returns 0 - order doesn't exist or doesn't match conditions
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 0 });
      // findUnique called to determine why deletion failed
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow(
        'Order with ID 999 not found',
      );
    });

    it('should throw BadRequestException when order status is not INQUIRY', async () => {
      // deleteMany returns 0 due to status mismatch
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 0 });
      // findUnique returns the order to check why
      const orderedOrder = {
        ...mockOrder,
        status: OrderItemStatus.ORDERED,
        customerPaid: 0,
        supplierPayments: [],
      };
      mockPrismaService.order.findUnique.mockResolvedValue(orderedOrder);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(1)).rejects.toThrow(
        'Cannot delete order - only INQUIRY status orders can be deleted',
      );
    });

    it('should throw ConflictException when order has customer payment > 0', async () => {
      // deleteMany returns 0 due to customerPaid > 0
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 0 });
      const orderWithPayment = {
        ...mockOrder,
        status: OrderItemStatus.INQUIRY,
        customerPaid: 1000,
        supplierPayments: [],
      };
      mockPrismaService.order.findUnique.mockResolvedValue(orderWithPayment);

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1)).rejects.toThrow(
        'Cannot delete order - has payment records',
      );
    });

    it('should throw ConflictException when supplier has actual paid amount > 0', async () => {
      // deleteMany returns 0 (but we need secondary check for supplier payments)
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

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1)).rejects.toThrow(
        'Cannot delete order - has payment records',
      );
    });

    it('should allow deletion when supplier payment record exists but paid = 0', async () => {
      // Supplier payment record exists but no actual payment made
      mockPrismaService.order.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove(1);

      expect(mockPrismaService.order.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: OrderItemStatus.INQUIRY,
          customerPaid: 0,
        },
      });
    });
  });
});

// Status transition helper function tests
describe('Status Transition Functions', () => {
  describe('isValidStatusTransition', () => {
    it('should allow INQUIRY -> PENDING', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.INQUIRY,
          OrderItemStatus.PENDING,
        ),
      ).toBe(true);
    });

    it('should allow INQUIRY -> CANCELLED', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.INQUIRY,
          OrderItemStatus.CANCELLED,
        ),
      ).toBe(true);
    });

    it('should not allow INQUIRY -> ORDERED (skip PENDING)', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.INQUIRY,
          OrderItemStatus.ORDERED,
        ),
      ).toBe(false);
    });

    it('should allow PENDING -> ORDERED', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.PENDING,
          OrderItemStatus.ORDERED,
        ),
      ).toBe(true);
    });

    it('should allow ORDERED -> PRODUCTION', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.ORDERED,
          OrderItemStatus.PRODUCTION,
        ),
      ).toBe(true);
    });

    it('should allow PRODUCTION -> QC', () => {
      expect(
        isValidStatusTransition(OrderItemStatus.PRODUCTION, OrderItemStatus.QC),
      ).toBe(true);
    });

    it('should allow QC -> SHIPPED', () => {
      expect(
        isValidStatusTransition(OrderItemStatus.QC, OrderItemStatus.SHIPPED),
      ).toBe(true);
    });

    it('should allow SHIPPED -> RECEIVED', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.SHIPPED,
          OrderItemStatus.RECEIVED,
        ),
      ).toBe(true);
    });

    it('should allow RECEIVED -> COMPLETED', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.RECEIVED,
          OrderItemStatus.COMPLETED,
        ),
      ).toBe(true);
    });

    it('should allow COMPLETED -> CANCELLED', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.COMPLETED,
          OrderItemStatus.CANCELLED,
        ),
      ).toBe(true);
    });

    it('should not allow transitions from CANCELLED', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.CANCELLED,
          OrderItemStatus.INQUIRY,
        ),
      ).toBe(false);
      expect(
        isValidStatusTransition(
          OrderItemStatus.CANCELLED,
          OrderItemStatus.PENDING,
        ),
      ).toBe(false);
    });

    it('should not allow backward transitions', () => {
      expect(
        isValidStatusTransition(
          OrderItemStatus.ORDERED,
          OrderItemStatus.PENDING,
        ),
      ).toBe(false);
      expect(
        isValidStatusTransition(
          OrderItemStatus.SHIPPED,
          OrderItemStatus.PRODUCTION,
        ),
      ).toBe(false);
    });
  });

  describe('canModifyItem', () => {
    it('should allow modification in INQUIRY status', () => {
      expect(canModifyItem(OrderItemStatus.INQUIRY)).toBe(true);
    });

    it('should allow modification in PENDING status', () => {
      expect(canModifyItem(OrderItemStatus.PENDING)).toBe(true);
    });

    it('should not allow modification in ORDERED status', () => {
      expect(canModifyItem(OrderItemStatus.ORDERED)).toBe(false);
    });

    it('should not allow modification in any status after PENDING', () => {
      expect(canModifyItem(OrderItemStatus.PRODUCTION)).toBe(false);
      expect(canModifyItem(OrderItemStatus.QC)).toBe(false);
      expect(canModifyItem(OrderItemStatus.SHIPPED)).toBe(false);
      expect(canModifyItem(OrderItemStatus.RECEIVED)).toBe(false);
      expect(canModifyItem(OrderItemStatus.COMPLETED)).toBe(false);
      expect(canModifyItem(OrderItemStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canDeleteItem', () => {
    it('should allow deletion in INQUIRY status', () => {
      expect(canDeleteItem(OrderItemStatus.INQUIRY)).toBe(true);
    });

    it('should allow deletion in PENDING status', () => {
      expect(canDeleteItem(OrderItemStatus.PENDING)).toBe(true);
    });

    it('should not allow deletion in ORDERED status', () => {
      expect(canDeleteItem(OrderItemStatus.ORDERED)).toBe(false);
    });

    it('should not allow deletion in CANCELLED status', () => {
      expect(canDeleteItem(OrderItemStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canCancelItem', () => {
    it('should allow cancellation from any non-cancelled status', () => {
      expect(canCancelItem(OrderItemStatus.INQUIRY)).toBe(true);
      expect(canCancelItem(OrderItemStatus.PENDING)).toBe(true);
      expect(canCancelItem(OrderItemStatus.ORDERED)).toBe(true);
      expect(canCancelItem(OrderItemStatus.PRODUCTION)).toBe(true);
      expect(canCancelItem(OrderItemStatus.QC)).toBe(true);
      expect(canCancelItem(OrderItemStatus.SHIPPED)).toBe(true);
      expect(canCancelItem(OrderItemStatus.RECEIVED)).toBe(true);
      expect(canCancelItem(OrderItemStatus.COMPLETED)).toBe(true);
    });

    it('should not allow cancellation when already cancelled', () => {
      expect(canCancelItem(OrderItemStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canRestoreItem', () => {
    it('should allow restoration when status is CANCELLED and prevStatus exists', () => {
      expect(
        canRestoreItem(OrderItemStatus.CANCELLED, OrderItemStatus.PENDING),
      ).toBe(true);
      expect(
        canRestoreItem(OrderItemStatus.CANCELLED, OrderItemStatus.ORDERED),
      ).toBe(true);
    });

    it('should not allow restoration when not cancelled', () => {
      expect(
        canRestoreItem(OrderItemStatus.PENDING, OrderItemStatus.INQUIRY),
      ).toBe(false);
    });

    it('should not allow restoration when prevStatus is null', () => {
      expect(canRestoreItem(OrderItemStatus.CANCELLED, null)).toBe(false);
    });

    it('should not allow restoration when prevStatus is undefined', () => {
      expect(canRestoreItem(OrderItemStatus.CANCELLED, undefined)).toBe(false);
    });
  });
});
