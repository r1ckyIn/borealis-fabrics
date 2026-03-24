import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  IsArray,
  ArrayNotEmpty,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerPayStatus, PaymentMethod } from '../enums/order-status.enum';
import { trimTransform } from './dto.utils';

/**
 * DTO for updating supplier payment information.
 * Note: CustomerPayStatus is reused for supplier payment status (unpaid/partial/paid).
 */
export class UpdateSupplierPaymentDto {
  @ApiPropertyOptional({
    description: 'Amount paid to supplier',
    example: 3000.0,
    minimum: 0,
    maximum: 100000000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000000, { message: 'Amount cannot exceed 100,000,000' })
  paid?: number;

  @ApiPropertyOptional({
    description: 'Payment status',
    enum: CustomerPayStatus,
    example: CustomerPayStatus.PARTIAL,
  })
  @IsOptional()
  @IsEnum(CustomerPayStatus)
  payStatus?: CustomerPayStatus;

  @ApiPropertyOptional({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.BANK,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  payMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Credit days for payment (if credit payment)',
    example: 30,
    minimum: 0,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  creditDays?: number;

  @ApiPropertyOptional({
    description: 'Payment date (ISO 8601 format)',
    example: '2026-02-15',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({
    description: 'Payment notes',
    example: 'Bank transfer reference: TXN123456',
    maxLength: 500,
  })
  @Transform(trimTransform)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({
    description: 'File IDs of uploaded voucher documents',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one voucher file is required' })
  @IsInt({ each: true })
  voucherFileIds!: number[];

  @ApiPropertyOptional({
    description: 'Optional remarks for each voucher file',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  voucherRemarks?: string[];
}
