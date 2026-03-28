import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that enforces role-based access control.
 * For MVP, boss role is determined by matching the authenticated user's
 * weworkId against a configurable list in BOSS_WEWORK_IDS env var.
 *
 * If no roles are required on the endpoint, the guard allows access.
 * If 'boss' role is required, checks if user's weworkId is in the boss list.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly bossIds: Set<string>;

  constructor(private readonly reflector: Reflector) {
    const idsStr = process.env.BOSS_WEWORK_IDS || '';
    this.bossIds = new Set(
      idsStr
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { weworkId?: string } }>();
    const user = request.user;

    if (!user?.weworkId) {
      throw new ForbiddenException('Authentication required');
    }

    if (requiredRoles.includes('boss') && !this.bossIds.has(user.weworkId)) {
      throw new ForbiddenException('Boss role required for this operation');
    }

    return true;
  }
}
