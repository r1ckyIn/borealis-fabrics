/**
 * TanStack Query hooks for Audit Log module.
 */

import { useQuery } from '@tanstack/react-query';

import { getAuditLogs, getAuditLogById } from '@/api/audit';
import type { AuditLogQuery } from '@/types';

// =============================================================================
// Query Keys
// =============================================================================

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (query?: AuditLogQuery) => [...auditLogKeys.lists(), query] as const,
  details: () => [...auditLogKeys.all, 'detail'] as const,
  detail: (id: number) => [...auditLogKeys.details(), id] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of audit logs with optional filters.
 * @param query - Query parameters (pagination, filters)
 */
export function useAuditLogs(query?: AuditLogQuery) {
  return useQuery({
    queryKey: auditLogKeys.list(query),
    queryFn: () => getAuditLogs(query),
  });
}

/**
 * Fetch a single audit log entry by ID.
 * @param id - Audit log entry ID
 */
export function useAuditLogDetail(id: number) {
  return useQuery({
    queryKey: auditLogKeys.detail(id),
    queryFn: () => getAuditLogById(id),
    enabled: !!id,
  });
}
