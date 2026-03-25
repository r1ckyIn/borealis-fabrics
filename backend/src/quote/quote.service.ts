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
  CreateQuoteItemDto,
  UpdateQuoteDto,
  UpdateQuoteItemDto,
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
import { FABRIC_UNIT, getUnitForProduct } from '../common/utils/product-units';

// Maximum retries for handling quote code conflicts
const MAX_CODE_GENERATION_RETRIES = 3;

// Reusable include configuration for QuoteItem relations
const QUOTE_ITEM_INCLUDE = {
  fabric: {
    select: { id: true, fabricCode: true, name: true, defaultPrice: true },
  },
  product: {
    select: { id: true, productCode: true, name: true, subCategory: true },
  },
} as const;

// Include configuration for quote list view
const QUOTE_LIST_INCLUDE = {
  customer: {
    select: {
      id: true,
      companyName: true,
      contactName: true,
      phone: true,
    },
  },
  items: {
    include: QUOTE_ITEM_INCLUDE,
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

// Include configuration for quote detail view
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
  items: {
    include: QUOTE_ITEM_INCLUDE,
    orderBy: { createdAt: 'asc' as const },
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
   * Create a new quote with one or more items.
   * Validates customer and all fabric/product IDs existence.
   * Calculates totalPrice as sum of item subtotals.
   * Implements retry logic for handling quote code conflicts (P2002).
   */
  async create(createDto: CreateQuoteDto): Promise<Quote> {
    // Validate customer
    const customer = await this.prisma.customer.findFirst({
      where: { id: createDto.customerId, isActive: true },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${createDto.customerId} not found`,
      );
    }

    // Validate validUntil is in the future
    const validUntilDate = new Date(createDto.validUntil);
    if (validUntilDate <= new Date()) {
      throw new BadRequestException('validUntil must be a future date');
    }

    // Collect and validate all fabric/product IDs
    const fabricIds = [
      ...new Set(
        createDto.items.filter((i) => i.fabricId).map((i) => i.fabricId!),
      ),
    ];
    const productIds = [
      ...new Set(
        createDto.items.filter((i) => i.productId).map((i) => i.productId!),
      ),
    ];

    const [fabrics, products] = await Promise.all([
      fabricIds.length > 0
        ? this.prisma.fabric.findMany({
            where: { id: { in: fabricIds }, isActive: true },
            select: { id: true },
          })
        : Promise.resolve([]),
      productIds.length > 0
        ? this.prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true },
            select: { id: true, subCategory: true },
          })
        : Promise.resolve([]),
    ]);

    // Validate all fabric IDs found
    if (fabrics.length !== fabricIds.length) {
      const foundIds = new Set(fabrics.map((f) => f.id));
      const missing = fabricIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Fabrics not found: ${missing.join(', ')}`);
    }

    // Validate all product IDs found
    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Products not found: ${missing.join(', ')}`);
    }

    // Build product subCategory map for unit derivation
    const productSubCategoryMap = new Map<number, string>();
    for (const p of products) {
      productSubCategoryMap.set(p.id, p.subCategory);
    }

    // Build item data with calculated subtotals and derived units
    const itemsData = createDto.items.map((item) => {
      const subtotal = item.quantity * item.unitPrice;
      let unit = item.unit ?? FABRIC_UNIT;

      if (item.productId) {
        const subCategory = productSubCategoryMap.get(item.productId);
        if (subCategory && !item.unit) {
          unit = getUnitForProduct(subCategory);
        }
      }

      return {
        fabricId: item.fabricId ?? null,
        productId: item.productId ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
        unit,
        notes: item.notes ?? null,
      };
    });

    // Calculate total price as sum of all subtotals
    const totalPrice = itemsData.reduce((sum, item) => sum + item.subtotal, 0);

    // Retry loop for handling quote code conflicts
    for (let attempt = 1; attempt <= MAX_CODE_GENERATION_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const quoteCode = await this.codeGeneratorService.generateCode(
            CodePrefix.QUOTE,
          );

          return tx.quote.create({
            data: {
              quoteCode,
              customerId: createDto.customerId,
              totalPrice,
              validUntil: validUntilDate,
              status: QuoteStatus.ACTIVE,
              notes: createDto.notes ?? null,
              items: {
                create: itemsData,
              },
            },
            include: QUOTE_DETAIL_INCLUDE,
          });
        });
      } catch (error) {
        const prismaError = error as { code?: string };
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
   * Includes nested items with fabric/product relations.
   */
  async findAll(query: QueryQuoteDto): Promise<PaginatedResult<Quote>> {
    const where: Prisma.QuoteWhereInput = {
      ...(query.keyword && { quoteCode: { contains: query.keyword } }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.status && { status: query.status }),
      validUntil: buildDateRangeFilter(query.validFrom, query.validTo),
      createdAt: buildDateRangeFilter(query.createdFrom, query.createdTo),
    };

    const paginationArgs = buildPaginationArgs(query);
    const orderBy = {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    };

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
   * Find a quote by ID with full detail including items.
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
   * Update quote header fields (validUntil, notes).
   * Only active, expired, or partially_converted quotes can be updated.
   * Extending validity on expired quote resets status to active.
   */
  async update(id: number, updateDto: UpdateQuoteDto): Promise<Quote> {
    const newValidUntil = updateDto.validUntil
      ? new Date(updateDto.validUntil)
      : undefined;

    if (newValidUntil && newValidUntil <= new Date()) {
      throw new BadRequestException('validUntil must be a future date');
    }

    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });

      if (!quote) {
        throw new NotFoundException(`Quote with ID ${id} not found`);
      }

      // Determine if status should reset to active
      const shouldResetStatus =
        newValidUntil && (quote.status as QuoteStatus) === QuoteStatus.EXPIRED;

      const data: Prisma.QuoteUpdateManyMutationInput = {
        ...(newValidUntil && { validUntil: newValidUntil }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(shouldResetStatus && { status: QuoteStatus.ACTIVE }),
      };

      // Atomic conditional update
      const updateResult = await tx.quote.updateMany({
        where: {
          id,
          status: {
            in: [
              QuoteStatus.ACTIVE,
              QuoteStatus.EXPIRED,
              QuoteStatus.PARTIALLY_CONVERTED,
            ],
          },
        },
        data,
      });

      if (updateResult.count === 0) {
        throw new ConflictException('Cannot update a converted quote');
      }

      const updatedQuote = await tx.quote.findUnique({
        where: { id },
        include: QUOTE_DETAIL_INCLUDE,
      });
      if (!updatedQuote) {
        throw new NotFoundException(`Quote with ID ${id} not found`);
      }

      return updatedQuote;
    });
  }

  /**
   * Add a new item to an existing quote.
   * Validates quote status and fabric/product existence.
   * Recalculates quote totalPrice.
   */
  async addItem(quoteId: number, itemDto: CreateQuoteItemDto): Promise<Quote> {
    return this.prisma.$transaction(async (tx) => {
      // Validate quote exists and is in an editable status
      const quote = await tx.quote.findUnique({
        where: { id: quoteId },
        include: { items: true },
      });

      if (!quote) {
        throw new NotFoundException(`Quote with ID ${quoteId} not found`);
      }

      const status = quote.status as QuoteStatus;
      if (
        status !== QuoteStatus.ACTIVE &&
        status !== QuoteStatus.PARTIALLY_CONVERTED
      ) {
        throw new ConflictException(
          'Can only add items to active or partially converted quotes',
        );
      }

      // Validate fabric/product existence
      await this.validateItemReferences(
        itemDto.fabricId ? [itemDto.fabricId] : [],
        itemDto.productId ? [itemDto.productId] : [],
      );

      // Derive unit
      let unit = itemDto.unit ?? FABRIC_UNIT;
      if (itemDto.productId && !itemDto.unit) {
        const product = await this.prisma.product.findUnique({
          where: { id: itemDto.productId },
          select: { subCategory: true },
        });
        if (product) {
          unit = getUnitForProduct(product.subCategory);
        }
      }

      const subtotal = itemDto.quantity * itemDto.unitPrice;

      // Create the item
      await tx.quoteItem.create({
        data: {
          quoteId,
          fabricId: itemDto.fabricId ?? null,
          productId: itemDto.productId ?? null,
          quantity: itemDto.quantity,
          unitPrice: itemDto.unitPrice,
          subtotal,
          unit,
          notes: itemDto.notes ?? null,
        },
      });

      // Recalculate total
      await this.recalculateQuoteTotal(tx, quoteId);

      // Return updated quote
      return tx.quote.findUnique({
        where: { id: quoteId },
        include: QUOTE_DETAIL_INCLUDE,
      }) as Promise<Quote>;
    });
  }

  /**
   * Update an existing quote item.
   * Validates item belongs to quote and is not converted.
   * Recalculates subtotal and quote totalPrice.
   */
  async updateItem(
    quoteId: number,
    itemId: number,
    updateDto: UpdateQuoteItemDto,
  ): Promise<Quote> {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id: quoteId } });
      if (!quote) {
        throw new NotFoundException(`Quote with ID ${quoteId} not found`);
      }

      const item = await tx.quoteItem.findUnique({ where: { id: itemId } });
      if (!item || item.quoteId !== quoteId) {
        throw new NotFoundException(
          `QuoteItem with ID ${itemId} not found in Quote ${quoteId}`,
        );
      }

      if (item.isConverted) {
        throw new ConflictException('Cannot update a converted quote item');
      }

      // Build update data
      const quantity =
        updateDto.quantity !== undefined
          ? updateDto.quantity
          : Number(item.quantity);
      const unitPrice =
        updateDto.unitPrice !== undefined
          ? updateDto.unitPrice
          : Number(item.unitPrice);
      const subtotal = quantity * unitPrice;

      const data: Record<string, unknown> = {
        ...(updateDto.quantity !== undefined && {
          quantity: updateDto.quantity,
        }),
        ...(updateDto.unitPrice !== undefined && {
          unitPrice: updateDto.unitPrice,
        }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        subtotal,
      };

      await tx.quoteItem.update({
        where: { id: itemId },
        data,
      });

      // Recalculate total
      await this.recalculateQuoteTotal(tx, quoteId);

      return tx.quote.findUnique({
        where: { id: quoteId },
        include: QUOTE_DETAIL_INCLUDE,
      }) as Promise<Quote>;
    });
  }

  /**
   * Remove an item from a quote.
   * If no items remain, deletes the quote itself.
   * Otherwise recalculates quote totalPrice.
   */
  async removeItem(quoteId: number, itemId: number): Promise<Quote | void> {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id: quoteId },
        include: { items: true },
      });

      if (!quote) {
        throw new NotFoundException(`Quote with ID ${quoteId} not found`);
      }

      const status = quote.status as QuoteStatus;
      if (
        status !== QuoteStatus.ACTIVE &&
        status !== QuoteStatus.PARTIALLY_CONVERTED
      ) {
        throw new ConflictException(
          'Can only remove items from active or partially converted quotes',
        );
      }

      const item = await tx.quoteItem.findUnique({ where: { id: itemId } });
      if (!item || item.quoteId !== quoteId) {
        throw new NotFoundException(
          `QuoteItem with ID ${itemId} not found in Quote ${quoteId}`,
        );
      }

      if (item.isConverted) {
        throw new ConflictException('Cannot remove a converted quote item');
      }

      // Delete the item
      await tx.quoteItem.delete({ where: { id: itemId } });

      // Check remaining items
      const remainingItems = quote.items.filter((i) => i.id !== itemId);

      if (remainingItems.length === 0) {
        // No items left, delete the quote
        await tx.quote.delete({ where: { id: quoteId } });
        return;
      }

      // Recalculate total
      await this.recalculateQuoteTotal(tx, quoteId);

      return tx.quote.findUnique({
        where: { id: quoteId },
        include: QUOTE_DETAIL_INCLUDE,
      }) as Promise<Quote>;
    });
  }

  /**
   * Delete a quote.
   * Only active, expired, or partially_converted quotes can be deleted.
   * Uses conditional delete to prevent race conditions.
   */
  async remove(id: number): Promise<void> {
    const deleteResult = await this.prisma.quote.deleteMany({
      where: {
        id,
        status: {
          in: [
            QuoteStatus.ACTIVE,
            QuoteStatus.EXPIRED,
            QuoteStatus.PARTIALLY_CONVERTED,
          ],
        },
      },
    });

    if (deleteResult.count === 0) {
      const quote = await this.prisma.quote.findUnique({ where: { id } });

      if (!quote) {
        throw new NotFoundException(`Quote with ID ${id} not found`);
      }

      throw new ConflictException(
        'Cannot delete a converted quote. It is linked to an order.',
      );
    }
  }

  /**
   * Mark all expired quotes.
   * Called by scheduler to automatically mark quotes past validUntil.
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
   * Reads items from quote.items relation for multi-item support.
   */
  async batchConvertToOrder(dto: ConvertQuotesToOrderDto): Promise<Order> {
    if (!this.redisService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Redis is required for conversion — concurrent protection unavailable',
      );
    }

    const sortedIds = [...dto.quoteIds].sort((a, b) => a - b);

    // Acquire locks
    const acquiredLocks: number[] = [];
    for (const id of sortedIds) {
      const locked = await this.redisService.acquireLock(
        `quote:convert:${id}`,
        30,
      );
      if (!locked) {
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
        // Fetch all quotes with items
        const quotes = await tx.quote.findMany({
          where: { id: { in: sortedIds } },
          include: {
            items: {
              include: {
                fabric: { select: { id: true } },
                product: { select: { id: true } },
              },
            },
          },
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

        // Collect all fabric IDs from quote items for supplier lookup
        const allFabricIds = [
          ...new Set(
            quotes.flatMap((q) =>
              q.items
                .filter((i) => i.fabricId !== null)
                .map((i) => i.fabricId!),
            ),
          ),
        ];

        // Look up cheapest suppliers for each fabric
        const allFabricSuppliers =
          allFabricIds.length > 0
            ? await tx.fabricSupplier.findMany({
                where: { fabricId: { in: allFabricIds } },
                orderBy: { purchasePrice: 'asc' },
              })
            : [];
        const supplierMap = new Map<number, number>();
        for (const fs of allFabricSuppliers) {
          if (!supplierMap.has(fs.fabricId)) {
            supplierMap.set(fs.fabricId, fs.supplierId);
          }
        }

        // Generate order code
        const orderCode = await this.codeGeneratorService.generateCode(
          CodePrefix.ORDER,
        );

        // Flatten all items from all quotes
        const allItems = quotes.flatMap((q) =>
          q.items.map((item) => ({
            fabricId: item.fabricId ?? null,
            productId: item.productId ?? null,
            supplierId: item.fabricId
              ? (supplierMap.get(item.fabricId) ?? null)
              : null,
            quoteId: q.id,
            quoteItemId: item.id,
            quantity: item.quantity,
            unit: item.unit,
            salePrice: item.unitPrice,
            subtotal: item.subtotal,
            status: OrderItemStatus.PENDING,
          })),
        );

        // Calculate total amount
        const totalAmount = allItems.reduce(
          (sum, item) => sum + Number(item.subtotal),
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
              create: allItems,
            },
          },
          include: { items: true, customer: true },
        });

        // Create timeline entries
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
      for (const id of sortedIds) {
        await this.redisService.releaseLock(`quote:convert:${id}`);
      }
    }
  }

  /**
   * Recalculate quote totalPrice from its items' subtotals.
   */
  private async recalculateQuoteTotal(
    tx: Prisma.TransactionClient,
    quoteId: number,
  ): Promise<void> {
    const items = await tx.quoteItem.findMany({
      where: { quoteId },
      select: { subtotal: true },
    });
    const totalPrice = items.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0,
    );
    await tx.quote.update({
      where: { id: quoteId },
      data: { totalPrice },
    });
  }

  /**
   * Validate that all referenced fabric/product IDs exist.
   */
  private async validateItemReferences(
    fabricIds: number[],
    productIds: number[],
  ): Promise<void> {
    if (fabricIds.length > 0) {
      const fabrics = await this.prisma.fabric.findMany({
        where: { id: { in: fabricIds }, isActive: true },
        select: { id: true },
      });
      if (fabrics.length !== fabricIds.length) {
        const foundIds = new Set(fabrics.map((f) => f.id));
        const missing = fabricIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(`Fabrics not found: ${missing.join(', ')}`);
      }
    }

    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true },
      });
      if (products.length !== productIds.length) {
        const foundIds = new Set(products.map((p) => p.id));
        const missing = productIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `Products not found: ${missing.join(', ')}`,
        );
      }
    }
  }
}
