import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../file/file.service';
import { UpdateCustomerPaymentDto, UpdateSupplierPaymentDto } from './dto';
import { CustomerPayStatus } from './enums/order-status.enum';
import {
  ORDER_INCLUDE_PAYMENT,
  SUPPLIER_PAYMENT_INCLUDE,
  PAYMENT_RECORD_INCLUDE_VOUCHERS,
} from './order.includes';
import {
  validateOrderExists,
  validateSupplierExists,
} from './order.validators';
import { Order, SupplierPayment, Prisma } from '@prisma/client';

@Injectable()
export class OrderPaymentService {
  private readonly logger = new Logger(OrderPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
  ) {}

  /**
   * Update customer payment information (3.2.15).
   * Creates a PaymentRecord + PaymentVouchers atomically with the order update.
   */
  async updateCustomerPayment(
    orderId: number,
    dto: UpdateCustomerPaymentDto,
  ): Promise<Order> {
    this.logger.debug(`UpdateCustomerPayment called for orderId: ${orderId}`);

    return this.prisma.$transaction(async (tx) => {
      await validateOrderExists(tx, orderId);

      // Create payment record for audit trail
      const paymentRecord = await tx.paymentRecord.create({
        data: {
          orderId,
          type: 'customer',
          amount: dto.customerPaid ?? 0,
          payMethod: dto.customerPayMethod,
          remark: dto.notes,
          operatorId: undefined,
        },
      });

      // Create voucher entries linking files to payment record
      const voucherData = dto.voucherFileIds.map(
        (fileId: number, index: number) => ({
          paymentRecordId: paymentRecord.id,
          fileId,
          remark: dto.voucherRemarks?.[index] ?? null,
        }),
      );
      await tx.paymentVoucher.createMany({ data: voucherData });

      // Update order payment fields
      const updateData = this.buildCustomerPaymentUpdateData(dto);
      return tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: ORDER_INCLUDE_PAYMENT,
      });
    });
  }

  /**
   * Get supplier payments for an order (3.2.16).
   */
  async getSupplierPayments(orderId: number): Promise<SupplierPayment[]> {
    this.logger.debug(`GetSupplierPayments called for orderId: ${orderId}`);

    await validateOrderExists(this.prisma, orderId);

    return this.prisma.supplierPayment.findMany({
      where: { orderId },
      include: SUPPLIER_PAYMENT_INCLUDE,
    });
  }

  /**
   * Update supplier payment information (3.2.17).
   * Creates a PaymentRecord + PaymentVouchers atomically with the upsert.
   */
  async updateSupplierPayment(
    orderId: number,
    supplierId: number,
    dto: UpdateSupplierPaymentDto,
  ): Promise<SupplierPayment> {
    this.logger.debug(
      `UpdateSupplierPayment called for orderId: ${orderId}, supplierId: ${supplierId}`,
    );

    return this.prisma.$transaction(async (tx) => {
      await validateOrderExists(tx, orderId);
      await validateSupplierExists(tx, supplierId);

      const updateData = this.buildSupplierPaymentUpdateData(dto);

      // Upsert supplier payment (existing logic)
      const supplierPayment = await tx.supplierPayment.upsert({
        where: { orderId_supplierId: { orderId, supplierId } },
        create: {
          orderId,
          supplierId,
          payable: 0,
          paid: dto.paid ?? 0,
          payStatus: dto.payStatus ?? CustomerPayStatus.UNPAID,
          payMethod: dto.payMethod,
          creditDays: dto.creditDays,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        },
        update: updateData,
        include: SUPPLIER_PAYMENT_INCLUDE,
      });

      // Create payment record for audit trail
      const paymentRecord = await tx.paymentRecord.create({
        data: {
          orderId,
          type: 'supplier',
          supplierId,
          amount: dto.paid ?? 0,
          payMethod: dto.payMethod,
          remark: dto.notes,
          operatorId: undefined,
        },
      });

      // Create voucher entries linking files to payment record
      const voucherData = dto.voucherFileIds.map(
        (fileId: number, index: number) => ({
          paymentRecordId: paymentRecord.id,
          fileId,
          remark: dto.voucherRemarks?.[index] ?? null,
        }),
      );
      await tx.paymentVoucher.createMany({ data: voucherData });

      return supplierPayment;
    });
  }

  /**
   * Get payment vouchers for an order.
   * Returns all payment records with their attached voucher files.
   * Resolves file keys to full URLs via FileService.
   */
  async getPaymentVouchers(orderId: number) {
    await validateOrderExists(this.prisma, orderId);

    const records = await this.prisma.paymentRecord.findMany({
      where: { orderId },
      include: PAYMENT_RECORD_INCLUDE_VOUCHERS,
      orderBy: { createdAt: 'desc' },
    });

    // Resolve file keys to full URLs (DB stores key-only)
    for (const record of records) {
      for (const voucher of record.vouchers) {
        if (voucher.file) {
          voucher.file.url = await this.fileService.getFileUrl(
            voucher.file.url,
          );
        }
      }
    }

    return records;
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Build update data for customer payment.
   */
  private buildCustomerPaymentUpdateData(
    dto: UpdateCustomerPaymentDto,
  ): Prisma.OrderUpdateInput {
    const updateData: Prisma.OrderUpdateInput = {};

    if (dto.customerPaid !== undefined) {
      updateData.customerPaid = dto.customerPaid;
    }
    if (dto.customerPayStatus !== undefined) {
      updateData.customerPayStatus = dto.customerPayStatus;
    }
    if (dto.customerPayMethod !== undefined) {
      updateData.customerPayMethod = dto.customerPayMethod;
    }
    if (dto.customerCreditDays !== undefined) {
      updateData.customerCreditDays = dto.customerCreditDays;
    }
    if (dto.customerPaidAt !== undefined) {
      updateData.customerPaidAt = new Date(dto.customerPaidAt);
    }

    return updateData;
  }

  /**
   * Build update data for supplier payment.
   */
  private buildSupplierPaymentUpdateData(
    dto: UpdateSupplierPaymentDto,
  ): Prisma.SupplierPaymentUpdateInput {
    const updateData: Prisma.SupplierPaymentUpdateInput = {};

    if (dto.paid !== undefined) {
      updateData.paid = dto.paid;
    }
    if (dto.payStatus !== undefined) {
      updateData.payStatus = dto.payStatus;
    }
    if (dto.payMethod !== undefined) {
      updateData.payMethod = dto.payMethod;
    }
    if (dto.creditDays !== undefined) {
      updateData.creditDays = dto.creditDays;
    }
    if (dto.paidAt !== undefined) {
      updateData.paidAt = new Date(dto.paidAt);
    }

    return updateData;
  }
}
