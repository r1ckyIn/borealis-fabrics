import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileService, UploadedFile } from '../file/file.service';
import { CreateFabricDto, QueryFabricDto, UpdateFabricDto } from './dto';
import { Fabric, FabricImage, Prisma } from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';

// Allowed image MIME types for fabric images
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class FabricService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
  ) {}

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

  /**
   * Upload an image for a fabric.
   * Validates fabric exists and is active, file type is an allowed image type,
   * and file size does not exceed 10MB.
   * Creates FabricImage record after successful file upload.
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

    // Create FabricImage record
    return this.prisma.fabricImage.create({
      data: {
        fabricId,
        url: uploadResult.url,
        sortOrder,
      },
    });
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
    // URL format: http://localhost:3000/uploads/{key}
    const urlParts = deletedImage.url.split('/uploads/');
    if (urlParts.length === 2) {
      const key = urlParts[1];
      try {
        await this.fileService.removeByKey(key);
      } catch {
        // File may not exist in File table (e.g., external URL or orphan record)
        // Log warning but don't fail the operation since FabricImage is deleted
      }
    }
    // If URL doesn't contain /uploads/, it's likely an external URL
    // Skip file deletion in this case
  }
}
