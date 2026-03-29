/**
 * Data export API endpoints.
 */

import type { ExportFieldConfig } from '@/types';
import apiClient from './client';

/** Get exportable field configuration for an entity type. */
export function getExportFields(
  entityType: string
): Promise<ExportFieldConfig[]> {
  return apiClient.get(`/export/fields/${entityType}`) as unknown as Promise<
    ExportFieldConfig[]
  >;
}

/** Download Excel export for an entity type with selected fields. */
export function downloadExport(
  entityType: string,
  fields: string[]
): Promise<Blob> {
  return apiClient.get(`/export/${entityType}`, {
    params: { fields: fields.join(',') },
    responseType: 'blob',
  }) as unknown as Promise<Blob>;
}
