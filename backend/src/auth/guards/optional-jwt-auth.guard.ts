import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RedisService } from '../../common/services/redis.service';
import { JwtPayload, RequestUser } from '../interfaces';
import {
  TOKEN_BLACKLIST_PREFIX,
  AUTH_COOKIE_NAME,
  hashToken,
} from '../constants';

/**
 * Optional JWT authentication guard.
 * Unlike JwtAuthGuard, this guard never throws on missing/invalid tokens.
 * If a valid token is present, request.user is populated.
 * If no token or invalid token, the request passes through with request.user undefined.
 *
 * Use case: public endpoints that behave differently for authenticated users
 * (e.g., includeDeleted RBAC check on findAll endpoints).
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const env = this.configService.get<string>('nodeEnv');

    // Dev mode: inject mock user (same as JwtAuthGuard)
    if (env === 'development') {
      (request as Request & { user: RequestUser }).user = {
        id: 1,
        weworkId: 'mock-dev-001',
        name: 'Mock Developer',
      };
      return true;
    }

    const token = this.extractToken(request);
    if (!token) {
      // No token — allow request through without user
      return true;
    }

    // Check if token is blacklisted
    const isBlacklisted = await this.isTokenBlacklisted(token);
    if (isBlacklisted) {
      // Blacklisted token — treat as unauthenticated, don't throw
      return true;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      // Attach user to request
      (request as Request & { user: RequestUser }).user = {
        id: payload.sub,
        weworkId: payload.weworkId,
        name: payload.name,
      };
    } catch {
      // Invalid/expired token — silently pass without user
      this.logger.debug('Optional auth: invalid token, proceeding as guest');
    }

    return true;
  }

  /**
   * Extract JWT token from Authorization header or HttpOnly cookie.
   */
  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[AUTH_COOKIE_NAME] ?? null;
  }

  /**
   * Check if a token is in the blacklist.
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${TOKEN_BLACKLIST_PREFIX}${hashToken(token)}`;
    const result = await this.redisService.get(key);
    return result !== null;
  }
}
