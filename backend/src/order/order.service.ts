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
import { CreateOrderDto, UpdateOrderDto, QueryOrderDto } from './dto';
import {
  OrderItemStatus,
  CustomerPayStatus,
  calculateAggregateStatus,
} from './enums/order-status.enum';
import {
  ORDER_INCLUDE_LIST,
  ORDER_INCLUDE_DETAIL,
  ORDER_INCLUDE_UPDATE,
} from './order.includes';
import {
  validateCustomerExists,
  validateOrderExists,
  extractUniqueIds,
  validateEntityIds,
} from './order.validators';
import { Order, Prisma } from '@prisma/client';
import {
  PaginatedResult,
  buildPaginationArgs,
  buildPaginatedResult,
} from '../common/common.module';
import { getUnitForProduct, FABRIC_UNIT } from '../common/utils/product-units';

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
   * - Validates all fabric/product IDs
   * - Validates supplier IDs if provided
   * - Generates order code (ORD-YYMM-NNNN)
   * - Creates order and items in transaction
   * - Calculates totalAmount from items
   * - Initial status: PENDING
   */
  async create(createDto: CreateOrderDto): Promise<Order> {
    this.logger.debug(`Create order called with: ${JSON.stringify(createDto)}`);

    // Validate all references before starting transaction
    await validateCustomerExists(this.prisma, createDto.customerId);

    // Extract and validate all IDs from items
    const fabricIds = extractUniqueIds(createDto.items, 'fabricId');
    const productIds = extractUniqueIds(createDto.items, 'productId');
    const supplierIds = extractUniqueIds(createDto.items, 'supplierId');
    const quoteIds = extractUniqueIds(createDto.items, 'quoteId');

    await Promise.all([
      fabricIds.length > 0
        ? validateEntityIds(
            this.prisma,
            'Fabric',
            fabricIds,
            this.prisma.fabric.findMany.bind(this.prisma.fabric),
          )
        : Promise.resolve(new Set<number>()),
      productIds.length > 0
        ? validateEntityIds(
            this.prisma,
            'Product',
            productIds,
            this.prisma.product.findMany.bind(this.prisma.product),
          )
        : Promise.resolve(new Set<number>()),
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
          )
        : Promise.resolve(new Set<number>()),
    ]);

    // Build product subCategory map for unit derivation
    const productSubCategoryMap = new Map<number, string>();
    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, subCategory: true },
      });
      for (const p of products) {
        productSubCategoryMap.set(p.id, p.subCategory);
      }
    }

    // Calculate total amount from items
    const totalAmount = createDto.items.reduce((sum, item) => {
      return sum + item.quantity * item.salePrice;
    }, 0);

    // Build item data with derived units
    const itemsData = createDto.items.map((item) => {
      let unit = item.unit ?? FABRIC_UNIT;
      if (item.productId && !item.unit) {
        const subCategory = productSubCategoryMap.get(item.productId);
        if (subCategory) {
          unit = getUnitForProduct(subCategory);
        }
      }

      return {
        fabricId: item.fabricId ?? null,
        productId: item.productId ?? null,
        supplierId: item.supplierId,
        quoteId: item.quoteId,
        quantity: item.quantity,
        unit,
        salePrice: item.salePrice,
        purchasePrice: item.purchasePrice,
        subtotal: item.quantity * item.salePrice,
        status: OrderItemStatus.PENDING,
        deliveryDate: item.deliveryDate
          ? new Date(item.deliveryDate)
          : undefined,
        notes: item.notes,
      };
    });

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
              status: OrderItemStatus.PENDING,
              totalAmount,
              customerPaid: 0,
              customerPayStatus: CustomerPayStatus.UNPAID,
              deliveryAddress: createDto.deliveryAddress,
              notes: createDto.notes,
              items: {
                create: itemsData,
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
              toStatus: OrderItemStatus.PENDING,
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

    // Atomic conditional delete: only delete if status is INQUIRY or PENDING and customerPaid is 0
    // This prevents TOCTOU race conditions where status might change between check and delete
    const deleteResult = await this.prisma.order.deleteMany({
      where: {
        id,
        status: { in: [OrderItemStatus.INQUIRY, OrderItemStatus.PENDING] },
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

      // Check status is INQUIRY or PENDING
      const deletableStatuses: string[] = [
        OrderItemStatus.INQUIRY,
        OrderItemStatus.PENDING,
      ];
      if (!deletableStatuses.includes(order.status)) {
        throw new BadRequestException(
          'Cannot delete order - only INQUIRY or PENDING status orders can be deleted',
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
}
