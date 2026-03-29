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
 * For MVP, admin role is determined by matching the authenticated user's
 * weworkId against configurable lists in BOSS_WEWORK_IDS and DEV_WEWORK_IDS env vars.
 *
 * If no roles are required on the endpoint, the guard allows access.
 * If 'boss' or 'developer' role is required, checks if user is an admin.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly bossIds: Set<string>;
  private readonly devIds: Set<string>;

  constructor(private readonly reflector: Reflector) {
    const bossStr = process.env.BOSS_WEWORK_IDS || '';
    this.bossIds = new Set(
      bossStr
        .split(',')
        .map((id: string) => id.trim())
        .filter(Boolean),
    );

    const devStr = process.env.DEV_WEWORK_IDS || '';
    this.devIds = new Set(
      devStr
        .split(',')
        .map((id: string) => id.trim())
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

    // Check if any required role matches
    const isAdmin = this.isAdminUser(user.weworkId);

    const hasRole = requiredRoles.some((role) => {
      if (role === 'boss' || role === 'developer') {
        return isAdmin;
      }
      return false;
    });

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * Check if a weworkId belongs to an admin user (boss or developer).
   * Used by AuthService (Plan 02) to include role info in responses.
   */
  isAdminUser(weworkId: string): boolean {
    return this.bossIds.has(weworkId) || this.devIds.has(weworkId);
  }
}
