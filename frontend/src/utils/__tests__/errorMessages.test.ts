/**
 * Unit tests for error message utility.
 * Verifies Chinese error messages for known business error codes,
 * HTTP status fallback, and generic fallback behavior.
 */

import { describe, it, expect } from 'vitest';
import type { ApiError } from '@/types/api.types';
import {
  getErrorMessage,
  getDeleteErrorMessage,
  mapApiErrorsToFormFields,
  ERROR_CODE_MESSAGES,
  HTTP_STATUS_MESSAGES,
} from '../errorMessages';

describe('ERROR_CODE_MESSAGES', () => {
  it('should contain at least 10 business error codes', () => {
    expect(Object.keys(ERROR_CODE_MESSAGES).length).toBeGreaterThanOrEqual(10);
  });
});

describe('HTTP_STATUS_MESSAGES', () => {
  it('should contain common HTTP status codes', () => {
    expect(HTTP_STATUS_MESSAGES[400]).toBeDefined();
    expect(HTTP_STATUS_MESSAGES[401]).toBeDefined();
    expect(HTTP_STATUS_MESSAGES[403]).toBeDefined();
    expect(HTTP_STATUS_MESSAGES[404]).toBeDefined();
    expect(HTTP_STATUS_MESSAGES[409]).toBeDefined();
    expect(HTTP_STATUS_MESSAGES[500]).toBeDefined();
  });
});

describe('getErrorMessage', () => {
  it('should return mapped Chinese string for known error code CUSTOMER_HAS_ORDERS', () => {
    const error: ApiError = {
      code: 409,
      message: 'CUSTOMER_HAS_ORDERS',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('该客户有关联的订单，无法删除');
  });

  it('should return mapped Chinese string for known error code SUPPLIER_HAS_FABRICS', () => {
    const error: ApiError = {
      code: 409,
      message: 'SUPPLIER_HAS_FABRICS',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('该供应商有关联的面料，无法删除');
  });

  it('should return mapped Chinese string for known error code FABRIC_CODE_EXISTS', () => {
    const error: ApiError = {
      code: 409,
      message: 'FABRIC_CODE_EXISTS',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('面料编码已存在');
  });

  it('should return mapped Chinese string for known error code COMPANY_NAME_EXISTS', () => {
    const error: ApiError = {
      code: 409,
      message: 'COMPANY_NAME_EXISTS',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('公司名称已存在');
  });

  it('should return mapped Chinese string for QUOTE_ALREADY_CONVERTED', () => {
    const error: ApiError = {
      code: 409,
      message: 'QUOTE_ALREADY_CONVERTED',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('该报价单已转为订单');
  });

  it('should return mapped Chinese string for INVALID_STATUS_TRANSITION', () => {
    const error: ApiError = {
      code: 400,
      message: 'INVALID_STATUS_TRANSITION',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('当前状态不允许此操作');
  });

  it('should fall back to HTTP status message for 404', () => {
    const error: ApiError = {
      code: 404,
      message: 'Not Found',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('记录不存在或已被删除');
  });

  it('should fall back to HTTP status message for 409', () => {
    const error: ApiError = {
      code: 409,
      message: 'Conflict',
      data: null,
    };
    // 'Conflict' is not a known error code, but 409 maps to HTTP_STATUS_MESSAGES
    expect(getErrorMessage(error)).toBe('存在关联数据，无法删除');
  });

  it('should fall back to HTTP status message for 403', () => {
    const error: ApiError = {
      code: 403,
      message: 'Forbidden',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('没有权限执行此操作');
  });

  it('should fall back to HTTP status message for 500', () => {
    const error: ApiError = {
      code: 500,
      message: 'Internal Server Error',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('服务器错误，请稍后重试');
  });

  it('should fall back to error.message when code is unknown and message is a readable string', () => {
    const error: ApiError = {
      code: 422,
      message: 'Email format is invalid',
      data: null,
    };
    // 422 is in HTTP_STATUS_MESSAGES, but message is not a known error code
    // The function checks ERROR_CODE_MESSAGES first, then HTTP_STATUS_MESSAGES
    expect(getErrorMessage(error)).toBe('数据验证失败');
  });

  it('should fall back to error.message for unmapped HTTP status with readable message', () => {
    const error: ApiError = {
      code: 418,
      message: 'This is a teapot error',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('This is a teapot error');
  });

  it('should return generic fallback when message is empty', () => {
    const error: ApiError = {
      code: 999,
      message: '',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('操作失败，请稍后重试');
  });

  it('should handle 501 Not Implemented', () => {
    const error: ApiError = {
      code: 501,
      message: 'Not Implemented',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('该功能暂未实现');
  });

  it('should handle 429 Too Many Requests', () => {
    const error: ApiError = {
      code: 429,
      message: 'Too Many Requests',
      data: null,
    };
    expect(getErrorMessage(error)).toBe('操作过于频繁，请稍后重试');
  });
});

describe('mapApiErrorsToFormFields', () => {
  it('should map single field error string to FieldData array', () => {
    const error = {
      code: 400,
      message: 'companyName should not be empty',
      data: null,
    } as ApiError;
    const result = mapApiErrorsToFormFields(error);
    expect(result).toEqual([
      { name: 'companyName', errors: ['companyName should not be empty'] },
    ]);
  });

  it('should map array of field errors to multiple FieldData entries', () => {
    const error = {
      code: 400,
      message: ['companyName should not be empty', 'email must be an email'],
      data: null,
    } as unknown as ApiError;
    const result = mapApiErrorsToFormFields(error);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'companyName',
      errors: ['companyName should not be empty'],
    });
    expect(result[1]).toEqual({
      name: 'email',
      errors: ['email must be an email'],
    });
  });

  it('should return empty array for non-field error message', () => {
    const error: ApiError = {
      code: 500,
      message: 'Internal server error',
      data: null,
    };
    const result = mapApiErrorsToFormFields(error);
    expect(result).toEqual([]);
  });

  it('should return empty array for undefined/null message', () => {
    const error = { code: 400, message: undefined, data: null } as unknown as ApiError;
    const result = mapApiErrorsToFormFields(error);
    expect(result).toEqual([]);
  });

  it('should return empty array for null error', () => {
    const result = mapApiErrorsToFormFields(null as unknown as ApiError);
    expect(result).toEqual([]);
  });

  it('should handle order-specific field names', () => {
    const error = {
      code: 400,
      message: 'customerId should not be empty',
      data: null,
    } as ApiError;
    const result = mapApiErrorsToFormFields(error);
    expect(result).toEqual([
      { name: 'customerId', errors: ['customerId should not be empty'] },
    ]);
  });
});

describe('getDeleteErrorMessage', () => {
  it('should return specific message from ERROR_CODE_MESSAGES for 409 with known code', () => {
    const error: ApiError = {
      code: 409,
      message: 'SUPPLIER_HAS_FABRICS',
      data: null,
    };
    expect(getDeleteErrorMessage(error, '供应商')).toBe(
      '该供应商有关联的面料，无法删除'
    );
  });

  it('should return generic 409 message when error code is not in ERROR_CODE_MESSAGES', () => {
    const error: ApiError = {
      code: 409,
      message: 'Conflict',
      data: null,
    };
    expect(getDeleteErrorMessage(error, '供应商')).toBe(
      '存在关联数据，无法删除'
    );
  });

  it('should return entity-specific 404 message', () => {
    const error: ApiError = {
      code: 404,
      message: 'Not Found',
      data: null,
    };
    expect(getDeleteErrorMessage(error, '供应商')).toBe(
      '供应商不存在或已被删除'
    );
  });

  it('should delegate to getErrorMessage for other errors', () => {
    const error: ApiError = {
      code: 500,
      message: 'Internal Server Error',
      data: null,
    };
    expect(getDeleteErrorMessage(error, '供应商')).toBe(
      '服务器错误，请稍后重试'
    );
  });

  it('should handle customer delete with CUSTOMER_HAS_ORDERS', () => {
    const error: ApiError = {
      code: 409,
      message: 'CUSTOMER_HAS_ORDERS',
      data: null,
    };
    expect(getDeleteErrorMessage(error, '客户')).toBe(
      '该客户有关联的订单，无法删除'
    );
  });
});
