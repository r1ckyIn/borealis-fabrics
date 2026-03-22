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
import { OrderService } from './order.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  QueryOrderDto,
  OrderSortField,
  AddOrderItemDto,
  UpdateOrderItemDto,
  UpdateItemStatusDto,
  UpdateCustomerPaymentDto,
  UpdateSupplierPaymentDto,
  CancelItemDto,
  RestoreItemDto,
} from './dto';
import { OrderItemStatus, CustomerPayStatus } from './enums/order-status.enum';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order',
    description:
      'Creates an order with at least one item. Initial status is INQUIRY.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or missing items',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer, fabric, or supplier not found',
  })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all orders with pagination and filtering',
    description:
      'Supports filtering by customer, status, fabric, keyword search, and date range.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: OrderSortField,
    example: 'createdAt',
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'customerId', required: false, type: Number })
  @ApiQuery({
    name: 'fabricId',
    required: false,
    type: Number,
    description: 'Filter orders containing this fabric',
  })
  @ApiQuery({ name: 'status', required: false, enum: OrderItemStatus })
  @ApiQuery({
    name: 'customerPayStatus',
    required: false,
    enum: CustomerPayStatus,
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: 'Search by order code or customer name',
  })
  @ApiQuery({ name: 'createdFrom', required: false, type: String })
  @ApiQuery({ name: 'createdTo', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  findAll(@Query() query: QueryOrderDto) {
    return this.orderService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an order by ID',
    description:
      'Returns full order details including items, timelines, payments, and logistics.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an order by ID',
    description:
      'Updates basic order information (customer, address, notes). Items are managed through separate endpoints.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Order or customer not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an order by ID',
    description:
      'Only INQUIRY status orders without payment records can be deleted.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiResponse({ status: 204, description: 'Order deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete - wrong status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete - has payment records',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.remove(id);
  }

  // ============================================================
  // Order Items Endpoints (3.2.6 - 3.2.12)
  // ============================================================

  @Get(':id/items')
  @ApiOperation({
    summary: 'Get all items for an order (3.2.6)',
    description:
      'Returns all order items with fabric, supplier, and recent timeline info.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiResponse({ status: 200, description: 'Order items list' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderItems(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderItems(id);
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a new item to an order (3.2.7)',
    description: 'Creates a new order item with INQUIRY status.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiBody({ type: AddOrderItemDto })
  @ApiResponse({ status: 201, description: 'Item added successfully' })
  @ApiResponse({
    status: 404,
    description: 'Order, fabric, or supplier not found',
  })
  addOrderItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrderItemDto,
  ) {
    return this.orderService.addOrderItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({
    summary: 'Update an order item (3.2.8)',
    description:
      'Updates item details. Only allowed when status is INQUIRY or PENDING.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiParam({ name: 'itemId', description: 'Order Item ID', type: Number })
  @ApiBody({ type: UpdateOrderItemDto })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot modify - wrong status or validation error',
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  updateOrderItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.orderService.updateOrderItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an order item (3.2.9)',
    description:
      'Deletes an item. Only allowed when status is INQUIRY or PENDING.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiParam({ name: 'itemId', description: 'Order Item ID', type: Number })
  @ApiResponse({ status: 204, description: 'Item deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete - wrong status' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  removeOrderItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.orderService.removeOrderItem(id, itemId);
  }

  @Patch(':id/items/:itemId/status')
  @ApiOperation({
    summary: 'Update an order item status (3.2.10)',
    description:
      'Changes item status following the workflow state machine. Records in timeline.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiParam({ name: 'itemId', description: 'Order Item ID', type: Number })
  @ApiBody({ type: UpdateItemStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  updateItemStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.orderService.updateItemStatus(id, itemId, dto);
  }

  @Post(':id/items/:itemId/cancel')
  @ApiOperation({
    summary: 'Cancel an order item (3.2.11)',
    description:
      'Cancels an item. Previous status is saved for potential restoration.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiParam({ name: 'itemId', description: 'Order Item ID', type: Number })
  @ApiBody({ type: CancelItemDto })
  @ApiResponse({ status: 200, description: 'Item cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Item already cancelled' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  cancelOrderItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: CancelItemDto,
  ) {
    return this.orderService.cancelOrderItem(id, itemId, dto);
  }

  @Post(':id/items/:itemId/restore')
  @ApiOperation({
    summary: 'Restore a cancelled order item (3.2.12)',
    description: 'Restores a cancelled item to its previous status.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiParam({ name: 'itemId', description: 'Order Item ID', type: Number })
  @ApiBody({ type: RestoreItemDto })
  @ApiResponse({ status: 200, description: 'Item restored successfully' })
  @ApiResponse({
    status: 400,
    description: 'Item not cancelled or no previous status',
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  restoreOrderItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: RestoreItemDto,
  ) {
    return this.orderService.restoreOrderItem(id, itemId, dto);
  }

  // ============================================================
  // Timeline Endpoints (3.2.13 - 3.2.14)
  // ============================================================

  @Get(':id/timeline')
  @ApiOperation({
    summary: 'Get order timeline (3.2.13)',
    description: 'Returns aggregated timeline for all items in the order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiResponse({ status: 200, description: 'Order timeline' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderTimeline(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderTimeline(id);
  }

  @Get(':id/items/:itemId/timeline')
  @ApiOperation({
    summary: 'Get item timeline (3.2.14)',
    description: 'Returns timeline for a specific order item.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiParam({ name: 'itemId', description: 'Order Item ID', type: Number })
  @ApiResponse({ status: 200, description: 'Item timeline' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  getItemTimeline(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.orderService.getItemTimeline(id, itemId);
  }

  // ============================================================
  // Payment Endpoints (3.2.15 - 3.2.17)
  // ============================================================

  @Patch(':id/customer-payment')
  @ApiOperation({
    summary: 'Update customer payment (3.2.15)',
    description: 'Updates customer payment information for the order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiBody({ type: UpdateCustomerPaymentDto })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  updateCustomerPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerPaymentDto,
  ) {
    return this.orderService.updateCustomerPayment(id, dto);
  }

  @Get(':id/supplier-payments')
  @ApiOperation({
    summary: 'Get supplier payments (3.2.16)',
    description: 'Returns all supplier payment records for the order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiResponse({ status: 200, description: 'Supplier payments list' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getSupplierPayments(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getSupplierPayments(id);
  }

  @Patch(':id/supplier-payments/:supplierId')
  @ApiOperation({
    summary: 'Update supplier payment (3.2.17)',
    description: 'Updates payment information for a specific supplier.',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: Number })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID', type: Number })
  @ApiBody({ type: UpdateSupplierPaymentDto })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  @ApiResponse({ status: 404, description: 'Order or supplier not found' })
  updateSupplierPayment(
    @Param('id', ParseIntPipe) id: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Body() dto: UpdateSupplierPaymentDto,
  ) {
    return this.orderService.updateSupplierPayment(id, supplierId, dto);
  }
}
