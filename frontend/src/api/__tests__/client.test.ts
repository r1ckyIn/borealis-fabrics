/**
 * Tests for API client interceptors and helpers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES, STORAGE_KEYS } from '@/utils/constants';

// Mock axios before importing client
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: {
      baseURL: '/api',
    },
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

describe('API Client', () => {
  let requestInterceptor: (config: { headers: Record<string, string> }) => unknown;
  let responseSuccessInterceptor: (response: { data: { data: unknown } }) => unknown;
  let responseErrorInterceptor: (error: unknown) => unknown;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();

    // Import axios and capture interceptors
    const axios = await import('axios');
    const mockCreate = axios.default.create as ReturnType<typeof vi.fn>;
    mockCreate.mockClear();

    // Re-import client to trigger interceptor registration
    await import('../client');

    const instance = mockCreate.mock.results[0]?.value;
    if (instance) {
      const requestUse = instance.interceptors.request.use;
      const responseUse = instance.interceptors.response.use;

      if (requestUse.mock.calls[0]) {
        requestInterceptor = requestUse.mock.calls[0][0];
      }
      if (responseUse.mock.calls[0]) {
        responseSuccessInterceptor = responseUse.mock.calls[0][0];
        responseErrorInterceptor = responseUse.mock.calls[0][1];
      }
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header when token exists', () => {
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'test-token');

      const config = { headers: {} as Record<string, string> };
      const result = requestInterceptor(config);

      expect(result).toEqual({
        headers: { Authorization: 'Bearer test-token' },
      });
    });

    it('should not add Authorization header when token is missing', () => {
      const config = { headers: {} as Record<string, string> };
      const result = requestInterceptor(config);

      expect(result).toEqual({ headers: {} });
    });
  });

  describe('Response Interceptor', () => {
    it('should unwrap ApiResponse data on success', () => {
      const response = {
        data: {
          code: 0,
          message: 'success',
          data: { id: 1, name: 'test' },
        },
      };

      const result = responseSuccessInterceptor(response);

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('should handle null data in ApiResponse', () => {
      const response = {
        data: {
          code: 0,
          message: 'success',
          data: null,
        },
      };

      const result = responseSuccessInterceptor(response);

      expect(result).toBeNull();
    });
  });

  describe('Error Interceptor', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/dashboard',
          href: '',
        },
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should clear storage and redirect on 401 error', async () => {
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'old-token');
      localStorage.setItem(STORAGE_KEYS.USER, 'user-data');

      // Reset redirect flag
      const { resetRedirectFlag } = await import('../client');
      resetRedirectFlag();

      const error = {
        response: {
          status: 401,
          data: { code: 401, message: 'Unauthorized', data: null },
        },
        config: { url: '/test' },
        message: 'Request failed',
      };

      await expect(responseErrorInterceptor(error)).rejects.toEqual({
        code: 401,
        message: 'Unauthorized',
        data: null,
      });

      expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
      expect(window.location.href).toBe(ROUTES.LOGIN);
    });

    it('should not redirect if already on login page', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/login',
          href: '',
        },
        writable: true,
      });

      const { resetRedirectFlag } = await import('../client');
      resetRedirectFlag();

      const error = {
        response: {
          status: 401,
          data: { code: 401, message: 'Unauthorized', data: null },
        },
        config: { url: '/test' },
        message: 'Request failed',
      };

      await expect(responseErrorInterceptor(error)).rejects.toBeDefined();

      expect(window.location.href).toBe('');
    });

    it('should transform error to ApiError format', async () => {
      const error = {
        response: {
          status: 500,
          data: { code: 5001, message: 'Server Error', data: null },
        },
        config: { url: '/test' },
        message: 'Request failed',
      };

      await expect(responseErrorInterceptor(error)).rejects.toEqual({
        code: 5001,
        message: 'Server Error',
        data: null,
      });
    });

    it('should use status code when error code is missing', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not Found' },
        },
        config: { url: '/test' },
        message: 'Request failed',
      };

      await expect(responseErrorInterceptor(error)).rejects.toEqual({
        code: 404,
        message: 'Not Found',
        data: null,
      });
    });

    it('should handle network errors without response', async () => {
      const error = {
        config: { url: '/test' },
        message: 'Network Error',
      };

      await expect(responseErrorInterceptor(error)).rejects.toEqual({
        code: 500,
        message: 'Network Error',
        data: null,
      });
    });
  });
});
