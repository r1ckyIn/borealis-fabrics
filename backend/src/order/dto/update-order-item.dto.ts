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
import { ApiPropertyOptional } from '@nestjs/swagger';

// Trim transform helper
const trimTransform = ({ value }: { value: unknown }): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

/**
 * DTO for updating an existing order item.
 * All fields are optional.
 * Note: Updates are only allowed when item status is INQUIRY or PENDING.
 */
export class UpdateOrderItemDto {
  @ApiPropertyOptional({
    description: 'Supplier ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  supplierId?: number;

  @ApiPropertyOptional({
    description: 'Related quote ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quoteId?: number;

  @ApiPropertyOptional({
    description: 'Quantity in meters',
    example: 100.5,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000, { message: 'Quantity cannot exceed 1,000,000 meters' })
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Sale price per meter',
    example: 35.5,
    minimum: 0.01,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000, { message: 'Sale price cannot exceed 100,000' })
  salePrice?: number;

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
