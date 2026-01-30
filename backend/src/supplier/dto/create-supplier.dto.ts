import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Custom validator: creditDays is only allowed when settleType is 'credit'.
 * If settleType is 'prepay' and creditDays is provided, validation fails.
 *
 * Note: This validator checks 'settleType' field (used in Supplier model).
 * CustomerModule has a similar validator that checks 'creditType' field.
 * The field name difference is intentional per database schema design.
 */
function IsCreditDaysValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCreditDaysValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object as { settleType?: string };
          // If creditDays is not provided, always valid
          if (value === undefined || value === null) {
            return true;
          }
          // creditDays is only valid when settleType is 'credit'
          return obj.settleType === 'credit';
        },
        defaultMessage() {
          return 'creditDays can only be set when settleType is credit';
        },
      },
    });
  };
}

// Trim transform helper
const trimTransform = ({ value }: { value: unknown }): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

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
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName!: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'John Doe',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '13800138000' })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'WeChat ID', example: 'wechat_id_123' })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  wechat?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'contact@abc-textiles.com',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({
    description: 'Company address',
    example: '123 Fabric Street, Textile City',
  })
  @Transform(trimTransform)
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
  @Transform(trimTransform)
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
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  @IsCreditDaysValid()
  creditDays?: number;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Premium supplier with fast delivery',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
