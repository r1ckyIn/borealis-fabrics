/**
 * System API endpoints.
 */

import type { HealthResponse, SystemEnumsResponse } from '@/types';

import { get } from './client';

/** Get all business enums for dropdowns and status displays. */
export function getEnums(): Promise<SystemEnumsResponse> {
  return get<SystemEnumsResponse>('/system/enums');
}

/** Check API health status. */
export function healthCheck(): Promise<HealthResponse> {
  return get<HealthResponse>('/health');
}

/** Check API readiness for deployment systems. */
export function readyCheck(): Promise<HealthResponse> {
  return get<HealthResponse>('/ready');
}

export const systemApi = {
  getEnums,
  healthCheck,
  readyCheck,
};
