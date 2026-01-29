import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFabricDto, QueryFabricDto, UpdateFabricDto } from './dto';
import { Fabric, Prisma } from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';

@Injectable()
export class FabricService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new fabric.
   * Uses transaction to prevent race conditions on fabricCode uniqueness check.
   * Throws ConflictException if fabricCode already exists.
   */
  async create(createFabricDto: CreateFabricDto): Promise<Fabric> {
    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate fabricCode
      const existing = await tx.fabric.findFirst({
        where: { fabricCode: createFabricDto.fabricCode },
      });

      if (existing) {
        throw new ConflictException(
          `Fabric with code "${createFabricDto.fabricCode}" already exists`,
        );
      }

      return tx.fabric.create({
        data: createFabricDto,
      });
    });
  }

  /**
   * Find a fabric by ID.
   * Throws NotFoundException if fabric not found or soft-deleted.
   */
  async findOne(id: number): Promise<Fabric> {
    const fabric = await this.prisma.fabric.findFirst({
      where: { id, isActive: true },
    });

    if (!fabric) {
      throw new NotFoundException(`Fabric with ID ${id} not found`);
    }

    return fabric;
  }

  /**
   * Find all fabrics with optional filtering and pagination.
   */
  async findAll(query: QueryFabricDto): Promise<PaginatedResult<Fabric>> {
    // Build where clause
    const where: Prisma.FabricWhereInput = {
      isActive: query.isActive ?? true,
    };

    if (query.fabricCode) {
      where.fabricCode = { contains: query.fabricCode };
    }

    if (query.name) {
      where.name = { contains: query.name };
    }

    if (query.color) {
      where.color = query.color;
    }

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // Execute queries in parallel
    const [items, total] = await Promise.all([
      this.prisma.fabric.findMany({
        where,
        ...paginationArgs,
        orderBy,
      }),
      this.prisma.fabric.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Update a fabric by ID.
   * Uses transaction to prevent race conditions on fabricCode uniqueness check.
   * Throws NotFoundException if fabric not found.
   * Throws ConflictException if fabricCode conflicts with another fabric.
   */
  async update(id: number, updateFabricDto: UpdateFabricDto): Promise<Fabric> {
    return this.prisma.$transaction(async (tx) => {
      // Check if fabric exists
      const existing = await tx.fabric.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Fabric with ID ${id} not found`);
      }

      // Check for fabricCode conflict if updating fabricCode
      if (updateFabricDto.fabricCode) {
        const conflict = await tx.fabric.findFirst({
          where: { fabricCode: updateFabricDto.fabricCode },
        });

        // If found a fabric with same code and it's not the current one
        if (conflict && conflict.id !== id) {
          throw new ConflictException(
            `Fabric with code "${updateFabricDto.fabricCode}" already exists`,
          );
        }
      }

      return tx.fabric.update({
        where: { id },
        data: updateFabricDto,
      });
    });
  }

  /**
   * Remove a fabric by ID.
   * - If no relations exist: physical delete
   * - If relations exist and force=false: throw ConflictException with relation details
   * - If relations exist and force=true: soft delete (set isActive=false)
   */
  async remove(id: number, force: boolean): Promise<void> {
    // Check if fabric exists
    const fabric = await this.prisma.fabric.findUnique({
      where: { id },
    });

    if (!fabric) {
      throw new NotFoundException(`Fabric with ID ${id} not found`);
    }

    // Check for related records in parallel
    const [
      fabricImageCount,
      fabricSupplierCount,
      customerPricingCount,
      orderItemCount,
      quoteCount,
    ] = await Promise.all([
      this.prisma.fabricImage.count({ where: { fabricId: id } }),
      this.prisma.fabricSupplier.count({ where: { fabricId: id } }),
      this.prisma.customerPricing.count({ where: { fabricId: id } }),
      this.prisma.orderItem.count({ where: { fabricId: id } }),
      this.prisma.quote.count({ where: { fabricId: id } }),
    ]);

    const hasRelations =
      fabricImageCount > 0 ||
      fabricSupplierCount > 0 ||
      customerPricingCount > 0 ||
      orderItemCount > 0 ||
      quoteCount > 0;

    if (!hasRelations) {
      // No relations, safe to physically delete
      await this.prisma.fabric.delete({ where: { id } });
      return;
    }

    // Has relations
    if (!force) {
      // Build relation details message
      const relations: string[] = [];
      if (fabricImageCount > 0)
        relations.push(
          `${fabricImageCount} fabric image${fabricImageCount > 1 ? 's' : ''}`,
        );
      if (fabricSupplierCount > 0)
        relations.push(
          `${fabricSupplierCount} fabric supplier record${fabricSupplierCount > 1 ? 's' : ''}`,
        );
      if (customerPricingCount > 0)
        relations.push(
          `${customerPricingCount} customer pricing record${customerPricingCount > 1 ? 's' : ''}`,
        );
      if (orderItemCount > 0)
        relations.push(
          `${orderItemCount} order item${orderItemCount > 1 ? 's' : ''}`,
        );
      if (quoteCount > 0)
        relations.push(`${quoteCount} quote${quoteCount > 1 ? 's' : ''}`);

      throw new ConflictException(
        `Cannot delete fabric. Related data exists: ${relations.join(', ')}. ` +
          'Use ?force=true to soft delete instead.',
      );
    }

    // Force=true with relations: soft delete
    await this.prisma.fabric.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
