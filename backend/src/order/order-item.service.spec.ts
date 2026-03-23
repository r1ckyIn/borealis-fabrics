import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderItemService } from './order-item.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderItemStatus } from './enums/order-status.enum';

describe('OrderItemService', () => {
  let service: OrderItemService;
  let mockPrismaService: {
    order: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
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
    };
    supplierPayment: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      upsert: jest.Mock;
    };
    fabric: { findFirst: jest.Mock };
    supplier: { findFirst: jest.Mock };
    quote: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockOrder = {
    id: 1,
    orderCode: 'ORD-2601-0001',
    customerId: 1,
    status: OrderItemStatus.INQUIRY,
    totalAmount: 3550.0,
  };

  const mockOrderItem = {
    id: 1,
    orderId: 1,
    fabricId: 1,
    supplierId: null,
    quantity: 100,
    salePrice: 35.5,
    purchasePrice: null,
    subtotal: 3550,
    status: OrderItemStatus.INQUIRY,
    prevStatus: null,
    fabric: {
      id: 1,
      fabricCode: 'BF-2601-0001',
      name: 'Cotton',
      composition: '100% Cotton',
    },
    supplier: null,
  };

  beforeEach(async () => {
    mockPrismaService = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
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
      },
      supplierPayment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        upsert: jest.fn(),
      },
      fabric: { findFirst: jest.fn() },
      supplier: { findFirst: jest.fn() },
      quote: { findUnique: jest.fn() },
      $transaction: jest.fn(
        <T>(callback: (tx: typeof mockPrismaService) => Promise<T>) =>
          callback(mockPrismaService),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderItemService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrderItemService>(OrderItemService);
  });

  describe('getOrderItems', () => {
    it('should return items for an order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.orderItem.findMany.mockResolvedValue([mockOrderItem]);

      const result = await service.getOrderItems(1);

      expect(result).toEqual([mockOrderItem]);
      expect(mockPrismaService.orderItem.findMany).toHaveBeenCalledWith({
        where: { orderId: 1 },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderItems(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addOrderItem', () => {
    const addDto = {
      fabricId: 1,
      quantity: 100,
      salePrice: 35.5,
    };

    it('should add item to order successfully', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.fabric.findFirst.mockResolvedValue({
        id: 1,
        isActive: true,
      });
      mockPrismaService.orderItem.create.mockResolvedValue(mockOrderItem);
      mockPrismaService.orderTimeline.create.mockResolvedValue({});
      mockPrismaService.orderItem.aggregate.mockResolvedValue({
        _sum: { subtotal: 3550 },
      });
      mockPrismaService.orderItem.findMany.mockResolvedValue([mockOrderItem]);
      mockPrismaService.order.update.mockResolvedValue(mockOrder);

      const result = await service.addOrderItem(1, addDto);

      expect(result).toEqual(mockOrderItem);
      expect(mockPrismaService.orderItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 1,
          fabricId: 1,
          quantity: 100,
          salePrice: 35.5,
          subtotal: 3550,
          status: OrderItemStatus.INQUIRY,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.addOrderItem(999, addDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when fabric not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.fabric.findFirst.mockResolvedValue(null);

      await expect(service.addOrderItem(1, addDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate supplier if provided', async () => {
      const dtoWithSupplier = { ...addDto, supplierId: 1 };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.fabric.findFirst.mockResolvedValue({
        id: 1,
        isActive: true,
      });
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(service.addOrderItem(1, dtoWithSupplier)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when order status not modifiable', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderItemStatus.SHIPPED,
      });

      await expect(service.addOrderItem(1, addDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateOrderItem', () => {
    const updateDto = {
      quantity: 150,
      salePrice: 40.0,
    };

    it('should update item successfully', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      mockPrismaService.orderItem.update.mockResolvedValue({
        ...mockOrderItem,
        quantity: 150,
        salePrice: 40.0,
        subtotal: 6000,
      });
      mockPrismaService.orderItem.aggregate.mockResolvedValue({
        _sum: { subtotal: 6000 },
      });
      mockPrismaService.orderItem.findMany.mockResolvedValue([mockOrderItem]);
      mockPrismaService.order.update.mockResolvedValue(mockOrder);

      const result = await service.updateOrderItem(1, 1, updateDto);

      expect(result.quantity).toBe(150);
      expect(result.subtotal).toBe(6000);
    });

    it('should throw NotFoundException when item not found', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(null);

      await expect(service.updateOrderItem(1, 999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when item status not modifiable', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue({
        ...mockOrderItem,
        status: OrderItemStatus.ORDERED,
      });

      await expect(service.updateOrderItem(1, 1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeOrderItem', () => {
    it('should remove item successfully', async () => {
      // deleteMany returns count: 1 indicating successful atomic delete
      mockPrismaService.orderItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.supplierPayment.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.orderItem.aggregate.mockResolvedValue({
        _sum: { subtotal: 0 },
      });
      mockPrismaService.order.update.mockResolvedValue(mockOrder);

      await service.removeOrderItem(1, 1);

      expect(mockPrismaService.orderItem.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          orderId: 1,
          status: { in: [OrderItemStatus.INQUIRY, OrderItemStatus.PENDING] },
        },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      // deleteMany returns count: 0, then findFirst returns null (item doesn't exist)
      mockPrismaService.orderItem.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.orderItem.findFirst.mockResolvedValue(null);

      await expect(service.removeOrderItem(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when item status not deletable', async () => {
      // deleteMany returns count: 0, then findFirst returns item with wrong status
      mockPrismaService.orderItem.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.orderItem.findFirst.mockResolvedValue({
        ...mockOrderItem,
        status: OrderItemStatus.SHIPPED,
      });

      await expect(service.removeOrderItem(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateItemStatus', () => {
    it('should update status successfully', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      mockPrismaService.orderItem.update.mockResolvedValue({
        ...mockOrderItem,
        status: OrderItemStatus.PENDING,
        prevStatus: OrderItemStatus.INQUIRY,
      });
      mockPrismaService.orderTimeline.create.mockResolvedValue({});
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { status: OrderItemStatus.PENDING },
      ]);
      mockPrismaService.order.update.mockResolvedValue(mockOrder);

      const result = await service.updateItemStatus(1, 1, {
        status: OrderItemStatus.PENDING,
      });

      expect(result.status).toBe(OrderItemStatus.PENDING);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(mockOrderItem);

      await expect(
        service.updateItemStatus(1, 1, {
          status: OrderItemStatus.SHIPPED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrderItem', () => {
    it('should cancel item successfully', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      mockPrismaService.orderItem.update.mockResolvedValue({
        ...mockOrderItem,
        status: OrderItemStatus.CANCELLED,
        prevStatus: OrderItemStatus.INQUIRY,
      });
      mockPrismaService.orderTimeline.create.mockResolvedValue({});
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { status: OrderItemStatus.CANCELLED },
      ]);
      mockPrismaService.order.update.mockResolvedValue(mockOrder);

      const result = await service.cancelOrderItem(1, 1, {});

      expect(result.status).toBe(OrderItemStatus.CANCELLED);
    });

    it('should throw BadRequestException when already cancelled', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue({
        ...mockOrderItem,
        status: OrderItemStatus.CANCELLED,
      });

      await expect(service.cancelOrderItem(1, 1, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('restoreOrderItem', () => {
    it('should restore cancelled item successfully', async () => {
      const cancelledItem = {
        ...mockOrderItem,
        status: OrderItemStatus.CANCELLED,
        prevStatus: OrderItemStatus.PENDING,
      };
      mockPrismaService.orderItem.findFirst.mockResolvedValue(cancelledItem);
      mockPrismaService.orderItem.update.mockResolvedValue({
        ...mockOrderItem,
        status: OrderItemStatus.PENDING,
        prevStatus: null,
      });
      mockPrismaService.orderTimeline.create.mockResolvedValue({});
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { status: OrderItemStatus.PENDING },
      ]);
      mockPrismaService.order.update.mockResolvedValue(mockOrder);

      const result = await service.restoreOrderItem(1, 1, {});

      expect(result.status).toBe(OrderItemStatus.PENDING);
    });

    it('should throw BadRequestException when not cancelled', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(mockOrderItem);

      await expect(service.restoreOrderItem(1, 1, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no prevStatus', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue({
        ...mockOrderItem,
        status: OrderItemStatus.CANCELLED,
        prevStatus: null,
      });

      await expect(service.restoreOrderItem(1, 1, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOrderTimeline', () => {
    it('should return timeline for order', async () => {
      const mockTimeline = [
        {
          id: 1,
          orderItemId: 1,
          fromStatus: null,
          toStatus: OrderItemStatus.INQUIRY,
          remark: 'Created',
        },
      ];
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.orderTimeline.findMany.mockResolvedValue(mockTimeline);

      const result = await service.getOrderTimeline(1);

      expect(result).toEqual(mockTimeline);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderTimeline(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getItemTimeline', () => {
    it('should return timeline for item', async () => {
      const mockTimeline = [
        {
          id: 1,
          orderItemId: 1,
          fromStatus: null,
          toStatus: OrderItemStatus.INQUIRY,
          remark: 'Created',
        },
      ];
      mockPrismaService.orderItem.findFirst.mockResolvedValue(mockOrderItem);
      mockPrismaService.orderTimeline.findMany.mockResolvedValue(mockTimeline);

      const result = await service.getItemTimeline(1, 1);

      expect(result).toEqual(mockTimeline);
    });

    it('should throw NotFoundException when item not found', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(null);

      await expect(service.getItemTimeline(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
