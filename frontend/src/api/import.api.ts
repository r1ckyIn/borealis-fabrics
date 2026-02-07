/**
 * Import API functions for Excel batch import operations.
 */

import apiClient from './client';
import type { ImportResult } from '@/types';

/**
 * Trigger a browser download from a Blob response.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download the fabric import Excel template.
 */
export async function downloadFabricTemplate(): Promise<void> {
  const response = await apiClient.get<Blob>('/import/templates/fabrics', {
    responseType: 'blob',
  });
  triggerDownload(response as unknown as Blob, 'fabric_import_template.xlsx');
}

/**
 * Download the supplier import Excel template.
 */
export async function downloadSupplierTemplate(): Promise<void> {
  const response = await apiClient.get<Blob>('/import/templates/suppliers', {
    responseType: 'blob',
  });
  triggerDownload(response as unknown as Blob, 'supplier_import_template.xlsx');
}

/**
 * Import fabrics from an Excel file.
 * @param file - The .xlsx file to import
 * @param onProgress - Optional upload progress callback (0-100)
 */
export async function importFabrics(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ImportResult>('/import/fabrics', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return response as unknown as ImportResult;
}

/**
 * Import suppliers from an Excel file.
 * @param file - The .xlsx file to import
 * @param onProgress - Optional upload progress callback (0-100)
 */
export async function importSuppliers(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ImportResult>('/import/suppliers', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return response as unknown as ImportResult;
}

export const importApi = {
  downloadFabricTemplate,
  downloadSupplierTemplate,
  importFabrics,
  importSuppliers,
};
