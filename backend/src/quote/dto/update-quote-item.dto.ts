import {
  IsOptional,
  IsInt,
  IsNumber,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { trimTransform } from '../../common/transforms';
import { IsIntegerWhenFieldPresent } from '../../common/validators/integer-quantity.validator';

/**
 * DTO for updating a single quote item.
 * productId is included as context so DTO-level integer validation fires
 * for non-fabric items (per user locked decision).
 */
export class UpdateQuoteItemDto {
  @ApiPropertyOptional({
    description: 'Product ID context for integer validation',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({
    description: 'Quantity (integer for non-fabric items)',
    example: 100,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsIntegerWhenFieldPresent('productId', {
    message: 'Non-fabric product quantity must be a whole number',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000, { message: 'Quantity cannot exceed 1,000,000' })
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Unit price',
    example: 25.5,
    minimum: 0.01,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000, { message: 'Unit price cannot exceed 100,000' })
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Notes for this item', maxLength: 2000 })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
