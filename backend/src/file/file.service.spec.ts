/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileService, UploadedFile } from './file.service';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, StorageProvider } from './storage';
import { File } from '@prisma/client';

describe('FileService', () => {
  let service: FileService;
  let mockStorageProvider: jest.Mocked<StorageProvider>;

  // Mock data
  const mockFile: File = {
    id: 1,
    key: 'abc123-uuid.jpg',
    url: 'abc123-uuid.jpg',
    originalName: 'test-image.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockUploadedFile: UploadedFile = {
    originalname: 'test-image.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test file content'),
  };

  // Mock Prisma methods
  const fileMock = {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    file: fileMock,
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockStorageProvider = {
      upload: jest.fn().mockResolvedValue(undefined),
      getUrl: jest
        .fn()
        .mockResolvedValue('http://localhost:3000/uploads/test-key.jpg'),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: STORAGE_PROVIDER,
          useValue: mockStorageProvider,
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    jest.clearAllMocks();

    // Re-setup mock defaults after clearAllMocks
    mockStorageProvider.upload.mockResolvedValue(undefined);
    mockStorageProvider.getUrl.mockResolvedValue(
      'http://localhost:3000/uploads/test-key.jpg',
    );
    mockStorageProvider.delete.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // UPLOAD Tests
  // ========================================
  describe('upload', () => {
    it('should store key-only in database (not full URL)', async () => {
      fileMock.create.mockResolvedValue(mockFile);

      await service.upload(mockUploadedFile);

      expect(fileMock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          // url field should equal key (key-only), not a full URL
          url: expect.stringMatching(
            /^[0-9a-f-]+\.jpg$/,
          ),
        }),
      });

      // Verify the url stored is the same as the key
      const createCall = fileMock.create.mock.calls[0] as [
        { data: { key: string; url: string } },
      ];
      expect(createCall[0].data.url).toBe(createCall[0].data.key);
    });

    it('should call storageProvider.upload with key, buffer, mimetype', async () => {
      fileMock.create.mockResolvedValue(mockFile);

      await service.upload(mockUploadedFile);

      expect(mockStorageProvider.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^[0-9a-f-]+\.jpg$/),
        mockUploadedFile.buffer,
        mockUploadedFile.mimetype,
      );
    });

    it('should return URL generated from storage provider', async () => {
      fileMock.create.mockResolvedValue(mockFile);

      const result = await service.upload(mockUploadedFile);

      expect(mockStorageProvider.getUrl).toHaveBeenCalled();
      expect(result.url).toBe(
        'http://localhost:3000/uploads/test-key.jpg',
      );
    });

    it('should generate unique key with correct extension', async () => {
      fileMock.create.mockResolvedValue(mockFile);

      await service.upload(mockUploadedFile);

      expect(fileMock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: expect.stringMatching(/.*\.jpg$/),
        }),
      });
    });

    it('should sanitize filename and validate extension', async () => {
      const maliciousFile: UploadedFile = {
        originalname: 'malware.exe',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      };

      await expect(service.upload(maliciousFile)).rejects.toThrow(
        'Invalid file extension',
      );
    });
  });

  // ========================================
  // GET FILE URL Tests
  // ========================================
  describe('getFileUrl', () => {
    it('should delegate to storage provider for key-only values', async () => {
      const result = await service.getFileUrl('test.jpg');

      expect(mockStorageProvider.getUrl).toHaveBeenCalledWith('test.jpg');
      expect(result).toBe(
        'http://localhost:3000/uploads/test-key.jpg',
      );
    });

    it('should return legacy full URL as-is without calling provider', async () => {
      const legacyUrl = 'http://localhost:3000/uploads/old.jpg';

      const result = await service.getFileUrl(legacyUrl);

      expect(mockStorageProvider.getUrl).not.toHaveBeenCalled();
      expect(result).toBe(legacyUrl);
    });

    it('should handle https legacy URLs', async () => {
      const legacyUrl = 'https://example.com/uploads/old.jpg';

      const result = await service.getFileUrl(legacyUrl);

      expect(mockStorageProvider.getUrl).not.toHaveBeenCalled();
      expect(result).toBe(legacyUrl);
    });
  });

  // ========================================
  // FIND ONE Tests
  // ========================================
  describe('findOne', () => {
    it('should return a file by ID', async () => {
      fileMock.findUnique.mockResolvedValue(mockFile);

      const result = await service.findOne(1);

      expect(fileMock.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException if file not found', async () => {
      fileMock.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'File with ID 999 not found',
      );
    });
  });

  // ========================================
  // FIND BY KEY Tests
  // ========================================
  describe('findByKey', () => {
    it('should return a file by key', async () => {
      fileMock.findUnique.mockResolvedValue(mockFile);

      const result = await service.findByKey('abc123-uuid.jpg');

      expect(fileMock.findUnique).toHaveBeenCalledWith({
        where: { key: 'abc123-uuid.jpg' },
      });
      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException if file not found', async () => {
      fileMock.findUnique.mockResolvedValue(null);

      await expect(service.findByKey('nonexistent.jpg')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByKey('nonexistent.jpg')).rejects.toThrow(
        'File with key "nonexistent.jpg" not found',
      );
    });
  });

  // ========================================
  // REMOVE Tests
  // ========================================
  describe('remove', () => {
    it('should call storageProvider.delete with file key', async () => {
      fileMock.findUnique.mockResolvedValue(mockFile);
      fileMock.delete.mockResolvedValue(mockFile);

      await service.remove(1);

      expect(mockStorageProvider.delete).toHaveBeenCalledWith(
        mockFile.key,
      );
      expect(fileMock.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if file not found', async () => {
      fileMock.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow(
        'File with ID 999 not found',
      );
    });
  });

  // ========================================
  // REMOVE BY KEY Tests
  // ========================================
  describe('removeByKey', () => {
    it('should remove file by key via storageProvider', async () => {
      fileMock.findUnique.mockResolvedValue(mockFile);
      fileMock.delete.mockResolvedValue(mockFile);

      await service.removeByKey('abc123-uuid.jpg');

      expect(fileMock.findUnique).toHaveBeenCalledWith({
        where: { key: 'abc123-uuid.jpg' },
      });
      expect(mockStorageProvider.delete).toHaveBeenCalledWith(
        mockFile.key,
      );
    });
  });

  // ========================================
  // SECURITY Tests - Filename Validation
  // ========================================
  describe('security - filename validation', () => {
    it('should sanitize filename with path traversal characters', async () => {
      const maliciousFile: UploadedFile = {
        originalname: '../../../etc/passwd.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      };

      fileMock.create.mockResolvedValue({
        ...mockFile,
        originalName: 'passwd.jpg',
      });

      const result = await service.upload(maliciousFile);

      expect(fileMock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          originalName: expect.not.stringContaining('..'),
        }),
      });
      expect(result.key).not.toContain('..');
    });

    it('should handle extremely long filenames', async () => {
      const longName = 'a'.repeat(300) + '.jpg';
      const maliciousFile: UploadedFile = {
        originalname: longName,
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      };

      fileMock.create.mockResolvedValue({
        ...mockFile,
        originalName: 'a'.repeat(200) + '.jpg',
      });

      await service.upload(maliciousFile);

      const mockCalls = fileMock.create.mock.calls as Array<
        [{ data: { originalName: string } }]
      >;
      const createdData = mockCalls[0][0];
      expect(createdData.data.originalName.length).toBeLessThanOrEqual(255);
    });

    it('should reject double extension attacks', async () => {
      const maliciousFile: UploadedFile = {
        originalname: 'image.jpg.exe',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      };

      await expect(service.upload(maliciousFile)).rejects.toThrow(
        'Invalid file extension',
      );
    });
  });
});
