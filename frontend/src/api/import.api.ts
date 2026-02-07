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
 * Download an import template as a blob and trigger a browser download.
 * @param endpoint - API path for the template (e.g. '/import/templates/fabrics')
 * @param filename - The filename for the downloaded file
 */
async function downloadTemplate(endpoint: string, filename: string): Promise<void> {
  const response = await apiClient.get<Blob>(endpoint, {
    responseType: 'blob',
  });
  triggerDownload(response as unknown as Blob, filename);
}

/**
 * Upload a file to an import endpoint and return the result.
 * @param endpoint - API path for the import (e.g. '/import/fabrics')
 * @param file - The .xlsx file to import
 * @param onProgress - Optional upload progress callback (0-100)
 */
async function uploadImportFile(
  endpoint: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ImportResult>(endpoint, formData, {
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

/** Download the fabric import Excel template. */
export function downloadFabricTemplate(): Promise<void> {
  return downloadTemplate('/import/templates/fabrics', 'fabric_import_template.xlsx');
}

/** Download the supplier import Excel template. */
export function downloadSupplierTemplate(): Promise<void> {
  return downloadTemplate('/import/templates/suppliers', 'supplier_import_template.xlsx');
}

/** Import fabrics from an Excel file. */
export function importFabrics(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ImportResult> {
  return uploadImportFile('/import/fabrics', file, onProgress);
}

/** Import suppliers from an Excel file. */
export function importSuppliers(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ImportResult> {
  return uploadImportFile('/import/suppliers', file, onProgress);
}

export const importApi = {
  downloadFabricTemplate,
  downloadSupplierTemplate,
  importFabrics,
  importSuppliers,
};
