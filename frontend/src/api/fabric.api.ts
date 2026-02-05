/**
 * Fabric API endpoints.
 */

import type {
  PaginatedResult,
  Fabric,
  FabricImage,
  FabricSupplier,
  CustomerPricing,
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

import apiClient, { get, post, patch, del } from './client';

// =============================================================================
// Basic CRUD
// =============================================================================

/** Get paginated list of fabrics. */
export function getFabrics(
  params?: QueryFabricParams
): Promise<PaginatedResult<Fabric>> {
  return get<PaginatedResult<Fabric>>('/fabrics', params);
}

/** Get a single fabric by ID. */
export function getFabric(id: number): Promise<Fabric> {
  return get<Fabric>(`/fabrics/${id}`);
}

/** Create a new fabric. */
export function createFabric(data: CreateFabricData): Promise<Fabric> {
  return post<Fabric>('/fabrics', data);
}

/** Update an existing fabric. */
export function updateFabric(
  id: number,
  data: UpdateFabricData
): Promise<Fabric> {
  return patch<Fabric>(`/fabrics/${id}`, data);
}

/** Delete a fabric (soft delete). */
export function deleteFabric(id: number): Promise<void> {
  return del<void>(`/fabrics/${id}`);
}

// =============================================================================
// Image Management
// =============================================================================

/**
 * Upload an image for a fabric.
 * @param fabricId - The fabric ID
 * @param file - The image file to upload
 * @param sortOrder - Optional sort order for the image
 * @param onProgress - Optional progress callback (0-100)
 * @returns The created fabric image
 */
export async function uploadFabricImage(
  fabricId: number,
  file: File,
  sortOrder?: number,
  onProgress?: (percent: number) => void
): Promise<FabricImage> {
  const formData = new FormData();
  formData.append('file', file);
  if (sortOrder !== undefined) {
    formData.append('sortOrder', String(sortOrder));
  }

  const response = await apiClient.post<FabricImage>(
    `/fabrics/${fabricId}/images`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percent);
        }
      },
    }
  );

  // Response interceptor unwraps ApiResponse, so we cast directly
  return response as unknown as FabricImage;
}

/** Delete a fabric image. */
export function deleteFabricImage(
  fabricId: number,
  imageId: number
): Promise<void> {
  return del<void>(`/fabrics/${fabricId}/images/${imageId}`);
}

// =============================================================================
// Supplier Association
// =============================================================================

/** Get suppliers associated with a fabric. */
export function getFabricSuppliers(
  fabricId: number,
  params?: QueryFabricSuppliersParams
): Promise<PaginatedResult<FabricSupplier>> {
  return get<PaginatedResult<FabricSupplier>>(
    `/fabrics/${fabricId}/suppliers`,
    params
  );
}

/** Add a supplier to a fabric. */
export function addFabricSupplier(
  fabricId: number,
  data: CreateFabricSupplierData
): Promise<FabricSupplier> {
  return post<FabricSupplier>(`/fabrics/${fabricId}/suppliers`, data);
}

/** Update a fabric-supplier association. */
export function updateFabricSupplier(
  fabricId: number,
  supplierId: number,
  data: UpdateFabricSupplierData
): Promise<FabricSupplier> {
  return patch<FabricSupplier>(
    `/fabrics/${fabricId}/suppliers/${supplierId}`,
    data
  );
}

/** Remove a supplier from a fabric. */
export function removeFabricSupplier(
  fabricId: number,
  supplierId: number
): Promise<void> {
  return del<void>(`/fabrics/${fabricId}/suppliers/${supplierId}`);
}

// =============================================================================
// Pricing Management
// =============================================================================

/** Get customer pricing rules for a fabric. */
export function getFabricPricing(
  fabricId: number,
  params?: QueryFabricPricingParams
): Promise<PaginatedResult<CustomerPricing>> {
  return get<PaginatedResult<CustomerPricing>>(
    `/fabrics/${fabricId}/pricing`,
    params
  );
}

/** Create a customer pricing rule for a fabric. */
export function createFabricPricing(
  fabricId: number,
  data: CreateFabricPricingData
): Promise<CustomerPricing> {
  return post<CustomerPricing>(`/fabrics/${fabricId}/pricing`, data);
}

/** Update a customer pricing rule for a fabric. */
export function updateFabricPricing(
  fabricId: number,
  pricingId: number,
  data: UpdateFabricPricingData
): Promise<CustomerPricing> {
  return patch<CustomerPricing>(
    `/fabrics/${fabricId}/pricing/${pricingId}`,
    data
  );
}

/** Delete a customer pricing rule for a fabric. */
export function deleteFabricPricing(
  fabricId: number,
  pricingId: number
): Promise<void> {
  return del<void>(`/fabrics/${fabricId}/pricing/${pricingId}`);
}

export const fabricApi = {
  // Basic CRUD
  getFabrics,
  getFabric,
  createFabric,
  updateFabric,
  deleteFabric,
  // Image Management
  uploadFabricImage,
  deleteFabricImage,
  // Supplier Association
  getFabricSuppliers,
  addFabricSupplier,
  updateFabricSupplier,
  removeFabricSupplier,
  // Pricing Management
  getFabricPricing,
  createFabricPricing,
  updateFabricPricing,
  deleteFabricPricing,
};
