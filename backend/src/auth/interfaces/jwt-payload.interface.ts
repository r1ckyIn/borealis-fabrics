/**
 * JWT payload structure for authentication tokens.
 */
export interface JwtPayload {
  /** User ID from database */
  sub: number;
  /** WeWork user ID */
  weworkId: string;
  /** User display name */
  name: string;
  /** Token issued at timestamp (Unix seconds) */
  iat?: number;
  /** Token expiration timestamp (Unix seconds) */
  exp?: number;
}

/**
 * User object attached to request after JWT validation.
 */
export interface RequestUser {
  id: number;
  weworkId: string;
  name: string;
}
