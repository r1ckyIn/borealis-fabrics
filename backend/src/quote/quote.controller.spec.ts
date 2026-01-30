import { Test, TestingModule } from '@nestjs/testing';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { QuoteStatus } from './dto';

describe('QuoteController', () => {
  let controller: QuoteController;
  let mockQuoteService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    convertToOrder: jest.Mock;
  };

  const mockQuote = {
    id: 1,
    quoteCode: 'QT-2601-0001',
    customerId: 1,
    fabricId: 1,
    quantity: 100.0,
    unitPrice: 25.5,
    totalPrice: 2550.0,
    validUntil: new Date('2026-02-28'),
    status: QuoteStatus.ACTIVE,
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockQuoteService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      convertToOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuoteController],
      providers: [{ provide: QuoteService, useValue: mockQuoteService }],
    }).compile();

    controller = module.get<QuoteController>(QuoteController);
  });

  describe('create', () => {
    it('should create a quote', async () => {
      const createDto = {
        customerId: 1,
        fabricId: 1,
        quantity: 100.0,
        unitPrice: 25.5,
        validUntil: '2026-02-28T23:59:59.000Z',
      };
      mockQuoteService.create.mockResolvedValue(mockQuote);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockQuote);
      expect(mockQuoteService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated quotes', async () => {
      const paginatedResult = {
        items: [mockQuote],
        pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      };
      mockQuoteService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(paginatedResult);
      expect(mockQuoteService.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filter parameters', async () => {
      const query = { customerId: 1, status: QuoteStatus.ACTIVE };
      mockQuoteService.findAll.mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      });

      await controller.findAll(query);

      expect(mockQuoteService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a quote by id', async () => {
      mockQuoteService.findOne.mockResolvedValue(mockQuote);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockQuote);
      expect(mockQuoteService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a quote', async () => {
      const updateDto = { quantity: 200.0 };
      const updatedQuote = { ...mockQuote, quantity: 200.0 };
      mockQuoteService.update.mockResolvedValue(updatedQuote);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedQuote);
      expect(mockQuoteService.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a quote', async () => {
      mockQuoteService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(mockQuoteService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('convertToOrder', () => {
    it('should call convertToOrder service method', async () => {
      mockQuoteService.convertToOrder.mockRejectedValue(
        new Error('Not implemented'),
      );

      await expect(controller.convertToOrder(1)).rejects.toThrow();
      expect(mockQuoteService.convertToOrder).toHaveBeenCalledWith(1);
    });
  });
});
