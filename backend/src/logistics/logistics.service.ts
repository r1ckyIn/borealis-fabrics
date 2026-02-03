import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLogisticsDto,
  UpdateLogisticsDto,
  QueryLogisticsDto,
} from './dto';

@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new logistics record
   */
  async create(createLogisticsDto: CreateLogisticsDto) {
    const { orderItemId, shippedAt, ...rest } = createLogisticsDto;

    // Verify order item exists
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    if (!orderItem) {
      throw new NotFoundException(
        `Order item with ID ${orderItemId} not found`,
      );
    }

    return this.prisma.logistics.create({
      data: {
        orderItemId,
        ...rest,
        shippedAt: shippedAt ? new Date(shippedAt) : undefined,
      },
    });
  }

  /**
   * Get paginated list of logistics records with filtering
   */
  async findAll(query: QueryLogisticsDto) {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      orderId,
      orderItemId,
      trackingNo,
      carrier,
    } = query;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (orderId) {
      where.orderItem = { orderId };
    }

    if (orderItemId) {
      where.orderItemId = orderItemId;
    }

    if (trackingNo) {
      where.trackingNo = { contains: trackingNo };
    }

    if (carrier) {
      where.carrier = { contains: carrier };
    }

    // Execute queries
    const [items, total] = await Promise.all([
      this.prisma.logistics.findMany({
        where,
        include: {
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
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.logistics.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get logistics record by ID with related order item info
   */
  async findOne(id: number) {
    const logistics = await this.prisma.logistics.findUnique({
      where: { id },
      include: {
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
      },
    });

    if (!logistics) {
      throw new NotFoundException(`Logistics record with ID ${id} not found`);
    }

    return logistics;
  }

  /**
   * Update logistics record (atomic operation to prevent race condition)
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Logistics record with ID ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete logistics record (atomic operation to prevent race condition)
   */
  async remove(id: number) {
    try {
      await this.prisma.logistics.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Logistics record with ID ${id} not found`);
      }
      throw error;
    }
  }
}
