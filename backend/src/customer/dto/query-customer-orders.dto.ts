import { OmitType } from '@nestjs/swagger';
import { QueryOrderDto, OrderSortField } from '../../order/dto/query-order.dto';

/**
 * DTO for querying customer orders.
 * Reuses QueryOrderDto but omits customerId (provided via URL param) and fabricId.
 */
export class QueryCustomerOrdersDto extends OmitType(QueryOrderDto, [
  'customerId',
  'fabricId',
] as const) {}

// Re-export OrderSortField for controller usage
export { OrderSortField as CustomerOrderSortField };
