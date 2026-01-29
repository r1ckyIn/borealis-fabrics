import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';
import { CreditType } from './create-customer.dto';

/**
 * Allowed sort fields for Customer queries.
 * Whitelist validation to prevent Prisma query failures.
 */
export enum CustomerSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  companyName = 'companyName',
  creditType = 'creditType',
}

export class QueryCustomerDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: CustomerSortField,
    default: CustomerSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(CustomerSortField)
  sortBy?: CustomerSortField = CustomerSortField.createdAt;

  @ApiPropertyOptional({
    description: 'Filter by company name (fuzzy search)',
    example: 'Furniture',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Filter by credit type',
    enum: CreditType,
  })
  @IsOptional()
  @IsEnum(CreditType)
  creditType?: CreditType;

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
