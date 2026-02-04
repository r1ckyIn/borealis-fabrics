import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, RequestUser } from '../interfaces';

/**
 * JWT authentication strategy using Passport.
 * Validates JWT tokens and extracts user information.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Validates the JWT payload and returns the user object.
   * Called automatically by Passport after successful JWT verification.
   */
  validate(payload: JwtPayload): RequestUser {
    if (!payload.sub || !payload.weworkId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      weworkId: payload.weworkId,
      name: payload.name,
    };
  }
}
