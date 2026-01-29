import { ApiProperty } from '@nestjs/swagger';

export class FabricImageResponseDto {
  @ApiProperty({ description: 'Fabric image ID', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Associated fabric ID', example: 1 })
  fabricId!: number;

  @ApiProperty({
    description: 'Image URL',
    example: 'http://localhost:3000/uploads/uuid-123.jpg',
  })
  url!: string;

  @ApiProperty({ description: 'Sort order for display', example: 0 })
  sortOrder!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;
}
