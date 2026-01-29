import { IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating a special pricing record.
 * The specialPrice field is required since it's the only updatable field.
 */
export class UpdateFabricPricingDto {
  @ApiProperty({
    description: 'Updated special price (2 decimal places)',
    example: 99.99,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  specialPrice!: number;
}
