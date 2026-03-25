import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  ValidateIf,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimTransform } from '../../common/transforms';
import { IsXorWith } from '../../common/validators/xor-field.validator';
import { IsIntegerWhenFieldPresent } from '../../common/validators/integer-quantity.validator';

/**
 * Quote status enum.
 * - active: Valid quote
 * - expired: Quote has passed validUntil date (auto-marked by scheduler)
 * - converted: All items converted to order
 * - partially_converted: Some items converted to order
 */
export enum QuoteStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
  PARTIALLY_CONVERTED = 'partially_converted',
}

/**
 * DTO for a single quote item.
 * Supports both fabric items (fabricId) and non-fabric product items (productId).
 * Exactly one of fabricId or productId must be provided (XOR constraint).
 */
export class CreateQuoteItemDto {
  @ApiPropertyOptional({ description: 'Fabric ID (for fabric items)', example: 1 })
  @ValidateIf((o: CreateQuoteItemDto) => !o.productId)
  @IsInt()
  @Min(1)
  fabricId?: number;

  @ApiPropertyOptional({ description: 'Product ID (for non-fabric items)', example: 1 })
  @IsXorWith('fabricId', {
    message: 'Exactly one of fabricId or productId must be provided',
  })
  @ValidateIf((o: CreateQuoteItemDto) => !o.fabricId)
  @IsInt()
  @Min(1)
  productId?: number;

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

  @ApiProperty({
    description: 'Unit price',
    example: 25.5,
    minimum: 0.01,
    maximum: 100000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000, { message: 'Unit price cannot exceed 100,000' })
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Unit of measure', example: 'meter' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ description: 'Notes for this item', maxLength: 2000 })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/**
 * DTO for creating a quote with one or more items.
 * Quote is a header (customer, validity, notes) with nested QuoteItem children.
 */
export class CreateQuoteDto {
  @ApiProperty({ description: 'Customer ID', example: 1 })
  @IsInt()
  @Min(1)
  customerId!: number;

  @ApiProperty({
    description: 'Quote valid until date (ISO 8601 format)',
    example: '2026-02-28T23:59:59.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  validUntil!: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    maxLength: 2000,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    description: 'Quote items (at least one)',
    type: [CreateQuoteItemDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Quote must have at least one item' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items!: CreateQuoteItemDto[];
}
