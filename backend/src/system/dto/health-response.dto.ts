import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Health check response DTO.
 */
export class HealthResponseDto {
  @ApiProperty({
    description: 'Health status',
    example: 'ok',
    enum: ['ok', 'error'],
  })
  status!: 'ok' | 'error';

  @ApiProperty({
    description: 'Timestamp of the health check',
    example: '2026-02-05T10:30:00.000Z',
  })
  timestamp!: string;
}

/**
 * Service check status.
 */
export type CheckStatus = 'ok' | 'error' | 'unknown';

/**
 * Readiness check response DTO.
 */
export class ReadyResponseDto {
  @ApiProperty({
    description: 'Overall readiness status',
    example: 'ok',
    enum: ['ok', 'degraded', 'error'],
  })
  status!: 'ok' | 'degraded' | 'error';

  @ApiProperty({
    description: 'Timestamp of the readiness check',
    example: '2026-02-05T10:30:00.000Z',
  })
  timestamp!: string;

  @ApiPropertyOptional({
    description: 'Individual service check results',
    example: { database: 'ok', redis: 'ok' },
  })
  checks?: {
    database: CheckStatus;
    redis: CheckStatus;
  };
}
