/**
 * File upload constants used across the application.
 * Centralized definitions for MIME types, file sizes, and extensions.
 */

/**
 * Allowed image MIME types for image uploads.
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Allowed MIME types for all file uploads (images + documents).
 */
export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Maximum file size in bytes (10MB).
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum image size in bytes (5MB).
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Maximum filename length.
 */
export const MAX_FILENAME_LENGTH = 255;

/**
 * Allowed file extensions (whitelist).
 */
export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.xls',
  '.xlsx',
  '.doc',
  '.docx',
];
