/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LogisticsService } from './logistics.service';
import { PrismaService } from '../prisma/prisma.service';

// Helper to create Prisma P2025 error for testing
const createPrismaNotFoundError = () => {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: '5.0.0',
  });
};

describe('LogisticsService', () => {
  let service: LogisticsService;
  let mockPrismaService: {
    logistics: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    orderItem: { findUnique: jest.Mock };
  };

  // Test fixtures
  const mockOrderItem = {
    id: 1,
    orderId: 1,
    fabricId: 1,
    quantity: 100,
    salePrice: 25.5,
    status: 'SHIPPED',
    order: {
      id: 1,
      orderCode: 'ORD-2601-0001',
    },
    fabric: {
      id: 1,
      fabricCode: 'BF-2601-0001',
      name: 'Cotton',
    },
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
  };

  const mockLogisticsWithRelations = {
    ...mockLogistics,
    orderItem: mockOrderItem,
  };

  beforeEach(async () => {
    mockPrismaService = {
      logistics: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      orderItem: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogisticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LogisticsService>(LogisticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

    it('should create a logistics record successfully', async () => {
      mockPrismaService.orderItem.findUnique.mockResolvedValue(mockOrderItem);
      mockPrismaService.logistics.create.mockResolvedValue(mockLogistics);

      const result = await service.create(createDto);

      expect(result).toEqual(mockLogistics);
      expect(mockPrismaService.orderItem.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.logistics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderItemId: 1,
          carrier: '顺丰速运',
          contactName: '张三',
          contactPhone: '13800138000',
          trackingNo: 'SF1234567890',
          notes: 'Handle with care',
        }),
      });
    });

    it('should create a logistics record with minimal data', async () => {
      const minimalDto = {
        orderItemId: 1,
        carrier: '顺丰速运',
      };
      mockPrismaService.orderItem.findUnique.mockResolvedValue(mockOrderItem);
      mockPrismaService.logistics.create.mockResolvedValue({
        ...mockLogistics,
        contactName: null,
        contactPhone: null,
        trackingNo: null,
        shippedAt: null,
        notes: null,
      });

      const result = await service.create(minimalDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.logistics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderItemId: 1,
          carrier: '顺丰速运',
        }),
      });
    });

    it('should throw NotFoundException when order item not found', async () => {
      mockPrismaService.orderItem.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Order item with ID 1 not found',
      );
    });
  });

  // ============================================================
  // FIND ALL
  // ============================================================
  describe('findAll', () => {
    it('should return paginated logistics list with default parameters', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([
        mockLogisticsWithRelations,
      ]);
      mockPrismaService.logistics.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toEqual({
        items: [mockLogisticsWithRelations],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });
      expect(mockPrismaService.logistics.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.objectContaining({
          orderItem: expect.any(Object),
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by orderId', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([
        mockLogisticsWithRelations,
      ]);
      mockPrismaService.logistics.count.mockResolvedValue(1);

      await service.findAll({ orderId: 1 });

      expect(mockPrismaService.logistics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderItem: { orderId: 1 },
          }),
        }),
      );
    });

    it('should filter by orderItemId', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([
        mockLogisticsWithRelations,
      ]);
      mockPrismaService.logistics.count.mockResolvedValue(1);

      await service.findAll({ orderItemId: 1 });

      expect(mockPrismaService.logistics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderItemId: 1,
          }),
        }),
      );
    });

    it('should filter by trackingNo (partial match)', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([
        mockLogisticsWithRelations,
      ]);
      mockPrismaService.logistics.count.mockResolvedValue(1);

      await service.findAll({ trackingNo: 'SF123' });

      expect(mockPrismaService.logistics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trackingNo: { contains: 'SF123' },
          }),
        }),
      );
    });

    it('should filter by carrier (partial match)', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([
        mockLogisticsWithRelations,
      ]);
      mockPrismaService.logistics.count.mockResolvedValue(1);

      await service.findAll({ carrier: '顺丰' });

      expect(mockPrismaService.logistics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            carrier: { contains: '顺丰' },
          }),
        }),
      );
    });

    it('should handle custom pagination', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([]);
      mockPrismaService.logistics.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 3, pageSize: 10 });

      expect(result.pagination).toEqual({
        page: 3,
        pageSize: 10,
        total: 50,
        totalPages: 5,
      });
      expect(mockPrismaService.logistics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('should handle custom sorting', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([]);
      mockPrismaService.logistics.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'shippedAt', sortOrder: 'asc' });

      expect(mockPrismaService.logistics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { shippedAt: 'asc' },
        }),
      );
    });

    it('should return empty list when no results', async () => {
      mockPrismaService.logistics.findMany.mockResolvedValue([]);
      mockPrismaService.logistics.count.mockResolvedValue(0);

      const result = await service.findAll({ orderItemId: 999 });

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ============================================================
  // FIND ONE
  // ============================================================
  describe('findOne', () => {
    it('should return logistics details with order item info', async () => {
      mockPrismaService.logistics.findUnique.mockResolvedValue(
        mockLogisticsWithRelations,
      );

      const result = await service.findOne(1);

      expect(result).toEqual(mockLogisticsWithRelations);
      expect(mockPrismaService.logistics.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.objectContaining({
          orderItem: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when logistics not found', async () => {
      mockPrismaService.logistics.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Logistics record with ID 999 not found',
      );
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

    it('should update logistics record successfully', async () => {
      mockPrismaService.logistics.findUnique.mockResolvedValue(mockLogistics);
      mockPrismaService.logistics.update.mockResolvedValue({
        ...mockLogistics,
        ...updateDto,
      });

      const result = await service.update(1, updateDto);

      expect(result.carrier).toBe('中通快递');
      expect(result.trackingNo).toBe('ZT9876543210');
      expect(mockPrismaService.logistics.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining(updateDto),
      });
    });

    it('should update shippedAt date', async () => {
      const updateWithDate = { shippedAt: '2026-02-05T15:00:00Z' };
      mockPrismaService.logistics.findUnique.mockResolvedValue(mockLogistics);
      mockPrismaService.logistics.update.mockResolvedValue({
        ...mockLogistics,
        shippedAt: new Date(updateWithDate.shippedAt),
      });

      const result = await service.update(1, updateWithDate);

      expect(mockPrismaService.logistics.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          shippedAt: new Date(updateWithDate.shippedAt),
        }),
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when logistics not found', async () => {
      // Mock Prisma P2025 error (record not found during atomic update)
      mockPrismaService.logistics.update.mockRejectedValue(
        createPrismaNotFoundError(),
      );

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, updateDto)).rejects.toThrow(
        'Logistics record with ID 999 not found',
      );
    });
  });

  // ============================================================
  // REMOVE
  // ============================================================
  describe('remove', () => {
    it('should delete logistics record successfully', async () => {
      mockPrismaService.logistics.delete.mockResolvedValue(mockLogistics);

      await service.remove(1);

      expect(mockPrismaService.logistics.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when logistics not found', async () => {
      // Mock Prisma P2025 error (record not found during atomic delete)
      mockPrismaService.logistics.delete.mockRejectedValue(
        createPrismaNotFoundError(),
      );

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow(
        'Logistics record with ID 999 not found',
      );
    });
  });
});
