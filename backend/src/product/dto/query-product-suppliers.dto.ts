import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';

/**
 * Allowed sort fields for ProductSupplier queries.
 */
export enum ProductSupplierSortField {
  createdAt = 'createdAt',
  supplierName = 'supplierName',
  purchasePrice = 'purchasePrice',
  minOrderQty = 'minOrderQty',
  leadTimeDays = 'leadTimeDays',
}

/**
 * DTO for querying product suppliers with pagination and filtering.
 */
export class QueryProductSuppliersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ProductSupplierSortField,
    default: ProductSupplierSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(ProductSupplierSortField)
  sortBy?: ProductSupplierSortField = ProductSupplierSortField.createdAt;

  @ApiPropertyOptional({
    description: 'Filter by supplier company name (fuzzy search)',
    example: 'Motor Co',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  supplierName?: string;
}
