/**
 * Logistics API endpoints.
 */

import type {
  PaginatedResult,
  Logistics,
  CreateLogisticsData,
  UpdateLogisticsData,
  QueryLogisticsParams,
} from '@/types';

import { get, post, patch, del } from './client';

/** Get paginated list of logistics entries. */
export function getLogisticsList(
  params?: QueryLogisticsParams
): Promise<PaginatedResult<Logistics>> {
  return get<PaginatedResult<Logistics>>('/logistics', params);
}

/** Get a single logistics entry by ID. */
export function getLogistics(id: number): Promise<Logistics> {
  return get<Logistics>(`/logistics/${id}`);
}

/** Create a new logistics entry. */
export function createLogistics(data: CreateLogisticsData): Promise<Logistics> {
  return post<Logistics>('/logistics', data);
}

/** Update an existing logistics entry. */
export function updateLogistics(
  id: number,
  data: UpdateLogisticsData
): Promise<Logistics> {
  return patch<Logistics>(`/logistics/${id}`, data);
}

/** Delete a logistics entry. */
export function deleteLogistics(id: number): Promise<void> {
  return del<void>(`/logistics/${id}`);
}

export const logisticsApi = {
  getLogisticsList,
  getLogistics,
  createLogistics,
  updateLogistics,
  deleteLogistics,
};
