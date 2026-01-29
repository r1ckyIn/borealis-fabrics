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
  ParseBoolPipe,
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
import { FabricService } from './fabric.service';
import { CreateFabricDto, QueryFabricDto, UpdateFabricDto } from './dto';

@ApiTags('fabrics')
@Controller('api/v1/fabrics')
export class FabricController {
  constructor(private readonly fabricService: FabricService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new fabric' })
  @ApiBody({ type: CreateFabricDto })
  @ApiResponse({ status: 201, description: 'Fabric created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Fabric code already exists' })
  create(@Body() createFabricDto: CreateFabricDto) {
    return this.fabricService.create(createFabricDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all fabrics with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'fabricCode', required: false, type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'color', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Paginated fabric list' })
  findAll(@Query() query: QueryFabricDto) {
    return this.fabricService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fabric by ID' })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiResponse({ status: 200, description: 'Fabric found' })
  @ApiResponse({ status: 404, description: 'Fabric not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fabricService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fabric by ID' })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiBody({ type: UpdateFabricDto })
  @ApiResponse({ status: 200, description: 'Fabric updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Fabric not found' })
  @ApiResponse({ status: 409, description: 'Fabric code already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFabricDto: UpdateFabricDto,
  ) {
    return this.fabricService.update(id, updateFabricDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a fabric by ID',
    description:
      'Physical delete if no relations, 409 if relations exist. ' +
      'Use ?force=true to soft delete when relations exist.',
  })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force soft delete when relations exist',
  })
  @ApiResponse({ status: 204, description: 'Fabric deleted successfully' })
  @ApiResponse({ status: 404, description: 'Fabric not found' })
  @ApiResponse({
    status: 409,
    description: 'Fabric has related data, use ?force=true to soft delete',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ) {
    return this.fabricService.remove(id, force ?? false);
  }
}
