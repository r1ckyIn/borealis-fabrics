import {
  IsOptional,
  IsEnum,
  IsInt,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination';
import { QuoteStatus } from './create-quote.dto';

/**
 * Allowed sort fields for Quote queries.
 * Whitelist validation to prevent Prisma query failures.
 */
export enum QuoteSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  validUntil = 'validUntil',
  totalPrice = 'totalPrice',
}

export class QueryQuoteDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: QuoteSortField,
    default: QuoteSortField.createdAt,
  })
  @IsOptional()
  @IsEnum(QuoteSortField)
  sortBy?: QuoteSortField = QuoteSortField.createdAt;

  @ApiPropertyOptional({
    description: 'Search keyword (quote code)',
    example: 'QT-2602',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiPropertyOptional({
    description: 'Filter by quote status',
    enum: QuoteStatus,
  })
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @ApiPropertyOptional({
    description: 'Filter by quotes valid on or after this date (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by quotes valid on or before this date (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by quotes created on or after this date (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by quotes created on or before this date (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
