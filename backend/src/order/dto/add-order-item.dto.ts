import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimTransform } from './dto.utils';
import { IsXorWith } from '../../common/validators/xor-field.validator';
import { IsIntegerWhenFieldPresent } from '../../common/validators/integer-quantity.validator';

/**
 * DTO for adding a new item to an existing order.
 * Supports both fabric items (fabricId) and non-fabric product items (productId).
 * Exactly one of fabricId or productId must be provided (XOR constraint).
 */
export class AddOrderItemDto {
  @ApiPropertyOptional({
    description: 'Fabric ID (for fabric items)',
    example: 1,
  })
  @ValidateIf((o: AddOrderItemDto) => !o.productId)
  @IsInt()
  @Min(1)
  fabricId?: number;

  @ApiPropertyOptional({
    description: 'Product ID (for non-fabric items)',
    example: 1,
  })
  @IsXorWith('fabricId', {
    message: 'Exactly one of fabricId or productId must be provided',
  })
  @ValidateIf((o: AddOrderItemDto) => !o.fabricId)
  @IsInt()
  @Min(1)
  productId?: number;

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
    description: 'Quantity (unit depends on product type)',
    example: 100.5,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsIntegerWhenFieldPresent('productId', {
    message: 'Non-fabric product quantity must be a whole number',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000, { message: 'Quantity cannot exceed 1,000,000' })
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Unit of measure (auto-derived if not provided)',
    example: 'meter',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({
    description: 'Sale price per unit',
    example: 35.5,
    minimum: 0.01,
    maximum: 100000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000, { message: 'Sale price cannot exceed 100,000' })
  salePrice!: number;

  @ApiPropertyOptional({
    description: 'Purchase price per unit (cost from supplier)',
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
