/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FabricService } from './fabric.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileService, UploadedFile } from '../file/file.service';
import {
  CreateFabricDto,
  QueryFabricDto,
  FabricSortField,
  FabricSupplierSortField,
  FabricPricingSortField,
} from './dto';
import { Fabric } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('FabricService', () => {
  let service: FabricService;

  // Mock data
  const mockFabric: Fabric = {
    id: 1,
    fabricCode: 'FB-2401-0001',
    name: 'Premium Cotton Twill',
    material: null,
    composition: '80% Cotton, 20% Polyester',
    color: 'Navy Blue',
    weight: new Decimal(280.5),
    width: new Decimal(150.0),
    thickness: 'Medium',
    handFeel: 'Soft',
    glossLevel: 'Matte',
    application: null,
    defaultPrice: new Decimal(45.5),
    defaultLeadTime: 14,
    description: 'High-quality cotton twill fabric',
    tags: null,
    notes: null,
    isActive: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const createDto: CreateFabricDto = {
    fabricCode: 'FB-2401-0001',
    name: 'Premium Cotton Twill',
    composition: '80% Cotton, 20% Polyester',
    color: 'Navy Blue',
    weight: 280.5,
    width: 150.0,
    thickness: 'Medium',
    handFeel: 'Soft',
    glossLevel: 'Matte',
    defaultPrice: 45.5,
    defaultLeadTime: 14,
    description: 'High-quality cotton twill fabric',
  };

  // Mock Prisma methods
  const fabricMock = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const fabricImageMock = {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  };
  const fabricSupplierMock = {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const customerPricingMock = {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const orderItemMock = { count: jest.fn() };
  const quoteItemMock = { count: jest.fn() };
  const supplierMock = { findFirst: jest.fn() };
  const customerMock = { findFirst: jest.fn() };

  // Mock supplier data for fabric-supplier association tests
  const mockSupplier = {
    id: 1,
    companyName: 'Test Supplier',
    isActive: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockPrismaService = {
    fabric: fabricMock,
    fabricImage: fabricImageMock,
    fabricSupplier: fabricSupplierMock,
    customerPricing: customerPricingMock,
    orderItem: orderItemMock,
    quoteItem: quoteItemMock,
    supplier: supplierMock,
    customer: customerMock,
    $transaction: jest.fn().mockImplementation((callback: CallableFunction) =>
      callback({
        fabric: fabricMock,
        fabricImage: fabricImageMock,
        fabricSupplier: fabricSupplierMock,
        supplier: supplierMock,
        customer: customerMock,
        customerPricing: customerPricingMock,
      }),
    ),
  };

  // Mock FileService
  const mockFileService = {
    upload: jest.fn(),
    removeByKey: jest.fn(),
    getFileUrl: jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(`http://localhost/uploads/${key}`),
      ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FabricService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FileService,
          useValue: mockFileService,
        },
      ],
    }).compile();

    service = module.get<FabricService>(FabricService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // CREATE Tests
  // ========================================
  describe('create', () => {
    it('should create a fabric successfully', async () => {
      fabricMock.findFirst.mockResolvedValue(null);
      fabricMock.create.mockResolvedValue(mockFabric);

      const result = await service.create(createDto);

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { fabricCode: createDto.fabricCode },
      });
      expect(fabricMock.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(result).toEqual(mockFabric);
    });

    it('should throw ConflictException if fabricCode already exists', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        `Fabric with code "${createDto.fabricCode}" already exists`,
      );
    });

    it('should create fabric with minimal required fields', async () => {
      const minimalDto: CreateFabricDto = {
        fabricCode: 'FB-MIN-0001',
        name: 'Minimal Fabric',
      };
      const minimalFabric = { ...mockFabric, ...minimalDto };

      fabricMock.findFirst.mockResolvedValue(null);
      fabricMock.create.mockResolvedValue(minimalFabric);

      const result = await service.create(minimalDto);

      expect(result.fabricCode).toBe('FB-MIN-0001');
      expect(result.name).toBe('Minimal Fabric');
    });
  });

  // ========================================
  // FIND ONE Tests
  // ========================================
  describe('findOne', () => {
    it('should return a fabric by ID', async () => {
      const fabricWithImages = { ...mockFabric, images: [] };
      fabricMock.findFirst.mockResolvedValue(fabricWithImages);

      const result = await service.findOne(1);

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
      expect(result).toEqual(fabricWithImages);
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Fabric with ID 999 not found',
      );
    });

    it('should not return soft-deleted fabric', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  });

  // ========================================
  // FIND ALL Tests
  // ========================================
  describe('findAll', () => {
    it('should return paginated fabrics with default query', async () => {
      const fabrics = [mockFabric];
      fabricMock.findMany.mockResolvedValue(fabrics);
      fabricMock.count.mockResolvedValue(1);

      const query: QueryFabricDto = {};
      const result = await service.findAll(query);

      expect(fabricMock.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toEqual(fabrics);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('should filter by fabricCode (fuzzy search)', async () => {
      fabricMock.findMany.mockResolvedValue([mockFabric]);
      fabricMock.count.mockResolvedValue(1);

      const query: QueryFabricDto = { fabricCode: 'FB-2401' };
      await service.findAll(query);

      expect(fabricMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fabricCode: { contains: 'FB-2401' },
          }),
        }),
      );
    });

    it('should filter by name (fuzzy search)', async () => {
      fabricMock.findMany.mockResolvedValue([mockFabric]);
      fabricMock.count.mockResolvedValue(1);

      const query: QueryFabricDto = { name: 'Cotton' };
      await service.findAll(query);

      expect(fabricMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Cotton' },
          }),
        }),
      );
    });

    it('should filter by color (exact match)', async () => {
      fabricMock.findMany.mockResolvedValue([mockFabric]);
      fabricMock.count.mockResolvedValue(1);

      const query: QueryFabricDto = { color: 'Navy Blue' };
      await service.findAll(query);

      expect(fabricMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            color: 'Navy Blue',
          }),
        }),
      );
    });

    it('should sort by specified field', async () => {
      fabricMock.findMany.mockResolvedValue([mockFabric]);
      fabricMock.count.mockResolvedValue(1);

      const query: QueryFabricDto = {
        sortBy: FabricSortField.name,
        sortOrder: 'asc',
      };
      await service.findAll(query);

      expect(fabricMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should include soft-deleted fabrics when isActive=false', async () => {
      fabricMock.findMany.mockResolvedValue([]);
      fabricMock.count.mockResolvedValue(0);

      const query: QueryFabricDto = { isActive: false };
      await service.findAll(query);

      expect(fabricMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      fabricMock.findMany.mockResolvedValue([mockFabric]);
      fabricMock.count.mockResolvedValue(50);

      const query: QueryFabricDto = { page: 3, pageSize: 10 };
      const result = await service.findAll(query);

      expect(fabricMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  // ========================================
  // UPDATE Tests
  // ========================================
  describe('update', () => {
    it('should update a fabric successfully', async () => {
      const updateDto = { name: 'Updated Fabric Name' };
      const updatedFabric = { ...mockFabric, ...updateDto };

      // First findFirst for existence check (with isActive: true)
      fabricMock.findFirst.mockResolvedValueOnce(mockFabric);
      fabricMock.update.mockResolvedValue(updatedFabric);

      const result = await service.update(1, updateDto);

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(fabricMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
      expect(result.name).toBe('Updated Fabric Name');
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if fabric is soft deleted', async () => {
      fabricMock.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(1, { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if fabricCode conflicts with another fabric', async () => {
      const anotherFabric = { ...mockFabric, id: 2 };
      // First findFirst for existence check, second for conflict check
      fabricMock.findFirst
        .mockResolvedValueOnce(mockFabric)
        .mockResolvedValueOnce(anotherFabric);

      await expect(
        service.update(1, { fabricCode: 'EXISTING-CODE' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating fabricCode to same value (self-reference)', async () => {
      // First findFirst for existence check, second for conflict check (returns self)
      fabricMock.findFirst
        .mockResolvedValueOnce(mockFabric)
        .mockResolvedValueOnce(mockFabric);
      fabricMock.update.mockResolvedValue(mockFabric);

      const result = await service.update(1, {
        fabricCode: mockFabric.fabricCode,
      });

      expect(result).toEqual(mockFabric);
    });
  });

  // ========================================
  // REMOVE Tests
  // ========================================
  describe('remove', () => {
    beforeEach(() => {
      // Default: no relations
      fabricImageMock.count.mockResolvedValue(0);
      fabricSupplierMock.count.mockResolvedValue(0);
      customerPricingMock.count.mockResolvedValue(0);
      orderItemMock.count.mockResolvedValue(0);
      quoteItemMock.count.mockResolvedValue(0);
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should physically delete fabric when no relations exist', async () => {
      fabricMock.findUnique.mockResolvedValue(mockFabric);
      fabricMock.delete.mockResolvedValue(mockFabric);

      await service.remove(1, false);

      expect(fabricMock.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw ConflictException when relations exist and force=false', async () => {
      fabricMock.findUnique.mockResolvedValue(mockFabric);
      fabricSupplierMock.count.mockResolvedValue(3);
      orderItemMock.count.mockResolvedValue(5);

      await expect(service.remove(1, false)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, false)).rejects.toThrow(
        /Cannot delete fabric.*Related data exists/,
      );
    });

    it('should soft delete fabric when relations exist and force=true', async () => {
      fabricMock.findUnique.mockResolvedValue(mockFabric);
      fabricSupplierMock.count.mockResolvedValue(3);
      fabricMock.update.mockResolvedValue({ ...mockFabric, isActive: false });

      await service.remove(1, true);

      expect(fabricMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(fabricMock.delete).not.toHaveBeenCalled();
    });

    it('should check all 5 relation types', async () => {
      fabricMock.findUnique.mockResolvedValue(mockFabric);
      fabricMock.delete.mockResolvedValue(mockFabric);

      await service.remove(1, false);

      expect(fabricImageMock.count).toHaveBeenCalledWith({
        where: { fabricId: 1 },
      });
      expect(fabricSupplierMock.count).toHaveBeenCalledWith({
        where: { fabricId: 1 },
      });
      expect(customerPricingMock.count).toHaveBeenCalledWith({
        where: { fabricId: 1 },
      });
      expect(orderItemMock.count).toHaveBeenCalledWith({
        where: { fabricId: 1 },
      });
      expect(quoteItemMock.count).toHaveBeenCalledWith({
        where: { fabricId: 1 },
      });
    });

    it('should include relation details in error message', async () => {
      fabricMock.findUnique.mockResolvedValue(mockFabric);
      fabricImageMock.count.mockResolvedValue(2);
      fabricSupplierMock.count.mockResolvedValue(3);
      customerPricingMock.count.mockResolvedValue(1);
      orderItemMock.count.mockResolvedValue(5);
      quoteItemMock.count.mockResolvedValue(4);

      try {
        await service.remove(1, false);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const message = (error as ConflictException).message;
        expect(message).toContain('2 fabric images');
        expect(message).toContain('3 fabric supplier records');
        expect(message).toContain('1 customer pricing record');
        expect(message).toContain('5 order items');
        expect(message).toContain('4 quotes');
      }
    });
  });

  // ========================================
  // UPLOAD IMAGE Tests
  // ========================================
  describe('uploadImage', () => {
    const mockFile: UploadedFile = {
      originalname: 'test-image.jpg',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('test image data'),
    };

    const mockFileUploadResult = {
      id: 1,
      key: 'uuid-123.jpg',
      url: 'http://localhost:3000/uploads/uuid-123.jpg',
      originalName: 'test-image.jpg',
      mimeType: 'image/jpeg',
      size: 1024 * 1024,
    };

    const mockFabricImage = {
      id: 1,
      fabricId: 1,
      url: 'uuid-123.jpg',
      sortOrder: 0,
      createdAt: new Date(),
    };

    it('should successfully upload an image for an active fabric', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue(mockFileUploadResult);
      fabricImageMock.create = jest.fn().mockResolvedValue(mockFabricImage);
      mockPrismaService.fabricImage.create = fabricImageMock.create;

      const result = await service.uploadImage(1, mockFile);

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(mockFileService.upload).toHaveBeenCalledWith(mockFile);
      expect(fabricImageMock.create).toHaveBeenCalledWith({
        data: {
          fabricId: 1,
          url: mockFileUploadResult.key,
          sortOrder: 0,
        },
      });
      expect(result.url).toBe('http://localhost/uploads/uuid-123.jpg');
    });

    it('should use custom sortOrder when provided', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue(mockFileUploadResult);
      const customSortOrderImage = { ...mockFabricImage, sortOrder: 5 };
      fabricImageMock.create = jest
        .fn()
        .mockResolvedValue(customSortOrderImage);
      mockPrismaService.fabricImage.create = fabricImageMock.create;

      const result = await service.uploadImage(1, mockFile, 5);

      expect(fabricImageMock.create).toHaveBeenCalledWith({
        data: {
          fabricId: 1,
          url: mockFileUploadResult.key,
          sortOrder: 5,
        },
      });
      expect(result.sortOrder).toBe(5);
    });

    it('should throw NotFoundException if fabric does not exist', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.uploadImage(999, mockFile)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.uploadImage(999, mockFile)).rejects.toThrow(
        'Fabric with ID 999 not found',
      );
      expect(mockFileService.upload).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.uploadImage(1, mockFile)).rejects.toThrow(
        NotFoundException,
      );
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw BadRequestException for non-image MIME type', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      const pdfFile: UploadedFile = {
        ...mockFile,
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      };

      await expect(service.uploadImage(1, pdfFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImage(1, pdfFile)).rejects.toThrow(
        'Invalid file type. Allowed: jpeg, png, gif, webp',
      );
      expect(mockFileService.upload).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for file exceeding 10MB', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      const largeFile: UploadedFile = {
        ...mockFile,
        size: 11 * 1024 * 1024, // 11MB
      };

      await expect(service.uploadImage(1, largeFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImage(1, largeFile)).rejects.toThrow(
        'File too large. Maximum size: 10MB',
      );
      expect(mockFileService.upload).not.toHaveBeenCalled();
    });

    it('should accept image/jpeg MIME type', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue(mockFileUploadResult);
      fabricImageMock.create = jest.fn().mockResolvedValue(mockFabricImage);
      mockPrismaService.fabricImage.create = fabricImageMock.create;

      const jpegFile: UploadedFile = { ...mockFile, mimetype: 'image/jpeg' };
      await service.uploadImage(1, jpegFile);

      expect(mockFileService.upload).toHaveBeenCalled();
    });

    it('should accept image/png MIME type', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue({
        ...mockFileUploadResult,
        mimeType: 'image/png',
      });
      fabricImageMock.create = jest.fn().mockResolvedValue(mockFabricImage);
      mockPrismaService.fabricImage.create = fabricImageMock.create;

      const pngFile: UploadedFile = {
        ...mockFile,
        originalname: 'test.png',
        mimetype: 'image/png',
      };
      await service.uploadImage(1, pngFile);

      expect(mockFileService.upload).toHaveBeenCalled();
    });

    it('should accept image/gif MIME type', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue({
        ...mockFileUploadResult,
        mimeType: 'image/gif',
      });
      fabricImageMock.create = jest.fn().mockResolvedValue(mockFabricImage);
      mockPrismaService.fabricImage.create = fabricImageMock.create;

      const gifFile: UploadedFile = {
        ...mockFile,
        originalname: 'test.gif',
        mimetype: 'image/gif',
      };
      await service.uploadImage(1, gifFile);

      expect(mockFileService.upload).toHaveBeenCalled();
    });

    it('should accept image/webp MIME type', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue({
        ...mockFileUploadResult,
        mimeType: 'image/webp',
      });
      fabricImageMock.create = jest.fn().mockResolvedValue(mockFabricImage);
      mockPrismaService.fabricImage.create = fabricImageMock.create;

      const webpFile: UploadedFile = {
        ...mockFile,
        originalname: 'test.webp',
        mimetype: 'image/webp',
      };
      await service.uploadImage(1, webpFile);

      expect(mockFileService.upload).toHaveBeenCalled();
    });

    it('should reject image/bmp MIME type', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      const bmpFile: UploadedFile = {
        ...mockFile,
        originalname: 'test.bmp',
        mimetype: 'image/bmp',
      };

      await expect(service.uploadImage(1, bmpFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept file exactly at 10MB limit', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      mockFileService.upload.mockResolvedValue(mockFileUploadResult);
      fabricImageMock.create = jest.fn().mockResolvedValue(mockFabricImage);
      mockPrismaService.fabricImage.create = fabricImageMock.create;

      const exactLimitFile: UploadedFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // Exactly 10MB
      };
      await service.uploadImage(1, exactLimitFile);

      expect(mockFileService.upload).toHaveBeenCalled();
    });
  });

  // ========================================
  // DELETE IMAGE Tests (2.3.8)
  // ========================================
  describe('deleteImage', () => {
    const mockFabricImageForDelete = {
      id: 10,
      fabricId: 1,
      url: 'http://localhost:3000/uploads/uuid-123.jpg',
      sortOrder: 0,
      createdAt: new Date(),
    };

    beforeEach(() => {
      // Reset fabricImage mock methods for deleteImage tests
      fabricImageMock.findFirst = jest.fn();
      fabricImageMock.delete = jest.fn();
      mockPrismaService.fabricImage.findFirst = fabricImageMock.findFirst;
      mockPrismaService.fabricImage.delete = fabricImageMock.delete;
    });

    it('should successfully delete an image for an active fabric', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricImageMock.findFirst.mockResolvedValue(mockFabricImageForDelete);
      fabricImageMock.delete.mockResolvedValue(mockFabricImageForDelete);
      mockFileService.removeByKey.mockResolvedValue(undefined);

      await service.deleteImage(1, 10);

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(fabricImageMock.findFirst).toHaveBeenCalledWith({
        where: { id: 10, fabricId: 1 },
      });
      expect(fabricImageMock.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
      expect(mockFileService.removeByKey).toHaveBeenCalledWith('uuid-123.jpg');
    });

    it('should throw NotFoundException if fabric does not exist', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.deleteImage(999, 10)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteImage(999, 10)).rejects.toThrow(
        'Fabric with ID 999 not found',
      );
      expect(fabricImageMock.findFirst).not.toHaveBeenCalled();
      expect(fabricImageMock.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.deleteImage(1, 10)).rejects.toThrow(
        NotFoundException,
      );
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw NotFoundException if image does not exist', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricImageMock.findFirst.mockResolvedValue(null);

      await expect(service.deleteImage(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteImage(1, 999)).rejects.toThrow(
        'Fabric image with ID 999 not found',
      );
      expect(fabricImageMock.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if image does not belong to the fabric', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      // findFirst with fabricId constraint returns null
      fabricImageMock.findFirst.mockResolvedValue(null);

      await expect(service.deleteImage(1, 10)).rejects.toThrow(
        NotFoundException,
      );
      expect(fabricImageMock.findFirst).toHaveBeenCalledWith({
        where: { id: 10, fabricId: 1 },
      });
    });

    it('should still delete FabricImage when FileService.removeByKey fails', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricImageMock.findFirst.mockResolvedValue(mockFabricImageForDelete);
      fabricImageMock.delete.mockResolvedValue(mockFabricImageForDelete);
      mockFileService.removeByKey.mockRejectedValue(
        new NotFoundException('File not found'),
      );

      // Should not throw, just log warning
      await expect(service.deleteImage(1, 10)).resolves.not.toThrow();

      expect(fabricImageMock.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
    });

    it('should extract key correctly from URL with /uploads/ path', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      const imageWithDifferentUrl = {
        ...mockFabricImageForDelete,
        url: 'http://example.com/uploads/different-uuid.png',
      };
      fabricImageMock.findFirst.mockResolvedValue(imageWithDifferentUrl);
      fabricImageMock.delete.mockResolvedValue(imageWithDifferentUrl);
      mockFileService.removeByKey.mockResolvedValue(undefined);

      await service.deleteImage(1, 10);

      expect(mockFileService.removeByKey).toHaveBeenCalledWith(
        'different-uuid.png',
      );
    });

    it('should handle URL without /uploads/ path gracefully', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      const imageWithExternalUrl = {
        ...mockFabricImageForDelete,
        url: 'https://cdn.example.com/images/external-image.jpg',
      };
      fabricImageMock.findFirst.mockResolvedValue(imageWithExternalUrl);
      fabricImageMock.delete.mockResolvedValue(imageWithExternalUrl);
      // removeByKey should not be called for external URLs
      mockFileService.removeByKey.mockResolvedValue(undefined);

      await service.deleteImage(1, 10);

      // FabricImage should still be deleted
      expect(fabricImageMock.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
      // removeByKey should not be called for external URLs
      expect(mockFileService.removeByKey).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // FIND SUPPLIERS Tests (2.3.9)
  // ========================================
  describe('findSuppliers', () => {
    const mockSupplier = {
      id: 1,
      companyName: 'Textile Corp',
      contactName: 'John Doe',
      phone: '123456789',
      status: 'active',
      isActive: true,
    };

    const mockFabricSupplier = {
      id: 1,
      fabricId: 1,
      supplierId: 1,
      purchasePrice: new Decimal(45.5),
      minOrderQty: new Decimal(100),
      leadTimeDays: 7,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      supplier: mockSupplier,
    };

    beforeEach(() => {
      fabricSupplierMock.findMany = jest.fn();
      mockPrismaService.fabricSupplier.findMany = fabricSupplierMock.findMany;
    });

    it('should return paginated supplier list for a fabric', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricSupplierMock.findMany.mockResolvedValue([mockFabricSupplier]);
      fabricSupplierMock.count.mockResolvedValue(1);

      const result = await service.findSuppliers(1, {});

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].supplier.companyName).toBe('Textile Corp');
      expect(result.items[0].fabricSupplierRelation.purchasePrice).toBe(45.5);
      expect(result.pagination.total).toBe(1);
    });

    it('should return empty list when no suppliers associated', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricSupplierMock.findMany.mockResolvedValue([]);
      fabricSupplierMock.count.mockResolvedValue(0);

      const result = await service.findSuppliers(1, {});

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.findSuppliers(999, {})).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findSuppliers(999, {})).rejects.toThrow(
        'Fabric with ID 999 not found',
      );
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.findSuppliers(1, {})).rejects.toThrow(
        NotFoundException,
      );
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should filter by supplier name (fuzzy search)', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricSupplierMock.findMany.mockResolvedValue([mockFabricSupplier]);
      fabricSupplierMock.count.mockResolvedValue(1);

      await service.findSuppliers(1, { supplierName: 'Textile' });

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            supplier: expect.objectContaining({
              companyName: { contains: 'Textile' },
            }),
          }),
        }),
      );
    });

    it('should sort by purchasePrice ascending', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricSupplierMock.findMany.mockResolvedValue([]);
      fabricSupplierMock.count.mockResolvedValue(0);

      await service.findSuppliers(1, {
        sortBy: FabricSupplierSortField.purchasePrice,
        sortOrder: 'asc',
      });

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { purchasePrice: 'asc' },
        }),
      );
    });

    it('should sort by supplier name', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricSupplierMock.findMany.mockResolvedValue([]);
      fabricSupplierMock.count.mockResolvedValue(0);

      await service.findSuppliers(1, {
        sortBy: FabricSupplierSortField.supplierName,
        sortOrder: 'asc',
      });

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { supplier: { companyName: 'asc' } },
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricSupplierMock.findMany.mockResolvedValue([mockFabricSupplier]);
      fabricSupplierMock.count.mockResolvedValue(50);

      const result = await service.findSuppliers(1, { page: 3, pageSize: 10 });

      expect(fabricSupplierMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should convert Decimal values to numbers in response', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      fabricSupplierMock.findMany.mockResolvedValue([mockFabricSupplier]);
      fabricSupplierMock.count.mockResolvedValue(1);

      const result = await service.findSuppliers(1, {});

      expect(typeof result.items[0].fabricSupplierRelation.purchasePrice).toBe(
        'number',
      );
      expect(typeof result.items[0].fabricSupplierRelation.minOrderQty).toBe(
        'number',
      );
    });

    it('should handle null minOrderQty gracefully', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      const supplierWithNullQty = {
        ...mockFabricSupplier,
        minOrderQty: null,
      };
      fabricSupplierMock.findMany.mockResolvedValue([supplierWithNullQty]);
      fabricSupplierMock.count.mockResolvedValue(1);

      const result = await service.findSuppliers(1, {});

      expect(result.items[0].fabricSupplierRelation.minOrderQty).toBeNull();
    });
  });

  // ========================================
  // ADD SUPPLIER Tests (2.3.10)
  // ========================================
  describe('addSupplier', () => {
    const mockSupplierEntity = {
      id: 1,
      companyName: 'Textile Corp',
      contactName: 'John Doe',
      phone: '123456789',
      status: 'active',
      isActive: true,
    };

    const mockCreatedFabricSupplier = {
      id: 1,
      fabricId: 1,
      supplierId: 1,
      purchasePrice: new Decimal(45.5),
      minOrderQty: new Decimal(100),
      leadTimeDays: 7,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const createDto = {
      supplierId: 1,
      purchasePrice: 45.5,
      minOrderQty: 100,
      leadTimeDays: 7,
    };

    it('should create fabric-supplier association successfully', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(mockSupplierEntity);
      fabricSupplierMock.create.mockResolvedValue(mockCreatedFabricSupplier);

      const result = await service.addSupplier(1, createDto);

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(fabricSupplierMock.create).toHaveBeenCalledWith({
        data: {
          fabricId: 1,
          supplierId: 1,
          purchasePrice: 45.5,
          minOrderQty: 100,
          leadTimeDays: 7,
        },
      });
      expect(result).toEqual(mockCreatedFabricSupplier);
    });

    it('should create association with only required fields', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(mockSupplierEntity);
      const minimalResult = {
        ...mockCreatedFabricSupplier,
        minOrderQty: null,
        leadTimeDays: null,
      };
      fabricSupplierMock.create.mockResolvedValue(minimalResult);

      const minimalDto = {
        supplierId: 1,
        purchasePrice: 45.5,
      };

      const result = await service.addSupplier(1, minimalDto);

      expect(fabricSupplierMock.create).toHaveBeenCalledWith({
        data: {
          fabricId: 1,
          supplierId: 1,
          purchasePrice: 45.5,
          minOrderQty: undefined,
          leadTimeDays: undefined,
        },
      });
      expect(result).toEqual(minimalResult);
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.addSupplier(999, createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.addSupplier(999, createDto)).rejects.toThrow(
        'Fabric with ID 999 not found',
      );
      expect(supplierMock.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.addSupplier(1, createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw NotFoundException if supplier not found', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(service.addSupplier(1, createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.addSupplier(1, createDto)).rejects.toThrow(
        'Supplier with ID 1 not found',
      );
    });

    it('should throw NotFoundException if supplier is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(service.addSupplier(1, createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw ConflictException if association already exists', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(mockSupplierEntity);
      // Simulate Prisma P2002 unique constraint violation
      const prismaError = {
        code: 'P2002',
        meta: { target: ['fabric_id', 'supplier_id'] },
      };
      fabricSupplierMock.create.mockRejectedValue(prismaError);

      await expect(service.addSupplier(1, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.addSupplier(1, createDto)).rejects.toThrow(
        'This supplier is already associated with this fabric',
      );
    });
  });

  // ========================================
  // UPDATE SUPPLIER Tests (2.3.11)
  // ========================================
  describe('updateSupplier', () => {
    const mockExistingFabricSupplier = {
      id: 1,
      fabricId: 1,
      supplierId: 1,
      purchasePrice: new Decimal(45.5),
      minOrderQty: new Decimal(100),
      leadTimeDays: 7,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    };

    beforeEach(() => {
      fabricSupplierMock.findFirst = jest.fn();
      fabricSupplierMock.update = jest.fn();
    });

    it('should update a single field successfully', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findFirst.mockResolvedValue(
        mockExistingFabricSupplier,
      );
      const updatedRecord = {
        ...mockExistingFabricSupplier,
        purchasePrice: new Decimal(50.0),
      };
      fabricSupplierMock.update.mockResolvedValue(updatedRecord);

      const result = await service.updateSupplier(1, 1, {
        purchasePrice: 50.0,
      });

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(fabricSupplierMock.findFirst).toHaveBeenCalledWith({
        where: { fabricId: 1, supplierId: 1 },
      });
      expect(fabricSupplierMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { purchasePrice: 50.0 },
      });
      expect(result).toEqual(updatedRecord);
    });

    it('should update multiple fields successfully', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findFirst.mockResolvedValue(
        mockExistingFabricSupplier,
      );
      const updatedRecord = {
        ...mockExistingFabricSupplier,
        purchasePrice: new Decimal(55.0),
        minOrderQty: new Decimal(200),
        leadTimeDays: 14,
      };
      fabricSupplierMock.update.mockResolvedValue(updatedRecord);

      const updateDto = {
        purchasePrice: 55.0,
        minOrderQty: 200,
        leadTimeDays: 14,
      };
      const result = await service.updateSupplier(1, 1, updateDto);

      expect(fabricSupplierMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
      expect(result).toEqual(updatedRecord);
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSupplier(999, 1, { purchasePrice: 50.0 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateSupplier(999, 1, { purchasePrice: 50.0 }),
      ).rejects.toThrow('Fabric with ID 999 not found');
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSupplier(1, 1, { purchasePrice: 50.0 }),
      ).rejects.toThrow(NotFoundException);
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw NotFoundException if supplier not found', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSupplier(1, 999, { purchasePrice: 50.0 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateSupplier(1, 999, { purchasePrice: 50.0 }),
      ).rejects.toThrow('Supplier with ID 999 not found');
    });

    it('should throw NotFoundException if supplier is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSupplier(1, 1, { purchasePrice: 50.0 }),
      ).rejects.toThrow(NotFoundException);
      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw NotFoundException if association not found', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(mockSupplier);
      fabricSupplierMock.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSupplier(1, 999, { purchasePrice: 50.0 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateSupplier(1, 999, { purchasePrice: 50.0 }),
      ).rejects.toThrow(
        'Supplier with ID 999 is not associated with fabric ID 1',
      );
    });
  });

  // ========================================
  // removeSupplier Tests (2.3.12)
  // ========================================
  describe('removeSupplier', () => {
    const mockFabricSupplier = {
      id: 1,
      fabricId: 1,
      supplierId: 10,
      purchasePrice: new Decimal(45.0),
      minOrderQty: new Decimal(100),
      leadTimeDays: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should delete a fabric-supplier association successfully', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue({ ...mockSupplier, id: 10 });
      fabricSupplierMock.findFirst.mockResolvedValue(mockFabricSupplier);
      fabricSupplierMock.delete.mockResolvedValue(mockFabricSupplier);

      await service.removeSupplier(1, 10);

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 10, isActive: true },
      });
      expect(fabricSupplierMock.findFirst).toHaveBeenCalledWith({
        where: { fabricId: 1, supplierId: 10 },
      });
      expect(fabricSupplierMock.delete).toHaveBeenCalledWith({
        where: { id: mockFabricSupplier.id },
      });
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.removeSupplier(999, 10)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeSupplier(999, 10)).rejects.toThrow(
        'Fabric with ID 999 not found',
      );
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.removeSupplier(1, 10)).rejects.toThrow(
        NotFoundException,
      );
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw NotFoundException if supplier not found', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(service.removeSupplier(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeSupplier(1, 999)).rejects.toThrow(
        'Supplier with ID 999 not found',
      );
    });

    it('should throw NotFoundException if supplier is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue(null);

      await expect(service.removeSupplier(1, 10)).rejects.toThrow(
        NotFoundException,
      );
      expect(supplierMock.findFirst).toHaveBeenCalledWith({
        where: { id: 10, isActive: true },
      });
    });

    it('should throw NotFoundException if association not found', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue({ ...mockSupplier, id: 999 });
      fabricSupplierMock.findFirst.mockResolvedValue(null);

      await expect(service.removeSupplier(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeSupplier(1, 999)).rejects.toThrow(
        'Supplier with ID 999 is not associated with fabric ID 1',
      );
    });

    it('should use transaction for atomic deletion', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      supplierMock.findFirst.mockResolvedValue({ ...mockSupplier, id: 10 });
      fabricSupplierMock.findFirst.mockResolvedValue(mockFabricSupplier);
      fabricSupplierMock.delete.mockResolvedValue(mockFabricSupplier);

      await service.removeSupplier(1, 10);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  // ========================================
  // FIND PRICING Tests (2.3.13)
  // ========================================
  describe('findPricing', () => {
    const mockCustomer = {
      id: 5,
      companyName: 'ABC Furniture',
      contactName: 'John Doe',
      isActive: true,
    };

    const mockCustomerPricing = {
      id: 1,
      customerId: 5,
      fabricId: 1,
      specialPrice: new Decimal(39.99),
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      customer: mockCustomer,
    };

    beforeEach(() => {
      customerPricingMock.findMany = jest.fn();
      customerPricingMock.count = jest.fn();
      mockPrismaService.customerPricing.findMany = customerPricingMock.findMany;
    });

    it('should return paginated pricing list for a fabric', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findMany.mockResolvedValue([mockCustomerPricing]);
      customerPricingMock.count.mockResolvedValue(1);

      const result = await service.findPricing(1, {});

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].customer.companyName).toBe('ABC Furniture');
      expect(result.items[0].specialPrice).toBe(39.99);
      expect(result.pagination.total).toBe(1);
    });

    it('should return empty list when no pricing exists', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findMany.mockResolvedValue([]);
      customerPricingMock.count.mockResolvedValue(0);

      const result = await service.findPricing(1, {});

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.findPricing(999, {})).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findPricing(999, {})).rejects.toThrow(
        'Fabric with ID 999 not found',
      );
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.findPricing(1, {})).rejects.toThrow(
        NotFoundException,
      );
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should filter by customer name (fuzzy search)', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findMany.mockResolvedValue([mockCustomerPricing]);
      customerPricingMock.count.mockResolvedValue(1);

      await service.findPricing(1, { customerName: 'ABC' });

      expect(customerPricingMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customer: expect.objectContaining({
              companyName: { contains: 'ABC' },
            }),
          }),
        }),
      );
    });

    it('should sort by specialPrice ascending', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findMany.mockResolvedValue([]);
      customerPricingMock.count.mockResolvedValue(0);

      await service.findPricing(1, {
        sortBy: FabricPricingSortField.specialPrice,
        sortOrder: 'asc',
      });

      expect(customerPricingMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { specialPrice: 'asc' },
        }),
      );
    });

    it('should sort by customer name', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findMany.mockResolvedValue([]);
      customerPricingMock.count.mockResolvedValue(0);

      await service.findPricing(1, {
        sortBy: FabricPricingSortField.customerName,
        sortOrder: 'asc',
      });

      expect(customerPricingMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { customer: { companyName: 'asc' } },
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findMany.mockResolvedValue([mockCustomerPricing]);
      customerPricingMock.count.mockResolvedValue(50);

      const result = await service.findPricing(1, { page: 3, pageSize: 10 });

      expect(customerPricingMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should convert Decimal values to numbers in response', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findMany.mockResolvedValue([mockCustomerPricing]);
      customerPricingMock.count.mockResolvedValue(1);

      const result = await service.findPricing(1, {});

      expect(typeof result.items[0].specialPrice).toBe('number');
    });
  });

  // ========================================
  // CREATE PRICING Tests (2.3.14)
  // ========================================
  describe('createPricing', () => {
    const mockCustomerEntity = {
      id: 5,
      companyName: 'ABC Furniture',
      isActive: true,
    };

    const mockCreatedPricing = {
      id: 1,
      customerId: 5,
      fabricId: 1,
      specialPrice: new Decimal(39.99),
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const customerMock = { findFirst: jest.fn() };

    beforeEach(() => {
      customerPricingMock.create = jest.fn();
      mockPrismaService.customer = customerMock;
      // Update $transaction mock to include customer
      mockPrismaService.$transaction.mockImplementation(
        (callback: CallableFunction) =>
          callback({
            fabric: fabricMock,
            fabricImage: fabricImageMock,
            fabricSupplier: fabricSupplierMock,
            supplier: supplierMock,
            customer: customerMock,
            customerPricing: customerPricingMock,
          }),
      );
    });

    it('should create pricing successfully', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerMock.findFirst.mockResolvedValue(mockCustomerEntity);
      customerPricingMock.create.mockResolvedValue(mockCreatedPricing);

      const result = await service.createPricing(1, {
        customerId: 5,
        specialPrice: 39.99,
      });

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 5, isActive: true },
      });
      expect(customerPricingMock.create).toHaveBeenCalledWith({
        data: {
          fabricId: 1,
          customerId: 5,
          specialPrice: 39.99,
        },
      });
      expect(result).toEqual(mockCreatedPricing);
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(
        service.createPricing(999, { customerId: 5, specialPrice: 39.99 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createPricing(999, { customerId: 5, specialPrice: 39.99 }),
      ).rejects.toThrow('Fabric with ID 999 not found');
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(
        service.createPricing(1, { customerId: 5, specialPrice: 39.99 }),
      ).rejects.toThrow(NotFoundException);
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerMock.findFirst.mockResolvedValue(null);

      await expect(
        service.createPricing(1, { customerId: 999, specialPrice: 39.99 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createPricing(1, { customerId: 999, specialPrice: 39.99 }),
      ).rejects.toThrow('Customer with ID 999 not found');
    });

    it('should throw NotFoundException if customer is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerMock.findFirst.mockResolvedValue(null);

      await expect(
        service.createPricing(1, { customerId: 5, specialPrice: 39.99 }),
      ).rejects.toThrow(NotFoundException);
      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 5, isActive: true },
      });
    });

    it('should throw ConflictException if pricing already exists', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerMock.findFirst.mockResolvedValue(mockCustomerEntity);
      // Simulate Prisma P2002 unique constraint violation
      const prismaError = {
        code: 'P2002',
        meta: { target: ['customer_id', 'fabric_id'] },
      };
      customerPricingMock.create.mockRejectedValue(prismaError);

      await expect(
        service.createPricing(1, { customerId: 5, specialPrice: 39.99 }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.createPricing(1, { customerId: 5, specialPrice: 39.99 }),
      ).rejects.toThrow('Customer already has special pricing for this fabric');
    });
  });

  // ========================================
  // UPDATE PRICING Tests (2.3.15)
  // ========================================
  describe('updatePricing', () => {
    const mockExistingPricing = {
      id: 10,
      customerId: 5,
      fabricId: 1,
      specialPrice: new Decimal(39.99),
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const mockCustomerEntity = {
      id: 5,
      companyName: 'ABC Furniture',
      isActive: true,
    };

    beforeEach(() => {
      customerPricingMock.findUnique = jest.fn();
      customerPricingMock.update = jest.fn();
      mockPrismaService.customerPricing.findUnique =
        customerPricingMock.findUnique;
      mockPrismaService.customerPricing.update = customerPricingMock.update;
      // Update $transaction mock to include customerPricing and customer
      mockPrismaService.$transaction.mockImplementation(
        (callback: CallableFunction) =>
          callback({
            fabric: fabricMock,
            fabricImage: fabricImageMock,
            fabricSupplier: fabricSupplierMock,
            supplier: supplierMock,
            customer: customerMock,
            customerPricing: customerPricingMock,
          }),
      );
    });

    it('should update pricing successfully', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findUnique.mockResolvedValue(mockExistingPricing);
      customerMock.findFirst.mockResolvedValue(mockCustomerEntity);
      const updatedPricing = {
        ...mockExistingPricing,
        specialPrice: new Decimal(49.99),
      };
      customerPricingMock.update.mockResolvedValue(updatedPricing);

      const result = await service.updatePricing(1, 10, {
        specialPrice: 49.99,
      });

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(customerPricingMock.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
      });
      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 5, isActive: true },
      });
      expect(customerPricingMock.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { specialPrice: 49.99 },
      });
      expect(result).toEqual(updatedPricing);
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePricing(999, 10, { specialPrice: 49.99 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updatePricing(999, 10, { specialPrice: 49.99 }),
      ).rejects.toThrow('Fabric with ID 999 not found');
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePricing(1, 10, { specialPrice: 49.99 }),
      ).rejects.toThrow(NotFoundException);
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw NotFoundException if pricing not found', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePricing(1, 999, { specialPrice: 49.99 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updatePricing(1, 999, { specialPrice: 49.99 }),
      ).rejects.toThrow('Fabric pricing with ID 999 not found');
    });

    it('should throw NotFoundException if pricing does not belong to fabric', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      // Pricing exists but belongs to a different fabric
      const pricingForDifferentFabric = { ...mockExistingPricing, fabricId: 2 };
      customerPricingMock.findUnique.mockResolvedValue(
        pricingForDifferentFabric,
      );

      await expect(
        service.updatePricing(1, 10, { specialPrice: 49.99 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updatePricing(1, 10, { specialPrice: 49.99 }),
      ).rejects.toThrow('Fabric pricing with ID 10 not found');
    });

    it('should throw NotFoundException if customer is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findUnique.mockResolvedValue(mockExistingPricing);
      customerMock.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePricing(1, 10, { specialPrice: 49.99 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updatePricing(1, 10, { specialPrice: 49.99 }),
      ).rejects.toThrow('Customer with ID 5 not found');
      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 5, isActive: true },
      });
    });
  });

  // ========================================
  // REMOVE PRICING Tests (2.3.16)
  // ========================================
  describe('removePricing', () => {
    const mockExistingPricing = {
      id: 10,
      customerId: 5,
      fabricId: 1,
      specialPrice: new Decimal(39.99),
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const mockCustomerEntity = {
      id: 5,
      companyName: 'ABC Furniture',
      isActive: true,
    };

    beforeEach(() => {
      customerPricingMock.findUnique = jest.fn();
      customerPricingMock.delete = jest.fn();
      mockPrismaService.customerPricing.findUnique =
        customerPricingMock.findUnique;
      mockPrismaService.customerPricing.delete = customerPricingMock.delete;
      // Update $transaction mock to include customerPricing and customer
      mockPrismaService.$transaction.mockImplementation(
        (callback: CallableFunction) =>
          callback({
            fabric: fabricMock,
            fabricImage: fabricImageMock,
            fabricSupplier: fabricSupplierMock,
            supplier: supplierMock,
            customer: customerMock,
            customerPricing: customerPricingMock,
          }),
      );
    });

    it('should delete pricing successfully', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findUnique.mockResolvedValue(mockExistingPricing);
      customerMock.findFirst.mockResolvedValue(mockCustomerEntity);
      customerPricingMock.delete.mockResolvedValue(mockExistingPricing);

      await service.removePricing(1, 10);

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(customerPricingMock.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
      });
      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 5, isActive: true },
      });
      expect(customerPricingMock.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.removePricing(999, 10)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removePricing(999, 10)).rejects.toThrow(
        'Fabric with ID 999 not found',
      );
    });

    it('should throw NotFoundException if fabric is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(null);

      await expect(service.removePricing(1, 10)).rejects.toThrow(
        NotFoundException,
      );
      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
    });

    it('should throw NotFoundException if pricing not found', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findUnique.mockResolvedValue(null);

      await expect(service.removePricing(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removePricing(1, 999)).rejects.toThrow(
        'Fabric pricing with ID 999 not found',
      );
    });

    it('should throw NotFoundException if pricing does not belong to fabric', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      // Pricing exists but belongs to a different fabric
      const pricingForDifferentFabric = { ...mockExistingPricing, fabricId: 2 };
      customerPricingMock.findUnique.mockResolvedValue(
        pricingForDifferentFabric,
      );

      await expect(service.removePricing(1, 10)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removePricing(1, 10)).rejects.toThrow(
        'Fabric pricing with ID 10 not found',
      );
    });

    it('should throw NotFoundException if customer is soft-deleted', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findUnique.mockResolvedValue(mockExistingPricing);
      customerMock.findFirst.mockResolvedValue(null);

      await expect(service.removePricing(1, 10)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removePricing(1, 10)).rejects.toThrow(
        'Customer with ID 5 not found',
      );
      expect(customerMock.findFirst).toHaveBeenCalledWith({
        where: { id: 5, isActive: true },
      });
    });

    it('should use transaction for atomic deletion', async () => {
      fabricMock.findFirst.mockResolvedValue(mockFabric);
      customerPricingMock.findUnique.mockResolvedValue(mockExistingPricing);
      customerMock.findFirst.mockResolvedValue(mockCustomerEntity);
      customerPricingMock.delete.mockResolvedValue(mockExistingPricing);

      await service.removePricing(1, 10);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
