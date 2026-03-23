import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import COS from 'cos-nodejs-sdk-v5';
import { StorageProvider } from './storage.interface';

@Injectable()
export class CosStorageProvider implements StorageProvider {
  private readonly cos: COS;
  private readonly bucket: string;
  private readonly region: string;
  private readonly logger = new Logger(CosStorageProvider.name);

  constructor(private readonly configService: ConfigService) {
    const cosConfig = configService.get<{
      secretId: string;
      secretKey: string;
      bucket: string;
      region: string;
    }>('cos');

    if (!cosConfig?.secretId || !cosConfig?.secretKey) {
      throw new Error(
        'COS configuration missing: COS_SECRET_ID and COS_SECRET_KEY are required',
      );
    }

    this.cos = new COS({
      SecretId: cosConfig.secretId,
      SecretKey: cosConfig.secretKey,
    });
    this.bucket = cosConfig.bucket;
    this.region = cosConfig.region;
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        },
        (err) => {
          if (err) {
            this.logger.error(
              `COS upload failed for key ${key}: ${err.message}`,
            );
            reject(err instanceof Error ? err : new Error(err.message));
          } else {
            resolve();
          }
        },
      );
    });
  }

  async getUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.cos.getObjectUrl(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Sign: true,
          Expires: expiresInSeconds,
        },
        (err, data) => {
          if (err) {
            this.logger.error(
              `COS getUrl failed for key ${key}: ${err.message}`,
            );
            reject(err instanceof Error ? err : new Error(err.message));
          } else {
            resolve(data.Url);
          }
        },
      );
    });
  }

  async delete(key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.cos.deleteObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err) => {
          if (err) {
            this.logger.error(
              `COS delete failed for key ${key}: ${err.message}`,
            );
            reject(err instanceof Error ? err : new Error(err.message));
          } else {
            resolve();
          }
        },
      );
    });
  }
}
