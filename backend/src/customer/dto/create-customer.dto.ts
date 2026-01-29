import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Custom validator: creditDays is only allowed when creditType is 'credit'.
 * If creditType is 'prepay' and creditDays is provided, validation fails.
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
          const obj = args.object as { creditType?: string };
          // If creditDays is not provided, always valid
          if (value === undefined || value === null) {
            return true;
          }
          // creditDays is only valid when creditType is 'credit'
          return obj.creditType === 'credit';
        },
        defaultMessage() {
          return 'creditDays can only be set when creditType is credit';
        },
      },
    });
  };
}

// Trim transform helper
const trimTransform = ({ value }: { value: unknown }): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

/**
 * Credit type for customer payment terms.
 */
export enum CreditType {
  PREPAY = 'prepay',
  CREDIT = 'credit',
}

/**
 * Address DTO for customer delivery addresses.
 * Similar to Taobao shipping address structure.
 */
export class AddressDto {
  @ApiProperty({ description: 'Province', example: '广东省' })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  province!: string;

  @ApiProperty({ description: 'City', example: '深圳市' })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  city!: string;

  @ApiProperty({ description: 'District', example: '南山区' })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  district!: string;

  @ApiProperty({
    description: 'Detail address (street + building number)',
    example: '科技园路123号A栋501室',
  })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  detailAddress!: string;

  @ApiProperty({ description: 'Contact person name', example: '张三' })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName!: string;

  @ApiProperty({ description: 'Contact phone number', example: '13800138000' })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  contactPhone!: string;

  @ApiPropertyOptional({
    description: 'Address label (e.g., factory, warehouse)',
    example: '工厂地址',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default address',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Company name',
    example: 'XYZ Furniture Co.',
  })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName!: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'Li Ming',
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

  @ApiPropertyOptional({ description: 'WeChat ID', example: 'wechat_xyz' })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  wechat?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'contact@xyz-furniture.com',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({
    description: 'Delivery addresses (array of address objects)',
    type: [AddressDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];

  @ApiPropertyOptional({
    description: 'Credit type for payment terms',
    enum: CreditType,
    default: CreditType.PREPAY,
  })
  @IsOptional()
  @IsEnum(CreditType)
  creditType?: CreditType = CreditType.PREPAY;

  @ApiPropertyOptional({
    description: 'Credit days (only applicable when creditType is credit)',
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
    example: 'VIP customer, priority delivery',
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
