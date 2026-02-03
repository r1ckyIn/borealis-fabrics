import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Trim transform helper
const trimTransform = ({ value }: { value: unknown }): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

/**
 * DTO for creating an order item within CreateOrderDto.
 */
export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Fabric ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  fabricId!: number;

  @ApiPropertyOptional({
    description: 'Supplier ID (optional, can be set later)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  supplierId?: number;

  @ApiPropertyOptional({
    description: 'Related quote ID (optional)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quoteId?: number;

  @ApiProperty({
    description: 'Quantity in meters',
    example: 100.5,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000, { message: 'Quantity cannot exceed 1,000,000 meters' })
  quantity!: number;

  @ApiProperty({
    description: 'Sale price per meter',
    example: 35.5,
    minimum: 0.01,
    maximum: 100000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000, { message: 'Sale price cannot exceed 100,000' })
  salePrice!: number;

  @ApiPropertyOptional({
    description: 'Purchase price per meter (cost from supplier)',
    example: 25.0,
    minimum: 0.01,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000, { message: 'Purchase price cannot exceed 100,000' })
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Required delivery date (ISO 8601 format)',
    example: '2026-02-28',
  })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Notes for this item',
    example: 'Urgent order',
    maxLength: 2000,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
