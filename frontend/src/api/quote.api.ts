/**
 * Quote API endpoints.
 * Updated for Phase 7 multi-item model (QuoteItem).
 */

import type {
  PaginatedResult,
  Quote,
  QuoteItem,
  Order,
  QueryQuoteParams,
  CreateQuoteData,
  UpdateQuoteData,
  AddQuoteItemData,
  UpdateQuoteItemData,
  ConvertQuoteItemsData,
} from '@/types';

import { get, post, patch, del } from './client';

// =============================================================================
// Quote CRUD
// =============================================================================

/** Get paginated list of quotes. */
export function getQuotes(
  params?: QueryQuoteParams
): Promise<PaginatedResult<Quote>> {
  return get<PaginatedResult<Quote>>('/quotes', params);
}

/** Get a single quote by ID (includes items). */
export function getQuote(id: number): Promise<Quote> {
  return get<Quote>(`/quotes/${id}`);
}

/** Create a new quote with items. */
export function createQuote(data: CreateQuoteData): Promise<Quote> {
  return post<Quote>('/quotes', data);
}

/** Update quote header (validUntil, notes only). */
export function updateQuote(
  id: number,
  data: UpdateQuoteData
): Promise<Quote> {
  return patch<Quote>(`/quotes/${id}`, data);
}

/** Delete a quote (hard delete). */
export function deleteQuote(id: number): Promise<void> {
  return del<void>(`/quotes/${id}`);
}

// =============================================================================
// Quote Item Management
// =============================================================================

/** Add an item to an existing quote. */
export function addQuoteItem(
  quoteId: number,
  data: AddQuoteItemData
): Promise<QuoteItem> {
  return post<QuoteItem>(`/quotes/${quoteId}/items`, data);
}

/** Update an existing quote item. */
export function updateQuoteItem(
  quoteId: number,
  itemId: number,
  data: UpdateQuoteItemData
): Promise<QuoteItem> {
  return patch<QuoteItem>(`/quotes/${quoteId}/items/${itemId}`, data);
}

/** Delete a quote item. */
export function deleteQuoteItem(
  quoteId: number,
  itemId: number
): Promise<void> {
  return del<void>(`/quotes/${quoteId}/items/${itemId}`);
}

// =============================================================================
// Quote Conversion
// =============================================================================

/** Convert selected quote items to an order (partial or full). */
export function convertQuoteItems(data: ConvertQuoteItemsData): Promise<Order> {
  return post<Order>('/quotes/convert-items', data);
}

export const quoteApi = {
  // Quote CRUD
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  // Quote Item Management
  addQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
  // Conversion
  convertQuoteItems,
};
