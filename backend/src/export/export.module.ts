import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

/**
 * Module for data export functionality.
 * Imports AuthModule for JwtAuthGuard dependency resolution.
 */
@Module({
  imports: [AuthModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
