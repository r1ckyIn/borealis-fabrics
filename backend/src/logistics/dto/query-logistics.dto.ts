import { IsInt, IsOptional, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Allowed sort fields for logistics queries (whitelist for SQL injection prevention)
 */
export enum LogisticsSortField {
  ID = 'id',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SHIPPED_AT = 'shippedAt',
  CARRIER = 'carrier',
  TRACKING_NO = 'trackingNo',
}

export class QueryLogisticsDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: LogisticsSortField,
    default: LogisticsSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(LogisticsSortField)
  sortBy?: LogisticsSortField = LogisticsSortField.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Filter by order ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderId?: number;

  @ApiPropertyOptional({
    description: 'Filter by order item ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderItemId?: number;

  @ApiPropertyOptional({
    description: 'Filter by tracking number (partial match)',
    example: 'SF123',
  })
  @IsOptional()
  @IsString()
  trackingNo?: string;

  @ApiPropertyOptional({
    description: 'Filter by carrier (partial match)',
    example: '顺丰',
  })
  @IsOptional()
  @IsString()
  carrier?: string;
}
