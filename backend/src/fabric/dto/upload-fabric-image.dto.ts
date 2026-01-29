import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadFabricImageDto {
  @ApiPropertyOptional({
    description: 'Sort order for image display (0-999)',
    example: 0,
    minimum: 0,
    maximum: 999,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}
