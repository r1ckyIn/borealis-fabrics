/**
 * Product API endpoints.
 */

import type {
  PaginatedResult,
  Product,
  ProductSupplier,
  ProductPricing,
  QueryProductParams,
  CreateProductData,
  UpdateProductData,
  CreateProductSupplierData,
  UpdateProductSupplierData,
  QueryProductSuppliersParams,
  CreateProductPricingData,
  UpdateProductPricingData,
  QueryProductPricingParams,
} from '@/types';

import { get, post, patch, del } from './client';

// =============================================================================
// Basic CRUD
// =============================================================================

/** Get paginated list of products. */
export function getProducts(
  params?: QueryProductParams
): Promise<PaginatedResult<Product>> {
  return get<PaginatedResult<Product>>('/products', params);
}

/** Get a single product by ID. */
export function getProduct(id: number): Promise<Product> {
  return get<Product>(`/products/${id}`);
}

/** Create a new product. */
export function createProduct(data: CreateProductData): Promise<Product> {
  return post<Product>('/products', data);
}

/** Update an existing product. */
export function updateProduct(
  id: number,
  data: UpdateProductData
): Promise<Product> {
  return patch<Product>(`/products/${id}`, data);
}

/** Delete a product (soft delete). */
export function deleteProduct(id: number, force?: boolean): Promise<void> {
  const url = force ? `/products/${id}?force=true` : `/products/${id}`;
  return del<void>(url);
}

// =============================================================================
// Supplier Association
// =============================================================================

/** Get suppliers associated with a product. */
export function getProductSuppliers(
  productId: number,
  params?: QueryProductSuppliersParams
): Promise<PaginatedResult<ProductSupplier>> {
  return get<PaginatedResult<ProductSupplier>>(
    `/products/${productId}/suppliers`,
    params
  );
}

/** Add a supplier to a product. */
export function addProductSupplier(
  productId: number,
  data: CreateProductSupplierData
): Promise<ProductSupplier> {
  return post<ProductSupplier>(`/products/${productId}/suppliers`, data);
}

/** Update a product-supplier association. */
export function updateProductSupplier(
  productId: number,
  supplierId: number,
  data: UpdateProductSupplierData
): Promise<ProductSupplier> {
  return patch<ProductSupplier>(
    `/products/${productId}/suppliers/${supplierId}`,
    data
  );
}

/** Remove a supplier from a product. */
export function removeProductSupplier(
  productId: number,
  supplierId: number
): Promise<void> {
  return del<void>(`/products/${productId}/suppliers/${supplierId}`);
}

// =============================================================================
// Pricing Management
// =============================================================================

/** Get customer pricing rules for a product. */
export function getProductPricing(
  productId: number,
  params?: QueryProductPricingParams
): Promise<PaginatedResult<ProductPricing>> {
  return get<PaginatedResult<ProductPricing>>(
    `/products/${productId}/pricing`,
    params
  );
}

/** Create a customer pricing rule for a product. */
export function createProductPricing(
  productId: number,
  data: CreateProductPricingData
): Promise<ProductPricing> {
  return post<ProductPricing>(`/products/${productId}/pricing`, data);
}

/** Update a customer pricing rule for a product. */
export function updateProductPricing(
  productId: number,
  pricingId: number,
  data: UpdateProductPricingData
): Promise<ProductPricing> {
  return patch<ProductPricing>(
    `/products/${productId}/pricing/${pricingId}`,
    data
  );
}

/** Delete a customer pricing rule for a product. */
export function deleteProductPricing(
  productId: number,
  pricingId: number
): Promise<void> {
  return del<void>(`/products/${productId}/pricing/${pricingId}`);
}

export const productApi = {
  // Basic CRUD
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  // Supplier Association
  getProductSuppliers,
  addProductSupplier,
  updateProductSupplier,
  removeProductSupplier,
  // Pricing Management
  getProductPricing,
  createProductPricing,
  updateProductPricing,
  deleteProductPricing,
};
