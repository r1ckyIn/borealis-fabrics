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
import { SupplierService } from './supplier.service';
import {
  CreateSupplierDto,
  QuerySupplierDto,
  QuerySupplierFabricsDto,
  UpdateSupplierDto,
} from './dto';

@ApiTags('suppliers')
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiBody({ type: CreateSupplierDto })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Company name already exists' })
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.supplierService.create(createSupplierDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all suppliers with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'companyName', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'suspended', 'eliminated'],
  })
  @ApiQuery({ name: 'settleType', required: false, enum: ['prepay', 'credit'] })
  @ApiResponse({ status: 200, description: 'Paginated supplier list' })
  findAll(@Query() query: QuerySupplierDto) {
    return this.supplierService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier by ID' })
  @ApiParam({ name: 'id', description: 'Supplier ID', type: Number })
  @ApiResponse({ status: 200, description: 'Supplier found' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.findOne(id);
  }

  @Get(':id/fabrics')
  @ApiOperation({
    summary: 'List all fabrics supplied by a supplier',
    description:
      'Returns paginated list of fabrics that this supplier can supply, ' +
      'including purchase price, minimum order quantity, and lead time.',
  })
  @ApiParam({ name: 'id', description: 'Supplier ID', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'createdAt',
      'fabricCode',
      'fabricName',
      'purchasePrice',
      'minOrderQty',
      'leadTimeDays',
    ],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'fabricCode',
    required: false,
    type: String,
    description: 'Filter by fabric code (fuzzy search)',
  })
  @ApiQuery({
    name: 'fabricName',
    required: false,
    type: String,
    description: 'Filter by fabric name (fuzzy search)',
  })
  @ApiQuery({
    name: 'color',
    required: false,
    type: String,
    description: 'Filter by fabric color (exact match)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of fabrics supplied by this supplier',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  findSupplierFabrics(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QuerySupplierFabricsDto,
  ) {
    return this.supplierService.findSupplierFabrics(id, query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a supplier by ID' })
  @ApiParam({ name: 'id', description: 'Supplier ID', type: Number })
  @ApiBody({ type: UpdateSupplierDto })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({ status: 409, description: 'Company name already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.supplierService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a supplier by ID',
    description:
      'Physical delete if no relations, 409 if relations exist. ' +
      'Use ?force=true to soft delete when relations exist.',
  })
  @ApiParam({ name: 'id', description: 'Supplier ID', type: Number })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force soft delete when relations exist',
  })
  @ApiResponse({ status: 204, description: 'Supplier deleted successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({
    status: 409,
    description: 'Supplier has related data, use ?force=true to soft delete',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ) {
    return this.supplierService.remove(id, force ?? false);
  }
}
