import { IsOptional, IsString, IsInt, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { trimTransform } from './dto.utils';

/**
 * DTO for updating an order's basic information.
 * Only basic fields can be updated (customer, address, notes).
 * Items are managed through separate endpoints.
 */
export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Customer ID (change customer)',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiPropertyOptional({
    description: 'Delivery address',
    example: '浙江省杭州市西湖区xxx路xxx号',
    maxLength: 1000,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deliveryAddress?: string;

  @ApiPropertyOptional({
    description: 'Order notes',
    example: 'Updated delivery instructions',
    maxLength: 2000,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
