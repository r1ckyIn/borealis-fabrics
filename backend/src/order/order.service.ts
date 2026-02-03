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
import { Order, Prisma } from '@prisma/client';
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

    // Validate customer exists and is active
    const customer = await this.prisma.customer.findFirst({
      where: { id: createDto.customerId, isActive: true },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${createDto.customerId} not found`,
      );
    }

    // Collect all fabric IDs from items
    const fabricIds = [
      ...new Set(createDto.items.map((item) => item.fabricId)),
    ];

    // Validate all fabrics exist and are active
    const fabrics = await this.prisma.fabric.findMany({
      where: { id: { in: fabricIds }, isActive: true },
      select: { id: true },
    });
    const foundFabricIds = new Set(fabrics.map((f) => f.id));
    const missingFabricIds = fabricIds.filter((id) => !foundFabricIds.has(id));
    if (missingFabricIds.length > 0) {
      throw new NotFoundException(
        `Fabrics not found: ${missingFabricIds.join(', ')}`,
      );
    }

    // Collect supplier IDs from items (if any)
    const supplierIds = [
      ...new Set(
        createDto.items
          .filter((item) => item.supplierId !== undefined)
          .map((item) => item.supplierId as number),
      ),
    ];

    // Validate suppliers if any
    if (supplierIds.length > 0) {
      const suppliers = await this.prisma.supplier.findMany({
        where: { id: { in: supplierIds }, isActive: true },
        select: { id: true },
      });
      const foundSupplierIds = new Set(suppliers.map((s) => s.id));
      const missingSupplierIds = supplierIds.filter(
        (id) => !foundSupplierIds.has(id),
      );
      if (missingSupplierIds.length > 0) {
        throw new NotFoundException(
          `Suppliers not found: ${missingSupplierIds.join(', ')}`,
        );
      }
    }

    // Collect quote IDs from items (if any)
    const quoteIds = [
      ...new Set(
        createDto.items
          .filter((item) => item.quoteId !== undefined)
          .map((item) => item.quoteId as number),
      ),
    ];

    // Validate quotes if any
    if (quoteIds.length > 0) {
      const quotes = await this.prisma.quote.findMany({
        where: { id: { in: quoteIds } },
        select: { id: true },
      });
      const foundQuoteIds = new Set(quotes.map((q) => q.id));
      const missingQuoteIds = quoteIds.filter((id) => !foundQuoteIds.has(id));
      if (missingQuoteIds.length > 0) {
        throw new NotFoundException(
          `Quotes not found: ${missingQuoteIds.join(', ')}`,
        );
      }
    }

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

    // Include relations
    const include = {
      customer: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          fabricId: true,
          quantity: true,
          salePrice: true,
          subtotal: true,
          status: true,
        },
      },
    };

    // Execute queries
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        ...paginationArgs,
        orderBy,
        include,
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
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            phone: true,
            email: true,
          },
        },
        items: {
          include: {
            fabric: {
              select: {
                id: true,
                fabricCode: true,
                name: true,
                composition: true,
              },
            },
            supplier: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                phone: true,
              },
            },
            quote: {
              select: {
                id: true,
                quoteCode: true,
              },
            },
            timelines: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        supplierPayments: true,
      },
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

    // Find existing order
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Validate new customer if provided
    if (updateDto.customerId !== undefined) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: updateDto.customerId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${updateDto.customerId} not found`,
        );
      }
    }

    // Build update data
    const data: {
      customerId?: number;
      deliveryAddress?: string;
      notes?: string;
    } = {};
    if (updateDto.customerId !== undefined) {
      data.customerId = updateDto.customerId;
    }
    if (updateDto.deliveryAddress !== undefined) {
      data.deliveryAddress = updateDto.deliveryAddress;
    }
    if (updateDto.notes !== undefined) {
      data.notes = updateDto.notes;
    }

    // Update and return with includes
    return this.prisma.order.update({
      where: { id },
      data,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            phone: true,
            email: true,
          },
        },
        items: {
          include: {
            fabric: {
              select: {
                id: true,
                fabricCode: true,
                name: true,
                composition: true,
              },
            },
            supplier: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                phone: true,
              },
            },
            quote: {
              select: {
                id: true,
                quoteCode: true,
              },
            },
            timelines: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        supplierPayments: true,
      },
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
}
