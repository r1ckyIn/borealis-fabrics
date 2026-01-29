import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';

/**
 * Allowed sort fields for SupplierFabrics queries.
 * Whitelist validation to prevent Prisma query failures.
 */
export enum SupplierFabricSortField {
  createdAt = 'createdAt',
  fabricCode = 'fabricCode',
  fabricName = 'fabricName',
  purchasePrice = 'purchasePrice',
  minOrderQty = 'minOrderQty',
  leadTimeDays = 'leadTimeDays',
}

export class QuerySupplierFabricsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: SupplierFabricSortField,
    default: SupplierFabricSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(SupplierFabricSortField)
  sortBy?: SupplierFabricSortField = SupplierFabricSortField.createdAt;

  @ApiPropertyOptional({
    description: 'Filter by fabric code (fuzzy search)',
    example: 'FB-2401',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  fabricCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by fabric name (fuzzy search)',
    example: 'Cotton',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  fabricName?: string;

  @ApiPropertyOptional({
    description: 'Filter by fabric color (exact match)',
    example: 'Navy Blue',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  color?: string;
}
