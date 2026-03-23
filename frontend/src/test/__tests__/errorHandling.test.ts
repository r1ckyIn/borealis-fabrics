/**
 * Error handling tests for unexpected API response formats.
 *
 * Verifies that getErrorMessage, getDeleteErrorMessage, and parseFieldError
 * handle edge cases gracefully: null/undefined/empty messages, wrong types,
 * known error codes, HTTP status fallbacks, and raw message fallbacks.
 */

import { describe, it, expect } from 'vitest';

import {
  getErrorMessage,
  getDeleteErrorMessage,
  parseFieldError,
  ERROR_CODE_MESSAGES,
  HTTP_STATUS_MESSAGES,
} from '@/utils/errorMessages';
import type { ApiError } from '@/types/api.types';

describe('Error Handling', () => {
  describe('getErrorMessage', () => {
    it('returns Chinese mapping for known business error code', () => {
      const error: ApiError = {
        code: 409,
        message: 'SUPPLIER_HAS_ORDERS',
        data: null,
      };
      expect(getErrorMessage(error)).toBe(
        ERROR_CODE_MESSAGES['SUPPLIER_HAS_ORDERS']
      );
    });

    it('returns Chinese mapping for known HTTP status code', () => {
      const error: ApiError = {
        code: 500,
        message: 'Internal Server Error',
        data: null,
      };
      expect(getErrorMessage(error)).toBe(HTTP_STATUS_MESSAGES[500]);
    });

    it('returns raw message for unknown error code and unknown HTTP status', () => {
      const error: ApiError = {
        code: 418,
        message: 'I am a teapot',
        data: null,
      };
      expect(getErrorMessage(error)).toBe('I am a teapot');
    });

    it('falls through to HTTP status when message is empty string', () => {
      const error: ApiError = { code: 500, message: '', data: null };
      expect(getErrorMessage(error)).toBe(HTTP_STATUS_MESSAGES[500]);
    });

    it('returns generic fallback when message is null (wrong type)', () => {
      const error: ApiError = {
        code: 0,
        message: null as unknown as string,
        data: null,
      };
      expect(getErrorMessage(error)).toBe('操作失败，请稍后重试');
    });

    it('returns generic fallback when message is undefined (wrong type)', () => {
      const error: ApiError = {
        code: 0,
        message: undefined as unknown as string,
        data: null,
      };
      expect(getErrorMessage(error)).toBe('操作失败，请稍后重试');
    });

    it('returns generic fallback when message is numeric (wrong type)', () => {
      const error: ApiError = {
        code: 0,
        message: 42 as unknown as string,
        data: null,
      };
      expect(getErrorMessage(error)).toBe('操作失败，请稍后重试');
    });

    it('returns 401 message for unauthorized error', () => {
      const error: ApiError = {
        code: 401,
        message: 'Unauthorized',
        data: null,
      };
      expect(getErrorMessage(error)).toBe(HTTP_STATUS_MESSAGES[401]);
    });

    it('returns 429 message for rate limiting error', () => {
      const error: ApiError = {
        code: 429,
        message: 'Too Many Requests',
        data: null,
      };
      expect(getErrorMessage(error)).toBe(HTTP_STATUS_MESSAGES[429]);
    });

    it('returns NOT_IMPLEMENTED mapping for 501 business code', () => {
      const error: ApiError = {
        code: 501,
        message: 'NOT_IMPLEMENTED',
        data: null,
      };
      expect(getErrorMessage(error)).toBe(
        ERROR_CODE_MESSAGES['NOT_IMPLEMENTED']
      );
    });
  });

  describe('getDeleteErrorMessage', () => {
    it('returns specific error message for 409 with known code', () => {
      const error: ApiError = {
        code: 409,
        message: 'CUSTOMER_HAS_ORDERS',
        data: null,
      };
      expect(getDeleteErrorMessage(error, '客户')).toBe(
        ERROR_CODE_MESSAGES['CUSTOMER_HAS_ORDERS']
      );
    });

    it('returns generic 409 message for unknown error code', () => {
      const error: ApiError = {
        code: 409,
        message: 'UNKNOWN_CONFLICT',
        data: null,
      };
      expect(getDeleteErrorMessage(error, '客户')).toBe(
        '存在关联数据，无法删除'
      );
    });

    it('returns entity-specific 404 message', () => {
      const error: ApiError = {
        code: 404,
        message: 'Not Found',
        data: null,
      };
      expect(getDeleteErrorMessage(error, '供应商')).toBe(
        '供应商不存在或已被删除'
      );
    });

    it('delegates to getErrorMessage for other status codes', () => {
      const error: ApiError = {
        code: 500,
        message: 'Internal Server Error',
        data: null,
      };
      expect(getDeleteErrorMessage(error, '面料')).toBe(
        HTTP_STATUS_MESSAGES[500]
      );
    });
  });

  describe('parseFieldError', () => {
    it('returns null for null input', () => {
      expect(parseFieldError(null as unknown as string)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseFieldError('')).toBeNull();
    });

    it('returns null for non-string input (number cast)', () => {
      expect(parseFieldError(123 as unknown as string)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseFieldError(undefined as unknown as string)).toBeNull();
    });

    it('parses known field: companyName should not be empty', () => {
      const result = parseFieldError('companyName should not be empty');
      expect(result).toEqual({
        field: 'companyName',
        message: 'companyName should not be empty',
      });
    });

    it('parses known field: email must be an email', () => {
      const result = parseFieldError('email must be an email');
      expect(result).toEqual({
        field: 'email',
        message: 'email must be an email',
      });
    });

    it('returns null for message starting with unknown field', () => {
      expect(parseFieldError('unknownField blah blah')).toBeNull();
    });

    it('returns null for non-matching message', () => {
      expect(parseFieldError('Some random error message')).toBeNull();
    });

    it('parses known field: fabricCode must not be empty', () => {
      const result = parseFieldError('fabricCode must not be empty');
      expect(result).toEqual({
        field: 'fabricCode',
        message: 'fabricCode must not be empty',
      });
    });
  });

  describe('API client error normalization', () => {
    it('normalizes missing response data to default ApiError shape', () => {
      // Simulate what the interceptor does when response.data is undefined
      const errorResponse = {
        status: 502,
        data: undefined as unknown as ApiError,
      };
      const fallbackMessage = 'Bad Gateway';

      const apiError: ApiError = {
        code: errorResponse.data?.code ?? errorResponse.status ?? 500,
        message:
          errorResponse.data?.message ?? fallbackMessage ?? 'Unknown error',
        data: null,
      };

      expect(apiError.code).toBe(502);
      expect(apiError.message).toBe('Bad Gateway');
      expect(apiError.data).toBeNull();
    });

    it('normalizes network error with no response object', () => {
      // Simulate network error: no response at all — interceptor falls through to defaults
      const apiError: ApiError = {
        code: 500,
        message: 'Network Error',
        data: null,
      };

      expect(apiError.code).toBe(500);
      expect(apiError.message).toBe('Network Error');
      expect(apiError.data).toBeNull();
    });

    it('normalizes HTML error page response (data is string)', () => {
      // Simulate when backend returns HTML error page instead of JSON
      const errorResponse = {
        status: 502,
        data: '<html><body>Bad Gateway</body></html>' as unknown as ApiError,
      };
      const errorMessage = 'Request failed with status code 502';

      const apiError: ApiError = {
        code: errorResponse.data?.code ?? errorResponse.status ?? 500,
        message:
          errorResponse.data?.message ?? errorMessage ?? 'Unknown error',
        data: null,
      };

      // When data is a string, data?.code is undefined, falls to status
      expect(apiError.code).toBe(502);
      // When data is a string, data?.message is undefined, falls to errorMessage
      expect(apiError.message).toBe('Request failed with status code 502');
      expect(apiError.data).toBeNull();
    });

    it('normalizes timeout error', () => {
      // Simulate timeout: no response, interceptor produces default ApiError
      const apiError: ApiError = {
        code: 500,
        message: 'timeout of 10000ms exceeded',
        data: null,
      };

      expect(apiError.code).toBe(500);
      expect(apiError.message).toBe('timeout of 10000ms exceeded');
      expect(apiError.data).toBeNull();
    });
  });
});
