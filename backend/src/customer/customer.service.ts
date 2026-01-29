import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, QueryCustomerDto, UpdateCustomerDto } from './dto';
import { Customer, Prisma } from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new customer.
   * Note: companyName is NOT unique for customers, so no duplicate check needed.
   */
  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Convert addresses to JSON-compatible format for Prisma
    const data: Prisma.CustomerCreateInput = {
      ...createCustomerDto,
      addresses: createCustomerDto.addresses
        ? (createCustomerDto.addresses as unknown as Prisma.InputJsonValue)
        : undefined,
    };

    return this.prisma.customer.create({ data });
  }

  /**
   * Find a customer by ID.
   * Throws NotFoundException if customer not found or soft-deleted.
   */
  async findOne(id: number): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, isActive: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Find all customers with optional filtering and pagination.
   */
  async findAll(query: QueryCustomerDto): Promise<PaginatedResult<Customer>> {
    // Build where clause
    const where: Prisma.CustomerWhereInput = {
      isActive: query.isActive ?? true,
    };

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
   * Throws NotFoundException if customer not found.
   * Note: companyName is NOT unique for customers, so no conflict check needed.
   */
  async update(
    id: number,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    // Check if customer exists
    const existing = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Convert addresses to JSON-compatible format for Prisma
    const data: Prisma.CustomerUpdateInput = {
      ...updateCustomerDto,
      addresses: updateCustomerDto.addresses
        ? (updateCustomerDto.addresses as unknown as Prisma.InputJsonValue)
        : undefined,
    };

    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  /**
   * Remove a customer by ID.
   * - If no relations exist: physical delete
   * - If relations exist and force=false: throw ConflictException with relation details
   * - If relations exist and force=true: soft delete (set isActive=false)
   */
  async remove(id: number, force: boolean): Promise<void> {
    // Check if customer exists
    const customer = await this.prisma.customer.findUnique({
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

    if (!hasRelations) {
      // No relations, safe to physically delete
      await this.prisma.customer.delete({ where: { id } });
      return;
    }

    // Has relations
    if (!force) {
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

    // Force=true with relations: soft delete
    await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
