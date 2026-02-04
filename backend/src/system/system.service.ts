import { Injectable } from '@nestjs/common';
import { EnumsResponseDto, EnumDefinitionDto } from './dto/enums-response.dto';
import {
  OrderItemStatus,
  CustomerPayStatus,
  PaymentMethod,
  QuoteStatus,
  SupplierStatus,
  SettleType,
  ORDER_ITEM_STATUS_LABELS,
  CUSTOMER_PAY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  QUOTE_STATUS_LABELS,
  SUPPLIER_STATUS_LABELS,
  SETTLE_TYPE_LABELS,
} from './enums';

@Injectable()
export class SystemService {
  /**
   * Get all system enums with their values and Chinese labels.
   */
  getAllEnums(): EnumsResponseDto {
    return {
      orderItemStatus: this.buildEnumDefinition(
        OrderItemStatus,
        ORDER_ITEM_STATUS_LABELS,
      ),
      customerPayStatus: this.buildEnumDefinition(
        CustomerPayStatus,
        CUSTOMER_PAY_STATUS_LABELS,
      ),
      paymentMethod: this.buildEnumDefinition(
        PaymentMethod,
        PAYMENT_METHOD_LABELS,
      ),
      quoteStatus: this.buildEnumDefinition(QuoteStatus, QUOTE_STATUS_LABELS),
      supplierStatus: this.buildEnumDefinition(
        SupplierStatus,
        SUPPLIER_STATUS_LABELS,
      ),
      settleType: this.buildEnumDefinition(SettleType, SETTLE_TYPE_LABELS),
    };
  }

  /**
   * Build an enum definition with values and labels.
   * Note: All enums are string enums, so Object.values returns only string values.
   */
  private buildEnumDefinition(
    enumObj: Record<string, string>,
    labels: Record<string, string>,
  ): EnumDefinitionDto {
    return {
      values: Object.values(enumObj),
      labels,
    };
  }
}
