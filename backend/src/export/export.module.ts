import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

/**
 * Module for data export functionality.
 * PrismaModule is global, so no explicit import needed.
 */
@Module({
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
