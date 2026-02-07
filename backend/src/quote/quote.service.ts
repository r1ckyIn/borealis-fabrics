import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CodeGeneratorService, CodePrefix } from '../common/services';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QueryQuoteDto,
  QuoteStatus,
} from './dto';
import { Quote, Prisma } from '@prisma/client';
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
   * Convert a quote to an order.
   * Only active quotes that haven't expired can be converted.
   * @returns The created order (placeholder for now)
   */
  async convertToOrder(id: number): Promise<never> {
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    // Check status constraint (quote.status is string from DB)
    if ((quote.status as QuoteStatus) !== QuoteStatus.ACTIVE) {
      throw new BadRequestException(
        `Only active quotes can be converted. Current status: ${quote.status}`,
      );
    }

    // Check if quote has expired
    if (quote.validUntil < new Date()) {
      throw new BadRequestException(
        'Quote has expired and cannot be converted',
      );
    }

    // TODO: Implement when OrderModule is ready
    // 1. Create order with order items from quote
    // 2. Update quote status to CONVERTED
    // 3. Add timeline entry "Converted from quote QT-xxx"
    throw new NotImplementedException(
      'Quote to order conversion will be implemented when OrderModule is ready',
    );
  }
}
