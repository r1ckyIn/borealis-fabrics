import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';
import { trimTransform } from '../../common/transforms';

/**
 * Allowed sort fields for ProductBundle queries.
 */
export enum ProductBundleSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  bundleCode = 'bundleCode',
  name = 'name',
  totalPrice = 'totalPrice',
}

/**
 * DTO for querying product bundles with pagination and filtering.
 */
export class QueryProductBundleDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ProductBundleSortField,
    default: ProductBundleSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(ProductBundleSortField)
  sortBy?: ProductBundleSortField = ProductBundleSortField.createdAt;

  @ApiPropertyOptional({
    description: 'Unified keyword search across bundleCode and name',
    example: 'bed set',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  keyword?: string;
}
