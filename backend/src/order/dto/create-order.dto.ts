import {
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddOrderItemDto } from './add-order-item.dto';
import { trimTransform } from './dto.utils';

/**
 * DTO for creating a new order.
 * Must include at least one order item.
 */
export class CreateOrderDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  customerId!: number;

  @ApiPropertyOptional({
    description: 'Delivery address (full address text)',
    example: '广东省深圳市南山区科技园路123号A栋501室',
    maxLength: 1000,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deliveryAddress?: string;

  @ApiPropertyOptional({
    description: 'Order notes',
    example: 'Rush order, deliver ASAP',
    maxLength: 2000,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    description: 'Order items (must have at least one)',
    type: [AddOrderItemDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Order must have at least one item' })
  @ValidateNested({ each: true })
  @Type(() => AddOrderItemDto)
  items!: AddOrderItemDto[];
}
