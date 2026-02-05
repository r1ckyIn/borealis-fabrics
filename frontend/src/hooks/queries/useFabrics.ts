/**
 * TanStack Query hooks for Fabric module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

import { fabricApi } from '@/api';
import type {
  QueryFabricParams,
  CreateFabricData,
  UpdateFabricData,
  CreateFabricSupplierData,
  UpdateFabricSupplierData,
  QueryFabricSuppliersParams,
  QueryFabricPricingParams,
  CreateFabricPricingData,
  UpdateFabricPricingData,
} from '@/types';

// =============================================================================
// Query Keys
// =============================================================================

export const fabricKeys = {
  all: ['fabrics'] as const,
  lists: () => [...fabricKeys.all, 'list'] as const,
  list: (params: QueryFabricParams) => [...fabricKeys.lists(), params] as const,
  details: () => [...fabricKeys.all, 'detail'] as const,
  detail: (id: number) => [...fabricKeys.details(), id] as const,
  suppliers: (id: number, params?: QueryFabricSuppliersParams) =>
    [...fabricKeys.detail(id), 'suppliers', params] as const,
  pricing: (id: number, params?: QueryFabricPricingParams) =>
    [...fabricKeys.detail(id), 'pricing', params] as const,
  // Base keys for invalidation (without params)
  suppliersBase: (id: number) => [...fabricKeys.detail(id), 'suppliers'] as const,
  pricingBase: (id: number) => [...fabricKeys.detail(id), 'pricing'] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of fabrics.
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useFabrics(params?: QueryFabricParams, enabled: boolean = true) {
  return useQuery({
    queryKey: fabricKeys.list(params ?? {}),
    queryFn: () => fabricApi.getFabrics(params),
    enabled,
  });
}

/**
 * Fetch a single fabric by ID.
 * @param id - Fabric ID
 * @param enabled - Whether to enable the query
 */
export function useFabric(id: number | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: fabricKeys.detail(id!),
    queryFn: () => fabricApi.getFabric(id!),
    enabled: enabled && id !== undefined,
  });
}

/**
 * Fetch suppliers associated with a fabric.
 * @param fabricId - Fabric ID
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useFabricSuppliers(
  fabricId: number | undefined,
  params?: QueryFabricSuppliersParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fabricKeys.suppliers(fabricId!, params),
    queryFn: () => fabricApi.getFabricSuppliers(fabricId!, params),
    enabled: enabled && fabricId !== undefined,
  });
}

/**
 * Fetch pricing rules for a fabric.
 * @param fabricId - Fabric ID
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useFabricPricing(
  fabricId: number | undefined,
  params?: QueryFabricPricingParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fabricKeys.pricing(fabricId!, params),
    queryFn: () => fabricApi.getFabricPricing(fabricId!, params),
    enabled: enabled && fabricId !== undefined,
  });
}

// =============================================================================
// Mutation Hooks - Basic CRUD
// =============================================================================

/**
 * Create a new fabric.
 */
export function useCreateFabric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFabricData) => fabricApi.createFabric(data),
    onSuccess: () => {
      // Invalidate all fabric lists to refresh data
      queryClient.invalidateQueries({ queryKey: fabricKeys.lists() });
    },
  });
}

/**
 * Update an existing fabric.
 */
export function useUpdateFabric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFabricData }) =>
      fabricApi.updateFabric(id, data),
    onSuccess: (_data, { id }) => {
      // Invalidate both list and detail caches
      queryClient.invalidateQueries({ queryKey: fabricKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fabricKeys.detail(id) });
    },
  });
}

/**
 * Delete a fabric (soft delete).
 */
export function useDeleteFabric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fabricApi.deleteFabric(id),
    onSuccess: (_data, id) => {
      // Invalidate list and remove detail from cache
      queryClient.invalidateQueries({ queryKey: fabricKeys.lists() });
      queryClient.removeQueries({ queryKey: fabricKeys.detail(id) });
    },
  });
}

// =============================================================================
// Mutation Hooks - Image Management
// =============================================================================

/**
 * Upload an image for a fabric with progress tracking.
 */
export function useUploadFabricImage() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const mutation = useMutation({
    mutationFn: ({
      fabricId,
      file,
      sortOrder,
    }: {
      fabricId: number;
      file: File;
      sortOrder?: number;
    }) => fabricApi.uploadFabricImage(fabricId, file, sortOrder, setUploadProgress),
    onSuccess: (_data, { fabricId }) => {
      // Invalidate fabric detail to refresh images
      queryClient.invalidateQueries({ queryKey: fabricKeys.detail(fabricId) });
      // Reset progress
      setUploadProgress(0);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  const reset = useCallback(() => {
    setUploadProgress(0);
    mutation.reset();
  }, [mutation]);

  return {
    ...mutation,
    uploadProgress,
    reset,
  };
}

/**
 * Delete a fabric image.
 */
export function useDeleteFabricImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fabricId, imageId }: { fabricId: number; imageId: number }) =>
      fabricApi.deleteFabricImage(fabricId, imageId),
    onSuccess: (_data, { fabricId }) => {
      // Invalidate fabric detail to refresh images
      queryClient.invalidateQueries({ queryKey: fabricKeys.detail(fabricId) });
    },
  });
}

// =============================================================================
// Mutation Hooks - Supplier Association
// =============================================================================

/**
 * Add a supplier to a fabric.
 */
export function useAddFabricSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fabricId,
      data,
    }: {
      fabricId: number;
      data: CreateFabricSupplierData;
    }) => fabricApi.addFabricSupplier(fabricId, data),
    onSuccess: (_data, { fabricId }) => {
      // Invalidate fabric detail and suppliers
      queryClient.invalidateQueries({ queryKey: fabricKeys.detail(fabricId) });
      queryClient.invalidateQueries({ queryKey: fabricKeys.suppliersBase(fabricId) });
    },
  });
}

/**
 * Update a fabric-supplier association.
 */
export function useUpdateFabricSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fabricId,
      supplierId,
      data,
    }: {
      fabricId: number;
      supplierId: number;
      data: UpdateFabricSupplierData;
    }) => fabricApi.updateFabricSupplier(fabricId, supplierId, data),
    onSuccess: (_data, { fabricId }) => {
      queryClient.invalidateQueries({ queryKey: fabricKeys.suppliersBase(fabricId) });
    },
  });
}

/**
 * Remove a supplier from a fabric.
 */
export function useRemoveFabricSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fabricId, supplierId }: { fabricId: number; supplierId: number }) =>
      fabricApi.removeFabricSupplier(fabricId, supplierId),
    onSuccess: (_data, { fabricId }) => {
      queryClient.invalidateQueries({ queryKey: fabricKeys.suppliersBase(fabricId) });
    },
  });
}

// =============================================================================
// Mutation Hooks - Pricing Management
// =============================================================================

/**
 * Create a customer pricing rule for a fabric.
 */
export function useCreateFabricPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fabricId,
      data,
    }: {
      fabricId: number;
      data: CreateFabricPricingData;
    }) => fabricApi.createFabricPricing(fabricId, data),
    onSuccess: (_data, { fabricId }) => {
      queryClient.invalidateQueries({ queryKey: fabricKeys.pricingBase(fabricId) });
    },
  });
}

/**
 * Update a customer pricing rule for a fabric.
 */
export function useUpdateFabricPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fabricId,
      pricingId,
      data,
    }: {
      fabricId: number;
      pricingId: number;
      data: UpdateFabricPricingData;
    }) => fabricApi.updateFabricPricing(fabricId, pricingId, data),
    onSuccess: (_data, { fabricId }) => {
      queryClient.invalidateQueries({ queryKey: fabricKeys.pricingBase(fabricId) });
    },
  });
}

/**
 * Delete a customer pricing rule for a fabric.
 */
export function useDeleteFabricPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fabricId, pricingId }: { fabricId: number; pricingId: number }) =>
      fabricApi.deleteFabricPricing(fabricId, pricingId),
    onSuccess: (_data, { fabricId }) => {
      queryClient.invalidateQueries({ queryKey: fabricKeys.pricingBase(fabricId) });
    },
  });
}

// =============================================================================
// Utility Types
// =============================================================================

/** Parameters for useUpdateFabric mutation. */
export interface UpdateFabricParams {
  id: number;
  data: UpdateFabricData;
}

/** Parameters for useUploadFabricImage mutation. */
export interface UploadFabricImageParams {
  fabricId: number;
  file: File;
  sortOrder?: number;
}

/** Parameters for useDeleteFabricImage mutation. */
export interface DeleteFabricImageParams {
  fabricId: number;
  imageId: number;
}

/** Parameters for useAddFabricSupplier mutation. */
export interface AddFabricSupplierParams {
  fabricId: number;
  data: CreateFabricSupplierData;
}

/** Parameters for useUpdateFabricSupplier mutation. */
export interface UpdateFabricSupplierParams {
  fabricId: number;
  supplierId: number;
  data: UpdateFabricSupplierData;
}

/** Parameters for useRemoveFabricSupplier mutation. */
export interface RemoveFabricSupplierParams {
  fabricId: number;
  supplierId: number;
}

/** Parameters for useCreateFabricPricing mutation. */
export interface CreateFabricPricingParams {
  fabricId: number;
  data: CreateFabricPricingData;
}

/** Parameters for useUpdateFabricPricing mutation. */
export interface UpdateFabricPricingParams {
  fabricId: number;
  pricingId: number;
  data: UpdateFabricPricingData;
}

/** Parameters for useDeleteFabricPricing mutation. */
export interface DeleteFabricPricingParams {
  fabricId: number;
  pricingId: number;
}
