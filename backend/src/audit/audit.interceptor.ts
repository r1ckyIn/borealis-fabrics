import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_KEY, AuditMetadata } from './decorators/audited.decorator';
import { buildChangesDiff } from './utils/diff';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';

/**
 * Global interceptor that automatically captures audit logs for CUD operations.
 * Works with @Audited() decorator to determine which methods to audit.
 *
 * Must be registered AFTER UserClsInterceptor in AppModule providers
 * so that CLS has the authenticated user available.
 *
 * Audit writes are fire-and-forget: failures are logged but never
 * block the main request.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
    private readonly auditService: AuditService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const metadata = this.reflector.get<AuditMetadata>(
      AUDIT_KEY,
      context.getHandler(),
    );

    // No @Audited() decorator — pass through
    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      params: Record<string, string>;
      ip?: string;
      headers: Record<string, string | string[]>;
    }>();
    const entityId = request.params[metadata.idParam || 'id'];

    // Pre-handler: fetch before-state for update/delete/restore
    let beforeState: Record<string, unknown> | null = null;
    if (
      (metadata.action === 'update' ||
        metadata.action === 'delete' ||
        metadata.action === 'restore') &&
      entityId
    ) {
      beforeState = await this.auditService.fetchEntityById(
        metadata.entityType,
        +entityId,
      );
    }

    return next.handle().pipe(
      tap((result) => {
        void (async () => {
          try {
            const user = this.cls.get<RequestUser>('user');
            const correlationId = this.cls.getId() ?? '';
            const ip =
              request.ip ||
              (request.headers['x-forwarded-for'] as string) ||
              '';

            const afterState =
              metadata.action === 'delete'
                ? null
                : (result as Record<string, unknown>);
            const changes = buildChangesDiff(
              metadata.action,
              beforeState,
              afterState,
            );
            const resolvedEntityId = entityId
              ? +entityId
              : ((result as { id?: number })?.id ?? 0);

            await this.auditService.createLog({
              userId: user?.id ?? null,
              userName: user?.name ?? 'system',
              action: metadata.action,
              entityType: metadata.entityType,
              entityId: resolvedEntityId,
              changes,
              ip: typeof ip === 'string' ? ip : String(ip),
              correlationId,
            });
          } catch (error) {
            // Fire-and-forget: log error but don't block the request
            this.logger.error('Audit log write failed:', error);
          }
        })();
      }),
    );
  }
}
