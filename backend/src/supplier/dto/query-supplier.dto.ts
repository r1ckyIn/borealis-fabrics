import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';
import { trimTransform } from '../../common/transforms';
import { SupplierStatus, SettleType } from './create-supplier.dto';

/**
 * Allowed sort fields for Supplier queries.
 * Whitelist validation to prevent Prisma query failures.
 */
export enum SupplierSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  companyName = 'companyName',
  status = 'status',
  settleType = 'settleType',
}

export class QuerySupplierDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: SupplierSortField,
    default: SupplierSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(SupplierSortField)
  sortBy?: SupplierSortField = SupplierSortField.createdAt;

  @ApiPropertyOptional({
    description:
      'Unified keyword search across companyName, contactName, phone',
    example: 'Textiles',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Filter by company name (fuzzy search)',
    example: 'Textiles',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Filter by supplier status',
    enum: SupplierStatus,
  })
  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @ApiPropertyOptional({
    description: 'Filter by settlement type',
    enum: SettleType,
  })
  @IsOptional()
  @IsEnum(SettleType)
  settleType?: SettleType;

  @ApiPropertyOptional({
    description:
      'Filter by fabric ID — only return suppliers linked via FabricSupplier',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  fabricId?: number;

  @ApiPropertyOptional({
    description:
      'Include soft-deleted records in results (admin only). Query params arrive as strings so "true" is transformed.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  includeDeleted?: boolean;
}
