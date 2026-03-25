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
    addItem: jest.Mock;
    updateItem: jest.Mock;
    removeItem: jest.Mock;
    convertToOrder: jest.Mock;
    batchConvertToOrder: jest.Mock;
  };

  const mockQuote = {
    id: 1,
    quoteCode: 'QT-2601-0001',
    customerId: 1,
    totalPrice: 2550.0,
    validUntil: new Date('2030-02-28'),
    status: QuoteStatus.ACTIVE,
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 1,
        quoteId: 1,
        fabricId: 1,
        productId: null,
        quantity: 100,
        unitPrice: 25.5,
        subtotal: 2550,
        unit: 'meter',
        isConverted: false,
        notes: null,
      },
    ],
  };

  beforeEach(async () => {
    mockQuoteService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      convertToOrder: jest.fn(),
      batchConvertToOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuoteController],
      providers: [{ provide: QuoteService, useValue: mockQuoteService }],
    }).compile();

    controller = module.get<QuoteController>(QuoteController);
  });

  describe('create', () => {
    it('should create a quote with items', async () => {
      const createDto = {
        customerId: 1,
        validUntil: '2030-02-28T23:59:59.000Z',
        items: [{ fabricId: 1, quantity: 100.0, unitPrice: 25.5 }],
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
    it('should update quote header fields', async () => {
      const updateDto = { notes: 'Updated notes' };
      const updatedQuote = { ...mockQuote, notes: 'Updated notes' };
      mockQuoteService.update.mockResolvedValue(updatedQuote);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedQuote);
      expect(mockQuoteService.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('addItem', () => {
    it('should add an item to a quote', async () => {
      const itemDto = { fabricId: 2, quantity: 50, unitPrice: 30 };
      mockQuoteService.addItem.mockResolvedValue(mockQuote);

      const result = await controller.addItem(1, itemDto);

      expect(result).toEqual(mockQuote);
      expect(mockQuoteService.addItem).toHaveBeenCalledWith(1, itemDto);
    });
  });

  describe('updateItem', () => {
    it('should update a quote item', async () => {
      const updateDto = { quantity: 200 };
      mockQuoteService.updateItem.mockResolvedValue(mockQuote);

      const result = await controller.updateItem(1, 1, updateDto);

      expect(result).toEqual(mockQuote);
      expect(mockQuoteService.updateItem).toHaveBeenCalledWith(1, 1, updateDto);
    });
  });

  describe('removeItem', () => {
    it('should remove a quote item', async () => {
      mockQuoteService.removeItem.mockResolvedValue(undefined);

      await controller.removeItem(1, 1);

      expect(mockQuoteService.removeItem).toHaveBeenCalledWith(1, 1);
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

  describe('batchConvertToOrder', () => {
    it('should call batchConvertToOrder service method', async () => {
      mockQuoteService.batchConvertToOrder.mockResolvedValue({
        id: 1,
        orderCode: 'ORD-2601-0001',
      });

      const result = await controller.batchConvertToOrder({
        quoteIds: [1, 2],
      });

      expect(result).toBeDefined();
      expect(mockQuoteService.batchConvertToOrder).toHaveBeenCalledWith({
        quoteIds: [1, 2],
      });
    });
  });
});
