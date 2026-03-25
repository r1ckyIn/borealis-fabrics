import { IsArray, ArrayMinSize, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for converting specific quote items to an order.
 * All items must belong to the same quote.
 * Creates a new order or adds to an existing one.
 */
export class ConvertQuoteItemsDto {
  @ApiProperty({
    description: 'Array of QuoteItem IDs to convert',
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one quote item ID is required' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  quoteItemIds!: number[];

  @ApiPropertyOptional({
    description: 'Existing order ID to add items to (omit to create new order)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  orderId?: number;
}
