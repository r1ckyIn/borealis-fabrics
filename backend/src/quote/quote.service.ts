import {
  Injectable,
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

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGeneratorService: CodeGeneratorService,
  ) {}

  /**
   * Create a new quote.
   * Validates customer and fabric existence, generates quote code.
   */
  async create(createDto: CreateQuoteDto): Promise<Quote> {
    return this.prisma.$transaction(async (tx) => {
      // Validate customer exists and is active
      const customer = await tx.customer.findFirst({
        where: { id: createDto.customerId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${createDto.customerId} not found`,
        );
      }

      // Validate fabric exists and is active
      const fabric = await tx.fabric.findFirst({
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

      // Generate quote code
      const quoteCode = await this.codeGeneratorService.generateCode(
        CodePrefix.QUOTE,
      );

      // Calculate total price
      const totalPrice = createDto.quantity * createDto.unitPrice;

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
  }

  /**
   * Find all quotes with optional filtering and pagination.
   */
  async findAll(query: QueryQuoteDto): Promise<PaginatedResult<Quote>> {
    // Build where clause
    const where: Prisma.QuoteWhereInput = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.fabricId) {
      where.fabricId = query.fabricId;
    }

    if (query.status) {
      where.status = query.status;
    }

    // Valid date range filter
    if (query.validFrom || query.validTo) {
      where.validUntil = {};
      if (query.validFrom) {
        where.validUntil.gte = new Date(query.validFrom);
      }
      if (query.validTo) {
        where.validUntil.lte = new Date(query.validTo);
      }
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
      fabric: {
        select: {
          id: true,
          fabricCode: true,
          name: true,
          defaultPrice: true,
        },
      },
    };

    // Execute queries
    const [items, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        ...paginationArgs,
        orderBy,
        include,
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
      include: {
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
      },
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
   */
  async update(id: number, updateDto: UpdateQuoteDto): Promise<Quote> {
    // Get existing quote
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    // Check status constraint (quote.status is string from DB)
    if ((quote.status as QuoteStatus) === QuoteStatus.CONVERTED) {
      throw new ConflictException('Cannot update a converted quote');
    }

    // Build update data
    const data: Prisma.QuoteUpdateInput = {};

    if (updateDto.quantity !== undefined) {
      data.quantity = updateDto.quantity;
    }

    if (updateDto.unitPrice !== undefined) {
      data.unitPrice = updateDto.unitPrice;
    }

    if (updateDto.validUntil !== undefined) {
      const newValidUntil = new Date(updateDto.validUntil);
      data.validUntil = newValidUntil;

      // If extending validity on expired quote and new date is in future,
      // reset status to active
      if (
        (quote.status as QuoteStatus) === QuoteStatus.EXPIRED &&
        newValidUntil > new Date()
      ) {
        data.status = QuoteStatus.ACTIVE;
      }
    }

    if (updateDto.notes !== undefined) {
      data.notes = updateDto.notes;
    }

    // Recalculate totalPrice if quantity or unitPrice changes
    const newQuantity =
      updateDto.quantity !== undefined
        ? updateDto.quantity
        : Number(quote.quantity);
    const newUnitPrice =
      updateDto.unitPrice !== undefined
        ? updateDto.unitPrice
        : Number(quote.unitPrice);
    data.totalPrice = newQuantity * newUnitPrice;

    return this.prisma.quote.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a quote.
   * Only active or expired quotes can be deleted.
   */
  async remove(id: number): Promise<void> {
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    // Check status constraint (quote.status is string from DB)
    if ((quote.status as QuoteStatus) === QuoteStatus.CONVERTED) {
      throw new ConflictException(
        'Cannot delete a converted quote. It is linked to an order.',
      );
    }

    await this.prisma.quote.delete({ where: { id } });
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
