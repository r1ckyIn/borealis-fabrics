import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';

/**
 * Allowed sort fields for FabricSupplier queries.
 */
export enum FabricSupplierSortField {
  createdAt = 'createdAt',
  supplierName = 'supplierName',
  purchasePrice = 'purchasePrice',
  minOrderQty = 'minOrderQty',
  leadTimeDays = 'leadTimeDays',
}

/**
 * DTO for querying fabric suppliers with pagination and filtering.
 */
export class QueryFabricSuppliersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: FabricSupplierSortField,
    default: FabricSupplierSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(FabricSupplierSortField)
  sortBy?: FabricSupplierSortField = FabricSupplierSortField.createdAt;

  @ApiPropertyOptional({
    description: 'Filter by supplier company name (fuzzy search)',
    example: 'Textiles',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  supplierName?: string;
}
