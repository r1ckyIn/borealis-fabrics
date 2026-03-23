import { IsArray, ArrayMinSize, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for batch converting quotes to a single order.
 * All quotes must belong to the same customer and be active/non-expired.
 */
export class ConvertQuotesToOrderDto {
  @ApiProperty({
    description: 'Array of quote IDs to convert',
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one quote ID is required' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  quoteIds!: number[];
}
