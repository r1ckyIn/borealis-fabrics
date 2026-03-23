/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { QuoteService } from './quote.service';
import { PrismaService } from '../prisma/prisma.service';
import { CodeGeneratorService, CodePrefix } from '../common/services';
import { QuoteStatus } from './dto';

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
    $transaction: jest.Mock;
  };
  let mockCodeGeneratorService: { generateCode: jest.Mock };

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
        QuoteService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CodeGeneratorService, useValue: mockCodeGeneratorService },
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
          validUntil: new Date('2026-12-31'),
        });
      mockPrismaService.quote.updateMany.mockResolvedValue({ count: 1 });

      await service.update(1, {
        validUntil: '2026-12-31T23:59:59.000Z',
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
    it('should throw NotFoundException when quote not found', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.convertToOrder(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when quote is not active', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.EXPIRED,
      });

      await expect(service.convertToOrder(1)).rejects.toThrow();
    });

    it('should throw error when quote has already expired', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.ACTIVE,
        validUntil: new Date('2020-01-01'),
      });

      await expect(service.convertToOrder(1)).rejects.toThrow();
    });

    it('should return 501 placeholder for now', async () => {
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.ACTIVE,
        validUntil: new Date('2030-12-31'),
      });

      // This should throw NotImplementedException or return a placeholder
      await expect(service.convertToOrder(1)).rejects.toThrow();
    });
  });
});
