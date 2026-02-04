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

/** Redis key prefix for blacklisted tokens */
const TOKEN_BLACKLIST_PREFIX = 'auth:blacklist:';

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
      (request as Request & { user: RequestUser }).user = {
        id: 1,
        weworkId: 'dev-user',
        name: 'Dev User',
      };
      return true;
    }

    const token = this.extractTokenFromHeader(request);
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
   * Extract JWT token from Authorization header.
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
  }

  /**
   * Check if a token is in the blacklist.
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${TOKEN_BLACKLIST_PREFIX}${this.hashToken(token)}`;
    const result = await this.redisService.get(key);
    return result !== null;
  }

  /**
   * Simple hash function for token blacklist keys.
   * Uses first 32 chars of token to avoid long Redis keys.
   */
  private hashToken(token: string): string {
    return token.substring(0, 32);
  }
}

export { TOKEN_BLACKLIST_PREFIX };
