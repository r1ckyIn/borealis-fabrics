import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileService, UploadedFile } from '../file/file.service';
import {
  CreateFabricDto,
  QueryFabricDto,
  UpdateFabricDto,
  QueryFabricSuppliersDto,
  FabricSupplierSortField,
  CreateFabricSupplierDto,
  UpdateFabricSupplierDto,
  QueryFabricPricingDto,
  FabricPricingSortField,
  CreateFabricPricingDto,
  UpdateFabricPricingDto,
} from './dto';
import {
  Fabric,
  FabricImage,
  FabricSupplier,
  CustomerPricing,
  Prisma,
} from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from '../common/constants/file.constants';
import { toNumber, toNumberRequired } from '../common/utils/decimal';

// Transaction client type for Prisma interactive transactions
type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

@Injectable()
export class FabricService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
  ) {}

  /**
   * Validate fabric-supplier association exists.
   * Checks that fabric, supplier, and their association all exist and are active.
   * Returns the association record for further operations.
   *
   * @throws NotFoundException if fabric, supplier, or association not found
   */
  private async validateFabricSupplierAssociation(
    tx: TransactionClient,
    fabricId: number,
    supplierId: number,
  ) {
    // Verify fabric exists and is active
    const fabric = await tx.fabric.findFirst({
      where: { id: fabricId, isActive: true },
    });

    if (!fabric) {
      throw new NotFoundException(`Fabric with ID ${fabricId} not found`);
    }

    // Verify supplier exists and is active
    const supplier = await tx.supplier.findFirst({
      where: { id: supplierId, isActive: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    // Verify association exists
    const association = await tx.fabricSupplier.findFirst({
      where: { fabricId, supplierId },
    });

    if (!association) {
      throw new NotFoundException(
        `Supplier with ID ${supplierId} is not associated with fabric ID ${fabricId}`,
      );
    }

    return association;
  }

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
   * Includes images with resolved URLs.
   * Throws NotFoundException if fabric not found or soft-deleted.
   */
  async findOne(id: number): Promise<Fabric & { images: FabricImage[] }> {
    const fabric = await this.prisma.fabric.findFirst({
      where: { id, isActive: true },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!fabric) {
      throw new NotFoundException(`Fabric with ID ${id} not found`);
    }

    // Resolve image URLs from key-only to full URLs
    return this.resolveImageUrls(fabric);
  }

  /**
   * Find all fabrics with optional filtering and pagination.
   */
  async findAll(query: QueryFabricDto): Promise<PaginatedResult<Fabric>> {
    // Build where clause
    const where: Prisma.FabricWhereInput = {
      isActive: query.isActive ?? true,
    };

    // Unified keyword search across fabricCode, name, and color
    if (query.keyword) {
      where.OR = [
        { fabricCode: { contains: query.keyword } },
        { name: { contains: query.keyword } },
        { color: { contains: query.keyword } },
      ];
    }

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
      // Check if fabric exists and is active
      const existing = await tx.fabric.findFirst({
        where: { id, isActive: true },
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
      this.prisma.quoteItem.count({ where: { fabricId: id } }),
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

  /**
   * Resolve image URLs from key-only storage to full URLs.
   * Delegates to FileService.getFileUrl which handles legacy full URLs gracefully.
   */
  private async resolveImageUrls<
    T extends { images?: { url: string; [key: string]: unknown }[] },
  >(fabric: T): Promise<T> {
    if (!fabric.images || fabric.images.length === 0) return fabric;
    const resolvedImages = await Promise.all(
      fabric.images.map(async (img) => ({
        ...img,
        url: await this.fileService.getFileUrl(img.url),
      })),
    );
    return { ...fabric, images: resolvedImages } as T;
  }

  /**
   * Upload an image for a fabric.
   * Validates fabric exists and is active, file type is an allowed image type,
   * and file size does not exceed 10MB.
   * Creates FabricImage record with key-only URL after successful file upload.
   * Returns resolved URL for client display.
   */
  async uploadImage(
    fabricId: number,
    file: UploadedFile,
    sortOrder: number = 0,
  ): Promise<FabricImage> {
    // Validate fabric exists and is active
    const fabric = await this.prisma.fabric.findFirst({
      where: { id: fabricId, isActive: true },
    });

    if (!fabric) {
      throw new NotFoundException(`Fabric with ID ${fabricId} not found`);
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: jpeg, png, gif, webp',
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File too large. Maximum size: 10MB');
    }

    // Upload file via FileService
    const uploadResult = await this.fileService.upload(file);

    // Create FabricImage record with key-only URL (not full URL)
    const fabricImage = await this.prisma.fabricImage.create({
      data: {
        fabricId,
        url: uploadResult.key,
        sortOrder,
      },
    });

    // Return with resolved URL for client display
    return {
      ...fabricImage,
      url: await this.fileService.getFileUrl(fabricImage.url),
    };
  }

  /**
   * Delete an image from a fabric.
   * Uses transaction to ensure atomic validation and deletion of FabricImage record.
   * Validates fabric exists and is active, image exists and belongs to the fabric.
   * Attempts to delete the associated file after transaction completes.
   */
  async deleteImage(fabricId: number, imageId: number): Promise<void> {
    // Use transaction for atomic validation and deletion
    const deletedImage = await this.prisma.$transaction(async (tx) => {
      // Validate fabric exists and is active
      const fabric = await tx.fabric.findFirst({
        where: { id: fabricId, isActive: true },
      });

      if (!fabric) {
        throw new NotFoundException(`Fabric with ID ${fabricId} not found`);
      }

      // Validate image exists and belongs to this fabric
      const image = await tx.fabricImage.findFirst({
        where: { id: imageId, fabricId },
      });

      if (!image) {
        throw new NotFoundException(
          `Fabric image with ID ${imageId} not found`,
        );
      }

      // Delete FabricImage record within transaction
      await tx.fabricImage.delete({
        where: { id: imageId },
      });

      return image;
    });

    // Try to delete the associated file (outside transaction)
    // File deletion failure should not affect the FabricImage deletion
    // URL may be key-only (new format) or legacy full URL
    let fileKey = deletedImage.url;
    if (fileKey.startsWith('http')) {
      // Legacy full URL format: http://localhost:3000/uploads/{key}
      const urlParts = fileKey.split('/uploads/');
      if (urlParts.length === 2) {
        fileKey = urlParts[1];
      } else {
        // External URL, skip file deletion
        return;
      }
    }
    try {
      await this.fileService.removeByKey(fileKey);
    } catch {
      // File may not exist in File table (e.g., orphan record)
      // Log warning but don't fail the operation since FabricImage is deleted
    }
  }

  /**
   * Find all suppliers associated with a fabric.
   * Returns paginated list with supplier details and fabric-specific pricing/lead time.
   * Throws NotFoundException if fabric not found or soft-deleted.
   */
  async findSuppliers(
    fabricId: number,
    query: QueryFabricSuppliersDto,
  ): Promise<PaginatedResult<FabricSupplierItem>> {
    // Verify fabric exists and is active
    const fabric = await this.prisma.fabric.findFirst({
      where: { id: fabricId, isActive: true },
    });

    if (!fabric) {
      throw new NotFoundException(`Fabric with ID ${fabricId} not found`);
    }

    // Build supplier filter conditions
    const supplierWhere: Prisma.SupplierWhereInput = {
      isActive: true,
    };

    // Add supplier filters if provided
    if (query.supplierName) {
      supplierWhere.companyName = { contains: query.supplierName };
    }

    // Build where clause for FabricSupplier
    const where: Prisma.FabricSupplierWhereInput = {
      fabricId,
      supplier: supplierWhere,
    };

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? FabricSupplierSortField.createdAt;
    const sortOrder = query.sortOrder ?? 'desc';

    // Handle sorting - supplierName is on supplier, others on fabricSupplier
    let orderBy: Prisma.FabricSupplierOrderByWithRelationInput;
    if (sortBy === FabricSupplierSortField.supplierName) {
      orderBy = { supplier: { companyName: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Execute queries in parallel
    const [fabricSuppliers, total] = await Promise.all([
      this.prisma.fabricSupplier.findMany({
        where,
        ...paginationArgs,
        orderBy,
        include: {
          supplier: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              phone: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.fabricSupplier.count({ where }),
    ]);

    // Transform results - convert Decimal to number
    const items: FabricSupplierItem[] = fabricSuppliers.map((fs) => ({
      supplier: {
        id: fs.supplier.id,
        companyName: fs.supplier.companyName,
        contactName: fs.supplier.contactName,
        phone: fs.supplier.phone,
        status: fs.supplier.status,
      },
      fabricSupplierRelation: {
        fabricSupplierId: fs.id,
        purchasePrice: toNumberRequired(fs.purchasePrice),
        minOrderQty: toNumber(fs.minOrderQty),
        leadTimeDays: fs.leadTimeDays,
      },
    }));

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Add a supplier association to a fabric.
   * Validates fabric and supplier exist and are active.
   * Throws ConflictException if association already exists.
   */
  async addSupplier(
    fabricId: number,
    createDto: CreateFabricSupplierDto,
  ): Promise<FabricSupplier> {
    return this.prisma.$transaction(async (tx) => {
      // Verify fabric exists and is active
      const fabric = await tx.fabric.findFirst({
        where: { id: fabricId, isActive: true },
      });

      if (!fabric) {
        throw new NotFoundException(`Fabric with ID ${fabricId} not found`);
      }

      // Verify supplier exists and is active
      const supplier = await tx.supplier.findFirst({
        where: { id: createDto.supplierId, isActive: true },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier with ID ${createDto.supplierId} not found`,
        );
      }

      // Create the association
      try {
        return await tx.fabricSupplier.create({
          data: {
            fabricId,
            supplierId: createDto.supplierId,
            purchasePrice: createDto.purchasePrice,
            minOrderQty: createDto.minOrderQty,
            leadTimeDays: createDto.leadTimeDays,
          },
        });
      } catch (error) {
        // Handle unique constraint violation (P2002)
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'This supplier is already associated with this fabric',
          );
        }
        throw error;
      }
    });
  }

  /**
   * Update a fabric-supplier association.
   * Validates fabric exists and is active, supplier is active, and association exists.
   */
  async updateSupplier(
    fabricId: number,
    supplierId: number,
    updateDto: UpdateFabricSupplierDto,
  ): Promise<FabricSupplier> {
    return this.prisma.$transaction(async (tx) => {
      const association = await this.validateFabricSupplierAssociation(
        tx,
        fabricId,
        supplierId,
      );

      // Update the association
      return tx.fabricSupplier.update({
        where: { id: association.id },
        data: updateDto,
      });
    });
  }

  /**
   * Remove a fabric-supplier association.
   * Validates fabric exists and is active, supplier is active, and association exists.
   */
  async removeSupplier(fabricId: number, supplierId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const association = await this.validateFabricSupplierAssociation(
        tx,
        fabricId,
        supplierId,
      );

      // Delete the association
      await tx.fabricSupplier.delete({
        where: { id: association.id },
      });
    });
  }

  // ========================================
  // Fabric Pricing Methods (2.3.13 - 2.3.16)
  // ========================================

  /**
   * Find all special pricing records for a fabric.
   * Returns paginated list with customer details.
   * Throws NotFoundException if fabric not found or soft-deleted.
   */
  async findPricing(
    fabricId: number,
    query: QueryFabricPricingDto,
  ): Promise<PaginatedResult<FabricPricingItem>> {
    // Verify fabric exists and is active
    const fabric = await this.prisma.fabric.findFirst({
      where: { id: fabricId, isActive: true },
    });

    if (!fabric) {
      throw new NotFoundException(`Fabric with ID ${fabricId} not found`);
    }

    // Build customer filter conditions
    const customerWhere: Prisma.CustomerWhereInput = {
      isActive: true,
    };

    // Add customer name filter if provided
    if (query.customerName) {
      customerWhere.companyName = { contains: query.customerName };
    }

    // Build where clause for CustomerPricing
    const where: Prisma.CustomerPricingWhereInput = {
      fabricId,
      customer: customerWhere,
    };

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? FabricPricingSortField.createdAt;
    const sortOrder = query.sortOrder ?? 'desc';

    // Handle sorting - customerName is on customer, others on customerPricing
    let orderBy: Prisma.CustomerPricingOrderByWithRelationInput;
    if (sortBy === FabricPricingSortField.customerName) {
      orderBy = { customer: { companyName: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Execute queries in parallel
    const [pricingRecords, total] = await Promise.all([
      this.prisma.customerPricing.findMany({
        where,
        ...paginationArgs,
        orderBy,
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
            },
          },
        },
      }),
      this.prisma.customerPricing.count({ where }),
    ]);

    // Transform results - convert Decimal to number
    // fabricId is always present for fabric-based pricing records
    const items: FabricPricingItem[] = pricingRecords.map((cp) => ({
      id: cp.id,
      customerId: cp.customerId,
      fabricId: cp.fabricId!,
      specialPrice: toNumberRequired(cp.specialPrice),
      createdAt: cp.createdAt,
      updatedAt: cp.updatedAt,
      customer: {
        id: cp.customer.id,
        companyName: cp.customer.companyName,
        contactName: cp.customer.contactName,
      },
    }));

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Create a special pricing record for a fabric-customer pair.
   * Uses transaction to ensure atomic validation and creation.
   * Throws NotFoundException if fabric or customer not found.
   * Throws ConflictException if pricing already exists for the pair.
   */
  async createPricing(
    fabricId: number,
    createDto: CreateFabricPricingDto,
  ): Promise<CustomerPricing> {
    return this.prisma.$transaction(async (tx) => {
      // Verify fabric exists and is active
      const fabric = await tx.fabric.findFirst({
        where: { id: fabricId, isActive: true },
      });
      if (!fabric) {
        throw new NotFoundException(`Fabric with ID ${fabricId} not found`);
      }

      // Verify customer exists and is active
      const customer = await tx.customer.findFirst({
        where: { id: createDto.customerId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${createDto.customerId} not found`,
        );
      }

      // Create pricing record (handle unique constraint violation)
      try {
        return await tx.customerPricing.create({
          data: {
            fabricId,
            customerId: createDto.customerId,
            specialPrice: createDto.specialPrice,
          },
        });
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'Customer already has special pricing for this fabric',
          );
        }
        throw error;
      }
    });
  }

  /**
   * Update a special pricing record.
   * Uses transaction to ensure atomic validation and update.
   * Throws NotFoundException if fabric or pricing not found.
   * Throws NotFoundException if pricing does not belong to the fabric.
   */
  async updatePricing(
    fabricId: number,
    pricingId: number,
    updateDto: UpdateFabricPricingDto,
  ): Promise<CustomerPricing> {
    return this.prisma.$transaction(async (tx) => {
      // Verify fabric exists and is active
      const fabric = await tx.fabric.findFirst({
        where: { id: fabricId, isActive: true },
      });
      if (!fabric) {
        throw new NotFoundException(`Fabric with ID ${fabricId} not found`);
      }

      // Verify pricing exists and belongs to this fabric
      const pricing = await tx.customerPricing.findUnique({
        where: { id: pricingId },
      });
      if (!pricing || pricing.fabricId !== fabricId) {
        throw new NotFoundException(
          `Fabric pricing with ID ${pricingId} not found`,
        );
      }

      // Verify customer is still active
      const customer = await tx.customer.findFirst({
        where: { id: pricing.customerId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${pricing.customerId} not found`,
        );
      }

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
   * Throws NotFoundException if fabric or pricing not found.
   * Throws NotFoundException if pricing does not belong to the fabric.
   */
  async removePricing(fabricId: number, pricingId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Verify fabric exists and is active
      const fabric = await tx.fabric.findFirst({
        where: { id: fabricId, isActive: true },
      });
      if (!fabric) {
        throw new NotFoundException(`Fabric with ID ${fabricId} not found`);
      }

      // Verify pricing exists and belongs to this fabric
      const pricing = await tx.customerPricing.findUnique({
        where: { id: pricingId },
      });
      if (!pricing || pricing.fabricId !== fabricId) {
        throw new NotFoundException(
          `Fabric pricing with ID ${pricingId} not found`,
        );
      }

      // Verify customer is still active
      const customer = await tx.customer.findFirst({
        where: { id: pricing.customerId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${pricing.customerId} not found`,
        );
      }

      // Delete the pricing record
      await tx.customerPricing.delete({
        where: { id: pricingId },
      });
    });
  }
}

/**
 * Response structure for fabric supplier items.
 */
export interface FabricSupplierItem {
  supplier: {
    id: number;
    companyName: string;
    contactName: string | null;
    phone: string | null;
    status: string;
  };
  fabricSupplierRelation: {
    fabricSupplierId: number;
    purchasePrice: number;
    minOrderQty: number | null;
    leadTimeDays: number | null;
  };
}

/**
 * Response structure for fabric pricing items.
 */
export interface FabricPricingItem {
  id: number;
  customerId: number;
  fabricId: number;
  specialPrice: number;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: number;
    companyName: string;
    contactName: string | null;
  };
}
