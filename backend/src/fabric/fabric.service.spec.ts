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
import { CreateFabricDto, QueryFabricDto, FabricSortField } from './dto';
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

  const fabricImageMock = { count: jest.fn(), create: jest.fn() };
  const fabricSupplierMock = { count: jest.fn() };
  const customerPricingMock = { count: jest.fn() };
  const orderItemMock = { count: jest.fn() };
  const quoteMock = { count: jest.fn() };

  const mockPrismaService = {
    fabric: fabricMock,
    fabricImage: fabricImageMock,
    fabricSupplier: fabricSupplierMock,
    customerPricing: customerPricingMock,
    orderItem: orderItemMock,
    quote: quoteMock,
    $transaction: jest.fn().mockImplementation((callback: CallableFunction) =>
      callback({
        fabric: fabricMock,
      }),
    ),
  };

  // Mock FileService
  const mockFileService = {
    upload: jest.fn(),
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
      fabricMock.findFirst.mockResolvedValue(mockFabric);

      const result = await service.findOne(1);

      expect(fabricMock.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(result).toEqual(mockFabric);
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

      fabricMock.findUnique.mockResolvedValue(mockFabric);
      fabricMock.update.mockResolvedValue(updatedFabric);

      const result = await service.update(1, updateDto);

      expect(fabricMock.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(fabricMock.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
      expect(result.name).toBe('Updated Fabric Name');
    });

    it('should throw NotFoundException if fabric not found', async () => {
      fabricMock.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if fabricCode conflicts with another fabric', async () => {
      const anotherFabric = { ...mockFabric, id: 2 };
      fabricMock.findUnique.mockResolvedValue(mockFabric);
      fabricMock.findFirst.mockResolvedValue(anotherFabric);

      await expect(
        service.update(1, { fabricCode: 'EXISTING-CODE' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating fabricCode to same value (self-reference)', async () => {
      fabricMock.findUnique.mockResolvedValue(mockFabric);
      fabricMock.findFirst.mockResolvedValue(mockFabric); // Same fabric found
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
      quoteMock.count.mockResolvedValue(0);
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
      expect(quoteMock.count).toHaveBeenCalledWith({
        where: { fabricId: 1 },
      });
    });

    it('should include relation details in error message', async () => {
      fabricMock.findUnique.mockResolvedValue(mockFabric);
      fabricImageMock.count.mockResolvedValue(2);
      fabricSupplierMock.count.mockResolvedValue(3);
      customerPricingMock.count.mockResolvedValue(1);
      orderItemMock.count.mockResolvedValue(5);
      quoteMock.count.mockResolvedValue(4);

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
      url: 'http://localhost:3000/uploads/uuid-123.jpg',
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
          url: mockFileUploadResult.url,
          sortOrder: 0,
        },
      });
      expect(result).toEqual(mockFabricImage);
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
          url: mockFileUploadResult.url,
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
});
