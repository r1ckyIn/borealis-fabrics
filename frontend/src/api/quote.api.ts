/**
 * Quote API endpoints.
 */

import type {
  PaginatedResult,
  Quote,
  Order,
  QueryQuoteParams,
  CreateQuoteData,
  UpdateQuoteData,
} from '@/types';

import { get, post, patch, del } from './client';

/** Get paginated list of quotes. */
export function getQuotes(
  params?: QueryQuoteParams
): Promise<PaginatedResult<Quote>> {
  return get<PaginatedResult<Quote>>('/quotes', params);
}

/** Get a single quote by ID. */
export function getQuote(id: number): Promise<Quote> {
  return get<Quote>(`/quotes/${id}`);
}

/** Create a new quote. */
export function createQuote(data: CreateQuoteData): Promise<Quote> {
  return post<Quote>('/quotes', data);
}

/** Update an existing quote. */
export function updateQuote(
  id: number,
  data: UpdateQuoteData
): Promise<Quote> {
  return patch<Quote>(`/quotes/${id}`, data);
}

/** Delete a quote (soft delete). */
export function deleteQuote(id: number): Promise<void> {
  return del<void>(`/quotes/${id}`);
}

/** Convert a quote to an order. */
export function convertQuoteToOrder(id: number): Promise<Order> {
  return post<Order>(`/quotes/${id}/convert-to-order`);
}

/** Batch convert multiple quotes to a single order. */
export function batchConvertQuotes(quoteIds: number[]): Promise<Order> {
  return post<Order>('/quotes/batch-convert', { quoteIds });
}

export const quoteApi = {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  convertQuoteToOrder,
  batchConvertQuotes,
};
