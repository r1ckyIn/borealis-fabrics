/**
 * Audit log API endpoints.
 */

import type { AuditLog, AuditLogQuery, PaginatedResult } from '@/types';
import { get } from './client';

/** Get paginated list of audit logs with optional filters. */
export function getAuditLogs(
  query?: AuditLogQuery
): Promise<PaginatedResult<AuditLog>> {
  return get<PaginatedResult<AuditLog>>('/audit-logs', query);
}

/** Get a single audit log entry by ID. */
export function getAuditLogById(id: number): Promise<AuditLog> {
  return get<AuditLog>(`/audit-logs/${id}`);
}
