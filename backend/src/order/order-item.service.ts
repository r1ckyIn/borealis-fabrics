import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddOrderItemDto,
  UpdateOrderItemDto,
  UpdateItemStatusDto,
  CancelItemDto,
  RestoreItemDto,
} from './dto';
import {
  OrderItemStatus,
  CustomerPayStatus,
  calculateAggregateStatus,
  isValidStatusTransition,
  canModifyItem,
  canCancelItem,
  canRestoreItem,
} from './enums/order-status.enum';
import {
  ORDER_ITEM_INCLUDE_BASIC,
  ORDER_ITEM_INCLUDE_WITH_TIMELINE,
  TIMELINE_INCLUDE_ORDER,
  TIMELINE_INCLUDE_ITEM,
} from './order.includes';
import {
  validateFabricExists,
  validateSupplierExists,
  validateQuoteExists,
  validateOrderExists,
  validateOrderItemExists,
} from './order.validators';
import { OrderItem, OrderTimeline, Prisma } from '@prisma/client';

@Injectable()
export class OrderItemService {
  private readonly logger = new Logger(OrderItemService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all items for an order (3.2.6).
   */
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    this.logger.debug(`GetOrderItems called for orderId: ${orderId}`);

    // Verify order exists
    await validateOrderExists(this.prisma, orderId);

    return this.prisma.orderItem.findMany({
      where: { orderId },
      include: ORDER_ITEM_INCLUDE_WITH_TIMELINE,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Add a new item to an order (3.2.7).
   * Creates the item, updates order total, and records timeline.
   */
  async addOrderItem(
    orderId: number,
    dto: AddOrderItemDto,
  ): Promise<OrderItem> {
    this.logger.debug(
      `AddOrderItem called for orderId: ${orderId}, data: ${JSON.stringify(dto)}`,
    );

    // Verify order exists and check status
    const order = await validateOrderExists(this.prisma, orderId);

    if (!canModifyItem(order.status as OrderItemStatus)) {
      throw new BadRequestException(
        `Cannot add items - order status is ${order.status}. Only INQUIRY and PENDING orders can have items added.`,
      );
    }

    // Validate references
    await validateFabricExists(this.prisma, dto.fabricId);
    if (dto.supplierId !== undefined) {
      await validateSupplierExists(this.prisma, dto.supplierId);
    }
    if (dto.quoteId !== undefined) {
      await validateQuoteExists(this.prisma, dto.quoteId);
    }

    // Calculate subtotal
    const subtotal = dto.quantity * dto.salePrice;

    // Create item and update order in transaction
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.create({
        data: {
          orderId,
          fabricId: dto.fabricId,
          supplierId: dto.supplierId,
          quoteId: dto.quoteId,
          quantity: dto.quantity,
          salePrice: dto.salePrice,
          purchasePrice: dto.purchasePrice,
          subtotal,
          status: OrderItemStatus.INQUIRY,
          deliveryDate: dto.deliveryDate
            ? new Date(dto.deliveryDate)
            : undefined,
          notes: dto.notes,
        },
        include: ORDER_ITEM_INCLUDE_BASIC,
      });

      // Create timeline entry
      await tx.orderTimeline.create({
        data: {
          orderItemId: item.id,
          fromStatus: null,
          toStatus: OrderItemStatus.INQUIRY,
          remark: 'Item added to order',
        },
      });

      // Update supplier payment if supplier is specified
      if (dto.supplierId !== undefined && dto.purchasePrice !== undefined) {
        await this.upsertSupplierPayment(tx, orderId, dto.supplierId);
      }

      // Update order total and aggregate status
      await this.recalculateOrderTotals(tx, orderId);

      return item;
    });
  }

  /**
   * Update an order item (3.2.8).
   * Only allowed when item status is INQUIRY or PENDING.
   */
  async updateOrderItem(
    orderId: number,
    itemId: number,
    dto: UpdateOrderItemDto,
  ): Promise<OrderItem> {
    this.logger.debug(
      `UpdateOrderItem called for orderId: ${orderId}, itemId: ${itemId}`,
    );

    // Validate references outside transaction for better error messages
    if (dto.supplierId !== undefined) {
      await validateSupplierExists(this.prisma, dto.supplierId);
    }
    if (dto.quoteId !== undefined) {
      await validateQuoteExists(this.prisma, dto.quoteId);
    }

    // Update in transaction with atomic status check
    return this.prisma.$transaction(async (tx) => {
      // Find and verify item inside transaction
      const item = await validateOrderItemExists(tx, orderId, itemId);

      // Check status inside transaction to prevent race condition
      if (!canModifyItem(item.status as OrderItemStatus)) {
        throw new BadRequestException(
          `Cannot modify item - status is ${item.status}. Only INQUIRY and PENDING items can be modified.`,
        );
      }

      // Build update data
      const updateData = this.buildOrderItemUpdateData(dto, item);
      const oldSupplierId = item.supplierId;

      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: updateData,
        include: ORDER_ITEM_INCLUDE_BASIC,
      });

      // Update supplier payments if supplier changed
      if (dto.supplierId !== undefined && dto.supplierId !== oldSupplierId) {
        // Recalculate for old supplier
        if (oldSupplierId !== null) {
          await this.upsertSupplierPayment(tx, orderId, oldSupplierId);
        }
        // Recalculate for new supplier
        await this.upsertSupplierPayment(tx, orderId, dto.supplierId);
      } else if (
        dto.quantity !== undefined ||
        dto.purchasePrice !== undefined
      ) {
        // Recalculate for current supplier if quantity or price changed
        if (updatedItem.supplierId !== null) {
          await this.upsertSupplierPayment(tx, orderId, updatedItem.supplierId);
        }
      }

      // Update order totals
      await this.recalculateOrderTotals(tx, orderId);

      return updatedItem;
    });
  }

  /**
   * Delete an order item (3.2.9).
   * Only allowed when item status is INQUIRY or PENDING.
   */
  async removeOrderItem(orderId: number, itemId: number): Promise<void> {
    this.logger.debug(
      `RemoveOrderItem called for orderId: ${orderId}, itemId: ${itemId}`,
    );

    // Delete in transaction with atomic status check
    await this.prisma.$transaction(async (tx) => {
      // Atomic delete with status condition to prevent race condition
      const deleteResult = await tx.orderItem.deleteMany({
        where: {
          id: itemId,
          orderId,
          status: { in: [OrderItemStatus.INQUIRY, OrderItemStatus.PENDING] },
        },
      });

      // If no rows deleted, check why
      if (deleteResult.count === 0) {
        const item = await tx.orderItem.findFirst({
          where: { id: itemId, orderId },
        });
        if (!item) {
          throw new NotFoundException(
            `Order item with ID ${itemId} not found in order ${orderId}`,
          );
        }
        // Item exists but status doesn't allow deletion
        throw new BadRequestException(
          `Cannot delete item - status is ${item.status}. Only INQUIRY and PENDING items can be deleted.`,
        );
      }

      // Get the deleted item's supplier ID for payment recalculation
      // Since item is deleted, we need to recalculate all supplier payments
      const remainingItems = await tx.orderItem.findMany({
        where: { orderId },
        select: { supplierId: true },
      });
      const supplierIds = [
        ...new Set(
          remainingItems
            .map((i) => i.supplierId)
            .filter((id): id is number => id !== null),
        ),
      ];

      // Recalculate supplier payments
      for (const supplierId of supplierIds) {
        await this.upsertSupplierPayment(tx, orderId, supplierId);
      }

      // Clean up supplier payments that no longer have items
      await tx.supplierPayment.deleteMany({
        where: {
          orderId,
          supplierId: { notIn: supplierIds.length > 0 ? supplierIds : [-1] },
        },
      });

      // Update order totals
      await this.recalculateOrderTotals(tx, orderId);
    });
  }

  /**
   * Update an order item's status (3.2.10).
   * Validates status transition and records timeline.
   */
  async updateItemStatus(
    orderId: number,
    itemId: number,
    dto: UpdateItemStatusDto,
  ): Promise<OrderItem> {
    this.logger.debug(
      `UpdateItemStatus called for orderId: ${orderId}, itemId: ${itemId}, newStatus: ${dto.status}`,
    );

    const newStatus = dto.status;

    return this.prisma.$transaction(async (tx) => {
      const item = await validateOrderItemExists(tx, orderId, itemId);
      const currentStatus = item.status as OrderItemStatus;

      if (!isValidStatusTransition(currentStatus, newStatus)) {
        throw new BadRequestException(
          `Invalid status transition from ${currentStatus} to ${newStatus}`,
        );
      }

      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: { status: newStatus, prevStatus: currentStatus },
        include: ORDER_ITEM_INCLUDE_BASIC,
      });

      await this.createTimelineEntry(
        tx,
        itemId,
        currentStatus,
        newStatus,
        dto.remark,
      );
      await this.updateAggregateStatusInTx(tx, orderId);

      return updatedItem;
    });
  }

  /**
   * Cancel an order item (3.2.11).
   * Stores previous status for potential restoration.
   */
  async cancelOrderItem(
    orderId: number,
    itemId: number,
    dto: CancelItemDto,
  ): Promise<OrderItem> {
    this.logger.debug(
      `CancelOrderItem called for orderId: ${orderId}, itemId: ${itemId}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const item = await validateOrderItemExists(tx, orderId, itemId);
      const currentStatus = item.status as OrderItemStatus;

      if (!canCancelItem(currentStatus)) {
        throw new BadRequestException('Item is already cancelled');
      }

      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: { status: OrderItemStatus.CANCELLED, prevStatus: currentStatus },
        include: ORDER_ITEM_INCLUDE_BASIC,
      });

      await this.createTimelineEntry(
        tx,
        itemId,
        currentStatus,
        OrderItemStatus.CANCELLED,
        dto.reason ?? 'Item cancelled',
      );
      await this.updateAggregateStatusInTx(tx, orderId);

      return updatedItem;
    });
  }

  /**
   * Restore a cancelled order item (3.2.12).
   * Restores to previous status if available.
   */
  async restoreOrderItem(
    orderId: number,
    itemId: number,
    dto: RestoreItemDto,
  ): Promise<OrderItem> {
    this.logger.debug(
      `RestoreOrderItem called for orderId: ${orderId}, itemId: ${itemId}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const item = await validateOrderItemExists(tx, orderId, itemId);
      const currentStatus = item.status as OrderItemStatus;
      const prevStatus = item.prevStatus as OrderItemStatus | null;

      if (!canRestoreItem(currentStatus, prevStatus)) {
        if (currentStatus !== OrderItemStatus.CANCELLED) {
          throw new BadRequestException('Only cancelled items can be restored');
        }
        throw new BadRequestException(
          'Cannot restore - no previous status recorded',
        );
      }

      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: { status: prevStatus!, prevStatus: null },
        include: ORDER_ITEM_INCLUDE_BASIC,
      });

      await this.createTimelineEntry(
        tx,
        itemId,
        OrderItemStatus.CANCELLED,
        prevStatus!,
        dto.reason ?? `Item restored to ${prevStatus}`,
      );
      await this.updateAggregateStatusInTx(tx, orderId);

      return updatedItem;
    });
  }

  // ============================================================
  // Timeline Methods (3.2.13 - 3.2.14)
  // ============================================================

  /**
   * Get timeline for an entire order (3.2.13).
   * Aggregates all item timelines.
   */
  async getOrderTimeline(orderId: number): Promise<OrderTimeline[]> {
    this.logger.debug(`GetOrderTimeline called for orderId: ${orderId}`);

    await validateOrderExists(this.prisma, orderId);

    return this.prisma.orderTimeline.findMany({
      where: { orderItem: { orderId } },
      include: TIMELINE_INCLUDE_ORDER,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get timeline for a specific order item (3.2.14).
   */
  async getItemTimeline(
    orderId: number,
    itemId: number,
  ): Promise<OrderTimeline[]> {
    this.logger.debug(
      `GetItemTimeline called for orderId: ${orderId}, itemId: ${itemId}`,
    );

    await validateOrderItemExists(this.prisma, orderId, itemId);

    return this.prisma.orderTimeline.findMany({
      where: { orderItemId: itemId },
      include: TIMELINE_INCLUDE_ITEM,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Build update data for order item.
   */
  private buildOrderItemUpdateData(
    dto: UpdateOrderItemDto,
    item: { quantity: unknown; salePrice: unknown },
  ): Prisma.OrderItemUpdateInput {
    const updateData: Prisma.OrderItemUpdateInput = {};

    if (dto.supplierId !== undefined) {
      updateData.supplier = { connect: { id: dto.supplierId } };
    }
    if (dto.quoteId !== undefined) {
      updateData.quote = { connect: { id: dto.quoteId } };
    }
    if (dto.quantity !== undefined) {
      updateData.quantity = dto.quantity;
    }
    if (dto.salePrice !== undefined) {
      updateData.salePrice = dto.salePrice;
    }
    if (dto.purchasePrice !== undefined) {
      updateData.purchasePrice = dto.purchasePrice;
    }
    if (dto.deliveryDate !== undefined) {
      updateData.deliveryDate = new Date(dto.deliveryDate);
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // Recalculate subtotal
    const newQuantity = dto.quantity ?? Number(item.quantity);
    const newSalePrice = dto.salePrice ?? Number(item.salePrice);
    updateData.subtotal = newQuantity * newSalePrice;

    return updateData;
  }

  /**
   * Create a timeline entry for status change.
   */
  private async createTimelineEntry(
    tx: Prisma.TransactionClient,
    orderItemId: number,
    fromStatus: OrderItemStatus | null,
    toStatus: OrderItemStatus,
    remark?: string,
  ): Promise<void> {
    await tx.orderTimeline.create({
      data: {
        orderItemId,
        fromStatus,
        toStatus,
        remark: remark ?? `Status changed to ${toStatus}`,
      },
    });
  }

  /**
   * Upsert supplier payment record and recalculate payable amount.
   */
  private async upsertSupplierPayment(
    tx: Prisma.TransactionClient,
    orderId: number,
    supplierId: number,
  ): Promise<void> {
    // Calculate payable based on purchase prices for this supplier
    const items = await tx.orderItem.findMany({
      where: {
        orderId,
        supplierId,
        status: { not: OrderItemStatus.CANCELLED },
      },
      select: { quantity: true, purchasePrice: true },
    });

    const payable = items.reduce((sum, item) => {
      const purchasePrice = item.purchasePrice ? Number(item.purchasePrice) : 0;
      return sum + Number(item.quantity) * purchasePrice;
    }, 0);

    // Upsert supplier payment
    await tx.supplierPayment.upsert({
      where: {
        orderId_supplierId: { orderId, supplierId },
      },
      create: {
        orderId,
        supplierId,
        payable,
        paid: 0,
        payStatus: CustomerPayStatus.UNPAID,
      },
      update: {
        payable,
      },
    });

    // Clean up supplier payment if no items for this supplier
    if (payable === 0) {
      const payment = await tx.supplierPayment.findUnique({
        where: { orderId_supplierId: { orderId, supplierId } },
      });
      if (payment && Number(payment.paid) === 0) {
        await tx.supplierPayment.delete({
          where: { id: payment.id },
        });
      }
    }
  }

  /**
   * Recalculate order totals (totalAmount and aggregate status).
   */
  private async recalculateOrderTotals(
    tx: Prisma.TransactionClient,
    orderId: number,
  ): Promise<void> {
    // Calculate total amount
    const amountResult = await tx.orderItem.aggregate({
      where: { orderId },
      _sum: { subtotal: true },
    });

    // Get all item statuses for aggregate calculation
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { status: true },
    });

    const statuses = items.map((item) => item.status as OrderItemStatus);
    const aggregateStatus = calculateAggregateStatus(statuses);

    // Update order
    await tx.order.update({
      where: { id: orderId },
      data: {
        totalAmount: amountResult._sum.subtotal ?? 0,
        status: aggregateStatus,
      },
    });
  }

  /**
   * Update aggregate status in transaction context.
   */
  private async updateAggregateStatusInTx(
    tx: Prisma.TransactionClient,
    orderId: number,
  ): Promise<void> {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { status: true },
    });

    const statuses = items.map((item) => item.status as OrderItemStatus);
    const aggregateStatus = calculateAggregateStatus(statuses);

    await tx.order.update({
      where: { id: orderId },
      data: { status: aggregateStatus },
    });
  }
}
