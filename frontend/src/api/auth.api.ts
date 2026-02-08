/**
 * Authentication API endpoints.
 *
 * Auth uses HttpOnly cookies. The frontend never handles JWT tokens directly.
 */

import type { AuthUser, LoginResponse } from '@/types';
import { API_BASE_URL } from '@/utils/constants';

import { get, post } from './client';

/** Get WeWork OAuth login URL. */
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

/** Dev mode login (development only). Returns user info; cookie set by backend. */
export function devLogin(): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/dev/login');
}

export const authApi = {
  getWeworkLoginUrl,
  getCurrentUser,
  logout,
  devLogin,
};
