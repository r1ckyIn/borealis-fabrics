import type { Request } from 'express';
import * as ExcelJS from 'exceljs';
import { ClsService } from 'nestjs-cls';
import { RequestUser } from '../../src/auth/interfaces';

/**
 * Authenticated Express request with user payload.
 * Used by controller specs that need a request object with auth context.
 */
type AuthenticatedRequest = Request & { user: RequestUser };

/**
 * Create a typed mock auth request for controller tests.
 *
 * Replaces `{ user: {...}, headers: {...} } as any` patterns by providing
 * a properly typed partial request that satisfies AuthenticatedRequest.
 *
 * @param userId - The user ID to set on the request (default: 1)
 * @param options - Optional overrides (e.g. authorization header)
 * @returns A mock request typed as AuthenticatedRequest
 */
export function createMockAuthRequest(
  userId = 1,
  options?: { authorization?: string },
): AuthenticatedRequest {
  return {
    user: { id: userId, weworkId: 'test-user-id', name: 'Test User' },
    headers: {
      authorization: options?.authorization ?? 'Bearer test-token',
    },
  } as unknown as AuthenticatedRequest;
}

/**
 * Create a minimal ClsService mock for E2E tests.
 * AllExceptionsFilter requires ClsService for correlation ID in error responses.
 */
export function createMockCls(): ClsService {
  return { getId: () => 'test-correlation-id' } as unknown as ClsService;
}

/**
 * Load a Buffer into an ExcelJS Workbook.
 *
 * Isolates the `buffer as unknown as ArrayBuffer` cast required by ExcelJS
 * when @types/node >= 22 changed Buffer to `Buffer<ArrayBufferLike>`.
 *
 * @param buffer - The raw Excel buffer
 * @returns A loaded ExcelJS Workbook
 */
export async function loadTestWorkbook(
  buffer: Buffer,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}
