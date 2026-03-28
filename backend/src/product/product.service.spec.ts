/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { CreateProductDto, QueryProductDto } from './dto';
import { Product } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('ProductService', () => {
  let service: ProductService;

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
    deletedAt: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const createDto: CreateProductDto = {
    name: 'Heavy Duty Iron Frame A1',
    category: 'IRON_FRAME_MOTOR',
    subCategory: 'IRON_FRAME',
    modelNumber: 'TJ-A1-2024',
    specification: '180x200cm',
    defaultPrice: 1200.5,
  };

  // Mock Prisma methods
  const productMock = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const productSupplierMock = {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const productBundleMock = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const productBundleItemMock = {
    count: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  };

  const customerPricingMock = {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const supplierMock = { findFirst: jest.fn() };
  const customerMock = { findFirst: jest.fn() };

  const mockPrismaService = {
    product: productMock,
    productSupplier: productSupplierMock,
    productBundle: productBundleMock,
    productBundleItem: productBundleItemMock,
    customerPricing: customerPricingMock,
    supplier: supplierMock,
    customer: customerMock,
    $transaction: jest.fn().mockImplementation((callback: CallableFunction) =>
      callback({
        product: productMock,
        productSupplier: productSupplierMock,
        productBundle: productBundleMock,
        productBundleItem: productBundleItemMock,
        customerPricing: customerPricingMock,
        supplier: supplierMock,
        customer: customerMock,
      }),
    ),
  };

  const mockCodeGenerator = {
    generateCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CodeGeneratorService,
          useValue: mockCodeGenerator,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // SubCategory to CodePrefix mapping
  // ========================================
  describe('getCodePrefix (via create)', () => {
    it('should map IRON_FRAME to TJ prefix', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('TJ-2603-0001');
      productMock.findFirst.mockResolvedValue(null);
      productMock.create.mockResolvedValue(mockProduct);

      await service.create({ ...createDto, subCategory: 'IRON_FRAME' });

      expect(mockCodeGenerator.generateCode).toHaveBeenCalledWith('TJ');
    });

    it('should map MOTOR to DJ prefix', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('DJ-2603-0001');
      productMock.findFirst.mockResolvedValue(null);
      productMock.create.mockResolvedValue({
        ...mockProduct,
        subCategory: 'MOTOR',
      });

      await service.create({ ...createDto, subCategory: 'MOTOR' });

      expect(mockCodeGenerator.generateCode).toHaveBeenCalledWith('DJ');
    });

    it('should map MATTRESS to CD prefix', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('CD-2603-0001');
      productMock.findFirst.mockResolvedValue(null);
      productMock.create.mockResolvedValue({
        ...mockProduct,
        subCategory: 'MATTRESS',
      });

      await service.create({ ...createDto, subCategory: 'MATTRESS' });

      expect(mockCodeGenerator.generateCode).toHaveBeenCalledWith('CD');
    });

    it('should map ACCESSORY to PJ prefix', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('PJ-2603-0001');
      productMock.findFirst.mockResolvedValue(null);
      productMock.create.mockResolvedValue({
        ...mockProduct,
        subCategory: 'ACCESSORY',
      });

      await service.create({ ...createDto, subCategory: 'ACCESSORY' });

      expect(mockCodeGenerator.generateCode).toHaveBeenCalledWith('PJ');
    });

    it('should throw BadRequestException for unknown subCategory', async () => {
      await expect(
        service.create({ ...createDto, subCategory: 'UNKNOWN' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // Product CRUD
  // ========================================
  describe('create', () => {
    it('should create a product with auto-generated code', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('TJ-2603-0001');
      productMock.findFirst.mockResolvedValue(null);
      productMock.create.mockResolvedValue(mockProduct);

      const result = await service.create(createDto);

      expect(mockCodeGenerator.generateCode).toHaveBeenCalledWith('TJ');
      expect(productMock.create).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should throw ConflictException if productCode already exists', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('TJ-2603-0001');
      productMock.findFirst.mockResolvedValue(mockProduct);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      productMock.findMany.mockResolvedValue([mockProduct]);
      productMock.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
      } as QueryProductDto);

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by keyword across name, productCode, modelNumber', async () => {
      productMock.findMany.mockResolvedValue([]);
      productMock.count.mockResolvedValue(0);

      await service.findAll({ keyword: 'iron' } as QueryProductDto);

      const findManyCall = productMock.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toHaveLength(3);
      expect(findManyCall.where.OR[0]).toEqual({ name: { contains: 'iron' } });
      expect(findManyCall.where.OR[1]).toEqual({
        productCode: { contains: 'iron' },
      });
      expect(findManyCall.where.OR[2]).toEqual({
        modelNumber: { contains: 'iron' },
      });
    });

    it('should filter by subCategory', async () => {
      productMock.findMany.mockResolvedValue([]);
      productMock.count.mockResolvedValue(0);

      await service.findAll({ subCategory: 'IRON_FRAME' } as QueryProductDto);

      const findManyCall = productMock.findMany.mock.calls[0][0];
      expect(findManyCall.where.subCategory).toBe('IRON_FRAME');
    });

    it('should filter by category', async () => {
      productMock.findMany.mockResolvedValue([]);
      productMock.count.mockResolvedValue(0);

      await service.findAll({
        category: 'IRON_FRAME_MOTOR',
      } as QueryProductDto);

      const findManyCall = productMock.findMany.mock.calls[0][0];
      expect(findManyCall.where.category).toBe('IRON_FRAME_MOTOR');
    });
  });

  describe('findOne', () => {
    it('should return product with suppliers and bundle items', async () => {
      const productWithRelations = {
        ...mockProduct,
        productSuppliers: [],
        bundleItems: [],
      };
      productMock.findFirst.mockResolvedValue(productWithRelations);

      const result = await service.findOne(1);

      expect(result).toEqual(productWithRelations);
      expect(productMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          productSuppliers: { include: { supplier: true } },
          bundleItems: true,
        },
      });
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productMock.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update product fields', async () => {
      const updated = { ...mockProduct, name: 'Updated Frame' };
      productMock.findFirst.mockResolvedValue(mockProduct);
      productMock.update.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'Updated Frame' });

      expect(result.name).toBe('Updated Frame');
    });

    it('should throw NotFoundException if product not found', async () => {
      productMock.findFirst.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete product with no relations', async () => {
      productMock.findFirst.mockResolvedValue(mockProduct);
      productSupplierMock.count.mockResolvedValue(0);
      productBundleItemMock.count.mockResolvedValue(0);
      customerPricingMock.count.mockResolvedValue(0);
      productMock.delete.mockResolvedValue(mockProduct);

      await service.remove(1, false);

      expect(productMock.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw ConflictException when relations exist and force=false', async () => {
      productMock.findFirst.mockResolvedValue(mockProduct);
      productSupplierMock.count.mockResolvedValue(2);
      productBundleItemMock.count.mockResolvedValue(0);
      customerPricingMock.count.mockResolvedValue(0);

      await expect(service.remove(1, false)).rejects.toThrow(ConflictException);
    });

    it('should soft delete when relations exist and force=true', async () => {
      productMock.findFirst.mockResolvedValue(mockProduct);
      productSupplierMock.count.mockResolvedValue(1);
      productBundleItemMock.count.mockResolvedValue(0);
      customerPricingMock.count.mockResolvedValue(0);
      productMock.delete.mockResolvedValue(mockProduct);

      await service.remove(1, true);

      // Extension intercepts delete() and sets deletedAt
      expect(productMock.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productMock.findFirst.mockResolvedValue(null);

      await expect(service.remove(999, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========================================
  // Product Supplier Tests
  // ========================================
  describe('addSupplier', () => {
    const mockSupplier = {
      id: 1,
      companyName: 'Test Supplier',
      deletedAt: null,
    };

    it('should add supplier association successfully', async () => {
      const mockAssociation = {
        id: 1,
        productId: 1,
        supplierId: 1,
        purchasePrice: new Decimal(450),
        minOrderQty: null,
        leadTimeDays: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      productMock.findFirst.mockResolvedValue(mockProduct);
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      productSupplierMock.create.mockResolvedValue(mockAssociation);

      const result = await service.addSupplier(1, {
        supplierId: 1,
        purchasePrice: 450,
        leadTimeDays: 7,
      });

      expect(result).toEqual(mockAssociation);
    });

    it('should throw ConflictException for duplicate association', async () => {
      productMock.findFirst.mockResolvedValue(mockProduct);
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      productSupplierMock.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.addSupplier(1, { supplierId: 1, purchasePrice: 450 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when product not found', async () => {
      productMock.findFirst.mockResolvedValue(null);

      await expect(
        service.addSupplier(999, { supplierId: 1, purchasePrice: 450 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSupplier', () => {
    it('should update supplier association', async () => {
      const mockAssociation = {
        id: 1,
        productId: 1,
        supplierId: 1,
        purchasePrice: new Decimal(500),
        minOrderQty: null,
        leadTimeDays: 14,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      productMock.findFirst.mockResolvedValue(mockProduct);
      supplierMock.findFirst.mockResolvedValue({ id: 1, deletedAt: null });
      productSupplierMock.findFirst.mockResolvedValue(mockAssociation);
      productSupplierMock.update.mockResolvedValue({
        ...mockAssociation,
        purchasePrice: new Decimal(500),
      });

      const result = await service.updateSupplier(1, 1, {
        purchasePrice: 500,
      });

      expect(result.purchasePrice).toEqual(new Decimal(500));
    });
  });

  describe('removeSupplier', () => {
    it('should remove supplier association', async () => {
      const mockAssociation = { id: 1, productId: 1, supplierId: 1 };
      productMock.findFirst.mockResolvedValue(mockProduct);
      supplierMock.findFirst.mockResolvedValue({ id: 1, deletedAt: null });
      productSupplierMock.findFirst.mockResolvedValue(mockAssociation);
      productSupplierMock.delete.mockResolvedValue(mockAssociation);

      await service.removeSupplier(1, 1);

      expect(productSupplierMock.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findSuppliers', () => {
    it('should return paginated supplier list', async () => {
      productMock.findFirst.mockResolvedValue(mockProduct);
      productSupplierMock.findMany.mockResolvedValue([
        {
          id: 1,
          productId: 1,
          supplierId: 1,
          purchasePrice: new Decimal(450),
          minOrderQty: null,
          leadTimeDays: 7,
          supplier: {
            id: 1,
            companyName: 'Test Supplier',
            contactName: 'John',
            phone: '123',
            status: 'active',
          },
        },
      ]);
      productSupplierMock.count.mockResolvedValue(1);

      const result = await service.findSuppliers(1, {
        page: 1,
        pageSize: 20,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].supplier.companyName).toBe('Test Supplier');
      expect(result.items[0].productSupplierRelation.purchasePrice).toBe(450);
    });
  });

  // ========================================
  // Customer Pricing Tests
  // ========================================
  describe('createPricing', () => {
    it('should create pricing with fabricId=null and productId set', async () => {
      const mockPricing = {
        id: 1,
        customerId: 5,
        fabricId: null,
        productId: 1,
        specialPrice: new Decimal(1099.99),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      productMock.findFirst.mockResolvedValue(mockProduct);
      customerMock.findFirst.mockResolvedValue({ id: 5, deletedAt: null });
      customerPricingMock.create.mockResolvedValue(mockPricing);

      const result = await service.createPricing(1, {
        customerId: 5,
        specialPrice: 1099.99,
      });

      expect(result.fabricId).toBeNull();
      expect(result.productId).toBe(1);
      expect(customerPricingMock.create).toHaveBeenCalledWith({
        data: {
          fabricId: null,
          productId: 1,
          customerId: 5,
          specialPrice: 1099.99,
        },
      });
    });

    it('should throw ConflictException for duplicate pricing', async () => {
      productMock.findFirst.mockResolvedValue(mockProduct);
      customerMock.findFirst.mockResolvedValue({ id: 5, deletedAt: null });
      customerPricingMock.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.createPricing(1, { customerId: 5, specialPrice: 1099.99 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when customer not found', async () => {
      productMock.findFirst.mockResolvedValue(mockProduct);
      customerMock.findFirst.mockResolvedValue(null);

      await expect(
        service.createPricing(1, { customerId: 999, specialPrice: 1099.99 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePricing', () => {
    it('should update pricing specialPrice', async () => {
      const mockPricing = {
        id: 10,
        customerId: 5,
        fabricId: null,
        productId: 1,
        specialPrice: new Decimal(999.99),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      productMock.findFirst.mockResolvedValue(mockProduct);
      customerPricingMock.findUnique.mockResolvedValue(mockPricing);
      customerPricingMock.update.mockResolvedValue({
        ...mockPricing,
        specialPrice: new Decimal(888.88),
      });

      const result = await service.updatePricing(1, 10, {
        specialPrice: 888.88,
      });

      expect(Number(result.specialPrice)).toBe(888.88);
    });
  });

  describe('removePricing', () => {
    it('should remove pricing record', async () => {
      const mockPricing = {
        id: 10,
        customerId: 5,
        fabricId: null,
        productId: 1,
        specialPrice: new Decimal(999.99),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      productMock.findFirst.mockResolvedValue(mockProduct);
      customerPricingMock.findUnique.mockResolvedValue(mockPricing);
      customerPricingMock.delete.mockResolvedValue(mockPricing);

      await service.removePricing(1, 10);

      expect(customerPricingMock.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
    });
  });

  // ========================================
  // Product Bundle Tests
  // ========================================
  describe('createBundle', () => {
    it('should create bundle with auto-generated code', async () => {
      const mockBundle = {
        id: 1,
        bundleCode: 'BD-2603-0001',
        name: 'Standard Bed Set',
        description: null,
        totalPrice: new Decimal(3500),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };
      mockCodeGenerator.generateCode.mockResolvedValue('BD-2603-0001');
      productMock.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      productBundleMock.create.mockResolvedValue(mockBundle);

      const result = await service.createBundle({
        name: 'Standard Bed Set',
        totalPrice: 3500,
        items: [
          { productId: 1, quantity: 1 },
          { productId: 2, quantity: 2 },
        ],
      });

      expect(mockCodeGenerator.generateCode).toHaveBeenCalledWith('BD');
      expect(result.bundleCode).toBe('BD-2603-0001');
    });

    it('should throw NotFoundException for invalid productId in items', async () => {
      mockCodeGenerator.generateCode.mockResolvedValue('BD-2603-0001');
      productMock.findMany.mockResolvedValue([{ id: 1 }]); // Only product 1 found

      await expect(
        service.createBundle({
          name: 'Invalid Bundle',
          items: [
            { productId: 1, quantity: 1 },
            { productId: 999, quantity: 1 },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBundles', () => {
    it('should return paginated bundle list', async () => {
      const mockBundle = {
        id: 1,
        bundleCode: 'BD-2603-0001',
        name: 'Standard Bed Set',
        deletedAt: null,
        _count: { items: 3 },
      };
      productBundleMock.findMany.mockResolvedValue([mockBundle]);
      productBundleMock.count.mockResolvedValue(1);

      const result = await service.findBundles({
        page: 1,
        pageSize: 20,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findBundle', () => {
    it('should return bundle with items and product details', async () => {
      const mockBundle = {
        id: 1,
        bundleCode: 'BD-2603-0001',
        name: 'Standard Bed Set',
        deletedAt: null,
        items: [{ id: 1, productId: 1, quantity: 1, product: mockProduct }],
      };
      productBundleMock.findFirst.mockResolvedValue(mockBundle);

      const result = await service.findBundle(1);

      expect(result).toEqual(mockBundle);
    });

    it('should throw NotFoundException for non-existent bundle', async () => {
      productBundleMock.findFirst.mockResolvedValue(null);

      await expect(service.findBundle(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBundle', () => {
    it('should update bundle name and items', async () => {
      const mockBundle = {
        id: 1,
        bundleCode: 'BD-2603-0001',
        name: 'Updated Bundle',
        deletedAt: null,
        items: [],
      };
      productBundleMock.findFirst.mockResolvedValue(mockBundle);
      productMock.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);
      productBundleItemMock.deleteMany.mockResolvedValue({ count: 2 });
      productBundleItemMock.createMany.mockResolvedValue({ count: 2 });
      productBundleMock.update.mockResolvedValue(mockBundle);

      const result = await service.updateBundle(1, {
        name: 'Updated Bundle',
        items: [
          { productId: 1, quantity: 1 },
          { productId: 3, quantity: 2 },
        ],
      });

      expect(result.name).toBe('Updated Bundle');
    });
  });

  describe('removeBundle', () => {
    it('should delete bundle', async () => {
      const mockBundle = { id: 1, bundleCode: 'BD-2603-0001' };
      productBundleMock.findFirst.mockResolvedValue(mockBundle);
      productBundleMock.delete.mockResolvedValue(mockBundle);

      await service.removeBundle(1);

      expect(productBundleMock.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException for non-existent bundle', async () => {
      productBundleMock.findFirst.mockResolvedValue(null);

      await expect(service.removeBundle(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
