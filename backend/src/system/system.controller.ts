import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { EnumsResponseDto } from './dto/enums-response.dto';

@ApiTags('System')
@Controller('api/v1/system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

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
  getEnums(): EnumsResponseDto {
    return this.systemService.getAllEnums();
  }
}
