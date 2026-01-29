import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { File } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Allowed file extensions (whitelist)
const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.xls',
  '.xlsx',
];

// Maximum filename length
const MAX_FILENAME_LENGTH = 255;

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

/**
 * Validate that the file path is within the upload directory.
 * Prevents path traversal attacks.
 */
function validateFilePath(uploadDir: string, key: string): string {
  // Check for obvious path traversal patterns
  if (key.includes('..') || key.includes('/') || key.includes('\\')) {
    throw new BadRequestException(
      'Invalid file path: contains traversal characters',
    );
  }

  // Decode URL-encoded characters and check again
  const decodedKey = decodeURIComponent(key);
  if (
    decodedKey.includes('..') ||
    decodedKey.includes('/') ||
    decodedKey.includes('\\')
  ) {
    throw new BadRequestException(
      'Invalid file path: contains encoded traversal characters',
    );
  }

  // Resolve the full path and verify it's within uploadDir
  const resolvedUploadDir = path.resolve(uploadDir);
  const resolvedFilePath = path.resolve(uploadDir, key);

  if (!resolvedFilePath.startsWith(resolvedUploadDir + path.sep)) {
    throw new BadRequestException(
      'Invalid file path: outside upload directory',
    );
  }

  return resolvedFilePath;
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
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // MVP: Use local file storage
    // TODO: Replace with COS SDK in production
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') || './uploads';
    this.baseUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:3000';

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload a file to storage and create a database record.
   * MVP: Uses local file system storage.
   * Production: Will use Tencent COS.
   */
  async upload(file: UploadedFile): Promise<FileUploadResult> {
    // Sanitize the original filename
    const sanitizedOriginalName = sanitizeFilename(file.originalname);

    // Validate file extension
    validateExtension(sanitizedOriginalName);

    // Generate unique key for the file with sanitized extension
    const ext = path.extname(sanitizedOriginalName).toLowerCase();
    const key = `${randomUUID()}${ext}`;

    // Validate the file path is within upload directory
    const filePath = validateFilePath(this.uploadDir, key);

    // Save file to local storage (MVP)
    await fs.promises.writeFile(filePath, file.buffer);

    // Generate URL
    const url = `${this.baseUrl}/uploads/${key}`;

    // Create database record with sanitized original name
    const record = await this.prisma.file.create({
      data: {
        key,
        url,
        originalName: sanitizedOriginalName,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return {
      id: record.id,
      key: record.key,
      url: record.url,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
    };
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
   * Deletes both the database record and the actual file.
   */
  async remove(id: number): Promise<void> {
    // Check if file exists
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    // Validate file path to prevent path traversal attacks
    const filePath = validateFilePath(this.uploadDir, file.key);

    // Delete from storage (MVP: local file system)
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }

    // Delete database record
    await this.prisma.file.delete({ where: { id } });
  }

  /**
   * Remove a file by key.
   * Deletes both the database record and the actual file.
   */
  async removeByKey(key: string): Promise<void> {
    const file = await this.findByKey(key);
    await this.remove(file.id);
  }
}
