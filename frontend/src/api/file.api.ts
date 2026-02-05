/**
 * File upload API functions.
 */

import apiClient from './client';
import type { FileEntity } from '@/types/entities.types';

/**
 * Upload a single file.
 * @param file - The file to upload
 * @param onProgress - Optional progress callback (0-100)
 * @returns The uploaded file entity
 */
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<FileEntity> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<FileEntity>('/files', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  // Response interceptor unwraps ApiResponse, so we cast directly
  return response as unknown as FileEntity;
}

/**
 * Delete a file by ID.
 * @param id - The file ID to delete
 */
export async function deleteFile(id: number): Promise<void> {
  await apiClient.delete(`/files/${id}`);
}

/**
 * Upload multiple files.
 * @param files - Array of files to upload
 * @param onProgress - Optional progress callback for each file
 * @returns Array of uploaded file entities
 */
export async function uploadFiles(
  files: File[],
  onProgress?: (fileIndex: number, percent: number) => void
): Promise<FileEntity[]> {
  const results: FileEntity[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await uploadFile(file, (percent) => {
      onProgress?.(i, percent);
    });
    results.push(result);
  }

  return results;
}
