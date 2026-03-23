export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  /**
   * Upload a file to storage.
   * @param key - Unique file key (e.g., uuid.ext)
   * @param buffer - File content
   * @param mimeType - MIME type for content-type header
   */
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;

  /**
   * Get a URL for accessing a stored file.
   * For COS: returns a presigned URL with expiry.
   * For local: returns a localhost URL.
   * @param key - File key
   * @param expiresInSeconds - URL expiry (COS only, default 3600)
   */
  getUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Delete a file from storage.
   * @param key - File key
   */
  delete(key: string): Promise<void>;
}
