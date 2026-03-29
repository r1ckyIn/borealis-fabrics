import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogDto } from './dto';
import { AuditLog, Prisma } from '@prisma/client';
import {
  buildPaginationArgs,
  buildPaginatedResult,
  PaginatedResult,
} from '../common/utils/pagination';

/** Data required to create an audit log entry */
export interface CreateAuditLogData {
  userId: number | null;
  userName: string;
  action: string;
  entityType: string;
  entityId: number;
  changes: Record<string, unknown>;
  ip: string;
  correlationId: string;
}

/** Maps entity types to their database table names */
const ENTITY_TABLE_MAP: Record<string, string> = {
  Supplier: 'suppliers',
  Customer: 'customers',
  Fabric: 'fabrics',
  Product: 'products',
  Order: 'orders',
  Quote: 'quotes',
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry. Fire-and-forget: errors are logged
   * but never thrown to avoid blocking the main request.
   */
  async createLog(data: CreateAuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          userName: data.userName,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          changes: data.changes as Prisma.JsonObject,
          ip: data.ip,
          correlationId: data.correlationId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
    }
  }

  /**
   * Find all audit logs with pagination and optional filters.
   */
  async findAll(query: QueryAuditLogDto): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // Keyword search across userName and changes JSON
    if (query.keyword) {
      where.OR = [
        { userName: { contains: query.keyword } },
        { changes: { path: '$', string_contains: query.keyword } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const { skip, take } = buildPaginationArgs(query);

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Find a single audit log entry by ID.
   * Throws NotFoundException if not found.
   */
  async findOne(id: number): Promise<AuditLog> {
    const log = await this.prisma.auditLog.findFirst({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return log;
  }

  /**
   * Fetch entity by type and ID using raw query to bypass soft-delete
   * extension. This is needed to capture before-state of entities
   * that may be soft-deleted during the operation.
   */
  async fetchEntityById(
    entityType: string,
    entityId: number,
  ): Promise<Record<string, unknown> | null> {
    const tableName = ENTITY_TABLE_MAP[entityType];
    if (!tableName) return null;

    try {
      const results = await this.prisma.$queryRawUnsafe<
        Record<string, unknown>[]
      >(`SELECT * FROM \`${tableName}\` WHERE id = ?`, entityId);

      if (!results || results.length === 0) return null;

      return results[0];
    } catch (error) {
      this.logger.warn(
        `Failed to fetch entity ${entityType}#${entityId} for audit`,
        error,
      );
      return null;
    }
  }
}
