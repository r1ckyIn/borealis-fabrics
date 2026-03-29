import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

/**
 * Module for audit logging functionality.
 * Exports AuditService for use by AuditInterceptor (registered globally in AppModule).
 */
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
