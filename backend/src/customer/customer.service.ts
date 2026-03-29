import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerDto,
  CreateCustomerPricingDto,
  QueryCustomerDto,
  QueryCustomerOrdersDto,
  UpdateCustomerDto,
  UpdateCustomerPricingDto,
} from './dto';
import { Customer, CustomerPricing, Order, Prisma } from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';
import { ORDER_INCLUDE_LIST } from '../order/order.includes';

// Transaction client type for Prisma interactive transactions
type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate customer exists within a transaction (soft-deleted records auto-filtered).
   * @throws NotFoundException if customer not found or soft-deleted
   */
  private async validateCustomerExists(
    tx: TransactionClient,
    customerId: number,
  ): Promise<void> {
    const customer = await tx.customer.findFirst({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }
  }

  /**
   * Validate pricing exists and belongs to the customer.
   * @throws NotFoundException if pricing not found or doesn't belong to customer
   */
  private async validatePricingBelongsToCustomer(
    tx: TransactionClient,
    customerId: number,
    pricingId: number,
  ): Promise<void> {
    const pricing = await tx.customerPricing.findUnique({
      where: { id: pricingId },
    });
    if (!pricing || pricing.customerId !== customerId) {
      throw new NotFoundException(
        `Customer pricing with ID ${pricingId} not found`,
      );
    }
  }

  /**
   * Create a new customer.
   * Note: companyName is NOT unique for customers, so no duplicate check needed.
   */
  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // DTO data is already validated and JSON-compatible, no need for serialization
    const data: Prisma.CustomerCreateInput = {
      ...createCustomerDto,
      addresses: createCustomerDto.addresses as
        | Prisma.InputJsonValue
        | undefined,
    };

    return this.prisma.customer.create({ data });
  }

  /**
   * Find a customer by ID.
   * Throws NotFoundException if customer not found or soft-deleted.
   */
  async findOne(id: number): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Find all special pricing records for a customer.
   * Returns pricing list with fabric details, ordered by createdAt desc.
   * Throws NotFoundException if customer not found or soft-deleted.
   */
  async findPricing(customerId: number) {
    // Ensure customer exists and is active
    await this.findOne(customerId);

    return this.prisma.customerPricing.findMany({
      where: { customerId },
      include: {
        fabric: {
          select: {
            id: true,
            fabricCode: true,
            name: true,
            defaultPrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find all customers with optional filtering and pagination.
   * When includeDeleted is true, bypasses the soft-delete extension filter.
   */
  async findAll(query: QueryCustomerDto): Promise<PaginatedResult<Customer>> {
    // Build where clause (soft-delete auto-filtered by extension)
    const where: Prisma.CustomerWhereInput = {};

    // Bypass soft-delete filter when includeDeleted is true
    if (query.includeDeleted) {
      where.deletedAt = {} as Prisma.DateTimeNullableFilter;
    }

    // Unified keyword search across companyName, contactName, phone
    if (query.keyword) {
      where.OR = [
        { companyName: { contains: query.keyword } },
        { contactName: { contains: query.keyword } },
        { phone: { contains: query.keyword } },
      ];
    }

    if (query.companyName) {
      where.companyName = { contains: query.companyName };
    }

    if (query.creditType) {
      where.creditType = query.creditType;
    }

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // Execute queries
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        ...paginationArgs,
        orderBy,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Update a customer by ID.
   * Uses compound where clause to check existence and active status atomically.
   * Throws NotFoundException if customer not found or soft-deleted.
   * Note: companyName is NOT unique for customers, so no conflict check needed.
   */
  async update(
    id: number,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    // DTO data is already validated and JSON-compatible, no need for serialization
    const data: Prisma.CustomerUpdateInput = {
      ...updateCustomerDto,
      addresses: updateCustomerDto.addresses as
        | Prisma.InputJsonValue
        | undefined,
    };

    try {
      // Update customer (soft-deleted records auto-filtered by extension)
      return await this.prisma.customer.update({
        where: { id },
        data,
      });
    } catch (error) {
      // P2025: Record not found (either doesn't exist or soft-deleted)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Remove a customer by ID (soft delete via Prisma extension).
   * - If relations exist and force=false: throw ConflictException with relation details
   * - Otherwise: soft delete (sets deletedAt timestamp via extension)
   */
  async remove(id: number, force: boolean): Promise<void> {
    // Check if customer exists (soft-deleted records auto-filtered)
    const customer = await this.prisma.customer.findFirst({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Check for related records
    const [customerPricingCount, orderCount, quoteCount] = await Promise.all([
      this.prisma.customerPricing.count({ where: { customerId: id } }),
      this.prisma.order.count({ where: { customerId: id } }),
      this.prisma.quote.count({ where: { customerId: id } }),
    ]);

    const hasRelations =
      customerPricingCount > 0 || orderCount > 0 || quoteCount > 0;

    if (hasRelations && !force) {
      // Build relation details message
      const relations: string[] = [];
      if (customerPricingCount > 0)
        relations.push(`${customerPricingCount} customer pricing records`);
      if (orderCount > 0) relations.push(`${orderCount} orders`);
      if (quoteCount > 0) relations.push(`${quoteCount} quotes`);

      throw new ConflictException(
        `Cannot delete customer. Related data exists: ${relations.join(', ')}. ` +
          'Use ?force=true to soft delete instead.',
      );
    }

    // Soft delete (extension intercepts delete and sets deletedAt)
    await this.prisma.customer.delete({ where: { id } });
  }

  /**
   * Restore a soft-deleted customer.
   * Uses raw SQL to bypass soft-delete auto-filtering.
   * @throws NotFoundException if customer not found in deleted records
   */
  async restore(id: number): Promise<Customer> {
    const deleted = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      'SELECT id FROM customers WHERE id = ? AND deleted_at IS NOT NULL',
      id,
    );

    if (!deleted || deleted.length === 0) {
      throw new NotFoundException(
        `Customer with ID ${id} not found in deleted records`,
      );
    }

    await this.prisma.$executeRawUnsafe(
      'UPDATE customers SET deleted_at = NULL WHERE id = ?',
      id,
    );

    return this.prisma.customer.findFirst({
      where: { id },
    }) as Promise<Customer>;
  }

  /**
   * Create a special pricing record for a customer-fabric pair.
   * Uses transaction to ensure atomic validation and creation.
   * Throws NotFoundException if customer or fabric not found.
   * Throws ConflictException if pricing already exists for the pair.
   */
  async createPricing(
    customerId: number,
    createDto: CreateCustomerPricingDto,
  ): Promise<CustomerPricing> {
    return this.prisma.$transaction(async (tx) => {
      await this.validateCustomerExists(tx, customerId);

      // Verify fabric exists (soft-deleted records auto-filtered)
      const fabric = await tx.fabric.findFirst({
        where: { id: createDto.fabricId },
      });
      if (!fabric) {
        throw new NotFoundException(
          `Fabric with ID ${createDto.fabricId} not found`,
        );
      }

      // Create pricing record (handle unique constraint violation)
      try {
        return await tx.customerPricing.create({
          data: {
            customerId,
            fabricId: createDto.fabricId,
            specialPrice: createDto.specialPrice,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            `Customer already has special pricing for fabric ID ${createDto.fabricId}`,
          );
        }
        throw error;
      }
    });
  }

  /**
   * Update a special pricing record.
   * Uses transaction to ensure atomic validation and update.
   * Throws NotFoundException if customer or pricing not found.
   * Throws NotFoundException if pricing does not belong to the customer.
   */
  async updatePricing(
    customerId: number,
    pricingId: number,
    updateDto: UpdateCustomerPricingDto,
  ): Promise<CustomerPricing> {
    return this.prisma.$transaction(async (tx) => {
      await this.validateCustomerExists(tx, customerId);
      await this.validatePricingBelongsToCustomer(tx, customerId, pricingId);

      return tx.customerPricing.update({
        where: { id: pricingId },
        data: {
          specialPrice: updateDto.specialPrice,
        },
      });
    });
  }

  /**
   * Delete a special pricing record.
   * Uses transaction to ensure atomic validation and deletion.
   * Throws NotFoundException if customer or pricing not found.
   * Throws NotFoundException if pricing does not belong to the customer.
   */
  async removePricing(customerId: number, pricingId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validateCustomerExists(tx, customerId);
      await this.validatePricingBelongsToCustomer(tx, customerId, pricingId);

      // Delete the pricing record
      await tx.customerPricing.delete({
        where: { id: pricingId },
      });
    });
  }

  /**
   * Find all orders for a customer with pagination and filtering.
   * Throws NotFoundException if customer not found or soft-deleted.
   */
  async findOrders(
    customerId: number,
    query: QueryCustomerOrdersDto,
  ): Promise<PaginatedResult<Order>> {
    // Validate customer exists
    await this.findOne(customerId);

    // Build where clause
    const where: Prisma.OrderWhereInput = {
      customerId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerPayStatus) {
      where.customerPayStatus = query.customerPayStatus;
    }

    if (query.keyword) {
      where.orderCode = { contains: query.keyword };
    }

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

    // Execute queries in parallel
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
}
