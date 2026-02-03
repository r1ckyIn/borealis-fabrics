import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Trim transform helper
const trimTransform = ({ value }: { value: unknown }): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

/**
 * DTO for cancelling an order item.
 */
export class CancelItemDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation (recorded in timeline)',
    example: 'Customer requested cancellation',
    maxLength: 500,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * DTO for restoring a cancelled order item.
 */
export class RestoreItemDto {
  @ApiPropertyOptional({
    description: 'Reason for restoration (recorded in timeline)',
    example: 'Customer changed mind',
    maxLength: 500,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
