import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SupplierStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ELIMINATED = 'eliminated',
}

export enum SettleType {
  PREPAY = 'prepay',
  CREDIT = 'credit',
}

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Company name (unique)',
    example: 'ABC Textiles',
  })
  @IsString()
  @MaxLength(200)
  companyName!: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '13800138000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'WeChat ID', example: 'wechat_id_123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  wechat?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'contact@abc-textiles.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({
    description: 'Company address',
    example: '123 Fabric Street, Textile City',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    description: 'Supplier status',
    enum: SupplierStatus,
    default: SupplierStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus = SupplierStatus.ACTIVE;

  @ApiPropertyOptional({
    description: 'Bill receive type',
    example: 'invoice',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billReceiveType?: string;

  @ApiPropertyOptional({
    description: 'Settlement type',
    enum: SettleType,
    default: SettleType.PREPAY,
  })
  @IsOptional()
  @IsEnum(SettleType)
  settleType?: SettleType = SettleType.PREPAY;

  @ApiPropertyOptional({
    description: 'Credit days (only applicable when settleType is credit)',
    example: 30,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  creditDays?: number;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Premium supplier with fast delivery',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
