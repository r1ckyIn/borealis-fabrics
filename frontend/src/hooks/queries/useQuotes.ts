/**
 * TanStack Query hooks for Quote module.
 * Updated for Phase 7 multi-item model (QuoteItem).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { quoteApi } from '@/api';
import type {
  QueryQuoteParams,
  CreateQuoteData,
  UpdateQuoteData,
  AddQuoteItemData,
  UpdateQuoteItemData,
  ConvertQuoteItemsData,
} from '@/types';

import { orderKeys } from './useOrders';

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
 * Fetch a single quote by ID (includes items).
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
// Mutation Hooks - Quote CRUD
// =============================================================================

/** Create a new quote with items. */
export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuoteData) => quoteApi.createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
  });
}

/** Update quote header (validUntil, notes only). */
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

/** Delete a quote. */
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

// =============================================================================
// Mutation Hooks - Quote Item Management
// =============================================================================

/** Add an item to an existing quote. */
export function useAddQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quoteId,
      data,
    }: {
      quoteId: number;
      data: AddQuoteItemData;
    }) => quoteApi.addQuoteItem(quoteId, data),
    onSuccess: (_data, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(quoteId) });
    },
  });
}

/** Update a quote item. */
export function useUpdateQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quoteId,
      itemId,
      data,
    }: {
      quoteId: number;
      itemId: number;
      data: UpdateQuoteItemData;
    }) => quoteApi.updateQuoteItem(quoteId, itemId, data),
    onSuccess: (_data, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(quoteId) });
    },
  });
}

/** Delete a quote item. */
export function useDeleteQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quoteId,
      itemId,
    }: {
      quoteId: number;
      itemId: number;
    }) => quoteApi.deleteQuoteItem(quoteId, itemId),
    onSuccess: (_data, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(quoteId) });
    },
  });
}

// =============================================================================
// Mutation Hooks - Quote Conversion
// =============================================================================

/** Convert selected quote items to an order. */
export function useConvertQuoteItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConvertQuoteItemsData) =>
      quoteApi.convertQuoteItems(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quoteKeys.details() });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
