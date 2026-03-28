import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for an endpoint.
 * Used with RolesGuard to enforce role-based access control.
 *
 * @example
 * @Roles('boss')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async restore(@Param('id') id: number) { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
