import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  QueryProductDto,
  UpdateProductDto,
  CreateProductBundleDto,
  QueryProductBundleDto,
} from './dto';
import { Product } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PaginatedResult } from '../common/utils/pagination';

describe('ProductController', () => {
  let controller: ProductController;

  // Mock data
  const mockProduct: Product = {
    id: 1,
    productCode: 'TJ-2603-0001',
    name: 'Heavy Duty Iron Frame A1',
    category: 'IRON_FRAME_MOTOR',
    subCategory: 'IRON_FRAME',
    modelNumber: 'TJ-A1-2024',
    specification: '180x200cm',
    defaultPrice: new Decimal(1200.5),
    specs: null,
    notes: null,
    isActive: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockPaginatedResult: PaginatedResult<Product> = {
    items: [mockProduct],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
  };

  const mockProductService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findSuppliers: jest.fn(),
    addSupplier: jest.fn(),
    updateSupplier: jest.fn(),
    removeSupplier: jest.fn(),
    findPricing: jest.fn(),
    createPricing: jest.fn(),
    updatePricing: jest.fn(),
    removePricing: jest.fn(),
    findBundles: jest.fn(),
    createBundle: jest.fn(),
    findBundle: jest.fn(),
    updateBundle: jest.fn(),
    removeBundle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ========================================
  // Product CRUD Tests
  // ========================================
  describe('create (POST /)', () => {
    it('should create a product successfully', async () => {
      const createDto: CreateProductDto = {
        name: 'Iron Frame A1',
        category: 'IRON_FRAME_MOTOR',
        subCategory: 'IRON_FRAME',
      };
      mockProductService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createDto);

      expect(mockProductService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll (GET /)', () => {
    it('should return paginated products', async () => {
      const query: QueryProductDto = { page: 1, pageSize: 20 };
      mockProductService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(query);

      expect(mockProductService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOne (GET /:id)', () => {
    it('should return a product by ID', async () => {
      mockProductService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne(1);

      expect(mockProductService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update (PATCH /:id)', () => {
    it('should update a product successfully', async () => {
      const updateDto: UpdateProductDto = { name: 'Updated Frame' };
      const updatedProduct = { ...mockProduct, ...updateDto };
      mockProductService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(1, updateDto);

      expect(mockProductService.update).toHaveBeenCalledWith(1, updateDto);
      expect(result.name).toBe('Updated Frame');
    });
  });

  describe('remove (DELETE /:id)', () => {
    it('should remove a product without force', async () => {
      mockProductService.remove.mockResolvedValue(undefined);

      await controller.remove(1, undefined);

      expect(mockProductService.remove).toHaveBeenCalledWith(1, false);
    });

    it('should remove a product with force=true', async () => {
      mockProductService.remove.mockResolvedValue(undefined);

      await controller.remove(1, true);

      expect(mockProductService.remove).toHaveBeenCalledWith(1, true);
    });
  });

  // ========================================
  // Product Supplier Tests
  // ========================================
  describe('addSupplier (POST /:id/suppliers)', () => {
    it('should call productService.addSupplier with correct args', async () => {
      const dto = { supplierId: 1, purchasePrice: 450 };
      mockProductService.addSupplier.mockResolvedValue({ id: 1 });

      await controller.addSupplier(1, dto);

      expect(mockProductService.addSupplier).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('removeSupplier (DELETE /:id/suppliers/:supplierId)', () => {
    it('should call productService.removeSupplier with correct args', async () => {
      mockProductService.removeSupplier.mockResolvedValue(undefined);

      await controller.removeSupplier(1, 5);

      expect(mockProductService.removeSupplier).toHaveBeenCalledWith(1, 5);
    });
  });

  // ========================================
  // Product Pricing Tests
  // ========================================
  describe('createPricing (POST /:id/pricing)', () => {
    it('should call productService.createPricing with correct args', async () => {
      const dto = { customerId: 5, specialPrice: 1099.99 };
      mockProductService.createPricing.mockResolvedValue({ id: 1 });

      await controller.createPricing(1, dto);

      expect(mockProductService.createPricing).toHaveBeenCalledWith(1, dto);
    });
  });

  // ========================================
  // Bundle Tests
  // ========================================
  describe('createBundle (POST /bundles)', () => {
    it('should call productService.createBundle with DTO', async () => {
      const dto: CreateProductBundleDto = {
        name: 'Standard Bed Set',
        items: [{ productId: 1, quantity: 1 }],
      };
      mockProductService.createBundle.mockResolvedValue({ id: 1 });

      await controller.createBundle(dto);

      expect(mockProductService.createBundle).toHaveBeenCalledWith(dto);
    });
  });

  describe('findBundles (GET /bundles)', () => {
    it('should call productService.findBundles with query', async () => {
      mockProductService.findBundles.mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      });

      const query: QueryProductBundleDto = { page: 1, pageSize: 20 };
      await controller.findBundles(query);

      expect(mockProductService.findBundles).toHaveBeenCalled();
    });
  });

  describe('findBundle (GET /bundles/:bundleId)', () => {
    it('should call productService.findBundle with bundleId', async () => {
      mockProductService.findBundle.mockResolvedValue({ id: 1 });

      await controller.findBundle(1);

      expect(mockProductService.findBundle).toHaveBeenCalledWith(1);
    });
  });

  describe('removeBundle (DELETE /bundles/:bundleId)', () => {
    it('should call productService.removeBundle with bundleId', async () => {
      mockProductService.removeBundle.mockResolvedValue(undefined);

      await controller.removeBundle(5);

      expect(mockProductService.removeBundle).toHaveBeenCalledWith(5);
    });
  });
});
