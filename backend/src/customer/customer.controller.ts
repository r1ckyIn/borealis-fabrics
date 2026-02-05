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
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  CreateCustomerPricingDto,
  QueryCustomerDto,
  QueryCustomerOrdersDto,
  UpdateCustomerDto,
  UpdateCustomerPricingDto,
  CustomerOrderSortField,
} from './dto';
import {
  OrderItemStatus,
  CustomerPayStatus,
} from '../order/enums/order-status.enum';

@ApiTags('customers')
@Controller('api/v1/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customerService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all customers with pagination and filtering' })
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
    name: 'creditType',
    required: false,
    enum: ['prepay', 'credit'],
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Paginated customer list' })
  findAll(@Query() query: QueryCustomerDto) {
    return this.customerService.findAll(query);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'Get customer order history' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: CustomerOrderSortField,
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'status', required: false, enum: OrderItemStatus })
  @ApiQuery({
    name: 'customerPayStatus',
    required: false,
    enum: CustomerPayStatus,
  })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiQuery({ name: 'createdFrom', required: false, type: String })
  @ApiQuery({ name: 'createdTo', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryCustomerOrdersDto,
  ) {
    return this.customerService.findOrders(id, query);
  }

  @Get(':id/pricing')
  @ApiOperation({ summary: 'Get customer special pricing list' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Customer pricing list retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  getPricing(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.findPricing(id);
  }

  @Post(':id/pricing')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create special pricing for customer-fabric pair' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiBody({ type: CreateCustomerPricingDto })
  @ApiResponse({
    status: 201,
    description: 'Customer pricing created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Customer or fabric not found' })
  @ApiResponse({
    status: 409,
    description: 'Pricing already exists for this customer-fabric pair',
  })
  createPricing(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateCustomerPricingDto,
  ) {
    return this.customerService.createPricing(id, createDto);
  }

  @Patch(':id/pricing/:pricingId')
  @ApiOperation({ summary: 'Update customer special pricing' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiParam({
    name: 'pricingId',
    description: 'Pricing record ID',
    type: Number,
  })
  @ApiBody({ type: UpdateCustomerPricingDto })
  @ApiResponse({
    status: 200,
    description: 'Customer pricing updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Customer or pricing not found' })
  updatePricing(
    @Param('id', ParseIntPipe) id: number,
    @Param('pricingId', ParseIntPipe) pricingId: number,
    @Body() updateDto: UpdateCustomerPricingDto,
  ) {
    return this.customerService.updatePricing(id, pricingId, updateDto);
  }

  @Delete(':id/pricing/:pricingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete customer special pricing' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiParam({
    name: 'pricingId',
    description: 'Pricing record ID',
    type: Number,
  })
  @ApiResponse({
    status: 204,
    description: 'Customer pricing deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Customer or pricing not found' })
  removePricing(
    @Param('id', ParseIntPipe) id: number,
    @Param('pricingId', ParseIntPipe) pricingId: number,
  ) {
    return this.customerService.removePricing(id, pricingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiResponse({ status: 200, description: 'Customer found' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customerService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a customer by ID',
    description:
      'Physical delete if no relations, 409 if relations exist. ' +
      'Use ?force=true to soft delete when relations exist.',
  })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force soft delete when relations exist',
  })
  @ApiResponse({ status: 204, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({
    status: 409,
    description: 'Customer has related data, use ?force=true to soft delete',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ) {
    return this.customerService.remove(id, force ?? false);
  }
}
