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
import { QuoteService } from './quote.service';
import {
  CreateQuoteDto,
  CreateQuoteItemDto,
  UpdateQuoteDto,
  UpdateQuoteItemDto,
  QueryQuoteDto,
  ConvertQuotesToOrderDto,
  QuoteStatus,
} from './dto';

@ApiTags('quotes')
@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new quote with items' })
  @ApiBody({ type: CreateQuoteDto })
  @ApiResponse({ status: 201, description: 'Quote created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid date',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer, fabric, or product not found',
  })
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quoteService.create(createQuoteDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all quotes with pagination and filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: 'Search by quote code',
  })
  @ApiQuery({ name: 'customerId', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: QuoteStatus,
  })
  @ApiQuery({ name: 'validFrom', required: false, type: String })
  @ApiQuery({ name: 'validTo', required: false, type: String })
  @ApiQuery({ name: 'createdFrom', required: false, type: String })
  @ApiQuery({ name: 'createdTo', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated quote list' })
  findAll(@Query() query: QueryQuoteDto) {
    return this.quoteService.findAll(query);
  }

  @Post('batch-convert')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Batch convert quotes to a single order',
    description:
      'Convert multiple quotes for the same customer into a single order. ' +
      'All quotes must be active and non-expired.',
  })
  @ApiBody({ type: ConvertQuotesToOrderDto })
  @ApiResponse({ status: 201, description: 'Order created from quotes' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or quotes invalid',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more quotes not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Quote is being converted by another request',
  })
  @ApiResponse({ status: 503, description: 'Redis unavailable' })
  batchConvertToOrder(@Body() dto: ConvertQuotesToOrderDto) {
    return this.quoteService.batchConvertToOrder(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quote by ID' })
  @ApiParam({ name: 'id', description: 'Quote ID', type: Number })
  @ApiResponse({ status: 200, description: 'Quote found' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quoteService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update quote header fields',
    description:
      'Only active, expired, or partially converted quotes can be updated. ' +
      'Extending validity on expired quote resets status to active.',
  })
  @ApiParam({ name: 'id', description: 'Quote ID', type: Number })
  @ApiBody({ type: UpdateQuoteDto })
  @ApiResponse({ status: 200, description: 'Quote updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot update converted quote',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuoteDto: UpdateQuoteDto,
  ) {
    return this.quoteService.update(id, updateQuoteDto);
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an item to a quote' })
  @ApiParam({ name: 'id', description: 'Quote ID', type: Number })
  @ApiBody({ type: CreateQuoteItemDto })
  @ApiResponse({ status: 201, description: 'Item added successfully' })
  @ApiResponse({
    status: 404,
    description: 'Quote, fabric, or product not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot add items to converted quote',
  })
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() itemDto: CreateQuoteItemDto,
  ) {
    return this.quoteService.addItem(id, itemDto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update a quote item' })
  @ApiParam({ name: 'id', description: 'Quote ID', type: Number })
  @ApiParam({ name: 'itemId', description: 'Quote Item ID', type: Number })
  @ApiBody({ type: UpdateQuoteItemDto })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  @ApiResponse({ status: 404, description: 'Quote or item not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot update converted item',
  })
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateDto: UpdateQuoteItemDto,
  ) {
    return this.quoteService.updateItem(id, itemId, updateDto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an item from a quote' })
  @ApiParam({ name: 'id', description: 'Quote ID', type: Number })
  @ApiParam({ name: 'itemId', description: 'Quote Item ID', type: Number })
  @ApiResponse({ status: 204, description: 'Item removed successfully' })
  @ApiResponse({ status: 404, description: 'Quote or item not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot remove converted item',
  })
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.quoteService.removeItem(id, itemId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a quote by ID',
    description:
      'Only active, expired, or partially converted quotes can be deleted.',
  })
  @ApiParam({ name: 'id', description: 'Quote ID', type: Number })
  @ApiResponse({ status: 204, description: 'Quote deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete converted quote',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.quoteService.remove(id);
  }

  @Post(':id/convert-to-order')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Convert a quote to an order',
    description:
      'Only active quotes that have not expired can be converted. ' +
      'Creates an order with order items from the quote items.',
  })
  @ApiParam({ name: 'id', description: 'Quote ID', type: Number })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully from quote',
  })
  @ApiResponse({
    status: 400,
    description: 'Quote is not active or has expired',
  })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  @ApiResponse({
    status: 409,
    description: 'Quote is being converted by another request',
  })
  @ApiResponse({ status: 503, description: 'Redis unavailable' })
  convertToOrder(@Param('id', ParseIntPipe) id: number) {
    return this.quoteService.convertToOrder(id);
  }
}
