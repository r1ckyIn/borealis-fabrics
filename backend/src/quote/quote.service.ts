import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CodeGeneratorService, CodePrefix } from '../common/services';
import { RedisService } from '../common/services/redis.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QueryQuoteDto,
  ConvertQuotesToOrderDto,
  QuoteStatus,
} from './dto';
import { OrderItemStatus } from '../order/enums/order-status.enum';
import { Quote, Order, Prisma } from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';

// Maximum retries for handling quote code conflicts
const MAX_CODE_GENERATION_RETRIES = 3;

// Reusable include configurations for quote queries
const QUOTE_LIST_INCLUDE = {
  customer: {
    select: {
      id: true,
      companyName: true,
      contactName: true,
      phone: true,
    },
  },
  fabric: {
    select: {
      id: true,
      fabricCode: true,
      name: true,
      defaultPrice: true,
    },
  },
} as const;

const QUOTE_DETAIL_INCLUDE = {
  customer: {
    select: {
      id: true,
      companyName: true,
      contactName: true,
      phone: true,
      email: true,
      wechat: true,
    },
  },
  fabric: {
    select: {
      id: true,
      fabricCode: true,
      name: true,
      material: true,
      color: true,
      defaultPrice: true,
    },
  },
} as const;

/**
 * Build date range filter for Prisma query.
 * Returns undefined if both from and to are not provided.
 */
function buildDateRangeFilter(
  from?: string,
  to?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) {
    return undefined;
  }

  const filter: { gte?: Date; lte?: Date } = {};
  if (from) {
    filter.gte = new Date(from);
  }
  if (to) {
    filter.lte = new Date(to);
  }
  return filter;
}

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGeneratorService: CodeGeneratorService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Create a new quote.
   * Validates customer and fabric existence, generates quote code.
   * Implements retry logic for handling quote code conflicts (P2002).
   */
  async create(createDto: CreateQuoteDto): Promise<Quote> {
    // Validate customer and fabric outside transaction for better error messages
    const customer = await this.prisma.customer.findFirst({
      where: { id: createDto.customerId, isActive: true },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${createDto.customerId} not found`,
      );
    }

    const fabric = await this.prisma.fabric.findFirst({
      where: { id: createDto.fabricId, isActive: true },
    });
    if (!fabric) {
      throw new NotFoundException(
        `Fabric with ID ${createDto.fabricId} not found`,
      );
    }

    // Validate validUntil is in the future
    const validUntilDate = new Date(createDto.validUntil);
    if (validUntilDate <= new Date()) {
      throw new BadRequestException('validUntil must be a future date');
    }

    // Calculate total price
    const totalPrice = createDto.quantity * createDto.unitPrice;

    // Retry loop for handling quote code conflicts
    for (let attempt = 1; attempt <= MAX_CODE_GENERATION_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // Generate quote code
          const quoteCode = await this.codeGeneratorService.generateCode(
            CodePrefix.QUOTE,
          );

          // Create quote
          return tx.quote.create({
            data: {
              quoteCode,
              customerId: createDto.customerId,
              fabricId: createDto.fabricId,
              quantity: createDto.quantity,
              unitPrice: createDto.unitPrice,
              totalPrice,
              validUntil: validUntilDate,
              status: QuoteStatus.ACTIVE,
              notes: createDto.notes,
            },
          });
        });
      } catch (error) {
        const prismaError = error as { code?: string };
        // P2002 is Prisma's unique constraint violation error code
        if (
          prismaError.code === 'P2002' &&
          attempt < MAX_CODE_GENERATION_RETRIES
        ) {
          this.logger.warn(
            `Quote code conflict detected, retrying (${attempt}/${MAX_CODE_GENERATION_RETRIES})`,
          );
          continue;
        }
        throw error;
      }
    }

    // This should never be reached due to the throw in catch block
    throw new Error('Failed to create quote after maximum retries');
  }

  /**
   * Find all quotes with optional filtering and pagination.
   */
  async findAll(query: QueryQuoteDto): Promise<PaginatedResult<Quote>> {
    // Build where clause with date range filters
    const where: Prisma.QuoteWhereInput = {
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.fabricId && { fabricId: query.fabricId }),
      ...(query.status && { status: query.status }),
      validUntil: buildDateRangeFilter(query.validFrom, query.validTo),
      createdAt: buildDateRangeFilter(query.createdFrom, query.createdTo),
    };

    // Build pagination and sort - DTO provides defaults, so nullish coalescing is only a safeguard
    const paginationArgs = buildPaginationArgs(query);
    const orderBy = {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    };

    // Execute queries in parallel
    const [items, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        ...paginationArgs,
        orderBy,
        include: QUOTE_LIST_INCLUDE,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Find a quote by ID.
   */
  async findOne(id: number): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: QUOTE_DETAIL_INCLUDE,
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    return quote;
  }

  /**
   * Update a quote.
   * Only active or expired quotes can be updated.
   * Extending validity on expired quote resets status to active.
   * Uses atomic conditional update to prevent race conditions.
   */
  async update(id: number, updateDto: UpdateQuoteDto): Promise<Quote> {
    // Validate validUntil is in the future if provided
    const newValidUntil = updateDto.validUntil
      ? new Date(updateDto.validUntil)
      : undefined;

    if (newValidUntil && newValidUntil <= new Date()) {
      throw new BadRequestException('validUntil must be a future date');
    }

    return this.prisma.$transaction(async (tx) => {
      // Fetch quote to calculate new totalPrice and check status reset requirement
      const quote = await tx.quote.findUnique({ where: { id } });

      if (!quote) {
        throw new NotFoundException(`Quote with ID ${id} not found`);
      }

      // Calculate new values with fallback to existing
      const quantity = updateDto.quantity ?? Number(quote.quantity);
      const unitPrice = updateDto.unitPrice ?? Number(quote.unitPrice);

      // Determine if status should reset to active (extending validity on expired quote)
      const shouldResetStatus =
        newValidUntil && (quote.status as QuoteStatus) === QuoteStatus.EXPIRED;

      // Build update data - only include fields that are being updated
      const data: Prisma.QuoteUpdateManyMutationInput = {
        ...(updateDto.quantity !== undefined && {
          quantity: updateDto.quantity,
        }),
        ...(updateDto.unitPrice !== undefined && {
          unitPrice: updateDto.unitPrice,
        }),
        ...(newValidUntil && { validUntil: newValidUntil }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(shouldResetStatus && { status: QuoteStatus.ACTIVE }),
        totalPrice: quantity * unitPrice,
      };

      // Atomic conditional update to prevent race conditions
      const updateResult = await tx.quote.updateMany({
        where: {
          id,
          status: { in: [QuoteStatus.ACTIVE, QuoteStatus.EXPIRED] },
        },
        data,
      });

      if (updateResult.count === 0) {
        throw new ConflictException('Cannot update a converted quote');
      }

      // Fetch and return the updated quote
      const updatedQuote = await tx.quote.findUnique({ where: { id } });
      if (!updatedQuote) {
        throw new NotFoundException(`Quote with ID ${id} not found`);
      }

      return updatedQuote;
    });
  }

  /**
   * Delete a quote.
   * Only active or expired quotes can be deleted.
   * Uses conditional delete to prevent race conditions.
   */
  async remove(id: number): Promise<void> {
    // Use deleteMany with status condition for atomic check-and-delete
    // This prevents race conditions where status changes between read and delete
    const deleteResult = await this.prisma.quote.deleteMany({
      where: {
        id,
        status: { in: [QuoteStatus.ACTIVE, QuoteStatus.EXPIRED] },
      },
    });

    if (deleteResult.count === 0) {
      // Either quote doesn't exist or status is converted
      const quote = await this.prisma.quote.findUnique({ where: { id } });

      if (!quote) {
        throw new NotFoundException(`Quote with ID ${id} not found`);
      }

      // Quote exists but couldn't be deleted due to status
      throw new ConflictException(
        'Cannot delete a converted quote. It is linked to an order.',
      );
    }
  }

  /**
   * Mark all expired quotes.
   * Called by scheduler to automatically mark quotes past validUntil.
   * @returns Number of quotes marked as expired
   */
  async markExpiredQuotes(): Promise<number> {
    const result = await this.prisma.quote.updateMany({
      where: {
        status: QuoteStatus.ACTIVE,
        validUntil: { lt: new Date() },
      },
      data: { status: QuoteStatus.EXPIRED },
    });

    return result.count;
  }

  /**
   * Convert a single quote to an order.
   * Delegates to batchConvertToOrder for consistent logic.
   */
  async convertToOrder(id: number): Promise<Order> {
    return this.batchConvertToOrder({ quoteIds: [id] });
  }

  /**
   * Batch convert multiple quotes into a single order.
   * All quotes must belong to the same customer, be active, and not expired.
   * Uses Redis distributed lock for concurrent protection.
   * Creates order with items in a Prisma transaction.
   */
  async batchConvertToOrder(dto: ConvertQuotesToOrderDto): Promise<Order> {
    // Check Redis availability — required for concurrent protection
    if (!this.redisService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Redis is required for conversion — concurrent protection unavailable',
      );
    }

    // Sort quote IDs to prevent deadlocks when acquiring locks
    const sortedIds = [...dto.quoteIds].sort((a, b) => a - b);

    // Acquire locks for all quote IDs
    const acquiredLocks: number[] = [];
    for (const id of sortedIds) {
      const locked = await this.redisService.acquireLock(
        `quote:convert:${id}`,
        30,
      );
      if (!locked) {
        // Release already-acquired locks before throwing
        for (const acquiredId of acquiredLocks) {
          await this.redisService.releaseLock(`quote:convert:${acquiredId}`);
        }
        throw new ConflictException(
          `Quote ${id} is being converted by another request`,
        );
      }
      acquiredLocks.push(id);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Fetch all quotes with fabric info
        const quotes = await tx.quote.findMany({
          where: { id: { in: sortedIds } },
          include: { fabric: { select: { id: true } } },
        });

        // Validate all quotes found
        if (quotes.length !== sortedIds.length) {
          const foundIds = new Set(quotes.map((q) => q.id));
          const missingIds = sortedIds.filter((id) => !foundIds.has(id));
          throw new NotFoundException(
            `Quotes not found: ${missingIds.join(', ')}`,
          );
        }

        // Validate all quotes are active
        const nonActiveQuotes = quotes.filter(
          (q) => (q.status as QuoteStatus) !== QuoteStatus.ACTIVE,
        );
        if (nonActiveQuotes.length > 0) {
          const details = nonActiveQuotes
            .map((q) => `Quote ${q.id} (status: ${q.status})`)
            .join(', ');
          throw new BadRequestException(
            `All quotes must be active. Invalid: ${details}`,
          );
        }

        // Validate none are expired
        const now = new Date();
        const expiredQuotes = quotes.filter((q) => q.validUntil < now);
        if (expiredQuotes.length > 0) {
          const expiredIds = expiredQuotes.map((q) => q.id).join(', ');
          throw new BadRequestException(`Quotes have expired: ${expiredIds}`);
        }

        // Validate all quotes belong to the same customer
        const customerIds = new Set(quotes.map((q) => q.customerId));
        if (customerIds.size > 1) {
          throw new BadRequestException(
            'All quotes must belong to the same customer',
          );
        }

        const customerId = quotes[0].customerId;

        // Look up cheapest suppliers for each fabric
        const fabricIds = [...new Set(quotes.map((q) => q.fabricId))];
        const fabricSuppliers = await tx.fabricSupplier.findMany({
          where: { fabricId: { in: fabricIds } },
          orderBy: { purchasePrice: 'asc' },
          distinct: ['fabricId'],
        });
        const supplierMap = new Map<number, number>(
          fabricSuppliers.map((fs) => [fs.fabricId, fs.supplierId]),
        );

        // Generate order code
        const orderCode = await this.codeGeneratorService.generateCode(
          CodePrefix.ORDER,
        );

        // Calculate total amount
        const totalAmount = quotes.reduce(
          (sum, q) => sum + Number(q.quantity) * Number(q.unitPrice),
          0,
        );

        // Create order with items
        const order = await tx.order.create({
          data: {
            orderCode,
            customerId,
            status: OrderItemStatus.PENDING,
            totalAmount,
            customerPaid: 0,
            customerPayStatus: 'unpaid',
            items: {
              create: quotes.map((q) => ({
                fabricId: q.fabricId,
                supplierId: supplierMap.get(q.fabricId) ?? null,
                quoteId: q.id,
                quantity: q.quantity,
                salePrice: q.unitPrice,
                subtotal: Number(q.quantity) * Number(q.unitPrice),
                status: OrderItemStatus.PENDING,
              })),
            },
          },
          include: { items: true, customer: true },
        });

        // Create timeline entries for each item
        await tx.orderTimeline.createMany({
          data: order.items.map((item) => ({
            orderItemId: item.id,
            fromStatus: null,
            toStatus: OrderItemStatus.PENDING,
            remark: 'Converted from quote',
          })),
        });

        // Update all quotes to CONVERTED status
        await tx.quote.updateMany({
          where: { id: { in: sortedIds } },
          data: { status: QuoteStatus.CONVERTED },
        });

        return order;
      });
    } finally {
      // Always release all locks
      for (const id of sortedIds) {
        await this.redisService.releaseLock(`quote:convert:${id}`);
      }
    }
  }
}
