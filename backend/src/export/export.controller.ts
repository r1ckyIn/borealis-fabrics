import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { ExportQueryDto } from './dto';
import { EntityFieldConfig } from './constants/field-config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controller for data export endpoints.
 * All endpoints require authentication.
 */
@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * Get available export fields for an entity type.
   * Frontend uses this to display a field selection checkbox list.
   */
  @Get('fields/:entityType')
  getFieldConfig(@Param('entityType') entityType: string): EntityFieldConfig[] {
    return this.exportService.getFieldConfig(entityType);
  }

  /**
   * Export entity data to Excel with selected fields.
   * Returns binary .xlsx file with Content-Disposition header.
   *
   * Uses @Res() to write response directly, bypassing TransformInterceptor
   * (binary responses must not be wrapped in ApiResponse).
   */
  @Get(':entityType')
  async exportEntity(
    @Param('entityType') entityType: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const fieldNames = query.fields.split(',').map((f) => f.trim());
    const buffer = await this.exportService.export(entityType, fieldNames);

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${entityType}-export-${dateStr}.xlsx`,
    );
    res.end(buffer);
  }
}
