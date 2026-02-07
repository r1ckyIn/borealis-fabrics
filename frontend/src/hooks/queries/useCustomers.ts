/**
 * TanStack Query hooks for Customer module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { customerApi } from '@/api';
import type {
  QueryCustomerParams,
  CreateCustomerData,
  UpdateCustomerData,
  CreateCustomerPricingData,
  UpdateCustomerPricingData,
  QueryCustomerOrdersParams,
} from '@/types';

// =============================================================================
// Query Keys
// =============================================================================

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params: QueryCustomerParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
  pricing: (id: number) => [...customerKeys.detail(id), 'pricing'] as const,
  orders: (id: number, params?: QueryCustomerOrdersParams) =>
    [...customerKeys.detail(id), 'orders', params] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of customers.
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useCustomers(params?: QueryCustomerParams, enabled: boolean = true) {
  return useQuery({
    queryKey: customerKeys.list(params ?? {}),
    queryFn: () => customerApi.getCustomers(params),
    enabled,
  });
}

/**
 * Fetch a single customer by ID.
 * @param id - Customer ID
 * @param enabled - Whether to enable the query
 */
export function useCustomer(id: number | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: customerKeys.detail(id!),
    queryFn: () => customerApi.getCustomer(id!),
    enabled: enabled && id !== undefined,
  });
}

/**
 * Fetch pricing rules for a customer.
 * @param customerId - Customer ID
 * @param enabled - Whether to enable the query
 */
export function useCustomerPricing(customerId: number | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: customerKeys.pricing(customerId!),
    queryFn: () => customerApi.getCustomerPricing(customerId!),
    enabled: enabled && customerId !== undefined,
  });
}

/**
 * Fetch orders for a customer.
 * @param customerId - Customer ID
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useCustomerOrders(
  customerId: number | undefined,
  params?: QueryCustomerOrdersParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: customerKeys.orders(customerId!, params),
    queryFn: () => customerApi.getCustomerOrders(customerId!, params),
    enabled: enabled && customerId !== undefined,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Create a new customer.
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerData) => customerApi.createCustomer(data),
    onSuccess: () => {
      // Invalidate all customer lists to refresh data
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Update an existing customer.
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerData }) =>
      customerApi.updateCustomer(id, data),
    onSuccess: (_data, { id }) => {
      // Invalidate both list and detail caches
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}

/**
 * Delete a customer (soft delete).
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerApi.deleteCustomer(id),
    onSuccess: (_data, id) => {
      // Invalidate list and remove detail from cache
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.removeQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}

// =============================================================================
// Pricing Mutation Hooks
// =============================================================================

/**
 * Create a pricing rule for a customer.
 */
export function useCreateCustomerPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      data,
    }: {
      customerId: number;
      data: CreateCustomerPricingData;
    }) => customerApi.createCustomerPricing(customerId, data),
    onSuccess: (_data, { customerId }) => {
      // Invalidate pricing cache for this customer
      queryClient.invalidateQueries({ queryKey: customerKeys.pricing(customerId) });
      // Also invalidate customer detail in case pricing affects it
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
    },
  });
}

/**
 * Update a pricing rule for a customer.
 */
export function useUpdateCustomerPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      pricingId,
      data,
    }: {
      customerId: number;
      pricingId: number;
      data: UpdateCustomerPricingData;
    }) => customerApi.updateCustomerPricing(customerId, pricingId, data),
    onSuccess: (_data, { customerId }) => {
      // Invalidate pricing cache for this customer
      queryClient.invalidateQueries({ queryKey: customerKeys.pricing(customerId) });
    },
  });
}

/**
 * Delete a pricing rule for a customer.
 */
export function useDeleteCustomerPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, pricingId }: { customerId: number; pricingId: number }) =>
      customerApi.deleteCustomerPricing(customerId, pricingId),
    onSuccess: (_data, { customerId }) => {
      // Invalidate pricing cache for this customer
      queryClient.invalidateQueries({ queryKey: customerKeys.pricing(customerId) });
    },
  });
}

// =============================================================================
// Utility Types
// =============================================================================

/** Parameters for useUpdateCustomer mutation. */
export interface UpdateCustomerParams {
  id: number;
  data: UpdateCustomerData;
}

/** Parameters for useCreateCustomerPricing mutation. */
export interface CreateCustomerPricingParams {
  customerId: number;
  data: CreateCustomerPricingData;
}

/** Parameters for useUpdateCustomerPricing mutation. */
export interface UpdateCustomerPricingParams {
  customerId: number;
  pricingId: number;
  data: UpdateCustomerPricingData;
}

/** Parameters for useDeleteCustomerPricing mutation. */
export interface DeleteCustomerPricingParams {
  customerId: number;
  pricingId: number;
}
