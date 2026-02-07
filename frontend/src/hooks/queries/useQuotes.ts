/**
 * TanStack Query hooks for Quote module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { quoteApi } from '@/api';
import type {
  QueryQuoteParams,
  CreateQuoteData,
  UpdateQuoteData,
} from '@/types';

// =============================================================================
// Query Keys
// =============================================================================

export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  list: (params: QueryQuoteParams) => [...quoteKeys.lists(), params] as const,
  details: () => [...quoteKeys.all, 'detail'] as const,
  detail: (id: number) => [...quoteKeys.details(), id] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of quotes.
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useQuotes(params?: QueryQuoteParams, enabled: boolean = true) {
  return useQuery({
    queryKey: quoteKeys.list(params ?? {}),
    queryFn: () => quoteApi.getQuotes(params),
    enabled,
  });
}

/**
 * Fetch a single quote by ID.
 * @param id - Quote ID
 * @param enabled - Whether to enable the query
 */
export function useQuote(id: number | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: quoteKeys.detail(id!),
    queryFn: () => quoteApi.getQuote(id!),
    enabled: enabled && id !== undefined,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Create a new quote.
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuoteData) => quoteApi.createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
  });
}

/**
 * Update an existing quote.
 */
export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuoteData }) =>
      quoteApi.updateQuote(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
    },
  });
}

/**
 * Delete a quote (soft delete).
 */
export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => quoteApi.deleteQuote(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      queryClient.removeQueries({ queryKey: quoteKeys.detail(id) });
    },
  });
}

// TODO: Replace local constant with orderKeys import from useOrders (Task 3.4)
const ORDER_CACHE_KEY = ['orders'] as const;

/**
 * Convert a quote to an order.
 */
export function useConvertQuoteToOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => quoteApi.convertQuoteToOrder(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_CACHE_KEY });
    },
  });
}

// =============================================================================
// Utility Types
// =============================================================================

/** Parameters for useUpdateQuote mutation. */
export interface UpdateQuoteParams {
  id: number;
  data: UpdateQuoteData;
}
