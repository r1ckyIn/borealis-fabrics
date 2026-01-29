import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, QuerySupplierDto, UpdateSupplierDto } from './dto';
import { Supplier, Prisma } from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new supplier.
   * Uses transaction to prevent race conditions on companyName uniqueness check.
   * Throws ConflictException if companyName already exists.
   */
  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate companyName
      const existing = await tx.supplier.findFirst({
        where: { companyName: createSupplierDto.companyName },
      });

      if (existing) {
        throw new ConflictException(
          `Supplier with company name "${createSupplierDto.companyName}" already exists`,
        );
      }

      return tx.supplier.create({
        data: createSupplierDto,
      });
    });
  }

  /**
   * Find a supplier by ID.
   * Throws NotFoundException if supplier not found or soft-deleted.
   */
  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, isActive: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  /**
   * Find all suppliers with optional filtering and pagination.
   */
  async findAll(query: QuerySupplierDto): Promise<PaginatedResult<Supplier>> {
    // Build where clause
    const where: Prisma.SupplierWhereInput = {
      isActive: query.isActive ?? true,
    };

    if (query.companyName) {
      where.companyName = { contains: query.companyName };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.settleType) {
      where.settleType = query.settleType;
    }

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // Execute queries
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        ...paginationArgs,
        orderBy,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Update a supplier by ID.
   * Uses transaction to prevent race conditions on companyName uniqueness check.
   * Throws NotFoundException if supplier not found.
   * Throws ConflictException if companyName conflicts with another supplier.
   */
  async update(
    id: number,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    return this.prisma.$transaction(async (tx) => {
      // Check if supplier exists
      const existing = await tx.supplier.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Supplier with ID ${id} not found`);
      }

      // Check for companyName conflict if updating companyName
      if (updateSupplierDto.companyName) {
        const conflict = await tx.supplier.findFirst({
          where: { companyName: updateSupplierDto.companyName },
        });

        // If found a supplier with same name and it's not the current one
        if (conflict && conflict.id !== id) {
          throw new ConflictException(
            `Supplier with company name "${updateSupplierDto.companyName}" already exists`,
          );
        }
      }

      return tx.supplier.update({
        where: { id },
        data: updateSupplierDto,
      });
    });
  }

  /**
   * Remove a supplier by ID.
   * - If no relations exist: physical delete
   * - If relations exist and force=false: throw ConflictException with relation details
   * - If relations exist and force=true: soft delete (set isActive=false)
   */
  async remove(id: number, force: boolean): Promise<void> {
    // Check if supplier exists
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Check for related records
    const [
      fabricSupplierCount,
      orderItemCount,
      supplierPaymentCount,
      paymentRecordCount,
    ] = await Promise.all([
      this.prisma.fabricSupplier.count({ where: { supplierId: id } }),
      this.prisma.orderItem.count({ where: { supplierId: id } }),
      this.prisma.supplierPayment.count({ where: { supplierId: id } }),
      this.prisma.paymentRecord.count({ where: { supplierId: id } }),
    ]);

    const hasRelations =
      fabricSupplierCount > 0 ||
      orderItemCount > 0 ||
      supplierPaymentCount > 0 ||
      paymentRecordCount > 0;

    if (!hasRelations) {
      // No relations, safe to physically delete
      await this.prisma.supplier.delete({ where: { id } });
      return;
    }

    // Has relations
    if (!force) {
      // Build relation details message
      const relations: string[] = [];
      if (fabricSupplierCount > 0)
        relations.push(`${fabricSupplierCount} fabric supplier records`);
      if (orderItemCount > 0) relations.push(`${orderItemCount} order items`);
      if (supplierPaymentCount > 0)
        relations.push(`${supplierPaymentCount} supplier payments`);
      if (paymentRecordCount > 0)
        relations.push(`${paymentRecordCount} payment records`);

      throw new ConflictException(
        `Cannot delete supplier. Related data exists: ${relations.join(', ')}. ` +
          'Use ?force=true to soft delete instead.',
      );
    }

    // Force=true with relations: soft delete
    await this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
