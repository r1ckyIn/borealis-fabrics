import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';
import { trimTransform } from '../../common/transforms';
import { ProductCategory, ProductSubCategory } from '../../system/enums';

/**
 * Allowed sort fields for Product queries.
 * Whitelist validation to prevent Prisma query injection.
 */
export enum ProductSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  productCode = 'productCode',
  name = 'name',
  defaultPrice = 'defaultPrice',
  subCategory = 'subCategory',
}

/**
 * DTO for querying products with pagination, filtering, and sorting.
 */
export class QueryProductDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ProductSortField,
    default: ProductSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(ProductSortField)
  sortBy?: ProductSortField = ProductSortField.createdAt;

  @ApiPropertyOptional({
    description:
      'Unified keyword search across name, productCode, and modelNumber',
    example: 'iron',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Filter by sub-category',
    enum: ProductSubCategory,
  })
  @IsOptional()
  @IsEnum(ProductSubCategory)
  subCategory?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: ProductCategory,
  })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status (soft delete filter)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean | undefined;
  })
  isActive?: boolean = true;
}
