/**
 * Authentication API endpoints.
 */

import type { AuthUser, LoginResponse, LogoutResponse } from '@/types';
import { API_BASE_URL } from '@/utils/constants';

import { get, post } from './client';

/** Get WeWork OAuth login URL. */
export function getWeworkLoginUrl(): string {
  return `${API_BASE_URL}/auth/wework/login`;
}

/** Exchange OAuth code for JWT token. */
export function handleOAuthCallback(code: string): Promise<LoginResponse> {
  return get<LoginResponse>('/auth/wework/callback', { code });
}

/** Get current authenticated user. */
export function getCurrentUser(): Promise<AuthUser> {
  return get<AuthUser>('/auth/me');
}

/** Logout and invalidate session. */
export function logout(): Promise<LogoutResponse> {
  return post<LogoutResponse>('/auth/logout');
}

export const authApi = {
  getWeworkLoginUrl,
  handleOAuthCallback,
  getCurrentUser,
  logout,
};
