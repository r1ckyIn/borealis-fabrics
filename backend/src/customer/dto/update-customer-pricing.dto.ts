import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a customer special pricing record.
 * Only the special price can be updated.
 */
export class UpdateCustomerPricingDto {
  @ApiPropertyOptional({
    description: 'Updated special price (2 decimal places)',
    example: 99.99,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  specialPrice?: number;
}
