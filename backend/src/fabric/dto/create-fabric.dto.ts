import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  IsObject,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

// Trim transform helper
const trimTransform = ({ value }: { value: unknown }): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

export class CreateFabricDto {
  @ApiProperty({
    description: 'Fabric code (unique identifier)',
    example: 'FB-2401-0001',
  })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  fabricCode!: string;

  @ApiProperty({
    description: 'Fabric name',
    example: 'Premium Cotton Twill',
  })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Material information (JSON object)',
    example: { primary: 'cotton', secondary: 'polyester' },
  })
  @IsOptional()
  @IsObject()
  material?: Prisma.InputJsonValue;

  @ApiPropertyOptional({
    description: 'Fabric composition',
    example: '80% Cotton, 20% Polyester',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  composition?: string;

  @ApiPropertyOptional({
    description: 'Fabric color',
    example: 'Navy Blue',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string;

  @ApiPropertyOptional({
    description: 'Fabric weight in g/m²',
    example: 280.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999.99)
  weight?: number;

  @ApiPropertyOptional({
    description: 'Fabric width in cm',
    example: 150.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999.99)
  width?: number;

  @ApiPropertyOptional({
    description: 'Fabric thickness',
    example: 'Medium',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  thickness?: string;

  @ApiPropertyOptional({
    description: 'Hand feel description',
    example: 'Soft and smooth',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  handFeel?: string;

  @ApiPropertyOptional({
    description: 'Gloss level',
    example: 'Matte',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  glossLevel?: string;

  @ApiPropertyOptional({
    description: 'Application scenarios (JSON array)',
    example: ['apparel', 'home-textile'],
  })
  @IsOptional()
  @IsArray()
  application?: Prisma.InputJsonValue;

  @ApiPropertyOptional({
    description: 'Default selling price',
    example: 45.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  defaultPrice?: number;

  @ApiPropertyOptional({
    description: 'Default lead time in days',
    example: 14,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  defaultLeadTime?: number;

  @ApiPropertyOptional({
    description: 'Detailed description',
    example: 'High-quality cotton twill fabric suitable for workwear.',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization (JSON array)',
    example: ['premium', 'workwear', 'durable'],
  })
  @IsOptional()
  @IsArray()
  tags?: Prisma.InputJsonValue;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Minimum order quantity: 100 meters',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
