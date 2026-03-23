import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrderPaymentService } from './order-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrderItemStatus,
  CustomerPayStatus,
} from './enums/order-status.enum';

describe('OrderPaymentService', () => {
  let service: OrderPaymentService;
  let mockPrismaService: {
    order: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    supplierPayment: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    supplier: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockOrder = {
    id: 1,
    orderCode: 'ORD-2601-0001',
    customerId: 1,
    status: OrderItemStatus.INQUIRY,
    totalAmount: 3550.0,
  };

  beforeEach(async () => {
    mockPrismaService = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      supplierPayment: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      supplier: { findFirst: jest.fn() },
      $transaction: jest.fn(
        <T>(callback: (tx: typeof mockPrismaService) => Promise<T>) =>
          callback(mockPrismaService),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderPaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrderPaymentService>(OrderPaymentService);
  });

  describe('updateCustomerPayment', () => {
    it('should update customer payment', async () => {
      const updatedOrder = {
        ...mockOrder,
        customerPaid: 1000,
        customerPayStatus: 'partial',
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateCustomerPayment(1, {
        customerPaid: 1000,
        customerPayStatus: CustomerPayStatus.PARTIAL,
      });

      expect(result.customerPaid).toBe(1000);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCustomerPayment(999, { customerPaid: 1000 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSupplierPayments', () => {
    it('should return supplier payments', async () => {
      const mockPayments = [
        { id: 1, orderId: 1, supplierId: 1, payable: 2500, paid: 0 },
      ];
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplierPayment.findMany.mockResolvedValue(
        mockPayments,
      );

      const result = await service.getSupplierPayments(1);

      expect(result).toEqual(mockPayments);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getSupplierPayments(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSupplierPayment', () => {
    it('should update existing supplier payment using upsert', async () => {
      const upsertedPayment = {
        id: 1,
        orderId: 1,
        supplierId: 1,
        payable: 0,
        paid: 500,
        supplier: {
          id: 1,
          companyName: 'Test',
          contactName: 'Contact',
          phone: '123',
        },
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplier.findFirst.mockResolvedValue({
        id: 1,
        isActive: true,
      });
      mockPrismaService.supplierPayment.upsert.mockResolvedValue(
        upsertedPayment,
      );

      const result = await service.updateSupplierPayment(1, 1, { paid: 500 });

      expect(result.paid).toBe(500);
      expect(mockPrismaService.supplierPayment.upsert).toHaveBeenCalled();
    });

    it('should create new supplier payment via upsert if not exists', async () => {
      const newPayment = {
        id: 1,
        orderId: 1,
        supplierId: 1,
        payable: 0,
        paid: 500,
        supplier: {
          id: 1,
          companyName: 'Test',
          contactName: 'Contact',
          phone: '123',
        },
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplier.findFirst.mockResolvedValue({
        id: 1,
        isActive: true,
      });
      mockPrismaService.supplierPayment.upsert.mockResolvedValue(newPayment);

      const result = await service.updateSupplierPayment(1, 1, { paid: 500 });

      expect(result.paid).toBe(500);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSupplierPayment(999, 1, { paid: 500 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when supplier not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSupplierPayment(1, 999, { paid: 500 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
