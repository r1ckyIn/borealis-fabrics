/**
 * Axios client instance with interceptors.
 *
 * Uses HttpOnly cookies for authentication (withCredentials: true).
 * No token is stored or managed client-side.
 */

import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';

import type { ApiError, ApiResponse } from '@/types';
import { API_BASE_URL, API_TIMEOUT, ROUTES } from '@/utils/constants';

/** Flag to prevent multiple 401 redirects. */
let isRedirecting = false;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/** Response interceptor: Unwrap ApiResponse and handle errors. */
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    // Blob responses (e.g. file downloads) are not wrapped in ApiResponse
    if (response.config?.responseType === 'blob') {
      return response.data as unknown as AxiosResponse;
    }
    return response.data.data as unknown as AxiosResponse;
  },
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      if (!window.location.pathname.includes(ROUTES.LOGIN)) {
        window.location.href = ROUTES.LOGIN;
      }
    }

    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    const apiError: ApiError = {
      code: error.response?.data?.code ?? error.response?.status ?? 500,
      message: error.response?.data?.message ?? error.message ?? 'Unknown error',
      data: null,
    };

    return Promise.reject(apiError);
  }
);

export default apiClient;

// Type-safe request helpers
export function get<T>(url: string, params?: object): Promise<T> {
  return apiClient.get(url, { params }) as unknown as Promise<T>;
}

export function post<T>(url: string, data?: object): Promise<T> {
  return apiClient.post(url, data) as unknown as Promise<T>;
}

export function put<T>(url: string, data?: object): Promise<T> {
  return apiClient.put(url, data) as unknown as Promise<T>;
}

export function patch<T>(url: string, data?: object): Promise<T> {
  return apiClient.patch(url, data) as unknown as Promise<T>;
}

export function del<T>(url: string): Promise<T> {
  return apiClient.delete(url) as unknown as Promise<T>;
}

/** Reset redirect flag for testing. */
export function resetRedirectFlag(): void {
  isRedirecting = false;
}
