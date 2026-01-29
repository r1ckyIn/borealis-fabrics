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
  UpdateCustomerDto,
  UpdateCustomerPricingDto,
} from './dto';
import { Customer, CustomerPricing, Prisma } from '@prisma/client';
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
    // Using JSON.parse/stringify for proper serialization
    const data: Prisma.CustomerCreateInput = {
      ...createCustomerDto,
      addresses: createCustomerDto.addresses
        ? (JSON.parse(
            JSON.stringify(createCustomerDto.addresses),
          ) as Prisma.InputJsonValue)
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
   * Uses transaction to ensure atomic read-check-update operation.
   * Throws NotFoundException if customer not found.
   * Note: companyName is NOT unique for customers, so no conflict check needed.
   */
  async update(
    id: number,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.prisma.$transaction(async (tx) => {
      // Check if customer exists
      const existing = await tx.customer.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // Convert addresses to JSON-compatible format for Prisma
      const data: Prisma.CustomerUpdateInput = {
        ...updateCustomerDto,
        addresses: updateCustomerDto.addresses
          ? (JSON.parse(
              JSON.stringify(updateCustomerDto.addresses),
            ) as Prisma.InputJsonValue)
          : undefined,
      };

      return tx.customer.update({
        where: { id },
        data,
      });
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
      // Verify customer exists and is active
      const customer = await tx.customer.findFirst({
        where: { id: customerId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Verify fabric exists and is active
      const fabric = await tx.fabric.findFirst({
        where: { id: createDto.fabricId, isActive: true },
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
      // Verify customer exists and is active
      const customer = await tx.customer.findFirst({
        where: { id: customerId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Verify pricing exists and belongs to this customer
      const pricing = await tx.customerPricing.findUnique({
        where: { id: pricingId },
      });
      if (!pricing || pricing.customerId !== customerId) {
        throw new NotFoundException(
          `Customer pricing with ID ${pricingId} not found`,
        );
      }

      // Build update data
      const data: Prisma.CustomerPricingUpdateInput = {};
      if (updateDto.specialPrice !== undefined) {
        data.specialPrice = updateDto.specialPrice;
      }

      return tx.customerPricing.update({
        where: { id: pricingId },
        data,
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
      // Verify customer exists and is active
      const customer = await tx.customer.findFirst({
        where: { id: customerId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Verify pricing exists and belongs to this customer
      const pricing = await tx.customerPricing.findUnique({
        where: { id: pricingId },
      });
      if (!pricing || pricing.customerId !== customerId) {
        throw new NotFoundException(
          `Customer pricing with ID ${pricingId} not found`,
        );
      }

      // Delete the pricing record
      await tx.customerPricing.delete({
        where: { id: pricingId },
      });
    });
  }
}
