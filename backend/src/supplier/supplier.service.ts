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
   * Throws ConflictException if companyName already exists.
   */
  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Check for duplicate companyName
    const existing = await this.prisma.supplier.findFirst({
      where: { companyName: createSupplierDto.companyName },
    });

    if (existing) {
      throw new ConflictException(
        `Supplier with company name "${createSupplierDto.companyName}" already exists`,
      );
    }

    return this.prisma.supplier.create({
      data: createSupplierDto,
    });
  }

  /**
   * Find a supplier by ID.
   * Throws NotFoundException if supplier not found.
   */
  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
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
   * Throws NotFoundException if supplier not found.
   * Throws ConflictException if companyName conflicts with another supplier.
   */
  async update(
    id: number,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    // Check if supplier exists
    const existing = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Check for companyName conflict if updating companyName
    if (updateSupplierDto.companyName) {
      const conflict = await this.prisma.supplier.findFirst({
        where: { companyName: updateSupplierDto.companyName },
      });

      // If found a supplier with same name and it's not the current one
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Supplier with company name "${updateSupplierDto.companyName}" already exists`,
        );
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }
}
