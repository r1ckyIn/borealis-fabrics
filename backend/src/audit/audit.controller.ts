import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditLog } from '@prisma/client';
import { PaginatedResult } from '../common/utils/pagination';

/**
 * Controller for viewing audit logs.
 * Restricted to boss and developer roles.
 */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('boss', 'developer')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/v1/audit-logs
   * Returns paginated, filterable list of audit log entries.
   */
  @Get()
  async findAll(
    @Query() query: QueryAuditLogDto,
  ): Promise<PaginatedResult<AuditLog>> {
    return this.auditService.findAll(query);
  }

  /**
   * GET /api/v1/audit-logs/:id
   * Returns a single audit log entry by ID.
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AuditLog> {
    return this.auditService.findOne(id);
  }
}
