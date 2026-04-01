import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { EnumsResponseDto } from './dto/enums-response.dto';
import { HealthResponseDto, ReadyResponseDto } from './dto/health-response.dto';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Basic health check',
    description:
      'Returns OK if the service is running. Used for liveness probes.',
  })
  @ApiOkResponse({
    description: 'Service is healthy',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return this.systemService.getHealth();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Verifies database and Redis connections. Used for readiness probes.',
  })
  @ApiOkResponse({
    description: 'Readiness check result',
    type: ReadyResponseDto,
  })
  async getReady(): Promise<ReadyResponseDto> {
    return this.systemService.getReady();
  }

  @Get('enums')
  @ApiOperation({
    summary: 'Get all system enums',
    description:
      'Returns all business enums with their values and Chinese labels.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved all enums',
    type: EnumsResponseDto,
  })
  async getEnums(): Promise<EnumsResponseDto> {
    return this.systemService.getAllEnums();
  }
}
