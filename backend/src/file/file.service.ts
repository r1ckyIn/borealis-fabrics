import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { File } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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
    // Generate unique key for the file
    const ext = path.extname(file.originalname);
    const key = `${randomUUID()}${ext}`;

    // Save file to local storage (MVP)
    const filePath = path.join(this.uploadDir, key);
    await fs.promises.writeFile(filePath, file.buffer);

    // Generate URL
    const url = `${this.baseUrl}/uploads/${key}`;

    // Create database record
    const record = await this.prisma.file.create({
      data: {
        key,
        url,
        originalName: file.originalname,
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

    // Delete from storage (MVP: local file system)
    const filePath = path.join(this.uploadDir, file.key);
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
