import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { StorageProvider } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = configService.get<string>('UPLOAD_DIR') || './uploads';
    this.baseUrl =
      configService.get<string>('BASE_URL') || 'http://localhost:3000';

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = path.resolve(this.uploadDir, key);

    // Validate path stays within upload directory
    const resolvedUploadDir = path.resolve(this.uploadDir);
    if (!filePath.startsWith(resolvedUploadDir + path.sep)) {
      throw new Error('Invalid file path: outside upload directory');
    }

    await fs.promises.writeFile(filePath, buffer);
  }

  async getUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    return this.baseUrl + '/uploads/' + key;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.resolve(this.uploadDir, key);

    // Validate path stays within upload directory
    const resolvedUploadDir = path.resolve(this.uploadDir);
    if (!filePath.startsWith(resolvedUploadDir + path.sep)) {
      throw new Error('Invalid file path: outside upload directory');
    }

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}
