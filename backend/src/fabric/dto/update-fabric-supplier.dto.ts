import { IsNumber, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a fabric-supplier association.
 * All fields are optional for partial updates.
 */
export class UpdateFabricSupplierDto {
  @ApiPropertyOptional({
    description: 'Updated purchase price (2 decimal places)',
    example: 50.0,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Updated minimum order quantity (2 decimal places)',
    example: 200,
    minimum: 0,
    maximum: 999999.99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  minOrderQty?: number;

  @ApiPropertyOptional({
    description: 'Updated lead time in days',
    example: 14,
    minimum: 0,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  leadTimeDays?: number;
}
