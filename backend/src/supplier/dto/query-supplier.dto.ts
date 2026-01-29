import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';
import { SupplierStatus, SettleType } from './create-supplier.dto';

export class QuerySupplierDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by company name (fuzzy search)',
    example: 'Textiles',
  })
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
