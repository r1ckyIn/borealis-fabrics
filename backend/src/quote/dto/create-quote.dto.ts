import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimTransform } from '../../common/transforms';

/**
 * Quote status enum.
 * - active: Valid quote
 * - expired: Quote has passed validUntil date (auto-marked by scheduler)
 * - converted: Quote has been converted to order
 */
export enum QuoteStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
}

export class CreateQuoteDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  customerId!: number;

  @ApiProperty({
    description: 'Fabric ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  fabricId!: number;

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
    description: 'Unit price per meter',
    example: 25.5,
    minimum: 0.01,
    maximum: 100000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000, { message: 'Unit price cannot exceed 100,000' })
  unitPrice!: number;

  @ApiProperty({
    description: 'Quote valid until date (ISO 8601 format)',
    example: '2026-02-28T23:59:59.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  validUntil!: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Special pricing for bulk order',
    maxLength: 2000,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
