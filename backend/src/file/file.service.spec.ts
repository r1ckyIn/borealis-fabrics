/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileService, UploadedFile } from './file.service';
import { PrismaService } from '../prisma/prisma.service';
import { File } from '@prisma/client';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('FileService', () => {
  let service: FileService;

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
    get: jest.fn((key: string) => {
      if (key === 'UPLOAD_DIR') return './test-uploads';
      if (key === 'BASE_URL') return 'http://localhost:3000';
      return undefined;
    }),
  };

  beforeEach(async () => {
    // Reset fs mocks
    (fs.existsSync as jest.Mock).mockReturnValue(true);

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
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // UPLOAD Tests
  // ========================================
  describe('upload', () => {
    it('should upload a file successfully', async () => {
      fileMock.create.mockResolvedValue(mockFile);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.upload(mockUploadedFile);

      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(fileMock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          originalName: 'test-image.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
        }),
      });
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('url');
      expect(result.originalName).toBe('test-image.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(1024);
    });

    it('should generate unique key with correct extension', async () => {
      fileMock.create.mockResolvedValue(mockFile);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.upload(mockUploadedFile);

      expect(fileMock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: expect.stringMatching(/.*\.jpg$/),
        }),
      });
    });

    it('should save file to local storage', async () => {
      fileMock.create.mockResolvedValue(mockFile);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.upload(mockUploadedFile);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-uploads'),
        mockUploadedFile.buffer,
      );
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
    it('should throw NotFoundException if file not found', async () => {
      fileMock.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow(
        'File with ID 999 not found',
      );
    });

    it('should delete file from storage and database', async () => {
      fileMock.findUnique.mockResolvedValue(mockFile);
      fileMock.delete.mockResolvedValue(mockFile);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.remove(1);

      expect(fs.promises.unlink).toHaveBeenCalledWith(
        expect.stringContaining(mockFile.key),
      );
      expect(fileMock.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should not fail if file does not exist on storage', async () => {
      fileMock.findUnique.mockResolvedValue(mockFile);
      fileMock.delete.mockResolvedValue(mockFile);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await service.remove(1);

      expect(fs.promises.unlink).not.toHaveBeenCalled();
      expect(fileMock.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  // ========================================
  // REMOVE BY KEY Tests
  // ========================================
  describe('removeByKey', () => {
    it('should remove file by key', async () => {
      fileMock.findUnique.mockResolvedValue(mockFile);
      fileMock.delete.mockResolvedValue(mockFile);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.removeByKey('abc123-uuid.jpg');

      expect(fileMock.findUnique).toHaveBeenCalledWith({
        where: { key: 'abc123-uuid.jpg' },
      });
      expect(fileMock.delete).toHaveBeenCalled();
    });
  });
});
