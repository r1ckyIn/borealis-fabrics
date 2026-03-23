/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QuoteService } from './quote.service';
import { PrismaService } from '../prisma/prisma.service';
import { CodeGeneratorService, CodePrefix } from '../common/services';
import { RedisService } from '../common/services/redis.service';
import { QuoteStatus } from './dto';
import { OrderItemStatus } from '../order/enums/order-status.enum';
import { Order } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('QuoteService', () => {
  let service: QuoteService;
  let mockPrismaService: {
    quote: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    customer: { findFirst: jest.Mock };
    fabric: { findFirst: jest.Mock };
    fabricSupplier: { findMany: jest.Mock };
    order: { create: jest.Mock };
    orderTimeline: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockCodeGeneratorService: { generateCode: jest.Mock };
  let mockRedisService: {
    isAvailable: jest.Mock;
    acquireLock: jest.Mock;
    releaseLock: jest.Mock;
  };

  // Test fixtures
  const mockCustomer = { id: 1, companyName: 'Test Customer', isActive: true };
  const mockFabric = {
    id: 1,
    fabricCode: 'BF-2601-0001',
    name: 'Cotton',
    isActive: true,
  };
  const mockQuote = {
    id: 1,
    quoteCode: 'QT-2601-0001',
    customerId: 1,
    fabricId: 1,
    quantity: 100.0,
    unitPrice: 25.5,
    totalPrice: 2550.0,
    validUntil: new Date('2030-12-31'),
    status: QuoteStatus.ACTIVE,
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Factory for quote fixtures
  const makeQuote = (overrides = {}) => ({
    id: 1,
    quoteCode: 'QT-2603-0001',
    customerId: 1,
    fabricId: 1,
    quantity: new Prisma.Decimal(100),
    unitPrice: new Prisma.Decimal(25),
    totalPrice: new Prisma.Decimal(2500),
    status: 'active',
    validUntil: new Date(Date.now() + 86400000), // tomorrow
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    fabric: { id: 1 },
    ...overrides,
  });

  beforeEach(async () => {
    mockPrismaService = {
      quote: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      customer: { findFirst: jest.fn() },
      fabric: { findFirst: jest.fn() },
      fabricSupplier: { findMany: jest.fn() },
      order: { create: jest.fn() },
      orderTimeline: { createMany: jest.fn() },
      $transaction: jest.fn(
        <T>(callback: (tx: typeof mockPrismaService) => Promise<T>) =>
          callback(mockPrismaService),
      ),
    };

    mockCodeGeneratorService = {
      generateCode: jest.fn(),
    };

    mockRedisService = {
      isAvailable: jest.fn().mockReturnValue(true),
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CodeGeneratorService, useValue: mockCodeGeneratorService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<QuoteService>(QuoteService);
  });

  describe('create', () => {
    const createDto = {
      customerId: 1,
      fabricId: 1,
      quantity: 100.0,
      unitPrice: 25.5,
      validUntil: '2030-12-31T23:59:59.000Z',
      notes: 'Test notes',
    };

    it('should create a quote successfully', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockCodeGeneratorService.generateCode.mockResolvedValue('QT-2601-0001');
      mockPrismaService.quote.create.mockResolvedValue(mockQuote);

      const result = await service.create(createDto);

      expect(result).toEqual(mockQuote);
      expect(mockCodeGeneratorService.generateCode).toHaveBeenCalledWith(
        CodePrefix.QUOTE,
      );
      expect(mockPrismaService.quote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quoteCode: 'QT-2601-0001',
          customerId: 1,
          fabricId: 1,
          quantity: 100.0,
          unitPrice: 25.5,
          totalPrice: 2550.0, // 100 * 25.5
          status: QuoteStatus.ACTIVE,
        }),
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when fabric not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when validUntil is in the past', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);

      const pastDateDto = {
        ...createDto,
        validUntil: '2020-01-01T00:00:00.000Z',
      };

      await expect(service.create(pastDateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate totalPrice correctly', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockCodeGeneratorService.generateCode.mockResolvedValue('QT-2601-0002');
      mockPrismaService.quote.create.mockImplementation((args) =>
        Promise.resolve({
          ...mockQuote,
          ...args.data,
        }),
      );

      const dto = { ...createDto, quantity: 50.25, unitPrice: 10.0 };
      await service.create(dto);

      expect(mockPrismaService.quote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalPrice: 502.5, // 50.25 * 10.0
        }),
      });
    });

    it('should retry on P2002 unique constraint violation', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockCodeGeneratorService.generateCode
        .mockResolvedValueOnce('QT-2601-0001')
        .mockResolvedValueOnce('QT-2601-0002');

      // First call fails with P2002, second succeeds
      mockPrismaService.quote.create
        .mockRejectedValueOnce({ code: 'P2002' })
        .mockResolvedValueOnce(mockQuote);

      const result = await service.create(createDto);

      expect(result).toEqual(mockQuote);
      expect(mockCodeGeneratorService.generateCode).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.quote.create).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries on persistent P2002 errors', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockCodeGeneratorService.generateCode.mockResolvedValue('QT-2601-0001');
      mockPrismaService.quote.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.create(createDto)).rejects.toEqual({
        code: 'P2002',
      });
      expect(mockPrismaService.quote.create).toHaveBeenCalledTimes(3);
    });

    it('should throw non-P2002 errors immediately without retry', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findFirst.mockResolvedValue(mockFabric);
      mockCodeGeneratorService.generateCode.mockResolvedValue('QT-2601-0001');
      mockPrismaService.quote.create.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'Database connection error',
      );
      expect(mockPrismaService.quote.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    const mockQuotes = [mockQuote, { ...mockQuote, id: 2 }];

    it('should return paginated quotes', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue(mockQuotes);
      mockPrismaService.quote.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result).toEqual({
        items: mockQuotes,
        pagination: {
          total: 2,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      });
    });

    it('should filter by customerId', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(1);

      await service.findAll({ customerId: 1 });

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 1 }),
        }),
      );
    });

    it('should filter by fabricId', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(1);

      await service.findAll({ fabricId: 1 });

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ fabricId: 1 }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(1);

      await service.findAll({ status: QuoteStatus.ACTIVE });

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: QuoteStatus.ACTIVE }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(1);

      await service.findAll({
        validFrom: '2026-01-01',
        validTo: '2026-12-31',
      });

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            validUntil: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should include customer and fabric relations', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue(mockQuotes);
      mockPrismaService.quote.count.mockResolvedValue(2);

      await service.findAll({});

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            customer: expect.any(Object),
            fabric: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return quote with relations', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        customer: mockCustomer,
        fabric: mockFabric,
      });

      const result = await service.findOne(1);

      expect(result).toEqual(expect.objectContaining({ id: 1 }));
      expect(mockPrismaService.quote.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.objectContaining({
          customer: expect.any(Object),
          fabric: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { quantity: 200.0, unitPrice: 30.0 };

    it('should update quote successfully', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 1 });

      const updatedQuote = {
        ...mockQuote,
        ...updateDto,
        totalPrice: 6000.0,
      };
      mockPrismaService.quote.findUnique
        .mockResolvedValueOnce(mockQuote) // First call to get current values
        .mockResolvedValueOnce(updatedQuote); // Second call after update

      const result = await service.update(1, updateDto);

      expect(result.quantity).toBe(200.0);
      expect(mockPrismaService.quote.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: { in: [QuoteStatus.ACTIVE, QuoteStatus.EXPIRED] },
        },
        data: expect.objectContaining({
          quantity: 200.0,
          unitPrice: 30.0,
          totalPrice: 6000.0,
        }),
      });
    });

    it('should throw NotFoundException when quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when updating converted quote', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.CONVERTED,
      });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.update(1, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reset expired status to active when extending validity', async () => {
      const expiredQuote = { ...mockQuote, status: QuoteStatus.EXPIRED };
      mockPrismaService.quote.findUnique
        .mockResolvedValueOnce(expiredQuote)
        .mockResolvedValueOnce({
          ...expiredQuote,
          status: QuoteStatus.ACTIVE,
          validUntil: new Date('2030-12-31'),
        });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 1 });

      await service.update(1, {
        validUntil: '2030-12-31T23:59:59.000Z',
      });

      expect(mockPrismaService.quote.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: { in: [QuoteStatus.ACTIVE, QuoteStatus.EXPIRED] },
        },
        data: expect.objectContaining({
          status: QuoteStatus.ACTIVE,
        }),
      });
    });

    it('should recalculate totalPrice when quantity or unitPrice changes', async () => {
      mockPrismaService.quote.findUnique
        .mockResolvedValueOnce(mockQuote)
        .mockResolvedValueOnce({
          ...mockQuote,
          quantity: 50.0,
          totalPrice: 1275.0,
        });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 1 });

      await service.update(1, { quantity: 50.0 });

      // Use existing unitPrice (25.5) with new quantity (50)
      expect(mockPrismaService.quote.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: { in: [QuoteStatus.ACTIVE, QuoteStatus.EXPIRED] },
        },
        data: expect.objectContaining({
          totalPrice: 1275.0, // 50 * 25.5
        }),
      });
    });

    it('should throw BadRequestException when validUntil is in the past', async () => {
      await expect(
        service.update(1, { validUntil: '2020-01-01T00:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);

      // Verify that prisma was not called
      expect(mockPrismaService.quote.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete quote successfully', async () => {
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(mockPrismaService.quote.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: { in: [QuoteStatus.ACTIVE, QuoteStatus.EXPIRED] },
        },
      });
    });

    it('should throw NotFoundException when quote not found', async () => {
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when deleting converted quote', async () => {
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.CONVERTED,
      });

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });

    it('should allow deleting expired quote', async () => {
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(mockPrismaService.quote.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: { in: [QuoteStatus.ACTIVE, QuoteStatus.EXPIRED] },
        },
      });
    });
  });

  describe('markExpiredQuotes', () => {
    it('should mark expired quotes', async () => {
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markExpiredQuotes();

      expect(result).toBe(5);
      expect(mockPrismaService.quote.updateMany).toHaveBeenCalledWith({
        where: {
          status: QuoteStatus.ACTIVE,
          validUntil: { lt: expect.any(Date) },
        },
        data: { status: QuoteStatus.EXPIRED },
      });
    });

    it('should return 0 when no expired quotes', async () => {
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markExpiredQuotes();

      expect(result).toBe(0);
    });
  });

  describe('convertToOrder', () => {
    it('should delegate to batchConvertToOrder with single ID', async () => {
      const spy = jest
        .spyOn(service, 'batchConvertToOrder')
        .mockResolvedValue({ id: 1 } as unknown as Order);

      await service.convertToOrder(5);

      expect(spy).toHaveBeenCalledWith({ quoteIds: [5] });
    });
  });

  describe('batchConvertToOrder', () => {
    const quote1 = makeQuote({ id: 1, fabricId: 1 });
    const quote2 = makeQuote({
      id: 2,
      quoteCode: 'QT-2603-0002',
      fabricId: 2,
      fabric: { id: 2 },
    });

    const mockOrder = {
      id: 1,
      orderCode: 'ORD-2603-0001',
      customerId: 1,
      status: OrderItemStatus.PENDING,
      totalAmount: 5000,
      customerPaid: 0,
      customerPayStatus: 'unpaid',
      items: [
        {
          id: 10,
          fabricId: 1,
          supplierId: 100,
          quoteId: 1,
          status: OrderItemStatus.PENDING,
        },
        {
          id: 11,
          fabricId: 2,
          supplierId: null,
          quoteId: 2,
          status: OrderItemStatus.PENDING,
        },
      ],
      customer: { id: 1, companyName: 'Test Customer' },
    };

    it('should convert 2 quotes for same customer into 1 order with 2 items', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([quote1, quote2]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([
        { fabricId: 1, supplierId: 100, purchasePrice: new Prisma.Decimal(20) },
      ]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');
      mockPrismaService.order.create.mockResolvedValue(mockOrder);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.batchConvertToOrder({ quoteIds: [1, 2] });

      expect(result).toEqual(mockOrder);

      // Verify order was created with PENDING status
      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderItemStatus.PENDING,
            customerPayStatus: 'unpaid',
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  quoteId: 1,
                  status: OrderItemStatus.PENDING,
                  supplierId: 100,
                }),
                expect.objectContaining({
                  quoteId: 2,
                  status: OrderItemStatus.PENDING,
                  supplierId: null,
                }),
              ]),
            }),
          }),
        }),
      );

      // Verify quotes updated to CONVERTED
      expect(mockPrismaService.quote.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { status: QuoteStatus.CONVERTED },
      });

      // Verify locks acquired in sorted order and released
      expect(mockRedisService.acquireLock).toHaveBeenCalledTimes(2);
      expect(mockRedisService.acquireLock).toHaveBeenNthCalledWith(
        1,
        'quote:convert:1',
        30,
      );
      expect(mockRedisService.acquireLock).toHaveBeenNthCalledWith(
        2,
        'quote:convert:2',
        30,
      );
      expect(mockRedisService.releaseLock).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when quotes belong to different customers', async () => {
      const quoteOtherCustomer = makeQuote({ id: 2, customerId: 2 });
      mockPrismaService.quote.findMany.mockResolvedValue([
        quote1,
        quoteOtherCustomer,
      ]);

      await expect(
        service.batchConvertToOrder({ quoteIds: [1, 2] }),
      ).rejects.toThrow(BadRequestException);

      // Verify locks are still released
      expect(mockRedisService.releaseLock).toHaveBeenCalled();
    });

    it('should throw BadRequestException when a quote is expired', async () => {
      const expiredQuote = makeQuote({
        id: 2,
        validUntil: new Date('2020-01-01'),
      });
      mockPrismaService.quote.findMany.mockResolvedValue([
        quote1,
        expiredQuote,
      ]);

      await expect(
        service.batchConvertToOrder({ quoteIds: [1, 2] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when a quote is already converted', async () => {
      const convertedQuote = makeQuote({
        id: 2,
        status: QuoteStatus.CONVERTED,
      });
      mockPrismaService.quote.findMany.mockResolvedValue([
        quote1,
        convertedQuote,
      ]);

      await expect(
        service.batchConvertToOrder({ quoteIds: [1, 2] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when a quote does not exist', async () => {
      // Only return 1 quote when 2 were requested
      mockPrismaService.quote.findMany.mockResolvedValue([quote1]);

      await expect(
        service.batchConvertToOrder({ quoteIds: [1, 999] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when lock fails (concurrent conversion)', async () => {
      // First lock succeeds, second fails
      mockRedisService.acquireLock
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.batchConvertToOrder({ quoteIds: [1, 2] }),
      ).rejects.toThrow(ConflictException);

      // Verify first lock was released when second failed
      expect(mockRedisService.releaseLock).toHaveBeenCalledWith(
        'quote:convert:1',
      );
    });

    it('should throw ServiceUnavailableException when Redis is unavailable', async () => {
      mockRedisService.isAvailable.mockReturnValue(false);

      await expect(
        service.batchConvertToOrder({ quoteIds: [1] }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should auto-fill supplierId from FabricSupplier with lowest purchasePrice', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([quote1, quote2]);
      // Fabric 1 has supplier 100 (cheapest), fabric 2 has no supplier
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([
        { fabricId: 1, supplierId: 100, purchasePrice: new Prisma.Decimal(20) },
      ]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');
      mockPrismaService.order.create.mockResolvedValue(mockOrder);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 2 });

      await service.batchConvertToOrder({ quoteIds: [1, 2] });

      // Verify order.create was called with correct supplierIds
      const createCall = mockPrismaService.order.create.mock.calls[0][0];
      const items = createCall.data.items.create;

      // Fabric 1 -> supplier 100
      expect(items[0].supplierId).toBe(100);
      // Fabric 2 -> no supplier -> null
      expect(items[1].supplierId).toBeNull();
    });

    it('should set supplierId to null when no FabricSupplier exists', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([quote1]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');

      const orderWithNullSupplier = {
        ...mockOrder,
        items: [
          {
            id: 10,
            fabricId: 1,
            supplierId: null,
            quoteId: 1,
            status: OrderItemStatus.PENDING,
          },
        ],
      };
      mockPrismaService.order.create.mockResolvedValue(orderWithNullSupplier);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 1 });

      await service.batchConvertToOrder({ quoteIds: [1] });

      const createCall = mockPrismaService.order.create.mock.calls[0][0];
      const items = createCall.data.items.create;
      expect(items[0].supplierId).toBeNull();
    });

    it('should sort IDs before acquiring locks to prevent deadlocks', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([
        makeQuote({ id: 5 }),
        makeQuote({ id: 3 }),
        makeQuote({ id: 7 }),
      ]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');
      mockPrismaService.order.create.mockResolvedValue({
        ...mockOrder,
        items: [{ id: 10 }, { id: 11 }, { id: 12 }],
      });
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 3,
      });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 3 });

      await service.batchConvertToOrder({ quoteIds: [7, 3, 5] });

      // Locks should be acquired in sorted order: 3, 5, 7
      expect(mockRedisService.acquireLock).toHaveBeenNthCalledWith(
        1,
        'quote:convert:3',
        30,
      );
      expect(mockRedisService.acquireLock).toHaveBeenNthCalledWith(
        2,
        'quote:convert:5',
        30,
      );
      expect(mockRedisService.acquireLock).toHaveBeenNthCalledWith(
        3,
        'quote:convert:7',
        30,
      );
    });

    it('should release all locks even when transaction fails', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([quote1]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockRejectedValue(
        new Error('Code generation failed'),
      );

      await expect(
        service.batchConvertToOrder({ quoteIds: [1] }),
      ).rejects.toThrow('Code generation failed');

      // Verify lock was still released
      expect(mockRedisService.releaseLock).toHaveBeenCalledWith(
        'quote:convert:1',
      );
    });

    it('should create timeline entries with PENDING status for each item', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([quote1]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');
      mockPrismaService.order.create.mockResolvedValue({
        ...mockOrder,
        items: [{ id: 10 }],
      });
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 1 });

      await service.batchConvertToOrder({ quoteIds: [1] });

      expect(mockPrismaService.orderTimeline.createMany).toHaveBeenCalledWith({
        data: [
          {
            orderItemId: 10,
            fromStatus: null,
            toStatus: OrderItemStatus.PENDING,
            remark: 'Converted from quote',
          },
        ],
      });
    });
  });
});
