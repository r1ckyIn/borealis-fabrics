/**
 * Authentication API endpoints.
 *
 * Auth uses HttpOnly cookies. The frontend never handles JWT tokens directly.
 */

import type { AuthUser } from '@/types';
import { API_BASE_URL } from '@/utils/constants';

import { get, post } from './client';

/** Get WeChat Work OAuth login URL. */
export function getWeworkLoginUrl(): string {
  return `${API_BASE_URL}/auth/wework/login`;
}

/** Get current authenticated user (cookie sent automatically). */
export function getCurrentUser(): Promise<AuthUser> {
  return get<AuthUser>('/auth/me');
}

/** Logout and invalidate session. */
export function logout(): Promise<void> {
  return post<void>('/auth/logout');
}

export const authApi = {
  getWeworkLoginUrl,
  getCurrentUser,
  logout,
};
