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
   * @param enumObj The enum object
   * @param labels The Chinese labels mapping
   */
  private buildEnumDefinition(
    enumObj: Record<string, string>,
    labels: Record<string, string>,
  ): EnumDefinitionDto {
    // Get enum values (filter out reverse mappings for numeric enums)
    const values = Object.values(enumObj).filter((v) => typeof v === 'string');

    return {
      values,
      labels,
    };
  }
}
