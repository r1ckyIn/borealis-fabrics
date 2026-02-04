import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents a single failure during import
 */
export class ImportFailureDto {
  @ApiProperty({ description: 'Excel row number (1-based, including header)' })
  rowNumber!: number;

  @ApiProperty({ description: 'Identifier (fabricCode or companyName)' })
  identifier!: string;

  @ApiProperty({ description: 'Reason for failure' })
  reason!: string;
}

/**
 * Import result response DTO
 */
export class ImportResultDto {
  @ApiProperty({ description: 'Number of successfully imported records' })
  successCount!: number;

  @ApiProperty({ description: 'Number of failed records' })
  failureCount!: number;

  @ApiProperty({
    description: 'Details of failed records',
    type: [ImportFailureDto],
  })
  failures!: ImportFailureDto[];
}
