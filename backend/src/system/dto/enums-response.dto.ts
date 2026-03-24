import { ApiProperty } from '@nestjs/swagger';

/**
 * Single enum definition with values and Chinese labels.
 */
export class EnumDefinitionDto {
  @ApiProperty({
    description: 'All possible enum values',
    example: ['INQUIRY', 'PENDING', 'ORDERED'],
  })
  values!: string[];

  @ApiProperty({
    description: 'Chinese labels for each enum value',
    example: { INQUIRY: '询价中', PENDING: '待下单' },
  })
  labels!: Record<string, string>;
}

/**
 * Response DTO for GET /system/enums endpoint.
 */
export class EnumsResponseDto {
  @ApiProperty({
    description: 'Order item status enum',
    type: EnumDefinitionDto,
  })
  orderItemStatus!: EnumDefinitionDto;

  @ApiProperty({
    description: 'Customer payment status enum',
    type: EnumDefinitionDto,
  })
  customerPayStatus!: EnumDefinitionDto;

  @ApiProperty({
    description: 'Payment method enum',
    type: EnumDefinitionDto,
  })
  paymentMethod!: EnumDefinitionDto;

  @ApiProperty({
    description: 'Quote status enum',
    type: EnumDefinitionDto,
  })
  quoteStatus!: EnumDefinitionDto;

  @ApiProperty({
    description: 'Supplier status enum',
    type: EnumDefinitionDto,
  })
  supplierStatus!: EnumDefinitionDto;

  @ApiProperty({
    description: 'Settlement type enum',
    type: EnumDefinitionDto,
  })
  settleType!: EnumDefinitionDto;

  @ApiProperty({
    description: 'Product category enum',
    type: EnumDefinitionDto,
  })
  productCategory!: EnumDefinitionDto;

  @ApiProperty({
    description: 'Product sub-category enum',
    type: EnumDefinitionDto,
  })
  productSubCategory!: EnumDefinitionDto;
}
