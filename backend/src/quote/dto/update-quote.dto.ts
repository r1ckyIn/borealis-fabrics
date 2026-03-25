import { IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { trimTransform } from '../../common/transforms';

/**
 * Update quote DTO.
 * Only allows updating quote-level fields (validUntil, notes).
 * Item management is through dedicated add/update/remove endpoints.
 * Only quotes with status 'active' or 'expired' can be updated.
 */
export class UpdateQuoteDto {
  @ApiPropertyOptional({ description: 'Quote valid until date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Additional notes', maxLength: 2000 })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
