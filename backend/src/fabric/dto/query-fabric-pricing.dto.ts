import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';

/**
 * Allowed sort fields for fabric pricing queries.
 */
export enum FabricPricingSortField {
  createdAt = 'createdAt',
  specialPrice = 'specialPrice',
  customerName = 'customerName',
}

/**
 * DTO for querying fabric pricing records with pagination and filtering.
 */
export class QueryFabricPricingDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: FabricPricingSortField,
    default: FabricPricingSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(FabricPricingSortField)
  sortBy?: FabricPricingSortField = FabricPricingSortField.createdAt;

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
