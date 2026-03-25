/**
 * TanStack Query hooks for Product module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { productApi } from '@/api';
import type {
  QueryProductParams,
  CreateProductData,
  UpdateProductData,
} from '@/types';

// =============================================================================
// Query Keys
// =============================================================================

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: QueryProductParams) =>
    [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of products.
 * @param params - Query parameters (pagination, filters, subCategory)
 * @param enabled - Whether to enable the query
 */
export function useProducts(
  params?: QueryProductParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: productKeys.list(params ?? {}),
    queryFn: () => productApi.getProducts(params),
    enabled,
  });
}

/**
 * Fetch a single product by ID.
 * @param id - Product ID
 * @param enabled - Whether to enable the query
 */
export function useProduct(
  id: number | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: productKeys.detail(id!),
    queryFn: () => productApi.getProduct(id!),
    enabled: enabled && id !== undefined,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/** Create a new product. */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductData) => productApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

/** Update an existing product. */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductData }) =>
      productApi.updateProduct(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

/** Delete a product (soft delete). */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productApi.deleteProduct(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });
    },
  });
}
