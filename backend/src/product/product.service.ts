import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CodeGeneratorService,
  CodePrefix,
} from '../common/services/code-generator.service';
import {
  CreateProductDto,
  QueryProductDto,
  UpdateProductDto,
  QueryProductSuppliersDto,
  ProductSupplierSortField,
  CreateProductSupplierDto,
  UpdateProductSupplierDto,
  QueryProductPricingDto,
  ProductPricingSortField,
  CreateProductPricingDto,
  UpdateProductPricingDto,
  CreateProductBundleDto,
  UpdateProductBundleDto,
  QueryProductBundleDto,
} from './dto';
import {
  Product,
  ProductSupplier,
  ProductBundle,
  ProductBundleItem,
  CustomerPricing,
  Supplier,
  Prisma,
} from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';
import { toNumber, toNumberRequired } from '../common/utils/decimal';
import { ProductSubCategory } from '../system/enums';

// Transaction client type for Prisma interactive transactions
type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerator: CodeGeneratorService,
  ) {}

  // ========================================
  // SubCategory to CodePrefix mapping
  // ========================================

  /**
   * Map product sub-category to code prefix for auto-generation.
   * @throws BadRequestException if subCategory is unknown
   */
  private getCodePrefix(subCategory: string): CodePrefix {
    const map: Record<string, CodePrefix> = {
      [ProductSubCategory.IRON_FRAME]: CodePrefix.IRON_FRAME,
      [ProductSubCategory.MOTOR]: CodePrefix.MOTOR,
      [ProductSubCategory.MATTRESS]: CodePrefix.MATTRESS,
      [ProductSubCategory.ACCESSORY]: CodePrefix.ACCESSORY,
    };
    const prefix = map[subCategory];
    if (!prefix) {
      throw new BadRequestException(`Unknown subCategory: ${subCategory}`);
    }
    return prefix;
  }

  // ========================================
  // Product CRUD
  // ========================================

  /**
   * Create a new product with auto-generated product code.
   * Uses transaction to prevent race conditions on productCode uniqueness.
   */
  async create(dto: CreateProductDto): Promise<Product> {
    const prefix = this.getCodePrefix(dto.subCategory);
    const productCode = await this.codeGenerator.generateCode(prefix);

    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate productCode (race condition guard)
      const existing = await tx.product.findFirst({
        where: { productCode },
      });

      if (existing) {
        throw new ConflictException(
          `Product with code "${productCode}" already exists`,
        );
      }

      return tx.product.create({
        data: {
          productCode,
          name: dto.name,
          category: dto.category,
          subCategory: dto.subCategory,
          modelNumber: dto.modelNumber,
          specification: dto.specification,
          defaultPrice: dto.defaultPrice,
          specs: dto.specs ?? undefined,
          notes: dto.notes,
        },
      });
    });
  }

  /**
   * Find all products with optional filtering and pagination.
   */
  async findAll(query: QueryProductDto): Promise<PaginatedResult<Product>> {
    // Build where clause
    const where: Prisma.ProductWhereInput = {};

    // Unified keyword search across name, productCode, and modelNumber
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { productCode: { contains: query.keyword } },
        { modelNumber: { contains: query.keyword } },
      ];
    }

    if (query.subCategory) {
      where.subCategory = query.subCategory;
    }

    if (query.category) {
      where.category = query.category;
    }

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // Execute queries in parallel
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        ...paginationArgs,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Find a product by ID.
   * Includes product suppliers (with supplier details) and bundle items.
   * @throws NotFoundException if product not found or soft-deleted
   */
  async findOne(id: number): Promise<
    Product & {
      productSuppliers: (ProductSupplier & { supplier: Supplier })[];
      bundleItems: ProductBundleItem[];
    }
  > {
    const product = await this.prisma.product.findFirst({
      where: { id },
      include: {
        productSuppliers: {
          include: { supplier: true },
        },
        bundleItems: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Update a product by ID.
   * Uses transaction to prevent race conditions.
   * @throws NotFoundException if product not found
   */
  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      // Check if product exists (soft-deleted records auto-filtered)
      const existing = await tx.product.findFirst({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      return tx.product.update({
        where: { id },
        data: {
          name: dto.name,
          category: dto.category,
          subCategory: dto.subCategory,
          modelNumber: dto.modelNumber,
          specification: dto.specification,
          defaultPrice: dto.defaultPrice,
          specs: dto.specs ?? undefined,
          notes: dto.notes,
        },
      });
    });
  }

  /**
   * Remove a product by ID (soft delete via Prisma extension).
   * - If relations exist and force=false: throw ConflictException with relation details
   * - Otherwise: soft delete (sets deletedAt timestamp via extension)
   */
  async remove(id: number, force: boolean): Promise<void> {
    // Check if product exists (soft-deleted records auto-filtered)
    const product = await this.prisma.product.findFirst({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check for related records in parallel
    const [productSupplierCount, bundleItemCount, customerPricingCount] =
      await Promise.all([
        this.prisma.productSupplier.count({ where: { productId: id } }),
        this.prisma.productBundleItem.count({ where: { productId: id } }),
        this.prisma.customerPricing.count({ where: { productId: id } }),
      ]);

    const hasRelations =
      productSupplierCount > 0 ||
      bundleItemCount > 0 ||
      customerPricingCount > 0;

    if (hasRelations && !force) {
      // Build relation details message
      const relations: string[] = [];
      if (productSupplierCount > 0)
        relations.push(
          `${productSupplierCount} supplier record${productSupplierCount > 1 ? 's' : ''}`,
        );
      if (bundleItemCount > 0)
        relations.push(
          `${bundleItemCount} bundle item${bundleItemCount > 1 ? 's' : ''}`,
        );
      if (customerPricingCount > 0)
        relations.push(
          `${customerPricingCount} customer pricing record${customerPricingCount > 1 ? 's' : ''}`,
        );

      throw new ConflictException(
        `Cannot delete product. Related data exists: ${relations.join(', ')}. ` +
          'Use ?force=true to soft delete instead.',
      );
    }

    // Soft delete (extension intercepts delete and sets deletedAt)
    await this.prisma.product.delete({ where: { id } });
  }

  /**
   * Restore a soft-deleted product.
   * Uses raw SQL to bypass soft-delete auto-filtering.
   * @throws NotFoundException if product not found in deleted records
   */
  async restore(id: number): Promise<Product> {
    const deleted = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      'SELECT id FROM products WHERE id = ? AND deleted_at IS NOT NULL',
      id,
    );

    if (!deleted || deleted.length === 0) {
      throw new NotFoundException(
        `Product with ID ${id} not found in deleted records`,
      );
    }

    await this.prisma.$executeRawUnsafe(
      'UPDATE products SET deleted_at = NULL WHERE id = ?',
      id,
    );

    return this.prisma.product.findFirst({ where: { id } }) as Promise<Product>;
  }

  // ========================================
  // Product Supplier Methods
  // ========================================

  /**
   * Validate product-supplier association exists.
   * @throws NotFoundException if product, supplier, or association not found
   */
  private async validateProductSupplierAssociation(
    tx: TransactionClient,
    productId: number,
    supplierId: number,
  ) {
    // Verify product exists and is active
    const product = await tx.product.findFirst({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Verify supplier exists and is active
    const supplier = await tx.supplier.findFirst({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    // Verify association exists
    const association = await tx.productSupplier.findFirst({
      where: { productId, supplierId },
    });

    if (!association) {
      throw new NotFoundException(
        `Supplier with ID ${supplierId} is not associated with product ID ${productId}`,
      );
    }

    return association;
  }

  /**
   * Find all suppliers associated with a product.
   * Returns paginated list with supplier details.
   * @throws NotFoundException if product not found
   */
  async findSuppliers(
    productId: number,
    query: QueryProductSuppliersDto,
  ): Promise<PaginatedResult<ProductSupplierItem>> {
    // Verify product exists and is active
    const product = await this.prisma.product.findFirst({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Build supplier filter conditions (soft-delete auto-filtered by extension)
    const supplierWhere: Prisma.SupplierWhereInput = {};

    if (query.supplierName) {
      supplierWhere.companyName = { contains: query.supplierName };
    }

    // Build where clause for ProductSupplier
    const where: Prisma.ProductSupplierWhereInput = {
      productId,
      supplier: supplierWhere,
    };

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? ProductSupplierSortField.createdAt;
    const sortOrder = query.sortOrder ?? 'desc';

    // Handle sorting - supplierName is on supplier, others on productSupplier
    let orderBy: Prisma.ProductSupplierOrderByWithRelationInput;
    if (sortBy === ProductSupplierSortField.supplierName) {
      orderBy = { supplier: { companyName: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Execute queries in parallel
    const [productSuppliers, total] = await Promise.all([
      this.prisma.productSupplier.findMany({
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
      this.prisma.productSupplier.count({ where }),
    ]);

    // Transform results - convert Decimal to number
    const items: ProductSupplierItem[] = productSuppliers.map((ps) => ({
      supplier: {
        id: ps.supplier.id,
        companyName: ps.supplier.companyName,
        contactName: ps.supplier.contactName,
        phone: ps.supplier.phone,
        status: ps.supplier.status,
      },
      productSupplierRelation: {
        productSupplierId: ps.id,
        purchasePrice: toNumberRequired(ps.purchasePrice),
        minOrderQty: toNumber(ps.minOrderQty),
        leadTimeDays: ps.leadTimeDays,
      },
    }));

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Add a supplier association to a product.
   * Validates product and supplier exist and are active.
   * @throws ConflictException if association already exists
   */
  async addSupplier(
    productId: number,
    dto: CreateProductSupplierDto,
  ): Promise<ProductSupplier> {
    return this.prisma.$transaction(async (tx) => {
      // Verify product exists and is active
      const product = await tx.product.findFirst({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Verify supplier exists and is active
      const supplier = await tx.supplier.findFirst({
        where: { id: dto.supplierId },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier with ID ${dto.supplierId} not found`,
        );
      }

      // Create the association
      try {
        return await tx.productSupplier.create({
          data: {
            productId,
            supplierId: dto.supplierId,
            purchasePrice: dto.purchasePrice,
            minOrderQty: dto.minOrderQty,
            leadTimeDays: dto.leadTimeDays,
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
            'This supplier is already associated with this product',
          );
        }
        throw error;
      }
    });
  }

  /**
   * Update a product-supplier association.
   * Validates product, supplier, and association exist.
   */
  async updateSupplier(
    productId: number,
    supplierId: number,
    dto: UpdateProductSupplierDto,
  ): Promise<ProductSupplier> {
    return this.prisma.$transaction(async (tx) => {
      const association = await this.validateProductSupplierAssociation(
        tx,
        productId,
        supplierId,
      );

      return tx.productSupplier.update({
        where: { id: association.id },
        data: dto,
      });
    });
  }

  /**
   * Remove a product-supplier association.
   * Validates product, supplier, and association exist.
   */
  async removeSupplier(productId: number, supplierId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const association = await this.validateProductSupplierAssociation(
        tx,
        productId,
        supplierId,
      );

      await tx.productSupplier.delete({
        where: { id: association.id },
      });
    });
  }

  // ========================================
  // Customer Pricing Methods
  // ========================================

  /**
   * Find all special pricing records for a product.
   * Returns paginated list with customer details.
   * @throws NotFoundException if product not found
   */
  async findPricing(
    productId: number,
    query: QueryProductPricingDto,
  ): Promise<PaginatedResult<ProductPricingItem>> {
    // Verify product exists and is active
    const product = await this.prisma.product.findFirst({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Build customer filter conditions (soft-delete auto-filtered by extension)
    const customerWhere: Prisma.CustomerWhereInput = {};

    if (query.customerName) {
      customerWhere.companyName = { contains: query.customerName };
    }

    // Build where clause for CustomerPricing
    const where: Prisma.CustomerPricingWhereInput = {
      productId,
      customer: customerWhere,
    };

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? ProductPricingSortField.createdAt;
    const sortOrder = query.sortOrder ?? 'desc';

    // Handle sorting - customerName is on customer, others on customerPricing
    let orderBy: Prisma.CustomerPricingOrderByWithRelationInput;
    if (sortBy === ProductPricingSortField.customerName) {
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
    const items: ProductPricingItem[] = pricingRecords.map((cp) => ({
      id: cp.id,
      customerId: cp.customerId,
      productId: cp.productId!,
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
   * Create a special pricing record for a product-customer pair.
   * Sets fabricId to null and productId to the product's id (XOR pattern).
   * @throws NotFoundException if product or customer not found
   * @throws ConflictException if pricing already exists for the pair
   */
  async createPricing(
    productId: number,
    dto: CreateProductPricingDto,
  ): Promise<CustomerPricing> {
    return this.prisma.$transaction(async (tx) => {
      // Verify product exists and is active
      const product = await tx.product.findFirst({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Verify customer exists and is active
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${dto.customerId} not found`,
        );
      }

      // Create pricing record with productId (fabricId = null for XOR)
      try {
        return await tx.customerPricing.create({
          data: {
            fabricId: null,
            productId,
            customerId: dto.customerId,
            specialPrice: dto.specialPrice,
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
            'Customer already has special pricing for this product',
          );
        }
        throw error;
      }
    });
  }

  /**
   * Update a special pricing record.
   * @throws NotFoundException if product or pricing not found
   */
  async updatePricing(
    productId: number,
    pricingId: number,
    dto: UpdateProductPricingDto,
  ): Promise<CustomerPricing> {
    return this.prisma.$transaction(async (tx) => {
      // Verify product exists and is active
      const product = await tx.product.findFirst({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Verify pricing exists and belongs to this product
      const pricing = await tx.customerPricing.findUnique({
        where: { id: pricingId },
      });
      if (!pricing || pricing.productId !== productId) {
        throw new NotFoundException(
          `Product pricing with ID ${pricingId} not found`,
        );
      }

      return tx.customerPricing.update({
        where: { id: pricingId },
        data: {
          specialPrice: dto.specialPrice,
        },
      });
    });
  }

  /**
   * Delete a special pricing record.
   * @throws NotFoundException if product or pricing not found
   */
  async removePricing(productId: number, pricingId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Verify product exists and is active
      const product = await tx.product.findFirst({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Verify pricing exists and belongs to this product
      const pricing = await tx.customerPricing.findUnique({
        where: { id: pricingId },
      });
      if (!pricing || pricing.productId !== productId) {
        throw new NotFoundException(
          `Product pricing with ID ${pricingId} not found`,
        );
      }

      await tx.customerPricing.delete({
        where: { id: pricingId },
      });
    });
  }

  // ========================================
  // Product Bundle Methods
  // ========================================

  /**
   * Find all product bundles with pagination.
   */
  async findBundles(
    query: QueryProductBundleDto,
  ): Promise<PaginatedResult<ProductBundle>> {
    // Build where clause
    const where: Prisma.ProductBundleWhereInput = {};

    // Keyword search across bundleCode and name
    if (query.keyword) {
      where.OR = [
        { bundleCode: { contains: query.keyword } },
        { name: { contains: query.keyword } },
      ];
    }

    // Build pagination args
    const paginationArgs = buildPaginationArgs(query);

    // Build sort order
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // Execute queries in parallel
    const [items, total] = await Promise.all([
      this.prisma.productBundle.findMany({
        where,
        ...paginationArgs,
        orderBy,
        include: {
          _count: { select: { items: true } },
        },
      }),
      this.prisma.productBundle.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Create a product bundle with auto-generated bundle code.
   * Validates all product IDs exist before creating.
   * @throws NotFoundException if any product ID is invalid
   */
  async createBundle(dto: CreateProductBundleDto): Promise<ProductBundle> {
    const bundleCode = await this.codeGenerator.generateCode(CodePrefix.BUNDLE);

    return this.prisma.$transaction(async (tx) => {
      // Validate all product IDs exist
      const productIds = dto.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });

      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));

      if (missingIds.length > 0) {
        throw new NotFoundException(
          `Products not found: ${missingIds.join(', ')}`,
        );
      }

      // Create bundle with items
      return tx.productBundle.create({
        data: {
          bundleCode,
          name: dto.name,
          description: dto.description,
          totalPrice: dto.totalPrice,
          items: {
            createMany: {
              data: dto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity ?? 1,
              })),
            },
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });
    });
  }

  /**
   * Find a single product bundle by ID.
   * Includes items with product details.
   * @throws NotFoundException if bundle not found
   */
  async findBundle(id: number): Promise<ProductBundle> {
    const bundle = await this.prisma.productBundle.findFirst({
      where: { id },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!bundle) {
      throw new NotFoundException(`Product bundle with ID ${id} not found`);
    }

    return bundle;
  }

  /**
   * Update a product bundle.
   * If items are provided, replaces all existing items.
   * @throws NotFoundException if bundle not found or any product ID is invalid
   */
  async updateBundle(
    id: number,
    dto: UpdateProductBundleDto,
  ): Promise<ProductBundle> {
    return this.prisma.$transaction(async (tx) => {
      // Check if bundle exists
      const existing = await tx.productBundle.findFirst({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Product bundle with ID ${id} not found`);
      }

      // If items provided, validate all product IDs and replace
      if (dto.items && dto.items.length > 0) {
        const productIds = dto.items.map((item) => item.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true },
        });

        const foundIds = new Set(products.map((p) => p.id));
        const missingIds = productIds.filter((pid) => !foundIds.has(pid));

        if (missingIds.length > 0) {
          throw new NotFoundException(
            `Products not found: ${missingIds.join(', ')}`,
          );
        }

        // Delete existing items, then create new ones
        await tx.productBundleItem.deleteMany({
          where: { bundleId: id },
        });

        await tx.productBundleItem.createMany({
          data: dto.items.map((item) => ({
            bundleId: id,
            productId: item.productId,
            quantity: item.quantity ?? 1,
          })),
        });
      }

      // Update bundle fields
      return tx.productBundle.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          totalPrice: dto.totalPrice,
        },
        include: {
          items: { include: { product: true } },
        },
      });
    });
  }

  /**
   * Delete a product bundle.
   * Cascade deletes bundle items.
   * @throws NotFoundException if bundle not found
   */
  async removeBundle(id: number): Promise<void> {
    const bundle = await this.prisma.productBundle.findFirst({
      where: { id },
    });

    if (!bundle) {
      throw new NotFoundException(`Product bundle with ID ${id} not found`);
    }

    // Delete bundle (cascade deletes items via Prisma relation)
    await this.prisma.productBundle.delete({
      where: { id },
    });
  }
}

/**
 * Response structure for product supplier items.
 */
export interface ProductSupplierItem {
  supplier: {
    id: number;
    companyName: string;
    contactName: string | null;
    phone: string | null;
    status: string;
  };
  productSupplierRelation: {
    productSupplierId: number;
    purchasePrice: number;
    minOrderQty: number | null;
    leadTimeDays: number | null;
  };
}

/**
 * Response structure for product pricing items.
 */
export interface ProductPricingItem {
  id: number;
  customerId: number;
  productId: number;
  specialPrice: number;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: number;
    companyName: string;
    contactName: string | null;
  };
}
