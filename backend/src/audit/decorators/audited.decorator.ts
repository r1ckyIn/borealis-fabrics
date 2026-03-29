import { SetMetadata } from '@nestjs/common';

/** Metadata key used by Reflector to retrieve audit config */
export const AUDIT_KEY = 'audit';

/** Configuration for the @Audited() decorator */
export interface AuditMetadata {
  entityType: string;
  action: 'create' | 'update' | 'delete' | 'restore';
  /** Request param name to extract entity ID from (defaults to 'id') */
  idParam?: string;
}

/**
 * Decorator that marks a controller method for automatic audit logging.
 * The AuditInterceptor reads this metadata to determine how to capture
 * the before/after state and record the change.
 *
 * @example
 * @Audited({ entityType: 'Supplier', action: 'create' })
 * @Post()
 * create(@Body() dto: CreateSupplierDto) { ... }
 */
export const Audited = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_KEY, metadata);
