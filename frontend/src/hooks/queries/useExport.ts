/**
 * TanStack Query hooks for Data Export module.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { getExportFields, downloadExport } from '@/api/export';

// =============================================================================
// Query Keys
// =============================================================================

export const exportKeys = {
  all: ['export'] as const,
  fields: (entityType: string) =>
    [...exportKeys.all, 'fields', entityType] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch exportable field configuration for an entity type.
 * @param entityType - Entity type (e.g., 'supplier', 'customer')
 */
export function useExportFields(entityType: string) {
  return useQuery({
    queryKey: exportKeys.fields(entityType),
    queryFn: () => getExportFields(entityType),
    enabled: !!entityType,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Download Excel export for an entity type with selected fields.
 * Creates a blob URL, triggers download, and revokes the URL.
 */
export function useDownloadExport() {
  return useMutation({
    mutationFn: ({
      entityType,
      fields,
    }: {
      entityType: string;
      fields: string[];
    }) => downloadExport(entityType, fields),
    onSuccess: (blob, { entityType }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityType}-export-${dayjs().format('YYYYMMDD')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
