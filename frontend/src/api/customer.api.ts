/**
 * Customer API endpoints.
 */

import type {
  PaginatedResult,
  Customer,
  CustomerPricing,
  Order,
  QueryCustomerParams,
  CreateCustomerData,
  UpdateCustomerData,
  CreateCustomerPricingData,
  UpdateCustomerPricingData,
  QueryCustomerOrdersParams,
} from '@/types';

import { get, post, patch, del } from './client';

/** Get paginated list of customers. */
export function getCustomers(
  params?: QueryCustomerParams
): Promise<PaginatedResult<Customer>> {
  return get<PaginatedResult<Customer>>('/customers', params);
}

/** Get a single customer by ID. */
export function getCustomer(id: number): Promise<Customer> {
  return get<Customer>(`/customers/${id}`);
}

/** Create a new customer. */
export function createCustomer(data: CreateCustomerData): Promise<Customer> {
  return post<Customer>('/customers', data);
}

/** Update an existing customer. */
export function updateCustomer(
  id: number,
  data: UpdateCustomerData
): Promise<Customer> {
  return patch<Customer>(`/customers/${id}`, data);
}

/** Delete a customer (soft delete). */
export function deleteCustomer(id: number): Promise<void> {
  return del<void>(`/customers/${id}`);
}

/** Get pricing rules for a specific customer. */
export function getCustomerPricing(id: number): Promise<CustomerPricing[]> {
  return get<CustomerPricing[]>(`/customers/${id}/pricing`);
}

/** Create a new pricing rule for a customer. */
export function createCustomerPricing(
  customerId: number,
  data: CreateCustomerPricingData
): Promise<CustomerPricing> {
  return post<CustomerPricing>(`/customers/${customerId}/pricing`, data);
}

/** Update an existing pricing rule for a customer. */
export function updateCustomerPricing(
  customerId: number,
  pricingId: number,
  data: UpdateCustomerPricingData
): Promise<CustomerPricing> {
  return patch<CustomerPricing>(
    `/customers/${customerId}/pricing/${pricingId}`,
    data
  );
}

/** Delete a pricing rule for a customer. */
export function deleteCustomerPricing(
  customerId: number,
  pricingId: number
): Promise<void> {
  return del<void>(`/customers/${customerId}/pricing/${pricingId}`);
}

/** Get orders for a specific customer. */
export function getCustomerOrders(
  customerId: number,
  params?: QueryCustomerOrdersParams
): Promise<PaginatedResult<Order>> {
  return get<PaginatedResult<Order>>(`/customers/${customerId}/orders`, params);
}

export const customerApi = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerPricing,
  createCustomerPricing,
  updateCustomerPricing,
  deleteCustomerPricing,
  getCustomerOrders,
};
