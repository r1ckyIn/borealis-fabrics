import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';
import { trimTransform } from '../../common/transforms';
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
    description:
      'Unified keyword search across companyName, contactName, phone',
    example: 'Furniture',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Filter by company name (fuzzy search)',
    example: 'Furniture',
  })
  @Transform(trimTransform)
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
}
