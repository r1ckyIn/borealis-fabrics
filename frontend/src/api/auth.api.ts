/**
 * Authentication API endpoints for Borealis Fabrics.
 */

import type { AuthUser, LoginResponse, LogoutResponse } from '@/types';

import apiClient, { get, post } from './client';

/**
 * Get WeWork OAuth login URL.
 * The backend will redirect to WeWork's OAuth page.
 * @returns The full URL to redirect the user to for WeWork login.
 */
export function getWeworkLoginUrl(): string {
  return `${apiClient.defaults.baseURL}/auth/wework/login`;
}

/**
 * Handle OAuth callback with authorization code.
 * Exchanges the OAuth code for a JWT token.
 * @param code - The authorization code from OAuth callback.
 * @returns Login response with token and user info.
 */
export async function handleOAuthCallback(code: string): Promise<LoginResponse> {
  return get<LoginResponse>('/auth/wework/callback', { code });
}

/**
 * Get current authenticated user information.
 * @returns Current user info from the JWT token.
 */
export async function getCurrentUser(): Promise<AuthUser> {
  return get<AuthUser>('/auth/me');
}

/**
 * Logout current user.
 * Invalidates the current session on the server.
 * @returns Logout confirmation message.
 */
export async function logout(): Promise<LogoutResponse> {
  return post<LogoutResponse>('/auth/logout');
}

/**
 * Auth API namespace for convenient imports.
 */
export const authApi = {
  getWeworkLoginUrl,
  handleOAuthCallback,
  getCurrentUser,
  logout,
};
