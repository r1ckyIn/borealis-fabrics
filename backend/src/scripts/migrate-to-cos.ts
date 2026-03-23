/**
 * One-time migration script: FabricImage.url localhost URLs -> key-only format.
 *
 * What it does:
 * 1. Finds all FabricImage records with URLs starting with 'http'
 * 2. Extracts the key from the URL (everything after '/uploads/')
 * 3. If COS mode: reads local file and uploads to COS
 * 4. Updates database record to store key-only
 *
 * Usage:
 *   DRY_RUN=true npx ts-node src/scripts/migrate-to-cos.ts    # Preview changes
 *   npx ts-node src/scripts/migrate-to-cos.ts                  # Execute migration
 *   STORAGE_MODE=cos npx ts-node src/scripts/migrate-to-cos.ts # Upload to COS + update DB
 *
 * Prerequisites:
 * - Deploy new code (that reads key-only) BEFORE running this script
 * - Set environment variables (.env) for database and optionally COS
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === 'true';
const STORAGE_MODE = process.env.STORAGE_MODE || 'local';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

/** Simple MIME type detection from file extension. */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/** Create COS client only when needed. */
function createCosClient() {
  // Dynamic import to avoid requiring cos-nodejs-sdk-v5 when not in COS mode
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const COS = require('cos-nodejs-sdk-v5');
  const secretId = process.env.COS_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY;
  const bucket = process.env.COS_BUCKET;
  const region = process.env.COS_REGION;

  if (!secretId || !secretKey || !bucket || !region) {
    throw new Error(
      'COS configuration missing. Set COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION',
    );
  }

  const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  return { cos, bucket, region };
}

/** Upload a buffer to COS. */
async function uploadToCos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cos: any,
  bucket: string,
  region: string,
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any) => {
        if (err) reject(err instanceof Error ? err : new Error(err.message));
        else resolve();
      },
    );
  });
}

/**
 * Main migration function.
 * Finds all FabricImage records with full URLs and converts them to key-only format.
 */
async function migrateFabricImagesToCos(): Promise<void> {
  console.log('=== FabricImage URL Migration ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Storage: ${STORAGE_MODE}`);
  console.log(`Upload dir: ${UPLOAD_DIR}`);
  console.log('');

  // Find all images with full URLs (starting with http)
  const images = await prisma.fabricImage.findMany({
    where: { url: { startsWith: 'http' } },
  });

  console.log(`Found ${images.length} images with full URLs to migrate`);

  if (images.length === 0) {
    console.log('No images to migrate. Done.');
    return;
  }

  // Create COS client if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cosClient: { cos: any; bucket: string; region: string } | undefined;
  if (STORAGE_MODE === 'cos' && !DRY_RUN) {
    cosClient = createCosClient();
    console.log('COS client initialized');
  }

  // Track statistics
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const image of images) {
    try {
      // Extract key from URL (everything after '/uploads/')
      const urlParts = image.url.split('/uploads/');
      if (urlParts.length < 2 || !urlParts[1]) {
        console.warn(
          `  SKIP image ${image.id}: URL format not recognized: ${image.url}`,
        );
        skipped++;
        continue;
      }

      const key = urlParts[1];

      if (DRY_RUN) {
        console.log(
          `  [DRY RUN] Would migrate image ${image.id}: ${image.url} -> ${key}`,
        );
        migrated++;
        continue;
      }

      // If COS mode: read local file and upload to COS
      if (STORAGE_MODE === 'cos' && cosClient) {
        const localPath = path.resolve(UPLOAD_DIR, key);

        if (!fs.existsSync(localPath)) {
          console.warn(
            `  SKIP image ${image.id}: local file not found: ${localPath}`,
          );
          skipped++;
          continue;
        }

        const buffer = await fs.promises.readFile(localPath);
        const mimeType = getMimeType(key);

        await uploadToCos(
          cosClient.cos,
          cosClient.bucket,
          cosClient.region,
          key,
          buffer,
          mimeType,
        );
        console.log(`  Uploaded to COS: ${key}`);
      }

      // Update database record to store key-only
      await prisma.fabricImage.update({
        where: { id: image.id },
        data: { url: key },
      });

      console.log(`  Migrated image ${image.id}: ${image.url} -> ${key}`);
      migrated++;
    } catch (error) {
      console.error(
        `  FAILED image ${image.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      failed++;
      // Continue processing remaining images
    }
  }

  console.log('');
  console.log('=== Migration Summary ===');
  console.log(`Total:    ${images.length}`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
}

// Execute migration
migrateFabricImagesToCos()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
