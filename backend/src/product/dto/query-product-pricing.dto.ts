import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';

/**
 * Allowed sort fields for product pricing queries.
 */
export enum ProductPricingSortField {
  createdAt = 'createdAt',
  specialPrice = 'specialPrice',
  customerName = 'customerName',
}

/**
 * DTO for querying product pricing records with pagination and filtering.
 */
export class QueryProductPricingDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ProductPricingSortField,
    default: ProductPricingSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(ProductPricingSortField)
  sortBy?: ProductPricingSortField = ProductPricingSortField.createdAt;

  @ApiPropertyOptional({
    description: 'Filter by customer company name (fuzzy search)',
    example: 'Furniture',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  customerName?: string;
}
