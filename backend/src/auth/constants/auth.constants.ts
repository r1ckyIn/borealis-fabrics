import * as crypto from 'crypto';
import type { CookieOptions } from 'express';

// Redis key prefixes
export const TOKEN_BLACKLIST_PREFIX = 'auth:blacklist:';
export const OAUTH_STATE_PREFIX = 'auth:state:';

// OAuth state expiration time in seconds (5 minutes)
export const OAUTH_STATE_TTL = 300;

// Auth cookie configuration
export const AUTH_COOKIE_NAME = 'bf_auth_token';
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true, // Prevents XSS attacks
  sameSite: 'lax', // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
};

/**
 * Hash token using SHA256 for secure blacklist storage.
 * Used consistently across auth.service.ts and jwt-auth.guard.ts.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
