/**
 * Supplier API endpoints.
 */

import type {
  PaginatedResult,
  Supplier,
  FabricSupplier,
  QuerySupplierParams,
  CreateSupplierData,
  UpdateSupplierData,
  QuerySupplierFabricsParams,
} from '@/types';

import { get, post, patch, del } from './client';

/** Get paginated list of suppliers. */
export function getSuppliers(
  params?: QuerySupplierParams
): Promise<PaginatedResult<Supplier>> {
  return get<PaginatedResult<Supplier>>('/suppliers', params);
}

/** Get a single supplier by ID. */
export function getSupplier(id: number): Promise<Supplier> {
  return get<Supplier>(`/suppliers/${id}`);
}

/** Create a new supplier. */
export function createSupplier(data: CreateSupplierData): Promise<Supplier> {
  return post<Supplier>('/suppliers', data);
}

/** Update an existing supplier. */
export function updateSupplier(
  id: number,
  data: UpdateSupplierData
): Promise<Supplier> {
  return patch<Supplier>(`/suppliers/${id}`, data);
}

/** Delete a supplier (soft delete). */
export function deleteSupplier(id: number): Promise<void> {
  return del<void>(`/suppliers/${id}`);
}

/** Get fabrics associated with a supplier. */
export function getSupplierFabrics(
  id: number,
  params?: QuerySupplierFabricsParams
): Promise<PaginatedResult<FabricSupplier>> {
  return get<PaginatedResult<FabricSupplier>>(`/suppliers/${id}/fabrics`, params);
}

export const supplierApi = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierFabrics,
};
