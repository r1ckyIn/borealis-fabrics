import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { FabricController } from './fabric.controller';
import { FabricService } from './fabric.service';
import {
  CreateFabricDto,
  QueryFabricDto,
  UpdateFabricDto,
  UploadFabricImageDto,
} from './dto';
import { Fabric, FabricImage } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PaginatedResult } from '../common/utils/pagination';

describe('FabricController', () => {
  let controller: FabricController;

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
    deletedAt: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockPaginatedResult: PaginatedResult<Fabric> = {
    items: [mockFabric],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
  };

  const mockFabricService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FabricController],
      providers: [
        {
          provide: FabricService,
          useValue: mockFabricService,
        },
      ],
    }).compile();

    controller = module.get<FabricController>(FabricController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ========================================
  // CREATE Tests
  // ========================================
  describe('create (POST /)', () => {
    it('should create a fabric successfully', async () => {
      const createDto: CreateFabricDto = {
        fabricCode: 'FB-2401-0001',
        name: 'Premium Cotton Twill',
      };
      mockFabricService.create.mockResolvedValue(mockFabric);

      const result = await controller.create(createDto);

      expect(mockFabricService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockFabric);
    });
  });

  // ========================================
  // FIND ALL Tests
  // ========================================
  describe('findAll (GET /)', () => {
    it('should return paginated fabrics', async () => {
      const query: QueryFabricDto = { page: 1, pageSize: 20 };
      mockFabricService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(query);

      expect(mockFabricService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass query parameters to service', async () => {
      const query: QueryFabricDto = {
        page: 2,
        pageSize: 10,
        fabricCode: 'FB-2401',
        name: 'Cotton',
        color: 'Navy Blue',
      };
      mockFabricService.findAll.mockResolvedValue(mockPaginatedResult);

      await controller.findAll(query);

      expect(mockFabricService.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ========================================
  // FIND ONE Tests
  // ========================================
  describe('findOne (GET /:id)', () => {
    it('should return a fabric by ID', async () => {
      mockFabricService.findOne.mockResolvedValue(mockFabric);

      const result = await controller.findOne(1);

      expect(mockFabricService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFabric);
    });
  });

  // ========================================
  // UPDATE Tests
  // ========================================
  describe('update (PATCH /:id)', () => {
    it('should update a fabric successfully', async () => {
      const updateDto: UpdateFabricDto = { name: 'Updated Name' };
      const updatedFabric = { ...mockFabric, ...updateDto };
      mockFabricService.update.mockResolvedValue(updatedFabric);

      const result = await controller.update(1, updateDto);

      expect(mockFabricService.update).toHaveBeenCalledWith(1, updateDto);
      expect(result.name).toBe('Updated Name');
    });
  });

  // ========================================
  // REMOVE Tests
  // ========================================
  describe('remove (DELETE /:id)', () => {
    it('should remove a fabric without force', async () => {
      mockFabricService.remove.mockResolvedValue(undefined);

      await controller.remove(1, undefined);

      expect(mockFabricService.remove).toHaveBeenCalledWith(1, false);
    });

    it('should remove a fabric with force=true', async () => {
      mockFabricService.remove.mockResolvedValue(undefined);

      await controller.remove(1, true);

      expect(mockFabricService.remove).toHaveBeenCalledWith(1, true);
    });

    it('should remove a fabric with force=false', async () => {
      mockFabricService.remove.mockResolvedValue(undefined);

      await controller.remove(1, false);

      expect(mockFabricService.remove).toHaveBeenCalledWith(1, false);
    });
  });

  // ========================================
  // UPLOAD IMAGE Tests (2.3.7)
  // ========================================
  describe('uploadImage (POST /:id/images)', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024,
      buffer: Buffer.from('test image data'),
      stream: Readable.from([]),
      destination: '',
      filename: '',
      path: '',
    };

    const mockFabricImage: FabricImage = {
      id: 1,
      fabricId: 1,
      url: 'http://localhost:3000/uploads/uuid-123.jpg',
      sortOrder: 0,
      createdAt: new Date('2024-01-15T10:00:00Z'),
    };

    it('should upload an image successfully', async () => {
      const dto: UploadFabricImageDto = {};
      mockFabricService.uploadImage.mockResolvedValue(mockFabricImage);

      const result = await controller.uploadImage(1, mockFile, dto);

      expect(mockFabricService.uploadImage).toHaveBeenCalledWith(
        1,
        mockFile,
        0,
      );
      expect(result).toEqual(mockFabricImage);
    });

    it('should pass custom sortOrder to service', async () => {
      const dto: UploadFabricImageDto = { sortOrder: 5 };
      const imageWithSortOrder = { ...mockFabricImage, sortOrder: 5 };
      mockFabricService.uploadImage.mockResolvedValue(imageWithSortOrder);

      const result = await controller.uploadImage(1, mockFile, dto);

      expect(mockFabricService.uploadImage).toHaveBeenCalledWith(
        1,
        mockFile,
        5,
      );
      expect(result.sortOrder).toBe(5);
    });

    it('should throw BadRequestException when no file provided', () => {
      const dto: UploadFabricImageDto = {};

      expect(() => controller.uploadImage(1, undefined, dto)).toThrow(
        BadRequestException,
      );
      expect(() => controller.uploadImage(1, undefined, dto)).toThrow(
        'No file provided',
      );
    });

    it('should throw BadRequestException for invalid MIME type', () => {
      const pdfFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      };
      const dto: UploadFabricImageDto = {};

      expect(() => controller.uploadImage(1, pdfFile, dto)).toThrow(
        BadRequestException,
      );
      expect(() => controller.uploadImage(1, pdfFile, dto)).toThrow(
        'Invalid file type. Allowed: jpeg, png, gif, webp',
      );
    });

    it('should accept image/jpeg MIME type', async () => {
      const dto: UploadFabricImageDto = {};
      mockFabricService.uploadImage.mockResolvedValue(mockFabricImage);

      await controller.uploadImage(1, mockFile, dto);

      expect(mockFabricService.uploadImage).toHaveBeenCalled();
    });

    it('should accept image/png MIME type', async () => {
      const pngFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'image/png',
      };
      const dto: UploadFabricImageDto = {};
      mockFabricService.uploadImage.mockResolvedValue(mockFabricImage);

      await controller.uploadImage(1, pngFile, dto);

      expect(mockFabricService.uploadImage).toHaveBeenCalled();
    });

    it('should accept image/gif MIME type', async () => {
      const gifFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'image/gif',
      };
      const dto: UploadFabricImageDto = {};
      mockFabricService.uploadImage.mockResolvedValue(mockFabricImage);

      await controller.uploadImage(1, gifFile, dto);

      expect(mockFabricService.uploadImage).toHaveBeenCalled();
    });

    it('should accept image/webp MIME type', async () => {
      const webpFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'image/webp',
      };
      const dto: UploadFabricImageDto = {};
      mockFabricService.uploadImage.mockResolvedValue(mockFabricImage);

      await controller.uploadImage(1, webpFile, dto);

      expect(mockFabricService.uploadImage).toHaveBeenCalled();
    });

    it('should reject image/bmp MIME type', () => {
      const bmpFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'image/bmp',
      };
      const dto: UploadFabricImageDto = {};

      expect(() => controller.uploadImage(1, bmpFile, dto)).toThrow(
        BadRequestException,
      );
    });

    it('should pass NotFoundException from service', async () => {
      const dto: UploadFabricImageDto = {};
      mockFabricService.uploadImage.mockRejectedValue(
        new NotFoundException('Fabric with ID 999 not found'),
      );

      await expect(controller.uploadImage(999, mockFile, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use default sortOrder 0 when not provided', async () => {
      const dto: UploadFabricImageDto = {};
      mockFabricService.uploadImage.mockResolvedValue(mockFabricImage);

      await controller.uploadImage(1, mockFile, dto);

      expect(mockFabricService.uploadImage).toHaveBeenCalledWith(
        1,
        mockFile,
        0,
      );
    });
  });

  // ========================================
  // DELETE IMAGE Tests (2.3.8)
  // ========================================
  describe('deleteImage (DELETE /:id/images/:imageId)', () => {
    it('should delete an image successfully', async () => {
      mockFabricService.deleteImage.mockResolvedValue(undefined);

      await controller.deleteImage(1, 10);

      expect(mockFabricService.deleteImage).toHaveBeenCalledWith(1, 10);
    });

    it('should pass correct fabricId and imageId to service', async () => {
      mockFabricService.deleteImage.mockResolvedValue(undefined);

      await controller.deleteImage(5, 20);

      expect(mockFabricService.deleteImage).toHaveBeenCalledWith(5, 20);
    });

    it('should pass NotFoundException from service when fabric not found', async () => {
      mockFabricService.deleteImage.mockRejectedValue(
        new NotFoundException('Fabric with ID 999 not found'),
      );

      await expect(controller.deleteImage(999, 10)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.deleteImage(999, 10)).rejects.toThrow(
        'Fabric with ID 999 not found',
      );
    });

    it('should pass NotFoundException from service when image not found', async () => {
      mockFabricService.deleteImage.mockRejectedValue(
        new NotFoundException('Fabric image with ID 999 not found'),
      );

      await expect(controller.deleteImage(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.deleteImage(1, 999)).rejects.toThrow(
        'Fabric image with ID 999 not found',
      );
    });
  });
});
