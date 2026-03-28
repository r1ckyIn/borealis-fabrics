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
import { CodeGeneratorService } from '../common/services';
import { RedisService } from '../common/services/redis.service';
import { QuoteStatus, CreateQuoteDto, CreateQuoteItemDto } from './dto';
import { OrderItemStatus } from '../order/enums/order-status.enum';
import { Prisma } from '@prisma/client';

describe('QuoteService', () => {
  let service: QuoteService;
  let mockPrismaService: {
    quote: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    quoteItem: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    customer: { findFirst: jest.Mock };
    fabric: { findFirst: jest.Mock; findMany: jest.Mock };
    product: { findMany: jest.Mock; findUnique: jest.Mock };
    fabricSupplier: { findMany: jest.Mock };
    productSupplier: { findMany: jest.Mock };
    order: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    orderItem: {
      create: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
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
  const mockCustomer = {
    id: 1,
    companyName: 'Test Customer',
    deletedAt: null,
  };
  const mockFabric = {
    id: 1,
    fabricCode: 'BF-2601-0001',
    name: 'Cotton',
    deletedAt: null,
    defaultPrice: new Prisma.Decimal(25),
  };
  const mockProduct = {
    id: 10,
    productCode: 'PD-2601-0001',
    name: 'Iron Frame A',
    subCategory: 'IRON_FRAME',
    deletedAt: null,
  };

  const mockQuoteItem = {
    id: 1,
    quoteId: 1,
    fabricId: 1,
    productId: null,
    quantity: new Prisma.Decimal(100),
    unitPrice: new Prisma.Decimal(25.5),
    subtotal: new Prisma.Decimal(2550),
    unit: 'meter',
    isConverted: false,
    notes: null,
    createdAt: new Date(),
  };

  const mockQuote = {
    id: 1,
    quoteCode: 'QT-2601-0001',
    customerId: 1,
    totalPrice: new Prisma.Decimal(2550),
    validUntil: new Date('2030-12-31'),
    status: QuoteStatus.ACTIVE,
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [mockQuoteItem],
  };

  beforeEach(async () => {
    mockPrismaService = {
      quote: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      quoteItem: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      customer: { findFirst: jest.fn() },
      fabric: { findFirst: jest.fn(), findMany: jest.fn() },
      product: { findMany: jest.fn(), findUnique: jest.fn() },
      fabricSupplier: { findMany: jest.fn() },
      productSupplier: { findMany: jest.fn() },
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      orderItem: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
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
    const createDto: CreateQuoteDto = {
      customerId: 1,
      validUntil: '2030-12-31T23:59:59.000Z',
      notes: 'Test notes',
      items: [
        { fabricId: 1, quantity: 100, unitPrice: 25.5 } as CreateQuoteItemDto,
      ],
    };

    it('should create a quote with items array', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('QT-2601-0001');
      mockPrismaService.quote.create.mockResolvedValue(mockQuote);

      const result = await service.create(createDto);

      expect(result).toEqual(mockQuote);
      expect(mockPrismaService.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quoteCode: 'QT-2601-0001',
            customerId: 1,
            totalPrice: 2550,
            status: QuoteStatus.ACTIVE,
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  fabricId: 1,
                  productId: null,
                  quantity: 100,
                  unitPrice: 25.5,
                  subtotal: 2550,
                  unit: 'meter',
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should compute totalPrice as sum of item subtotals', async () => {
      const multiItemDto: CreateQuoteDto = {
        customerId: 1,
        validUntil: '2030-12-31T23:59:59.000Z',
        items: [
          { fabricId: 1, quantity: 50, unitPrice: 10 } as CreateQuoteItemDto,
          { fabricId: 1, quantity: 25, unitPrice: 20 } as CreateQuoteItemDto,
        ],
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('QT-2601-0002');
      mockPrismaService.quote.create.mockImplementation((args) =>
        Promise.resolve({ ...mockQuote, ...args.data }),
      );

      await service.create(multiItemDto);

      expect(mockPrismaService.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalPrice: 1000, // 50*10 + 25*20
          }),
        }),
      );
    });

    it('should derive unit from product subCategory for product items', async () => {
      const productItemDto: CreateQuoteDto = {
        customerId: 1,
        validUntil: '2030-12-31T23:59:59.000Z',
        items: [
          { productId: 10, quantity: 5, unitPrice: 100 } as CreateQuoteItemDto,
        ],
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('QT-2601-0003');
      mockPrismaService.quote.create.mockImplementation((args) =>
        Promise.resolve({ ...mockQuote, ...args.data }),
      );

      await service.create(productItemDto);

      expect(mockPrismaService.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  productId: 10,
                  unit: 'set', // IRON_FRAME -> set
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should validate all fabric/product IDs exist', async () => {
      const dto: CreateQuoteDto = {
        customerId: 1,
        validUntil: '2030-12-31T23:59:59.000Z',
        items: [
          { fabricId: 999, quantity: 10, unitPrice: 5 } as CreateQuoteItemDto,
        ],
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should reject if validUntil is in the past', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);

      const pastDto: CreateQuoteDto = {
        ...createDto,
        validUntil: '2020-01-01T00:00:00.000Z',
      };

      await expect(service.create(pastDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should retry on P2002 unique constraint violation', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode
        .mockResolvedValueOnce('QT-2601-0001')
        .mockResolvedValueOnce('QT-2601-0002');

      mockPrismaService.quote.create
        .mockRejectedValueOnce({ code: 'P2002' })
        .mockResolvedValueOnce(mockQuote);

      const result = await service.create(createDto);

      expect(result).toEqual(mockQuote);
      expect(mockCodeGeneratorService.generateCode).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    const mockQuotes = [mockQuote, { ...mockQuote, id: 2 }];

    it('should return paginated quotes with nested items', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue(mockQuotes);
      mockPrismaService.quote.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.items).toEqual(mockQuotes);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    it('should filter by keyword matching quoteCode', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);
      mockPrismaService.quote.count.mockResolvedValue(1);

      await service.findAll({ keyword: 'QT-2601' });

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            quoteCode: { contains: 'QT-2601' },
          }),
        }),
      );
    });

    it('should include items with fabric/product relations', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue(mockQuotes);
      mockPrismaService.quote.count.mockResolvedValue(2);

      await service.findAll({});

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            customer: expect.any(Object),
            items: expect.objectContaining({
              include: expect.objectContaining({
                fabric: expect.any(Object),
                product: expect.any(Object),
              }),
            }),
          }),
        }),
      );
    });

    it('should NOT contain fabricId filter', async () => {
      mockPrismaService.quote.findMany.mockResolvedValue([]);
      mockPrismaService.quote.count.mockResolvedValue(0);

      await service.findAll({ customerId: 1 });

      const callArgs = mockPrismaService.quote.findMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('fabricId');
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
  });

  describe('findOne', () => {
    it('should include items with fabric and product relations', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(mockQuote);

      const result = await service.findOne(1);

      expect(result).toEqual(expect.objectContaining({ id: 1 }));
      expect(mockPrismaService.quote.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.objectContaining({
          customer: expect.any(Object),
          items: expect.objectContaining({
            include: expect.objectContaining({
              fabric: expect.any(Object),
              product: expect.any(Object),
            }),
          }),
        }),
      });
    });

    it('should throw NotFoundException when quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should only allow updating validUntil and notes on active quotes', async () => {
      const updateDto = {
        validUntil: '2031-06-30T23:59:59.000Z',
        notes: 'Updated notes',
      };
      mockPrismaService.quote.findUnique
        .mockResolvedValueOnce(mockQuote)
        .mockResolvedValueOnce({ ...mockQuote, ...updateDto });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.quote.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: {
            in: [
              QuoteStatus.ACTIVE,
              QuoteStatus.EXPIRED,
              QuoteStatus.PARTIALLY_CONVERTED,
            ],
          },
        },
        data: expect.objectContaining({
          validUntil: expect.any(Date),
          notes: 'Updated notes',
        }),
      });
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

      expect(mockPrismaService.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: QuoteStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should throw ConflictException when updating converted quote', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.CONVERTED,
      });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.update(1, { notes: 'try update' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { notes: 'test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when validUntil is in the past', async () => {
      await expect(
        service.update(1, { validUntil: '2020-01-01T00:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.quote.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    it('should add a QuoteItem to an existing quote and recalculate totalPrice', async () => {
      const itemDto: CreateQuoteItemDto = {
        fabricId: 1,
        quantity: 50,
        unitPrice: 20,
      } as CreateQuoteItemDto;

      mockPrismaService.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrismaService.fabric.findMany.mockResolvedValue([mockFabric]);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.quoteItem.create.mockResolvedValue({
        ...mockQuoteItem,
        id: 2,
        quantity: new Prisma.Decimal(50),
        unitPrice: new Prisma.Decimal(20),
        subtotal: new Prisma.Decimal(1000),
      });
      mockPrismaService.quoteItem.findMany.mockResolvedValue([
        { subtotal: new Prisma.Decimal(2550) },
        { subtotal: new Prisma.Decimal(1000) },
      ]);
      mockPrismaService.quote.update.mockResolvedValue({
        ...mockQuote,
        totalPrice: new Prisma.Decimal(3550),
      });
      mockPrismaService.quote.findUnique
        .mockResolvedValueOnce(mockQuote) // status check
        .mockResolvedValueOnce({
          ...mockQuote,
          totalPrice: new Prisma.Decimal(3550),
        }); // return

      const result = await service.addItem(1, itemDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.quoteItem.create).toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('should remove a QuoteItem and recalculate totalPrice', async () => {
      const quoteWithTwoItems = {
        ...mockQuote,
        items: [
          mockQuoteItem,
          {
            ...mockQuoteItem,
            id: 2,
            subtotal: new Prisma.Decimal(500),
          },
        ],
      };

      mockPrismaService.quote.findUnique.mockResolvedValue(quoteWithTwoItems);
      mockPrismaService.quoteItem.findUnique.mockResolvedValue({
        ...mockQuoteItem,
        id: 2,
        isConverted: false,
      });
      mockPrismaService.quoteItem.delete.mockResolvedValue({});
      mockPrismaService.quoteItem.findMany.mockResolvedValue([
        { subtotal: new Prisma.Decimal(2550) },
      ]);
      mockPrismaService.quote.update.mockResolvedValue({
        ...mockQuote,
        totalPrice: new Prisma.Decimal(2550),
      });
      mockPrismaService.quote.findUnique
        .mockResolvedValueOnce(quoteWithTwoItems) // status check
        .mockResolvedValueOnce({
          ...mockQuote,
          totalPrice: new Prisma.Decimal(2550),
        }); // return

      const result = await service.removeItem(1, 2);

      expect(result).toBeDefined();
      expect(mockPrismaService.quoteItem.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete active/expired quote successfully', async () => {
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(mockPrismaService.quote.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: {
            in: [QuoteStatus.ACTIVE, QuoteStatus.EXPIRED],
          },
        },
      });
    });

    it('should delete partially_converted quote with FK cleanup', async () => {
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.quote.findUnique.mockResolvedValue({
        status: QuoteStatus.PARTIALLY_CONVERTED,
      });
      mockPrismaService.orderItem.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.quote.delete.mockResolvedValue(mockQuote);

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(mockPrismaService.orderItem.updateMany).toHaveBeenCalledWith({
        where: { quoteId: 1 },
        data: { quoteId: null },
      });
      expect(mockPrismaService.quote.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when quote not found', async () => {
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when removing converted quote', async () => {
      mockPrismaService.quote.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.CONVERTED,
      });

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });
  });

  describe('markExpiredQuotes', () => {
    it('should mark expired quotes with both active and partially_converted statuses', async () => {
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markExpiredQuotes();

      expect(result).toBe(5);
      expect(mockPrismaService.quote.updateMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [QuoteStatus.ACTIVE, QuoteStatus.PARTIALLY_CONVERTED],
          },
          validUntil: { lt: expect.any(Date) },
        },
        data: { status: QuoteStatus.EXPIRED },
      });
    });
  });

  describe('convertQuoteItems', () => {
    // Fixtures for conversion tests
    const fabricQuoteItem = {
      id: 1,
      quoteId: 1,
      fabricId: 1,
      productId: null,
      quantity: new Prisma.Decimal(100),
      unitPrice: new Prisma.Decimal(25),
      subtotal: new Prisma.Decimal(2500),
      unit: 'meter',
      isConverted: false,
      notes: null,
      quote: {
        id: 1,
        customerId: 1,
        status: QuoteStatus.ACTIVE,
        validUntil: new Date('2030-12-31'),
      },
      fabric: { id: 1 },
      product: null,
    };

    const productQuoteItem = {
      id: 2,
      quoteId: 1,
      fabricId: null,
      productId: 10,
      quantity: new Prisma.Decimal(5),
      unitPrice: new Prisma.Decimal(200),
      subtotal: new Prisma.Decimal(1000),
      unit: 'set',
      isConverted: false,
      notes: null,
      quote: {
        id: 1,
        customerId: 1,
        status: QuoteStatus.ACTIVE,
        validUntil: new Date('2030-12-31'),
      },
      fabric: null,
      product: { id: 10, subCategory: 'IRON_FRAME' },
    };

    const mockOrderWithItems = {
      id: 1,
      orderCode: 'ORD-2603-0001',
      customerId: 1,
      status: OrderItemStatus.PENDING,
      totalAmount: 3500,
      customerPaid: 0,
      customerPayStatus: 'unpaid',
      items: [
        {
          id: 10,
          orderId: 1,
          fabricId: 1,
          productId: null,
          quoteItemId: 1,
          supplierId: 100,
          quantity: new Prisma.Decimal(100),
          salePrice: new Prisma.Decimal(25),
          subtotal: 2500,
          unit: 'meter',
          status: OrderItemStatus.PENDING,
        },
        {
          id: 11,
          orderId: 1,
          fabricId: null,
          productId: 10,
          quoteItemId: 2,
          supplierId: 200,
          quantity: new Prisma.Decimal(5),
          salePrice: new Prisma.Decimal(200),
          subtotal: 1000,
          unit: 'set',
          status: OrderItemStatus.PENDING,
        },
      ],
      customer: { id: 1, companyName: 'Test Customer' },
    };

    it('should convert all items of a quote and set status to converted', async () => {
      mockPrismaService.quoteItem.findMany
        .mockResolvedValueOnce([fabricQuoteItem, productQuoteItem]) // fetch items
        .mockResolvedValueOnce([{ isConverted: true }, { isConverted: true }]); // check all converted
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([
        {
          fabricId: 1,
          supplierId: 100,
          purchasePrice: new Prisma.Decimal(20),
        },
      ]);
      mockPrismaService.productSupplier.findMany.mockResolvedValue([
        {
          productId: 10,
          supplierId: 200,
          purchasePrice: new Prisma.Decimal(150),
        },
      ]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');
      mockPrismaService.order.create.mockResolvedValue(mockOrderWithItems);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.quoteItem.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.quote.update.mockResolvedValue({});

      const result = await service.convertQuoteItems({
        quoteItemIds: [1, 2],
      });

      expect(result).toEqual(mockOrderWithItems);
      // Should mark items as converted
      expect(mockPrismaService.quoteItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { isConverted: true },
      });
      // Should set quote to converted (all items converted)
      expect(mockPrismaService.quote.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: QuoteStatus.CONVERTED },
      });
    });

    it('should convert subset of items and set status to partially_converted', async () => {
      mockPrismaService.quoteItem.findMany
        .mockResolvedValueOnce([fabricQuoteItem]) // only one item selected
        .mockResolvedValueOnce([{ isConverted: true }, { isConverted: false }]); // one converted, one not
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([
        {
          fabricId: 1,
          supplierId: 100,
          purchasePrice: new Prisma.Decimal(20),
        },
      ]);
      mockPrismaService.productSupplier.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');

      const partialOrder = {
        ...mockOrderWithItems,
        items: [mockOrderWithItems.items[0]],
        totalAmount: 2500,
      };
      mockPrismaService.order.create.mockResolvedValue(partialOrder);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.quoteItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.quote.update.mockResolvedValue({});

      const result = await service.convertQuoteItems({
        quoteItemIds: [1],
      });

      expect(result).toEqual(partialOrder);
      // Should set quote to partially_converted
      expect(mockPrismaService.quote.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: QuoteStatus.PARTIALLY_CONVERTED },
      });
    });

    it('should create OrderItems with correct fabricId/productId/unit/quoteItemId', async () => {
      mockPrismaService.quoteItem.findMany
        .mockResolvedValueOnce([fabricQuoteItem, productQuoteItem])
        .mockResolvedValueOnce([{ isConverted: true }, { isConverted: true }]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockPrismaService.productSupplier.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');
      mockPrismaService.order.create.mockResolvedValue(mockOrderWithItems);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.quoteItem.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.quote.update.mockResolvedValue({});

      await service.convertQuoteItems({ quoteItemIds: [1, 2] });

      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  fabricId: 1,
                  productId: null,
                  quoteItemId: 1,
                  unit: 'meter',
                }),
                expect.objectContaining({
                  fabricId: null,
                  productId: 10,
                  quoteItemId: 2,
                  unit: 'set',
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should auto-fill cheapest supplier for both fabric and product items', async () => {
      mockPrismaService.quoteItem.findMany
        .mockResolvedValueOnce([fabricQuoteItem, productQuoteItem])
        .mockResolvedValueOnce([{ isConverted: true }, { isConverted: true }]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([
        {
          fabricId: 1,
          supplierId: 100,
          purchasePrice: new Prisma.Decimal(20),
        },
        {
          fabricId: 1,
          supplierId: 101,
          purchasePrice: new Prisma.Decimal(22),
        },
      ]);
      mockPrismaService.productSupplier.findMany.mockResolvedValue([
        {
          productId: 10,
          supplierId: 200,
          purchasePrice: new Prisma.Decimal(150),
        },
        {
          productId: 10,
          supplierId: 201,
          purchasePrice: new Prisma.Decimal(180),
        },
      ]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');
      mockPrismaService.order.create.mockResolvedValue(mockOrderWithItems);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.quoteItem.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.quote.update.mockResolvedValue({});

      await service.convertQuoteItems({ quoteItemIds: [1, 2] });

      // Verify cheapest suppliers used (sorted by asc, first wins)
      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  fabricId: 1,
                  supplierId: 100, // cheapest fabric supplier
                  purchasePrice: 20,
                }),
                expect.objectContaining({
                  productId: 10,
                  supplierId: 200, // cheapest product supplier
                  purchasePrice: 150,
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should reject already-converted QuoteItems', async () => {
      const convertedItem = { ...fabricQuoteItem, isConverted: true };
      mockPrismaService.quoteItem.findMany.mockResolvedValueOnce([
        convertedItem,
      ]);

      await expect(
        service.convertQuoteItems({ quoteItemIds: [1] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject items from different quotes', async () => {
      const itemFromOtherQuote = {
        ...productQuoteItem,
        quoteId: 2,
        quote: { ...productQuoteItem.quote, id: 2 },
      };
      mockPrismaService.quoteItem.findMany.mockResolvedValueOnce([
        fabricQuoteItem,
        itemFromOtherQuote,
      ]);

      await expect(
        service.convertQuoteItems({ quoteItemIds: [1, 2] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if quote is expired', async () => {
      const expiredItem = {
        ...fabricQuoteItem,
        quote: {
          ...fabricQuoteItem.quote,
          status: QuoteStatus.EXPIRED,
        },
      };
      mockPrismaService.quoteItem.findMany.mockResolvedValueOnce([expiredItem]);

      await expect(
        service.convertQuoteItems({ quoteItemIds: [1] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if quote is already fully converted', async () => {
      const convertedStatusItem = {
        ...fabricQuoteItem,
        quote: {
          ...fabricQuoteItem.quote,
          status: QuoteStatus.CONVERTED,
        },
      };
      mockPrismaService.quoteItem.findMany.mockResolvedValueOnce([
        convertedStatusItem,
      ]);

      await expect(
        service.convertQuoteItems({ quoteItemIds: [1] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create timeline entries for new OrderItems', async () => {
      mockPrismaService.quoteItem.findMany
        .mockResolvedValueOnce([fabricQuoteItem])
        .mockResolvedValueOnce([{ isConverted: true }]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockPrismaService.productSupplier.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');

      const order = {
        ...mockOrderWithItems,
        items: [mockOrderWithItems.items[0]],
      };
      mockPrismaService.order.create.mockResolvedValue(order);
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.quoteItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.quote.update.mockResolvedValue({});

      await service.convertQuoteItems({ quoteItemIds: [1] });

      expect(mockPrismaService.orderTimeline.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            orderItemId: expect.any(Number),
            fromStatus: null,
            toStatus: OrderItemStatus.PENDING,
            remark: 'Converted from quote item',
          }),
        ]),
      });
    });

    it('should use Redis lock for concurrent protection', async () => {
      mockPrismaService.quoteItem.findMany
        .mockResolvedValueOnce([fabricQuoteItem])
        .mockResolvedValueOnce([{ isConverted: true }]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockPrismaService.productSupplier.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockResolvedValue('ORD-2603-0001');
      mockPrismaService.order.create.mockResolvedValue({
        ...mockOrderWithItems,
        items: [mockOrderWithItems.items[0]],
      });
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.quoteItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.quote.update.mockResolvedValue({});

      await service.convertQuoteItems({ quoteItemIds: [1] });

      expect(mockRedisService.acquireLock).toHaveBeenCalledWith(
        'quote:convert:1',
        30,
      );
      expect(mockRedisService.releaseLock).toHaveBeenCalledWith(
        'quote:convert:1',
      );
    });

    it('should throw ServiceUnavailableException when Redis is unavailable', async () => {
      mockRedisService.isAvailable.mockReturnValue(false);
      mockPrismaService.quoteItem.findMany.mockResolvedValueOnce([
        fabricQuoteItem,
      ]);

      await expect(
        service.convertQuoteItems({ quoteItemIds: [1] }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ConflictException when lock fails', async () => {
      mockRedisService.acquireLock.mockResolvedValue(false);
      mockPrismaService.quoteItem.findMany.mockResolvedValueOnce([
        fabricQuoteItem,
      ]);

      await expect(
        service.convertQuoteItems({ quoteItemIds: [1] }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when quote items not found', async () => {
      mockPrismaService.quoteItem.findMany.mockResolvedValueOnce([]);

      await expect(
        service.convertQuoteItems({ quoteItemIds: [999] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should release lock even when transaction fails', async () => {
      mockPrismaService.quoteItem.findMany.mockResolvedValueOnce([
        fabricQuoteItem,
      ]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockPrismaService.productSupplier.findMany.mockResolvedValue([]);
      mockCodeGeneratorService.generateCode.mockRejectedValue(
        new Error('Code generation failed'),
      );

      await expect(
        service.convertQuoteItems({ quoteItemIds: [1] }),
      ).rejects.toThrow('Code generation failed');

      expect(mockRedisService.releaseLock).toHaveBeenCalledWith(
        'quote:convert:1',
      );
    });

    it('should add items to existing order when orderId provided', async () => {
      const existingOrder = {
        id: 5,
        customerId: 1,
        status: OrderItemStatus.PENDING,
      };

      mockPrismaService.quoteItem.findMany
        .mockResolvedValueOnce([fabricQuoteItem])
        .mockResolvedValueOnce([{ isConverted: true }]);
      mockPrismaService.fabricSupplier.findMany.mockResolvedValue([]);
      mockPrismaService.productSupplier.findMany.mockResolvedValue([]);
      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.orderItem.create.mockResolvedValue({
        id: 20,
        orderId: 5,
        quoteItemId: 1,
      });
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { subtotal: new Prisma.Decimal(2500) },
      ]);
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.order.findUniqueOrThrow.mockResolvedValue({
        ...mockOrderWithItems,
        id: 5,
        items: [{ ...mockOrderWithItems.items[0], orderId: 5, id: 20 }],
      });
      mockPrismaService.orderTimeline.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.quoteItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.quote.update.mockResolvedValue({});

      const result = await service.convertQuoteItems({
        quoteItemIds: [1],
        orderId: 5,
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
        }),
      );
      expect(mockPrismaService.orderItem.create).toHaveBeenCalled();
    });
  });
});
