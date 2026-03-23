import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemStatus } from '../enums/order-status.enum';
import { trimTransform } from './dto.utils';

/**
 * DTO for updating an order item's status.
 */
export class UpdateItemStatusDto {
  @ApiProperty({
    description: 'New status for the order item',
    enum: OrderItemStatus,
    example: OrderItemStatus.PENDING,
  })
  @IsEnum(OrderItemStatus)
  status!: OrderItemStatus;

  @ApiPropertyOptional({
    description: 'Remark for this status change (recorded in timeline)',
    example: 'Customer confirmed order',
    maxLength: 500,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
