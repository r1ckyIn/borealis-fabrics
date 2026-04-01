import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark endpoints as publicly accessible,
 * bypassing JWT authentication when a global guard is active.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
