import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerPayStatus, PaymentMethod } from '../enums/order-status.enum';

// Trim transform helper
const trimTransform = ({ value }: { value: unknown }): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

/**
 * DTO for updating customer payment information on an order.
 */
export class UpdateCustomerPaymentDto {
  @ApiPropertyOptional({
    description: 'Amount paid by customer',
    example: 5000.0,
    minimum: 0,
    maximum: 100000000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000000, { message: 'Amount cannot exceed 100,000,000' })
  customerPaid?: number;

  @ApiPropertyOptional({
    description: 'Payment status',
    enum: CustomerPayStatus,
    example: CustomerPayStatus.PARTIAL,
  })
  @IsOptional()
  @IsEnum(CustomerPayStatus)
  customerPayStatus?: CustomerPayStatus;

  @ApiPropertyOptional({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.BANK,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  customerPayMethod?: PaymentMethod;

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
  customerCreditDays?: number;

  @ApiPropertyOptional({
    description: 'Payment date (ISO 8601 format)',
    example: '2026-02-15',
  })
  @IsOptional()
  @IsDateString()
  customerPaidAt?: string;

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
}
