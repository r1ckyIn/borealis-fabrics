import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLogisticsDto {
  @ApiProperty({
    description: 'Order item ID to associate with this logistics record',
    example: 1,
    minimum: 1,
    maximum: 2147483647,
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(2147483647)
  orderItemId!: number;

  @ApiProperty({
    description: 'Carrier/logistics company name',
    example: '顺丰速运',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  carrier!: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: '张三',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactName?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '13800138000',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Tracking number',
    example: 'SF1234567890',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  trackingNo?: string;

  @ApiPropertyOptional({
    description: 'Shipped date and time',
    example: '2026-02-01T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  shippedAt?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Handle with care',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
