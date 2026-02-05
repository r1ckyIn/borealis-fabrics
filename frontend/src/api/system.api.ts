/**
 * System API endpoints for Borealis Fabrics.
 */

import type { HealthResponse, SystemEnumsResponse } from '@/types';

import { get } from './client';

/**
 * Get all business enums from the system.
 * Used for populating dropdown options and status displays.
 * @returns All enum definitions with values and labels.
 */
export async function getEnums(): Promise<SystemEnumsResponse> {
  return get<SystemEnumsResponse>('/system/enums');
}

/**
 * Check API health status.
 * @returns Health status with timestamp and uptime.
 */
export async function healthCheck(): Promise<HealthResponse> {
  return get<HealthResponse>('/health');
}

/**
 * Check API readiness status.
 * Used by deployment systems to verify the API is ready to accept traffic.
 * @returns Readiness status with timestamp and uptime.
 */
export async function readyCheck(): Promise<HealthResponse> {
  return get<HealthResponse>('/ready');
}

/**
 * System API namespace for convenient imports.
 */
export const systemApi = {
  getEnums,
  healthCheck,
  readyCheck,
};
