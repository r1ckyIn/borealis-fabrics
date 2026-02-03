import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LogisticsService } from './logistics.service';
import {
  CreateLogisticsDto,
  UpdateLogisticsDto,
  QueryLogisticsDto,
} from './dto';

@ApiTags('logistics')
@Controller('api/v1/logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new logistics record' })
  @ApiBody({ type: CreateLogisticsDto })
  @ApiResponse({
    status: 201,
    description: 'Logistics record created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Order item not found' })
  create(@Body() createLogisticsDto: CreateLogisticsDto) {
    return this.logisticsService.create(createLogisticsDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all logistics records with pagination and filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'orderId',
    required: false,
    type: Number,
    description: 'Filter by order ID',
  })
  @ApiQuery({
    name: 'orderItemId',
    required: false,
    type: Number,
    description: 'Filter by order item ID',
  })
  @ApiQuery({
    name: 'trackingNo',
    required: false,
    type: String,
    description: 'Filter by tracking number (partial match)',
  })
  @ApiQuery({
    name: 'carrier',
    required: false,
    type: String,
    description: 'Filter by carrier (partial match)',
  })
  @ApiResponse({ status: 200, description: 'Paginated logistics list' })
  findAll(@Query() query: QueryLogisticsDto) {
    return this.logisticsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a logistics record by ID' })
  @ApiParam({ name: 'id', description: 'Logistics ID', type: Number })
  @ApiResponse({ status: 200, description: 'Logistics record found' })
  @ApiResponse({ status: 404, description: 'Logistics record not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.logisticsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a logistics record by ID' })
  @ApiParam({ name: 'id', description: 'Logistics ID', type: Number })
  @ApiBody({ type: UpdateLogisticsDto })
  @ApiResponse({
    status: 200,
    description: 'Logistics record updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Logistics record not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLogisticsDto: UpdateLogisticsDto,
  ) {
    return this.logisticsService.update(id, updateLogisticsDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a logistics record by ID' })
  @ApiParam({ name: 'id', description: 'Logistics ID', type: Number })
  @ApiResponse({
    status: 204,
    description: 'Logistics record deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Logistics record not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.logisticsService.remove(id);
  }
}
