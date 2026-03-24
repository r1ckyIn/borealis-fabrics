import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrderPaymentService } from './order-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrderItemStatus,
  CustomerPayStatus,
  PaymentMethod,
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
    paymentRecord: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    paymentVoucher: {
      createMany: jest.Mock;
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
      paymentRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      paymentVoucher: {
        createMany: jest.fn(),
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
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 1 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.updateCustomerPayment(1, {
        customerPaid: 1000,
        customerPayStatus: CustomerPayStatus.PARTIAL,
        voucherFileIds: [10],
      });

      expect(result.customerPaid).toBe(1000);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCustomerPayment(999, {
          customerPaid: 1000,
          voucherFileIds: [1],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create PaymentRecord with type=customer and correct amount/payMethod', async () => {
      const updatedOrder = {
        ...mockOrder,
        customerPaid: 2000,
        customerPayStatus: 'partial',
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 5 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 2,
      });

      await service.updateCustomerPayment(1, {
        customerPaid: 2000,
        customerPayMethod: PaymentMethod.BANK,
        voucherFileIds: [10, 20],
      });

      expect(mockPrismaService.paymentRecord.create).toHaveBeenCalledWith({
        data: {
          orderId: 1,
          type: 'customer',
          amount: 2000,
          payMethod: 'bank',
          remark: undefined,
          operatorId: undefined,
        },
      });
    });

    it('should create PaymentVoucher entries linking PaymentRecord to each fileId', async () => {
      const updatedOrder = { ...mockOrder, customerPaid: 1000 };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 7 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 3,
      });

      await service.updateCustomerPayment(1, {
        customerPaid: 1000,
        voucherFileIds: [10, 20, 30],
      });

      expect(mockPrismaService.paymentVoucher.createMany).toHaveBeenCalledWith({
        data: [
          { paymentRecordId: 7, fileId: 10, remark: null },
          { paymentRecordId: 7, fileId: 20, remark: null },
          { paymentRecordId: 7, fileId: 30, remark: null },
        ],
      });
    });

    it('should create all operations in same transaction', async () => {
      const updatedOrder = { ...mockOrder, customerPaid: 1000 };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 1 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 1,
      });

      await service.updateCustomerPayment(1, {
        customerPaid: 1000,
        voucherFileIds: [10],
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should store voucherRemarks when provided (index-matched to fileIds)', async () => {
      const updatedOrder = { ...mockOrder, customerPaid: 1000 };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 9 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 2,
      });

      await service.updateCustomerPayment(1, {
        customerPaid: 1000,
        voucherFileIds: [10, 20],
        voucherRemarks: ['Payment receipt', 'Bank confirmation'],
      });

      expect(mockPrismaService.paymentVoucher.createMany).toHaveBeenCalledWith({
        data: [
          { paymentRecordId: 9, fileId: 10, remark: 'Payment receipt' },
          { paymentRecordId: 9, fileId: 20, remark: 'Bank confirmation' },
        ],
      });
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
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 1 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.updateSupplierPayment(1, 1, {
        paid: 500,
        voucherFileIds: [10],
      });

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
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 1 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.updateSupplierPayment(1, 1, {
        paid: 500,
        voucherFileIds: [10],
      });

      expect(result.paid).toBe(500);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSupplierPayment(999, 1, {
          paid: 500,
          voucherFileIds: [10],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when supplier not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSupplierPayment(1, 999, {
          paid: 500,
          voucherFileIds: [10],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create PaymentRecord with type=supplier and correct supplierId', async () => {
      const upsertedPayment = {
        id: 1,
        orderId: 1,
        supplierId: 2,
        payable: 0,
        paid: 3000,
        supplier: {
          id: 2,
          companyName: 'Supplier Co',
          contactName: 'Bob',
          phone: '456',
        },
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.supplier.findFirst.mockResolvedValue({
        id: 2,
        isActive: true,
      });
      mockPrismaService.supplierPayment.upsert.mockResolvedValue(
        upsertedPayment,
      );
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 3 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 1,
      });

      await service.updateSupplierPayment(1, 2, {
        paid: 3000,
        voucherFileIds: [15],
      });

      expect(mockPrismaService.paymentRecord.create).toHaveBeenCalledWith({
        data: {
          orderId: 1,
          type: 'supplier',
          supplierId: 2,
          amount: 3000,
          payMethod: undefined,
          remark: undefined,
          operatorId: undefined,
        },
      });
    });

    it('should create PaymentVoucher entries for supplier payment', async () => {
      const upsertedPayment = {
        id: 1,
        orderId: 1,
        supplierId: 1,
        payable: 0,
        paid: 1000,
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
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 11 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 2,
      });

      await service.updateSupplierPayment(1, 1, {
        paid: 1000,
        voucherFileIds: [50, 51],
      });

      expect(mockPrismaService.paymentVoucher.createMany).toHaveBeenCalledWith({
        data: [
          { paymentRecordId: 11, fileId: 50, remark: null },
          { paymentRecordId: 11, fileId: 51, remark: null },
        ],
      });
    });

    it('should perform upsert + PaymentRecord + vouchers all in same transaction', async () => {
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
      mockPrismaService.paymentRecord.create.mockResolvedValue({ id: 1 });
      mockPrismaService.paymentVoucher.createMany.mockResolvedValue({
        count: 1,
      });

      await service.updateSupplierPayment(1, 1, {
        paid: 500,
        voucherFileIds: [10],
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.supplierPayment.upsert).toHaveBeenCalled();
      expect(mockPrismaService.paymentRecord.create).toHaveBeenCalled();
      expect(mockPrismaService.paymentVoucher.createMany).toHaveBeenCalled();
    });
  });

  describe('getPaymentVouchers', () => {
    it('should return vouchers with file details for an order', async () => {
      const mockVouchers = [
        {
          id: 1,
          orderId: 1,
          type: 'customer',
          amount: 1000,
          vouchers: [
            {
              id: 1,
              fileId: 10,
              remark: null,
              file: {
                id: 10,
                key: 'uploads/voucher1.pdf',
                url: 'http://example.com/voucher1.pdf',
                originalName: 'voucher1.pdf',
              },
            },
          ],
        },
      ];
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.paymentRecord.findMany.mockResolvedValue(mockVouchers);

      const result = await service.getPaymentVouchers(1);

      expect(result).toEqual(mockVouchers);
      expect(mockPrismaService.paymentRecord.findMany).toHaveBeenCalledWith({
        where: { orderId: 1 },
        include: {
          vouchers: {
            include: { file: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getPaymentVouchers(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
