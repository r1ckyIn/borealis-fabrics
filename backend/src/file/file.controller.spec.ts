import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService, FileUploadResult } from './file.service';
import { File } from '@prisma/client';

describe('FileController', () => {
  let controller: FileController;

  // Mock data
  const mockFile: File = {
    id: 1,
    key: 'abc123-uuid.jpg',
    url: 'http://localhost:3000/uploads/abc123-uuid.jpg',
    originalName: 'test-image.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockUploadResult: FileUploadResult = {
    id: 1,
    key: 'abc123-uuid.jpg',
    url: 'http://localhost:3000/uploads/abc123-uuid.jpg',
    originalName: 'test-image.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
  };

  const mockMulterFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test file content'),
    destination: '',
    filename: '',
    path: '',
    stream: null as never,
  };

  const mockFileService = {
    upload: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        {
          provide: FileService,
          useValue: mockFileService,
        },
      ],
    }).compile();

    controller = module.get<FileController>(FileController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ========================================
  // UPLOAD Tests
  // ========================================
  describe('upload (POST /)', () => {
    it('should upload a file successfully', async () => {
      mockFileService.upload.mockResolvedValue(mockUploadResult);

      const result = await controller.upload(mockMulterFile);

      expect(mockFileService.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'test-image.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
        }),
      );
      expect(result).toEqual(mockUploadResult);
    });

    it('should throw BadRequestException if no file provided', async () => {
      await expect(
        controller.upload(undefined as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.upload(undefined as unknown as Express.Multer.File),
      ).rejects.toThrow('No file provided');
    });

    it('should throw BadRequestException for invalid MIME type', async () => {
      const invalidFile = { ...mockMulterFile, mimetype: 'application/exe' };

      await expect(controller.upload(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(invalidFile)).rejects.toThrow(
        'Invalid file type',
      );
    });

    it('should throw BadRequestException for file exceeding size limit', async () => {
      const largeFile = { ...mockMulterFile, size: 15 * 1024 * 1024 }; // 15MB

      await expect(controller.upload(largeFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(largeFile)).rejects.toThrow(
        'File too large',
      );
    });

    it('should accept PDF files', async () => {
      const pdfFile = { ...mockMulterFile, mimetype: 'application/pdf' };
      mockFileService.upload.mockResolvedValue({
        ...mockUploadResult,
        mimeType: 'application/pdf',
      });

      const result = await controller.upload(pdfFile);

      expect(result).toBeDefined();
      expect(mockFileService.upload).toHaveBeenCalled();
    });

    it('should accept Excel files', async () => {
      const excelFile = {
        ...mockMulterFile,
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      mockFileService.upload.mockResolvedValue({
        ...mockUploadResult,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await controller.upload(excelFile);

      expect(result).toBeDefined();
      expect(mockFileService.upload).toHaveBeenCalled();
    });

    it('should accept all image types', async () => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      for (const mimeType of imageTypes) {
        const imageFile = { ...mockMulterFile, mimetype: mimeType };
        mockFileService.upload.mockResolvedValue({
          ...mockUploadResult,
          mimeType,
        });

        const result = await controller.upload(imageFile);

        expect(result).toBeDefined();
      }

      expect(mockFileService.upload).toHaveBeenCalledTimes(imageTypes.length);
    });
  });

  // ========================================
  // FIND ONE Tests
  // ========================================
  describe('findOne (GET /:id)', () => {
    it('should return a file by ID', async () => {
      mockFileService.findOne.mockResolvedValue(mockFile);

      const result = await controller.findOne(1);

      expect(mockFileService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFile);
    });
  });

  // ========================================
  // REMOVE Tests
  // ========================================
  describe('remove (DELETE /:id)', () => {
    it('should remove a file by ID', async () => {
      mockFileService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(mockFileService.remove).toHaveBeenCalledWith(1);
    });
  });

  // ========================================
  // SECURITY Tests - Filename Validation
  // ========================================
  describe('security - filename validation', () => {
    it('should reject filename with path traversal characters (../)', async () => {
      const maliciousFile = {
        ...mockMulterFile,
        originalname: '../../../etc/passwd.jpg',
      };

      await expect(controller.upload(maliciousFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(maliciousFile)).rejects.toThrow(
        'Invalid filename',
      );
    });

    it('should reject filename with backslash path traversal (..\\)', async () => {
      const maliciousFile = {
        ...mockMulterFile,
        originalname: '..\\..\\..\\windows\\system32\\config.jpg',
      };

      await expect(controller.upload(maliciousFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(maliciousFile)).rejects.toThrow(
        'Invalid filename',
      );
    });

    it('should reject filename with null byte', async () => {
      const maliciousFile = {
        ...mockMulterFile,
        originalname: 'image.jpg\x00.exe',
      };

      await expect(controller.upload(maliciousFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(maliciousFile)).rejects.toThrow(
        'Invalid filename',
      );
    });

    it('should reject extremely long filenames', async () => {
      const maliciousFile = {
        ...mockMulterFile,
        originalname: 'a'.repeat(300) + '.jpg',
      };

      await expect(controller.upload(maliciousFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(maliciousFile)).rejects.toThrow(
        'Filename too long',
      );
    });

    it('should reject filenames with only dots', async () => {
      const maliciousFile = {
        ...mockMulterFile,
        originalname: '....jpg',
      };

      await expect(controller.upload(maliciousFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow valid filenames with special characters', async () => {
      const validFile = {
        ...mockMulterFile,
        originalname: 'my-file_2024 (1).jpg',
      };
      mockFileService.upload.mockResolvedValue(mockUploadResult);

      const result = await controller.upload(validFile);

      expect(result).toBeDefined();
      expect(mockFileService.upload).toHaveBeenCalled();
    });

    it('should allow Chinese/Unicode filenames', async () => {
      const unicodeFile = {
        ...mockMulterFile,
        originalname: '面料图片-红色.jpg',
      };
      mockFileService.upload.mockResolvedValue(mockUploadResult);

      const result = await controller.upload(unicodeFile);

      expect(result).toBeDefined();
      expect(mockFileService.upload).toHaveBeenCalled();
    });
  });
});
