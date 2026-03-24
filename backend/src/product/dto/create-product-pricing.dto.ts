import { IsInt, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a special pricing record for a product-customer pair.
 * Used when setting customer-specific pricing from the product perspective.
 */
export class CreateProductPricingDto {
  @ApiProperty({
    description: 'Customer ID to set special pricing for',
    example: 5,
  })
  @IsInt()
  @IsNotEmpty()
  customerId!: number;

  @ApiProperty({
    description: 'Special price for this customer (2 decimal places)',
    example: 1099.99,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0.01)
  @Max(999999.99)
  specialPrice!: number;
}
