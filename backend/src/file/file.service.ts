import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { File } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as path from 'path';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILENAME_LENGTH,
} from '../common/constants/file.constants';
import { STORAGE_PROVIDER } from './storage';
import type { StorageProvider } from './storage';

/**
 * Sanitize filename to prevent security issues.
 * Removes path traversal characters, null bytes, and special characters.
 */
function sanitizeFilename(filename: string): string {
  // Remove null bytes (use split/join to avoid eslint no-control-regex)
  const nullByte = String.fromCharCode(0);
  let sanitized = filename.split(nullByte).join('');

  // Remove path traversal characters
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[/\\]/g, '');

  // Remove HTML/script tags and special characters
  sanitized = sanitized.replace(/[<>:"'|?*]/g, '');

  // Get just the filename without any path
  sanitized = path.basename(sanitized);

  // Truncate to max length while preserving extension
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = sanitized.slice(0, MAX_FILENAME_LENGTH - ext.length);
    sanitized = nameWithoutExt + ext;
  }

  return sanitized;
}

/**
 * Validate file extension against whitelist.
 * Throws BadRequestException if extension is not allowed.
 */
function validateExtension(filename: string): void {
  const ext = path.extname(filename).toLowerCase();

  // Check if extension is in whitelist
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new BadRequestException(
      `Invalid file extension "${ext}". Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    );
  }

  // Check for double extension attacks (e.g., file.jpg.exe)
  const parts = filename.split('.');
  if (parts.length > 2) {
    // Check if any middle part looks like an extension
    const middleParts = parts.slice(1, -1);
    for (const part of middleParts) {
      if (ALLOWED_EXTENSIONS.includes('.' + part.toLowerCase())) {
        throw new BadRequestException(
          'Invalid file extension: double extension detected',
        );
      }
    }
  }
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface FileUploadResult {
  id: number;
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Upload a file to storage and create a database record.
   * Uses StorageProvider for abstracted storage (local or COS).
   * Database stores key-only; URLs are generated at read-time.
   */
  async upload(file: UploadedFile): Promise<FileUploadResult> {
    // Sanitize the original filename
    const sanitizedOriginalName = sanitizeFilename(file.originalname);

    // Validate file extension
    validateExtension(sanitizedOriginalName);

    // Generate unique key for the file with sanitized extension
    const ext = path.extname(sanitizedOriginalName).toLowerCase();
    const key = `${randomUUID()}${ext}`;

    // Upload via storage provider
    await this.storageProvider.upload(key, file.buffer, file.mimetype);

    // Store key-only in database (not full URL) per FEAT-05
    const record = await this.prisma.file.create({
      data: {
        key,
        url: key,
        originalName: sanitizedOriginalName,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    // Generate URL at read-time
    const url = await this.storageProvider.getUrl(key);

    return {
      id: record.id,
      key: record.key,
      url,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
    };
  }

  /**
   * Generate a URL for a file key.
   * Returns presigned URL (COS) or localhost URL (local).
   * Handles legacy full URLs gracefully (returns as-is if starts with 'http').
   */
  async getFileUrl(key: string): Promise<string> {
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    return this.storageProvider.getUrl(key);
  }

  /**
   * Find a file by ID.
   * Throws NotFoundException if file not found.
   */
  async findOne(id: number): Promise<File> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    return file;
  }

  /**
   * Find a file by key.
   * Throws NotFoundException if file not found.
   */
  async findByKey(key: string): Promise<File> {
    const file = await this.prisma.file.findUnique({
      where: { key },
    });

    if (!file) {
      throw new NotFoundException(`File with key "${key}" not found`);
    }

    return file;
  }

  /**
   * Remove a file by ID.
   * Deletes both the database record and the file from storage.
   */
  async remove(id: number): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    // Delete from storage provider
    await this.storageProvider.delete(file.key);

    // Delete database record
    await this.prisma.file.delete({ where: { id } });
  }

  /**
   * Remove a file by key.
   * Deletes both the database record and the file from storage.
   */
  async removeByKey(key: string): Promise<void> {
    const file = await this.findByKey(key);
    await this.remove(file.id);
  }
}
