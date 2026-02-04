import * as crypto from 'crypto';

// Redis key prefixes
export const TOKEN_BLACKLIST_PREFIX = 'auth:blacklist:';
export const OAUTH_STATE_PREFIX = 'auth:state:';

// OAuth state expiration time in seconds (5 minutes)
export const OAUTH_STATE_TTL = 300;

/**
 * Hash token using SHA256 for secure blacklist storage.
 * Used consistently across auth.service.ts and jwt-auth.guard.ts.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
