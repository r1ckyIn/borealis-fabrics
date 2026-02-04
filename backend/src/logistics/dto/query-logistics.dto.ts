import {
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';

/**
 * Allowed sort fields for logistics queries (whitelist for SQL injection prevention).
 */
export enum LogisticsSortField {
  ID = 'id',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SHIPPED_AT = 'shippedAt',
  CARRIER = 'carrier',
  TRACKING_NO = 'trackingNo',
}

/**
 * Query parameters for logistics list with filtering and pagination.
 * Extends PaginationDto to inherit page, pageSize, sortBy, sortOrder.
 */
export class QueryLogisticsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Sort field',
    enum: LogisticsSortField,
    default: LogisticsSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(LogisticsSortField)
  override sortBy?: string = LogisticsSortField.CREATED_AT;

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
  @MaxLength(50)
  trackingNo?: string;

  @ApiPropertyOptional({
    description: 'Filter by carrier (partial match)',
    example: '顺丰',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrier?: string;
}
