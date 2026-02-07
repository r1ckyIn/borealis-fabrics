/**
 * TanStack Query hooks for Logistics module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { logisticsApi } from '@/api';
import type {
  CreateLogisticsData,
  UpdateLogisticsData,
  QueryLogisticsParams,
} from '@/types';

import { orderKeys } from './useOrders';

// =============================================================================
// Query Keys
// =============================================================================

export const logisticsKeys = {
  all: ['logistics'] as const,
  lists: () => [...logisticsKeys.all, 'list'] as const,
  list: (params: QueryLogisticsParams) =>
    [...logisticsKeys.lists(), params] as const,
  details: () => [...logisticsKeys.all, 'detail'] as const,
  detail: (id: number) => [...logisticsKeys.details(), id] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of logistics entries.
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useLogisticsList(
  params?: QueryLogisticsParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: logisticsKeys.list(params ?? {}),
    queryFn: () => logisticsApi.getLogisticsList(params),
    enabled,
  });
}

/**
 * Fetch logistics entries filtered by orderItemId.
 * Convenience wrapper around useLogisticsList.
 * @param orderItemId - Order item ID to filter by
 * @param enabled - Whether to enable the query
 */
export function useLogisticsByOrderItem(
  orderItemId: number | undefined,
  enabled: boolean = true
) {
  return useLogisticsList(
    orderItemId ? { orderItemId } : undefined,
    enabled && orderItemId !== undefined
  );
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/** Create a new logistics entry. */
export function useCreateLogistics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLogisticsData) =>
      logisticsApi.createLogistics(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logisticsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

/** Update an existing logistics entry. */
export function useUpdateLogistics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLogisticsData }) =>
      logisticsApi.updateLogistics(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: logisticsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: logisticsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

/** Delete a logistics entry. */
export function useDeleteLogistics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => logisticsApi.deleteLogistics(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: logisticsKeys.lists() });
      queryClient.removeQueries({ queryKey: logisticsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// =============================================================================
// Utility Types
// =============================================================================

/** Parameters for useUpdateLogistics mutation. */
export interface UpdateLogisticsParams {
  id: number;
  data: UpdateLogisticsData;
}
