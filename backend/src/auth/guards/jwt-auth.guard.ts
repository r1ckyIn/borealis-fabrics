import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
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
 * JWT authentication guard with blacklist support.
 * In development mode, skips auth and injects a mock user.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const env = this.configService.get<string>('nodeEnv');

    // Dev mode: skip auth, inject mock user
    if (env === 'development') {
      this.logger.warn(
        'Authentication bypassed in development mode. ' +
          'Ensure NODE_ENV is set correctly in production!',
      );
      (request as Request & { user: RequestUser }).user = {
        id: 1,
        weworkId: 'dev-user',
        name: 'Dev User',
      };
      return true;
    }

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    // Check if token is blacklisted
    const isBlacklisted = await this.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
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

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Extract JWT token from Authorization header or HttpOnly cookie.
   * Prioritizes header for API clients, falls back to cookie for browser.
   */
  private extractToken(request: Request): string | null {
    // First try Authorization header (for API clients)
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    // Fall back to HttpOnly cookie (for browser)
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
