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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FabricService } from './fabric.service';
import {
  CreateFabricDto,
  QueryFabricDto,
  UpdateFabricDto,
  UploadFabricImageDto,
  FabricImageResponseDto,
  QueryFabricSuppliersDto,
  CreateFabricSupplierDto,
  UpdateFabricSupplierDto,
  QueryFabricPricingDto,
  CreateFabricPricingDto,
  UpdateFabricPricingDto,
} from './dto';

// Allowed image MIME types for fabric images
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

@ApiTags('fabrics')
@Controller('fabrics')
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

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image for a fabric' })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiBody({
    description: 'Image file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpeg, png, gif, webp)',
        },
        sortOrder: {
          type: 'integer',
          description: 'Sort order for display (0-999)',
          minimum: 0,
          maximum: 999,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: FabricImageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No file provided or invalid file type',
  })
  @ApiResponse({ status: 404, description: 'Fabric not found' })
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFabricImageDto,
  ) {
    // Validate file is provided
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate MIME type at controller level for early rejection
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: jpeg, png, gif, webp',
      );
    }

    return this.fabricService.uploadImage(id, file, dto.sortOrder ?? 0);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an image from a fabric' })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiParam({ name: 'imageId', description: 'Image ID', type: Number })
  @ApiResponse({ status: 204, description: 'Image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Fabric or image not found' })
  deleteImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.fabricService.deleteImage(id, imageId);
  }

  // ========================================
  // Fabric-Supplier Association Endpoints
  // ========================================

  @Get(':id/suppliers')
  @ApiOperation({
    summary: 'List suppliers associated with a fabric',
    description:
      'Returns paginated list of suppliers with pricing and lead time info',
  })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
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
    name: 'supplierName',
    required: false,
    type: String,
    description: 'Filter by supplier company name (fuzzy search)',
  })
  @ApiResponse({ status: 200, description: 'Paginated supplier list' })
  @ApiResponse({ status: 404, description: 'Fabric not found' })
  findSuppliers(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryFabricSuppliersDto,
  ) {
    return this.fabricService.findSuppliers(id, query);
  }

  @Post(':id/suppliers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Associate a supplier with a fabric',
    description:
      'Creates a fabric-supplier association with pricing and lead time info',
  })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiBody({ type: CreateFabricSupplierDto })
  @ApiResponse({
    status: 201,
    description: 'Supplier association created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Fabric or supplier not found' })
  @ApiResponse({
    status: 409,
    description: 'Supplier is already associated with this fabric',
  })
  addSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateFabricSupplierDto,
  ) {
    return this.fabricService.addSupplier(id, createDto);
  }

  @Patch(':id/suppliers/:supplierId')
  @ApiOperation({
    summary: 'Update a fabric-supplier association',
    description:
      'Updates pricing or lead time info for an existing association',
  })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', type: Number })
  @ApiBody({ type: UpdateFabricSupplierDto })
  @ApiResponse({ status: 200, description: 'Association updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Fabric or association not found' })
  updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Body() updateDto: UpdateFabricSupplierDto,
  ) {
    return this.fabricService.updateSupplier(id, supplierId, updateDto);
  }

  @Delete(':id/suppliers/:supplierId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a fabric-supplier association',
    description: 'Removes an existing fabric-supplier association',
  })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', type: Number })
  @ApiResponse({
    status: 204,
    description: 'Association removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Fabric or association not found' })
  removeSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
  ) {
    return this.fabricService.removeSupplier(id, supplierId);
  }

  // ========================================
  // Fabric Pricing Endpoints (2.3.13 - 2.3.16)
  // ========================================

  @Get(':id/pricing')
  @ApiOperation({
    summary: 'List special pricing records for a fabric',
    description:
      'Returns paginated list of customer special pricing with customer details',
  })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
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
    name: 'customerName',
    required: false,
    type: String,
    description: 'Filter by customer company name (fuzzy search)',
  })
  @ApiResponse({ status: 200, description: 'Paginated pricing list' })
  @ApiResponse({ status: 404, description: 'Fabric not found' })
  findPricing(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryFabricPricingDto,
  ) {
    return this.fabricService.findPricing(id, query);
  }

  @Post(':id/pricing')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a special pricing for a customer',
    description: 'Sets a special price for a specific customer for this fabric',
  })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiBody({ type: CreateFabricPricingDto })
  @ApiResponse({
    status: 201,
    description: 'Pricing created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Fabric or customer not found' })
  @ApiResponse({
    status: 409,
    description: 'Customer already has special pricing for this fabric',
  })
  createPricing(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateFabricPricingDto,
  ) {
    return this.fabricService.createPricing(id, createDto);
  }

  @Patch(':id/pricing/:pricingId')
  @ApiOperation({
    summary: 'Update a special pricing record',
    description: 'Updates the special price for an existing pricing record',
  })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiParam({ name: 'pricingId', description: 'Pricing ID', type: Number })
  @ApiBody({ type: UpdateFabricPricingDto })
  @ApiResponse({ status: 200, description: 'Pricing updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Fabric or pricing not found' })
  updatePricing(
    @Param('id', ParseIntPipe) id: number,
    @Param('pricingId', ParseIntPipe) pricingId: number,
    @Body() updateDto: UpdateFabricPricingDto,
  ) {
    return this.fabricService.updatePricing(id, pricingId, updateDto);
  }

  @Delete(':id/pricing/:pricingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a special pricing record',
    description: 'Removes a special pricing record for a customer',
  })
  @ApiParam({ name: 'id', description: 'Fabric ID', type: Number })
  @ApiParam({ name: 'pricingId', description: 'Pricing ID', type: Number })
  @ApiResponse({
    status: 204,
    description: 'Pricing removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Fabric or pricing not found' })
  removePricing(
    @Param('id', ParseIntPipe) id: number,
    @Param('pricingId', ParseIntPipe) pricingId: number,
  ) {
    return this.fabricService.removePricing(id, pricingId);
  }
}
