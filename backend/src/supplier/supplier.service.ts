import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupplierDto,
  QuerySupplierDto,
  QuerySupplierFabricsDto,
  UpdateSupplierDto,
  SupplierFabricSortField,
} from './dto';
import { Supplier, Prisma } from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';
import { toNumber, toNumberRequired } from '../common/utils/decimal';

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
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  /**
   * Find all suppliers with optional filtering and pagination.
   * Soft-deleted records are auto-filtered by Prisma extension.
   */
  async findAll(query: QuerySupplierDto): Promise<PaginatedResult<Supplier>> {
    // Build where clause (soft-delete auto-filtered by extension)
    const where: Prisma.SupplierWhereInput = {};

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

    if (query.status) {
      where.status = query.status;
    }

    if (query.settleType) {
      where.settleType = query.settleType;
    }

    // Filter by fabric relationship (only suppliers that supply the given fabric)
    if (query.fabricId) {
      where.fabricSuppliers = {
        some: { fabricId: query.fabricId },
      };
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
      // Check if supplier exists (soft-deleted records auto-filtered)
      const existing = await tx.supplier.findFirst({
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
   * Remove a supplier by ID (soft delete via Prisma extension).
   * - If no relations exist and force=false: throw ConflictException with relation details
   * - Otherwise: soft delete (sets deletedAt timestamp via extension)
   */
  async remove(id: number, force: boolean): Promise<void> {
    // Check if supplier exists (soft-deleted records auto-filtered)
    const supplier = await this.prisma.supplier.findFirst({
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

    if (hasRelations && !force) {
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

    // Soft delete (extension intercepts delete and sets deletedAt)
    await this.prisma.supplier.delete({ where: { id } });
  }

  /**
   * Restore a soft-deleted supplier.
   * Uses raw SQL to bypass soft-delete auto-filtering.
   * @throws NotFoundException if supplier not found in deleted records
   */
  async restore(id: number): Promise<Supplier> {
    // Query deleted records using raw SQL (bypasses soft-delete extension filter)
    const deleted = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      'SELECT id FROM suppliers WHERE id = ? AND deleted_at IS NOT NULL',
      id,
    );

    if (!deleted || deleted.length === 0) {
      throw new NotFoundException(
        `Supplier with ID ${id} not found in deleted records`,
      );
    }

    // Restore by setting deleted_at to null
    await this.prisma.$executeRawUnsafe(
      'UPDATE suppliers SET deleted_at = NULL WHERE id = ?',
      id,
    );

    return this.prisma.supplier.findFirst({
      where: { id },
    }) as Promise<Supplier>;
  }

  /**
   * Find all fabrics associated with a supplier.
   * Returns paginated list with fabric details and supplier-specific pricing/lead time.
   * Throws NotFoundException if supplier not found or soft-deleted.
   */
  async findSupplierFabrics(
    supplierId: number,
    query: QuerySupplierFabricsDto,
  ): Promise<PaginatedResult<SupplierFabricItem>> {
    // Verify supplier exists (soft-deleted records auto-filtered)
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    // Build fabric filter conditions (soft-delete auto-filtered by extension)
    const fabricWhere: Prisma.FabricWhereInput = {};

    // Add fabric filters if provided
    if (query.fabricCode) {
      fabricWhere.fabricCode = { contains: query.fabricCode };
    }

    if (query.fabricName) {
      fabricWhere.name = { contains: query.fabricName };
    }

    if (query.color) {
      fabricWhere.color = query.color;
    }

    // Build where clause for FabricSupplier
    const where: Prisma.FabricSupplierWhereInput = {
      supplierId,
      fabric: fabricWhere,
    };

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? SupplierFabricSortField.createdAt;
    const sortOrder = query.sortOrder ?? 'desc';

    // Handle sorting - some fields are on fabric, others on fabricSupplier
    let orderBy: Prisma.FabricSupplierOrderByWithRelationInput;
    if (
      sortBy === SupplierFabricSortField.fabricCode ||
      sortBy === SupplierFabricSortField.fabricName
    ) {
      const fabricField =
        sortBy === SupplierFabricSortField.fabricCode ? 'fabricCode' : 'name';
      orderBy = { fabric: { [fabricField]: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Execute queries
    const [fabricSuppliers, total] = await Promise.all([
      this.prisma.fabricSupplier.findMany({
        where,
        ...paginationArgs,
        orderBy,
        include: {
          fabric: {
            select: {
              id: true,
              fabricCode: true,
              name: true,
              color: true,
              weight: true,
              width: true,
              defaultPrice: true,
            },
          },
        },
      }),
      this.prisma.fabricSupplier.count({ where }),
    ]);

    // Transform results - convert Decimal to number
    const items: SupplierFabricItem[] = fabricSuppliers.map((fs) => ({
      fabric: {
        id: fs.fabric.id,
        fabricCode: fs.fabric.fabricCode,
        name: fs.fabric.name,
        color: fs.fabric.color,
        weight: toNumber(fs.fabric.weight),
        width: toNumber(fs.fabric.width),
        defaultPrice: toNumber(fs.fabric.defaultPrice),
      },
      supplierRelation: {
        fabricSupplierId: fs.id,
        purchasePrice: toNumberRequired(fs.purchasePrice),
        minOrderQty: toNumber(fs.minOrderQty),
        leadTimeDays: fs.leadTimeDays,
      },
    }));

    return buildPaginatedResult(items, total, query);
  }
}

/**
 * Response structure for supplier fabric items.
 */
export interface SupplierFabricItem {
  fabric: {
    id: number;
    fabricCode: string;
    name: string;
    color: string | null;
    weight: number | null;
    width: number | null;
    defaultPrice: number | null;
  };
  supplierRelation: {
    fabricSupplierId: number;
    purchasePrice: number;
    minOrderQty: number | null;
    leadTimeDays: number | null;
  };
}
