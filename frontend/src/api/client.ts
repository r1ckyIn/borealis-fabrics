/**
 * Axios client instance with interceptors for Borealis Fabrics.
 */

import axios from 'axios';
import type {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import type { ApiError, ApiResponse } from '@/types';
import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from '@/utils/constants';

/** Create axios instance with default configuration. */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor: Add JWT token to Authorization header.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Unwrap ApiResponse and handle errors.
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    // Unwrap the data field from ApiResponse wrapper
    return response.data.data as AxiosResponse;
  },
  (error: AxiosError<ApiError>) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Log error for debugging
    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    // Transform error for consistent handling
    const apiError: ApiError = {
      code: error.response?.data?.code ?? error.response?.status ?? 500,
      message: error.response?.data?.message ?? error.message ?? 'Unknown error',
      data: null,
    };

    return Promise.reject(apiError);
  }
);

export default apiClient;

/**
 * Type-safe GET request helper.
 */
export async function get<T>(url: string, params?: object): Promise<T> {
  return apiClient.get(url, { params }) as Promise<T>;
}

/**
 * Type-safe POST request helper.
 */
export async function post<T>(url: string, data?: object): Promise<T> {
  return apiClient.post(url, data) as Promise<T>;
}

/**
 * Type-safe PUT request helper.
 */
export async function put<T>(url: string, data?: object): Promise<T> {
  return apiClient.put(url, data) as Promise<T>;
}

/**
 * Type-safe PATCH request helper.
 */
export async function patch<T>(url: string, data?: object): Promise<T> {
  return apiClient.patch(url, data) as Promise<T>;
}

/**
 * Type-safe DELETE request helper.
 */
export async function del<T>(url: string): Promise<T> {
  return apiClient.delete(url) as Promise<T>;
}
