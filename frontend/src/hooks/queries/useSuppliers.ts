/**
 * TanStack Query hooks for Supplier module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supplierApi } from '@/api';
import type {
  QuerySupplierParams,
  CreateSupplierData,
  UpdateSupplierData,
  QuerySupplierFabricsParams,
} from '@/types';

// =============================================================================
// Query Keys
// =============================================================================

export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (params: QuerySupplierParams) => [...supplierKeys.lists(), params] as const,
  details: () => [...supplierKeys.all, 'detail'] as const,
  detail: (id: number) => [...supplierKeys.details(), id] as const,
  fabrics: (id: number, params?: QuerySupplierFabricsParams) =>
    [...supplierKeys.detail(id), 'fabrics', params] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of suppliers.
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useSuppliers(params?: QuerySupplierParams, enabled: boolean = true) {
  return useQuery({
    queryKey: supplierKeys.list(params ?? {}),
    queryFn: () => supplierApi.getSuppliers(params),
    enabled,
  });
}

/**
 * Fetch a single supplier by ID.
 * @param id - Supplier ID
 * @param enabled - Whether to enable the query
 */
export function useSupplier(id: number | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: supplierKeys.detail(id!),
    queryFn: () => supplierApi.getSupplier(id!),
    enabled: enabled && id !== undefined,
  });
}

/**
 * Fetch fabrics associated with a supplier.
 * @param supplierId - Supplier ID
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useSupplierFabrics(
  supplierId: number | undefined,
  params?: QuerySupplierFabricsParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: supplierKeys.fabrics(supplierId!, params),
    queryFn: () => supplierApi.getSupplierFabrics(supplierId!, params),
    enabled: enabled && supplierId !== undefined,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Create a new supplier.
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierData) => supplierApi.createSupplier(data),
    onSuccess: () => {
      // Invalidate all supplier lists to refresh data
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

/**
 * Update an existing supplier.
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSupplierData }) =>
      supplierApi.updateSupplier(id, data),
    onSuccess: (_data, { id }) => {
      // Invalidate both list and detail caches
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(id) });
    },
  });
}

/**
 * Delete a supplier (soft delete).
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => supplierApi.deleteSupplier(id),
    onSuccess: (_data, id) => {
      // Invalidate list and remove detail from cache
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      queryClient.removeQueries({ queryKey: supplierKeys.detail(id) });
    },
  });
}

// =============================================================================
// Utility Types
// =============================================================================

/** Parameters for useUpdateSupplier mutation. */
export interface UpdateSupplierParams {
  id: number;
  data: UpdateSupplierData;
}
