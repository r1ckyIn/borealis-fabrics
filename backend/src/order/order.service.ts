import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CodeGeneratorService,
  CodePrefix,
} from '../common/services/code-generator.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  QueryOrderDto,
  AddOrderItemDto,
  UpdateOrderItemDto,
  UpdateItemStatusDto,
  UpdateCustomerPaymentDto,
  UpdateSupplierPaymentDto,
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
  ORDER_INCLUDE_LIST,
  ORDER_INCLUDE_DETAIL,
  ORDER_INCLUDE_UPDATE,
  ORDER_INCLUDE_PAYMENT,
  ORDER_ITEM_INCLUDE_BASIC,
  ORDER_ITEM_INCLUDE_WITH_TIMELINE,
  TIMELINE_INCLUDE_ORDER,
  TIMELINE_INCLUDE_ITEM,
  SUPPLIER_PAYMENT_INCLUDE,
} from './order.includes';
import {
  validateCustomerExists,
  validateFabricExists,
  validateSupplierExists,
  validateQuoteExists,
  validateOrderExists,
  validateOrderItemExists,
  extractUniqueIds,
  validateEntityIds,
} from './order.validators';
import {
  Order,
  OrderItem,
  OrderTimeline,
  SupplierPayment,
  Prisma,
} from '@prisma/client';
import {
  PaginatedResult,
  buildPaginationArgs,
  buildPaginatedResult,
} from '../common/common.module';

const MAX_CODE_GENERATION_RETRIES = 3;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGeneratorService: CodeGeneratorService,
  ) {}

  /**
   * Create a new order with items.
   * - Validates customer existence
   * - Validates all fabric IDs
   * - Validates supplier IDs if provided
   * - Generates order code (ORD-YYMM-NNNN)
   * - Creates order and items in transaction
   * - Calculates totalAmount from items
   * - Initial status: INQUIRY
   */
  async create(createDto: CreateOrderDto): Promise<Order> {
    this.logger.debug(`Create order called with: ${JSON.stringify(createDto)}`);

    // Validate all references before starting transaction
    await validateCustomerExists(this.prisma, createDto.customerId);

    // Extract and validate all IDs from items
    const fabricIds = extractUniqueIds(createDto.items, 'fabricId');
    const supplierIds = extractUniqueIds(createDto.items, 'supplierId');
    const quoteIds = extractUniqueIds(createDto.items, 'quoteId');

    await Promise.all([
      validateEntityIds(
        this.prisma,
        'Fabric',
        fabricIds,
        this.prisma.fabric.findMany.bind(this.prisma.fabric),
      ),
      supplierIds.length > 0
        ? validateEntityIds(
            this.prisma,
            'Supplier',
            supplierIds,
            this.prisma.supplier.findMany.bind(this.prisma.supplier),
          )
        : Promise.resolve(new Set<number>()),
      quoteIds.length > 0
        ? validateEntityIds(
            this.prisma,
            'Quote',
            quoteIds,
            this.prisma.quote.findMany.bind(this.prisma.quote),
            false,
          )
        : Promise.resolve(new Set<number>()),
    ]);

    // Calculate total amount from items
    const totalAmount = createDto.items.reduce((sum, item) => {
      return sum + item.quantity * item.salePrice;
    }, 0);

    // Retry loop for handling order code conflicts
    for (let attempt = 1; attempt <= MAX_CODE_GENERATION_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // Generate order code
          const orderCode = await this.codeGeneratorService.generateCode(
            CodePrefix.ORDER,
          );

          // Create order with items
          const order = await tx.order.create({
            data: {
              orderCode,
              customerId: createDto.customerId,
              status: OrderItemStatus.INQUIRY,
              totalAmount,
              customerPaid: 0,
              customerPayStatus: CustomerPayStatus.UNPAID,
              deliveryAddress: createDto.deliveryAddress,
              notes: createDto.notes,
              items: {
                create: createDto.items.map((item) => ({
                  fabricId: item.fabricId,
                  supplierId: item.supplierId,
                  quoteId: item.quoteId,
                  quantity: item.quantity,
                  salePrice: item.salePrice,
                  purchasePrice: item.purchasePrice,
                  subtotal: item.quantity * item.salePrice,
                  status: OrderItemStatus.INQUIRY,
                  deliveryDate: item.deliveryDate
                    ? new Date(item.deliveryDate)
                    : undefined,
                  notes: item.notes,
                })),
              },
            },
            include: {
              items: true,
              customer: true,
            },
          });

          // Create timeline entries for each item
          await tx.orderTimeline.createMany({
            data: order.items.map((item) => ({
              orderItemId: item.id,
              fromStatus: null,
              toStatus: OrderItemStatus.INQUIRY,
              remark: 'Order created',
            })),
          });

          return order;
        });
      } catch (error) {
        const prismaError = error as { code?: string };
        // P2002 is Prisma's unique constraint violation error code
        if (prismaError.code === 'P2002') {
          if (attempt < MAX_CODE_GENERATION_RETRIES) {
            this.logger.warn(
              `Order code conflict detected, retrying (${attempt}/${MAX_CODE_GENERATION_RETRIES})`,
            );
            continue;
          }
          // Max retries reached with P2002 error
          throw new Error('Failed to create order after maximum retries');
        }
        throw error;
      }
    }

    // This should never be reached due to the throw in catch block
    throw new Error('Failed to create order after maximum retries');
  }

  /**
   * Find all orders with pagination, filtering, and search.
   */
  async findAll(query: QueryOrderDto): Promise<PaginatedResult<Order>> {
    this.logger.debug(`FindAll orders called with: ${JSON.stringify(query)}`);

    // Build where clause
    const where: Prisma.OrderWhereInput = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerPayStatus) {
      where.customerPayStatus = query.customerPayStatus;
    }

    // Filter by fabricId through items relation
    if (query.fabricId) {
      where.items = {
        some: {
          fabricId: query.fabricId,
        },
      };
    }

    // Keyword search (order code or customer company name)
    if (query.keyword) {
      where.OR = [
        { orderCode: { contains: query.keyword } },
        { customer: { companyName: { contains: query.keyword } } },
      ];
    }

    // Created date range filter
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) {
        where.createdAt.gte = new Date(query.createdFrom);
      }
      if (query.createdTo) {
        where.createdAt.lte = new Date(query.createdTo);
      }
    }

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // Execute queries
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        ...paginationArgs,
        orderBy,
        include: ORDER_INCLUDE_LIST,
      }),
      this.prisma.order.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Find an order by ID with full details.
   */
  async findOne(id: number): Promise<Order> {
    this.logger.debug(`FindOne order called with id: ${id}`);

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE_DETAIL,
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  /**
   * Update an order's basic information.
   * Only basic fields can be updated (customer, address, notes).
   * Items are managed through separate endpoints.
   */
  async update(id: number, updateDto: UpdateOrderDto): Promise<Order> {
    this.logger.debug(
      `Update order called with id: ${id}, data: ${JSON.stringify(updateDto)}`,
    );

    // Verify order exists
    await validateOrderExists(this.prisma, id);

    // Validate new customer if provided
    if (updateDto.customerId !== undefined) {
      await validateCustomerExists(this.prisma, updateDto.customerId);
    }

    // Build update data - only include defined fields
    const data: Prisma.OrderUpdateInput = {};
    if (updateDto.customerId !== undefined) {
      data.customer = { connect: { id: updateDto.customerId } };
    }
    if (updateDto.deliveryAddress !== undefined) {
      data.deliveryAddress = updateDto.deliveryAddress;
    }
    if (updateDto.notes !== undefined) {
      data.notes = updateDto.notes;
    }

    return this.prisma.order.update({
      where: { id },
      data,
      include: ORDER_INCLUDE_UPDATE,
    });
  }

  /**
   * Delete an order.
   * Only allowed when status is INQUIRY and no payment records exist.
   * Uses atomic conditional delete to prevent race conditions.
   */
  async remove(id: number): Promise<void> {
    this.logger.debug(`Remove order called with id: ${id}`);

    // Atomic conditional delete: only delete if status is INQUIRY and customerPaid is 0
    // This prevents TOCTOU race conditions where status might change between check and delete
    const deleteResult = await this.prisma.order.deleteMany({
      where: {
        id,
        status: OrderItemStatus.INQUIRY,
        customerPaid: 0,
      },
    });

    if (deleteResult.count === 0) {
      // Deletion failed - determine reason by checking the order
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: {
          supplierPayments: true,
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      // Check status is INQUIRY
      if ((order.status as OrderItemStatus) !== OrderItemStatus.INQUIRY) {
        throw new BadRequestException(
          'Cannot delete order - only INQUIRY status orders can be deleted',
        );
      }

      // Check for actual payment records (customerPaid > 0 or any supplier has paid > 0)
      const hasPaymentRecords =
        Number(order.customerPaid) > 0 ||
        order.supplierPayments?.some((sp) => Number(sp.paid) > 0);

      if (hasPaymentRecords) {
        throw new ConflictException(
          'Cannot delete order - has payment records',
        );
      }

      // If we reach here, conditions matched but delete still failed (unexpected)
      throw new ConflictException('Cannot delete order - unexpected condition');
    }
  }

  /**
   * Recalculate and update order aggregate status.
   * Called after item status changes.
   */
  async updateAggregateStatus(orderId: number): Promise<void> {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: { status: true },
    });

    const statuses = items.map((item) => item.status as OrderItemStatus);
    const aggregateStatus = calculateAggregateStatus(statuses);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: aggregateStatus },
    });
  }

  /**
   * Recalculate and update order total amount.
   * Called after item changes.
   */
  async updateTotalAmount(orderId: number): Promise<void> {
    const result = await this.prisma.orderItem.aggregate({
      where: { orderId },
      _sum: { subtotal: true },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: result._sum.subtotal ?? 0 },
    });
  }

  // ============================================================
  // Order Items Methods (3.2.6 - 3.2.12)
  // ============================================================

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
  // Payment Methods (3.2.15 - 3.2.17)
  // ============================================================

  /**
   * Update customer payment information (3.2.15).
   */
  async updateCustomerPayment(
    orderId: number,
    dto: UpdateCustomerPaymentDto,
  ): Promise<Order> {
    this.logger.debug(`UpdateCustomerPayment called for orderId: ${orderId}`);

    await validateOrderExists(this.prisma, orderId);

    const updateData = this.buildCustomerPaymentUpdateData(dto);

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: ORDER_INCLUDE_PAYMENT,
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
   * Uses transaction with upsert for atomic operation to prevent TOCTOU race conditions.
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

      return tx.supplierPayment.upsert({
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
    });
  }

  // ============================================================
  // Helper Methods
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
