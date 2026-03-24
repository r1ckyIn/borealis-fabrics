import {
  IsInt,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a product-supplier association.
 * Links a product to a supplier with purchase price and order details.
 */
export class CreateProductSupplierDto {
  @ApiProperty({
    description: 'Supplier ID to associate with the product',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  supplierId!: number;

  @ApiProperty({
    description: 'Purchase price from this supplier (2 decimal places)',
    example: 450.0,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0.01)
  @Max(999999.99)
  purchasePrice!: number;

  @ApiPropertyOptional({
    description: 'Minimum order quantity (2 decimal places)',
    example: 10,
    minimum: 0,
    maximum: 999999.99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  minOrderQty?: number;

  @ApiPropertyOptional({
    description: 'Lead time in days',
    example: 7,
    minimum: 0,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  leadTimeDays?: number;
}
