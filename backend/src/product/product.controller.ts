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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  QueryProductDto,
  UpdateProductDto,
  QueryProductSuppliersDto,
  CreateProductSupplierDto,
  UpdateProductSupplierDto,
  QueryProductPricingDto,
  CreateProductPricingDto,
  UpdateProductPricingDto,
  CreateProductBundleDto,
  UpdateProductBundleDto,
  QueryProductBundleDto,
} from './dto';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ========================================
  // Bundle Endpoints (MUST be before :id routes)
  // ========================================

  @Get('bundles')
  @ApiOperation({ summary: 'List all product bundles with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated bundle list' })
  findBundles(@Query() query: QueryProductBundleDto) {
    return this.productService.findBundles(query);
  }

  @Post('bundles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product bundle' })
  @ApiBody({ type: CreateProductBundleDto })
  @ApiResponse({ status: 201, description: 'Bundle created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'One or more products not found' })
  createBundle(@Body() dto: CreateProductBundleDto) {
    return this.productService.createBundle(dto);
  }

  @Get('bundles/:bundleId')
  @ApiOperation({ summary: 'Get a product bundle by ID' })
  @ApiParam({ name: 'bundleId', description: 'Bundle ID', type: Number })
  @ApiResponse({ status: 200, description: 'Bundle found' })
  @ApiResponse({ status: 404, description: 'Bundle not found' })
  findBundle(@Param('bundleId', ParseIntPipe) bundleId: number) {
    return this.productService.findBundle(bundleId);
  }

  @Patch('bundles/:bundleId')
  @ApiOperation({ summary: 'Update a product bundle' })
  @ApiParam({ name: 'bundleId', description: 'Bundle ID', type: Number })
  @ApiBody({ type: UpdateProductBundleDto })
  @ApiResponse({ status: 200, description: 'Bundle updated successfully' })
  @ApiResponse({ status: 404, description: 'Bundle not found' })
  updateBundle(
    @Param('bundleId', ParseIntPipe) bundleId: number,
    @Body() dto: UpdateProductBundleDto,
  ) {
    return this.productService.updateBundle(bundleId, dto);
  }

  @Delete('bundles/:bundleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product bundle' })
  @ApiParam({ name: 'bundleId', description: 'Bundle ID', type: Number })
  @ApiResponse({ status: 204, description: 'Bundle deleted successfully' })
  @ApiResponse({ status: 404, description: 'Bundle not found' })
  removeBundle(@Param('bundleId', ParseIntPipe) bundleId: number) {
    return this.productService.removeBundle(bundleId);
  }

  // ========================================
  // Product CRUD Endpoints
  // ========================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Product code already exists' })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all products with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiQuery({ name: 'subCategory', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a product by ID',
    description:
      'Physical delete if no relations, 409 if relations exist. ' +
      'Use ?force=true to soft delete when relations exist.',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force soft delete when relations exist',
  })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 409,
    description: 'Product has related data, use ?force=true to soft delete',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ) {
    return this.productService.remove(id, force ?? false);
  }

  // ========================================
  // Product-Supplier Endpoints
  // ========================================

  @Get(':id/suppliers')
  @ApiOperation({
    summary: 'List suppliers associated with a product',
    description:
      'Returns paginated list of suppliers with pricing and lead time info',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'supplierName', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated supplier list' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findSuppliers(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryProductSuppliersDto,
  ) {
    return this.productService.findSuppliers(id, query);
  }

  @Post(':id/suppliers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Associate a supplier with a product',
    description:
      'Creates a product-supplier association with pricing and lead time info',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiBody({ type: CreateProductSupplierDto })
  @ApiResponse({
    status: 201,
    description: 'Supplier association created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Product or supplier not found' })
  @ApiResponse({
    status: 409,
    description: 'Supplier is already associated with this product',
  })
  addSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductSupplierDto,
  ) {
    return this.productService.addSupplier(id, dto);
  }

  @Patch(':id/suppliers/:supplierId')
  @ApiOperation({
    summary: 'Update a product-supplier association',
    description:
      'Updates pricing or lead time info for an existing association',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', type: Number })
  @ApiBody({ type: UpdateProductSupplierDto })
  @ApiResponse({ status: 200, description: 'Association updated successfully' })
  @ApiResponse({ status: 404, description: 'Product or association not found' })
  updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Body() dto: UpdateProductSupplierDto,
  ) {
    return this.productService.updateSupplier(id, supplierId, dto);
  }

  @Delete(':id/suppliers/:supplierId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a product-supplier association',
    description: 'Removes an existing product-supplier association',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', type: Number })
  @ApiResponse({ status: 204, description: 'Association removed successfully' })
  @ApiResponse({ status: 404, description: 'Product or association not found' })
  removeSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
  ) {
    return this.productService.removeSupplier(id, supplierId);
  }

  // ========================================
  // Product Pricing Endpoints
  // ========================================

  @Get(':id/pricing')
  @ApiOperation({
    summary: 'List special pricing records for a product',
    description:
      'Returns paginated list of customer special pricing with customer details',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'customerName', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated pricing list' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findPricing(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryProductPricingDto,
  ) {
    return this.productService.findPricing(id, query);
  }

  @Post(':id/pricing')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a special pricing for a customer',
    description:
      'Sets a special price for a specific customer for this product',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiBody({ type: CreateProductPricingDto })
  @ApiResponse({ status: 201, description: 'Pricing created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Product or customer not found' })
  @ApiResponse({
    status: 409,
    description: 'Customer already has special pricing for this product',
  })
  createPricing(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductPricingDto,
  ) {
    return this.productService.createPricing(id, dto);
  }

  @Patch(':id/pricing/:pricingId')
  @ApiOperation({
    summary: 'Update a special pricing record',
    description: 'Updates the special price for an existing pricing record',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiParam({ name: 'pricingId', description: 'Pricing ID', type: Number })
  @ApiBody({ type: UpdateProductPricingDto })
  @ApiResponse({ status: 200, description: 'Pricing updated successfully' })
  @ApiResponse({ status: 404, description: 'Product or pricing not found' })
  updatePricing(
    @Param('id', ParseIntPipe) id: number,
    @Param('pricingId', ParseIntPipe) pricingId: number,
    @Body() dto: UpdateProductPricingDto,
  ) {
    return this.productService.updatePricing(id, pricingId, dto);
  }

  @Delete(':id/pricing/:pricingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a special pricing record',
    description: 'Removes a special pricing record for a customer',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiParam({ name: 'pricingId', description: 'Pricing ID', type: Number })
  @ApiResponse({ status: 204, description: 'Pricing removed successfully' })
  @ApiResponse({ status: 404, description: 'Product or pricing not found' })
  removePricing(
    @Param('id', ParseIntPipe) id: number,
    @Param('pricingId', ParseIntPipe) pricingId: number,
  ) {
    return this.productService.removePricing(id, pricingId);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss')
  @ApiOperation({ summary: 'Restore a soft-deleted product (boss only)' })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Product restored' })
  @ApiResponse({ status: 403, description: 'Boss role required' })
  @ApiResponse({
    status: 404,
    description: 'Product not found in deleted records',
  })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.productService.restore(id);
  }
}
