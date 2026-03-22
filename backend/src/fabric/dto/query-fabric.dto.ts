import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';
import { trimTransform } from '../../common/transforms';

/**
 * Allowed sort fields for Fabric queries.
 * Whitelist validation to prevent Prisma query injection.
 */
export enum FabricSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  fabricCode = 'fabricCode',
  name = 'name',
  color = 'color',
  defaultPrice = 'defaultPrice',
}

export class QueryFabricDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: FabricSortField,
    default: FabricSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(FabricSortField)
  sortBy?: FabricSortField = FabricSortField.createdAt;

  @ApiPropertyOptional({
    description: 'Unified keyword search across fabricCode, name, and color',
    example: 'Cotton',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Filter by fabric code (fuzzy search)',
    example: 'FB-2401',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  fabricCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by fabric name (fuzzy search)',
    example: 'Cotton',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by color (exact match)',
    example: 'Navy Blue',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  color?: string;

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
