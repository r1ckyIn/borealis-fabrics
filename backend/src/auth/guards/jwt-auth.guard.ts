import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const env = this.configService.get<string>('NODE_ENV');

    // Dev mode: skip auth, inject mock user
    if (env === 'development') {
      (request as Request & { user: unknown }).user = {
        id: 1,
        weworkId: 'dev-user',
        name: 'Dev User',
      };
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    // TODO: Implement JWT verification in production
    throw new UnauthorizedException('JWT verification not implemented');
  }
}
