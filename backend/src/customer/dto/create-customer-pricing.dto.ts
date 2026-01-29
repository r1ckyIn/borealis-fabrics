import { IsInt, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a customer special pricing record.
 * Links a customer to a fabric with a special price.
 */
export class CreateCustomerPricingDto {
  @ApiProperty({
    description: 'Fabric ID to set special pricing for',
    example: 10,
  })
  @IsInt()
  @IsNotEmpty()
  fabricId!: number;

  @ApiProperty({
    description: 'Special price for this customer (2 decimal places)',
    example: 89.99,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0.01)
  @Max(999999.99)
  specialPrice!: number;
}
