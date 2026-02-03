import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LogisticsController } from './logistics.controller';
import { LogisticsService } from './logistics.service';

describe('LogisticsController', () => {
  let controller: LogisticsController;
  let mockLogisticsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockLogistics = {
    id: 1,
    orderItemId: 1,
    carrier: '顺丰速运',
    contactName: '张三',
    contactPhone: '13800138000',
    trackingNo: 'SF1234567890',
    shippedAt: new Date('2026-02-01T10:00:00Z'),
    notes: 'Handle with care',
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItem: {
      id: 1,
      orderId: 1,
      fabricId: 1,
      order: { id: 1, orderCode: 'ORD-2601-0001' },
      fabric: { id: 1, fabricCode: 'BF-2601-0001', name: 'Cotton' },
    },
  };

  const mockPaginatedResult = {
    items: [mockLogistics],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    mockLogisticsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogisticsController],
      providers: [
        { provide: LogisticsService, useValue: mockLogisticsService },
      ],
    }).compile();

    controller = module.get<LogisticsController>(LogisticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // CREATE
  // ============================================================
  describe('create', () => {
    const createDto = {
      orderItemId: 1,
      carrier: '顺丰速运',
      contactName: '张三',
      contactPhone: '13800138000',
      trackingNo: 'SF1234567890',
      shippedAt: '2026-02-01T10:00:00Z',
      notes: 'Handle with care',
    };

    it('should create a logistics record', async () => {
      mockLogisticsService.create.mockResolvedValue(mockLogistics);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockLogistics);
      expect(mockLogisticsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw NotFoundException when order item not found', async () => {
      mockLogisticsService.create.mockRejectedValue(
        new NotFoundException('Order item with ID 999 not found'),
      );

      await expect(
        controller.create({ ...createDto, orderItemId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // FIND ALL
  // ============================================================
  describe('findAll', () => {
    it('should return paginated logistics list', async () => {
      mockLogisticsService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(mockPaginatedResult);
      expect(mockLogisticsService.findAll).toHaveBeenCalledWith({});
    });

    it('should pass query parameters to service', async () => {
      const query = {
        page: 2,
        pageSize: 10,
        orderId: 1,
        trackingNo: 'SF123',
      };
      mockLogisticsService.findAll.mockResolvedValue({
        items: [],
        pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
      });

      await controller.findAll(query);

      expect(mockLogisticsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ============================================================
  // FIND ONE
  // ============================================================
  describe('findOne', () => {
    it('should return logistics details', async () => {
      mockLogisticsService.findOne.mockResolvedValue(mockLogistics);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockLogistics);
      expect(mockLogisticsService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when logistics not found', async () => {
      mockLogisticsService.findOne.mockRejectedValue(
        new NotFoundException('Logistics record with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // UPDATE
  // ============================================================
  describe('update', () => {
    const updateDto = {
      carrier: '中通快递',
      trackingNo: 'ZT9876543210',
    };

    it('should update logistics record', async () => {
      const updatedLogistics = { ...mockLogistics, ...updateDto };
      mockLogisticsService.update.mockResolvedValue(updatedLogistics);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedLogistics);
      expect(mockLogisticsService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when logistics not found', async () => {
      mockLogisticsService.update.mockRejectedValue(
        new NotFoundException('Logistics record with ID 999 not found'),
      );

      await expect(controller.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================
  // REMOVE
  // ============================================================
  describe('remove', () => {
    it('should delete logistics record', async () => {
      mockLogisticsService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(mockLogisticsService.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when logistics not found', async () => {
      mockLogisticsService.remove.mockRejectedValue(
        new NotFoundException('Logistics record with ID 999 not found'),
      );

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
