import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPaginationArgs,
  buildPaginatedResult,
} from '../common/utils/pagination';
import {
  CreateLogisticsDto,
  UpdateLogisticsDto,
  QueryLogisticsDto,
} from './dto';

/**
 * Shared include configuration for logistics queries.
 * Includes order item with order and fabric details.
 */
const LOGISTICS_INCLUDE = {
  orderItem: {
    include: {
      order: {
        select: {
          id: true,
          orderCode: true,
          customerId: true,
          customer: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      },
      fabric: {
        select: {
          id: true,
          fabricCode: true,
          name: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new logistics record.
   * Uses foreign key constraint to validate orderItemId atomically,
   * preventing TOCTOU race conditions.
   */
  async create(createLogisticsDto: CreateLogisticsDto) {
    const { orderItemId, shippedAt, ...rest } = createLogisticsDto;

    try {
      return await this.prisma.logistics.create({
        data: {
          orderItemId,
          ...rest,
          shippedAt: shippedAt ? new Date(shippedAt) : undefined,
        },
      });
    } catch (error) {
      this.handlePrismaError(
        error,
        'P2003',
        `Order item with ID ${orderItemId} not found`,
      );
    }
  }

  /**
   * Get paginated list of logistics records with filtering.
   */
  async findAll(query: QueryLogisticsDto) {
    const {
      sortBy = 'createdAt',
      sortOrder = 'desc',
      orderId,
      orderItemId,
      trackingNo,
      carrier,
    } = query;

    const where = this.buildWhereClause({
      orderId,
      orderItemId,
      trackingNo,
      carrier,
    });
    const paginationArgs = buildPaginationArgs(query);

    const [items, total] = await Promise.all([
      this.prisma.logistics.findMany({
        where,
        include: LOGISTICS_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        ...paginationArgs,
      }),
      this.prisma.logistics.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  /**
   * Get logistics record by ID with related order item info.
   */
  async findOne(id: number) {
    const logistics = await this.prisma.logistics.findUnique({
      where: { id },
      include: LOGISTICS_INCLUDE,
    });

    if (!logistics) {
      throw new NotFoundException(`Logistics record with ID ${id} not found`);
    }

    return logistics;
  }

  /**
   * Update logistics record (atomic operation to prevent race condition).
   */
  async update(id: number, updateLogisticsDto: UpdateLogisticsDto) {
    const { shippedAt, ...rest } = updateLogisticsDto;

    try {
      return await this.prisma.logistics.update({
        where: { id },
        data: {
          ...rest,
          ...(shippedAt !== undefined && {
            shippedAt: shippedAt ? new Date(shippedAt) : null,
          }),
        },
      });
    } catch (error) {
      this.handlePrismaError(
        error,
        'P2025',
        `Logistics record with ID ${id} not found`,
      );
    }
  }

  /**
   * Delete logistics record (atomic operation to prevent race condition).
   */
  async remove(id: number) {
    try {
      await this.prisma.logistics.delete({
        where: { id },
      });
    } catch (error) {
      this.handlePrismaError(
        error,
        'P2025',
        `Logistics record with ID ${id} not found`,
      );
    }
  }

  /**
   * Build where clause for logistics queries.
   */
  private buildWhereClause(filters: {
    orderId?: number;
    orderItemId?: number;
    trackingNo?: string;
    carrier?: string;
  }): Prisma.LogisticsWhereInput {
    const where: Prisma.LogisticsWhereInput = {};

    if (filters.orderId) {
      where.orderItem = { orderId: filters.orderId };
    }

    if (filters.orderItemId) {
      where.orderItemId = filters.orderItemId;
    }

    if (filters.trackingNo) {
      where.trackingNo = { contains: filters.trackingNo };
    }

    if (filters.carrier) {
      where.carrier = { contains: filters.carrier };
    }

    return where;
  }

  /**
   * Handle Prisma errors and convert to appropriate HTTP exceptions.
   * @throws NotFoundException for specified error code
   * @throws Original error for other cases
   */
  private handlePrismaError(
    error: unknown,
    expectedCode: string,
    message: string,
  ): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === expectedCode
    ) {
      throw new NotFoundException(message);
    }
    throw error;
  }
}
