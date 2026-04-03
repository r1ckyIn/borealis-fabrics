import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { EnumsResponseDto, EnumDefinitionDto } from './dto/enums-response.dto';
import { HealthResponseDto, ReadyResponseDto } from './dto/health-response.dto';
import {
  OrderItemStatus,
  CustomerPayStatus,
  PaymentMethod,
  QuoteStatus,
  SupplierStatus,
  SettleType,
  ProductCategory,
  ProductSubCategory,
  ORDER_ITEM_STATUS_LABELS,
  CUSTOMER_PAY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  QUOTE_STATUS_LABELS,
  SUPPLIER_STATUS_LABELS,
  SETTLE_TYPE_LABELS,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_SUB_CATEGORY_LABELS,
} from './enums';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}
  /**
   * Get all system enums with their values and Chinese labels.
   * Pure in-memory computation — no caching needed.
   */
  getAllEnums(): EnumsResponseDto {
    return {
      orderItemStatus: this.buildEnumDefinition(
        OrderItemStatus,
        ORDER_ITEM_STATUS_LABELS,
      ),
      customerPayStatus: this.buildEnumDefinition(
        CustomerPayStatus,
        CUSTOMER_PAY_STATUS_LABELS,
      ),
      paymentMethod: this.buildEnumDefinition(
        PaymentMethod,
        PAYMENT_METHOD_LABELS,
      ),
      quoteStatus: this.buildEnumDefinition(QuoteStatus, QUOTE_STATUS_LABELS),
      supplierStatus: this.buildEnumDefinition(
        SupplierStatus,
        SUPPLIER_STATUS_LABELS,
      ),
      settleType: this.buildEnumDefinition(SettleType, SETTLE_TYPE_LABELS),
      productCategory: this.buildEnumDefinition(
        ProductCategory,
        PRODUCT_CATEGORY_LABELS,
      ),
      productSubCategory: this.buildEnumDefinition(
        ProductSubCategory,
        PRODUCT_SUB_CATEGORY_LABELS,
      ),
    };
  }

  /**
   * Build an enum definition with values and labels.
   * Note: All enums are string enums, so Object.values returns only string values.
   */
  private buildEnumDefinition(
    enumObj: Record<string, string>,
    labels: Record<string, string>,
  ): EnumDefinitionDto {
    return {
      values: Object.values(enumObj),
      labels,
    };
  }

  /**
   * Basic health check - returns OK if the service is running.
   */
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness check - verifies database and Redis connections.
   */
  async getReady(): Promise<ReadyResponseDto> {
    const checks: ReadyResponseDto['checks'] = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const allOk = Object.values(checks).every((status) => status === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return 'error';
    }
  }

  private async checkRedis(): Promise<'ok' | 'error'> {
    try {
      await this.redis.ping();
      return 'ok';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return 'error';
    }
  }
}
