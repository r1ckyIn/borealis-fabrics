/**
 * API response types for Borealis Fabrics frontend.
 */

/** Standard API response wrapper. */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/** API error response. */
export interface ApiError {
  code: number;
  message: string;
  data: null;
}

/** Pagination metadata. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Paginated result wrapper. */
export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Pagination query parameters. */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** User information in auth responses. */
export interface AuthUser {
  id: number;
  weworkId: string;
  name: string;
  avatar?: string;
  mobile?: string;
  createdAt: string;
  updatedAt: string;
}

/** Login response data. */
export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/** Logout response data. */
export interface LogoutResponse {
  message: string;
}

/** Single enum definition from /system/enums endpoint. */
export interface EnumDefinition {
  values: string[];
  labels: Record<string, string>;
}

/** Response from GET /system/enums endpoint. */
export interface SystemEnumsResponse {
  orderItemStatus: EnumDefinition;
  customerPayStatus: EnumDefinition;
  paymentMethod: EnumDefinition;
  quoteStatus: EnumDefinition;
  supplierStatus: EnumDefinition;
  settleType: EnumDefinition;
}

/** Health check response. */
export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

/** Import result for Excel import operations. */
export interface ImportResult {
  successCount: number;
  failureCount: number;
  failures: ImportFailure[];
}

/** Individual import failure detail. */
export interface ImportFailure {
  rowNumber: number;
  identifier: string;
  reason: string;
}
