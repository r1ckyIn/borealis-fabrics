import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/common.module';
import {
  OrderItemStatus,
  CustomerPayStatus,
} from '../../order/enums/order-status.enum';

// Trim transform helper
const trimTransform = ({ value }: { value: unknown }): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

/**
 * Allowed sort fields for Customer Orders queries.
 */
export enum CustomerOrderSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  totalAmount = 'totalAmount',
  orderCode = 'orderCode',
}

export class QueryCustomerOrdersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: CustomerOrderSortField,
    default: CustomerOrderSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(CustomerOrderSortField)
  override sortBy?: string = CustomerOrderSortField.createdAt;

  @ApiPropertyOptional({
    description: 'Filter by order status (aggregate status)',
    enum: OrderItemStatus,
  })
  @IsOptional()
  @IsEnum(OrderItemStatus)
  status?: OrderItemStatus;

  @ApiPropertyOptional({
    description: 'Filter by customer payment status',
    enum: CustomerPayStatus,
  })
  @IsOptional()
  @IsEnum(CustomerPayStatus)
  customerPayStatus?: CustomerPayStatus;

  @ApiPropertyOptional({
    description: 'Search keyword (order code)',
    example: 'ORD-2601',
    maxLength: 100,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Filter by orders created on or after this date (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by orders created on or before this date (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
